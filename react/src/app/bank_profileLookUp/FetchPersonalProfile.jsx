


import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Badge,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "app/components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FetchPersonalProfile() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [wallet, setWallet] = useState(0);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pan, setPan] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch {
      setWallet(0);
    }
  };

  const normalize = (data) => {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  };

  const getBadgeVariant = (code) => {
    if (code === "1000") return "success";
    if (code === "1004") return "warning";
    return "danger";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    if (!phone || phone.length !== 10 || !firstName || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!phone ? "<li>Phone is required</li>" : ""}
            ${!firstName ? "<li>First Name is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "Not enough wallet balance",
        "error"
      );
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Personal Profile Fetch",
      html: `
        <p><b>Phone:</b> ${phone}</p>
        <p><b>First Name:</b> ${firstName}</p>
        <p><b>Last Name:</b> ${lastName || "-"}</p>
        <p><b>PAN:</b> ${pan || "-"}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const checkRes = await api.post(
        "api/checkPersonalProfileCache",
        { mas_ser_id, mas_cat_id, phone }
      );

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          icon: "question",
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: "Use Old Data",
          denyButtonText: "Fetch Fresh",
               customClass: {
            confirmButton: "btn-use-old",
            denyButton: "btn-fetch-fresh",
          },
            allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (cacheConfirm.isConfirmed) useCache = true;
        else if (cacheConfirm.isDenied) useCache = false;
        else {
          setLoading(false);
          return;
        }
      }

      const executeRes = await api.post(
        "api/executePersonalProfile",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          phone,
          first_name: firstName,
          last_name: lastName || "",
          pan: pan || "",
          file_no: fileNo,
          use_cache: useCache,
        }
      );

      const apiData = normalize(executeRes.data?.data);
      setResult(apiData);
      fetchWallet();

      const code = apiData?.data?.code;

      if (code === "1000") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1004") {
        swal.fire("No Records", apiData?.data?.message, "info");
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "warning");
      }
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Server error",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

const exportPdf = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";

  const personal = result?.data?.personal_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === ""
      ? "-"
      : Array.isArray(v)
      ? v.join(", ")
      : String(v);

  const section = (title, size = "section") => ({
    text: title,
    style: size,
    margin: [0, 12, 0, 6],
  });

  const twoCol = (rows) => ({
    table: {
      widths: ["45%", "55%"],
      body: rows.map(([k, v]) => [
        { text: k, bold: true },
        safe(v),
      ]),
    },
    layout: "lightHorizontalLines",
  });

  /* ⭐ dynamic array table */
  const buildArrayTable = (title, arr) => {
    if (!arr.length) return [];

    const headers = Object.keys(arr[0]);

    return [
      section(title, "subSection"),
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => "*"),
          body: [
            headers.map((h) => ({
              text: h
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              bold: true,
            })),
            ...arr.map((row) =>
              headers.map((h) =>
                typeof row[h] === "object"
                  ? JSON.stringify(row[h])
                  : safe(row[h])
              )
            ),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 5],
      },
    ];
  };

  /* ⭐ recursive object renderer */
  const buildObject = (obj) => {
    const content = [];

    Object.entries(obj || {}).forEach(([key, value]) => {
      const title = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      if (Array.isArray(value)) {
        if (typeof value[0] === "object") {
          content.push(...buildArrayTable(title, value));
        } else {
          content.push(twoCol([[title, value]]));
        }
      } else if (typeof value === "object" && value !== null) {
        content.push(section(title, "subSection"));
        content.push(...buildObject(value));
      } else {
        content.push(twoCol([[title, value]]));
      }
    });

    return content;
  };

  const doc = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [40, 60, 40, 60],

    content: [
      { text: "Personal Profile Detailed Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Phone: ${phone}` },
      { text: `Transaction ID: ${transactionId}` },
      { text: `Request ID: ${requestId}` },

      {
        qr: transactionId,
        fit: 70,
        alignment: "right",
        margin: [0, 10],
      },

      section("Personal Profile Data"),
      ...buildObject(personal),

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 15],
        italics: true,
        fontSize: 9,
      },
    ],

    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      section: { fontSize: 14, bold: true },
      subSection: { fontSize: 12, bold: true },
    },

    defaultStyle: { fontSize: 10 },
  };

  pdfMake.createPdf(doc).download(`PERSONAL_PROFILE_${fileNo}.pdf`);
};

  const code = result?.data?.code;

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="mb-4">
          <Row>
               <Col md={4}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Label>Phone <Required /></Form.Label>
              <Form.Control
                maxLength={10}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, ""))
                }
              />
            </Col>

            <Col md={4}>
              <Form.Label>First Name <Required /></Form.Label>
              <Form.Control
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Col>

          </Row>

          <Row className="mt-3">
         

            <Col md={4}>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Label>PAN</Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            className="mt-3"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Fetch Personal Profile"}
          </Button>
        </Card>

        {result && (
          <Card body>
          <div className="d-flex justify-content-between">
  <h5>
    Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
  </h5>
  <Button onClick={exportPdf}>Export PDF</Button>
</div>

            <div style={{ maxHeight: 350, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}