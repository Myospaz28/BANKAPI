

import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Table,
  Badge,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "app/components/JsonTableViewer";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchDigitalFootprint() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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

  const getBadgeVariant = (code) => {
    if (code === "1030") return "success";
    return "secondary";
  };

  const handleFetch = async () => {
    if (loading) return;

    /* ================= VALIDATION ================= */
    if (!fileNo || !phone || phone.length !== 10 || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
        <ul style="text-align:left">
          ${!fileNo ? "<li>File Number is required</li>" : ""}
          ${!phone ? "<li>Phone is required</li>" : ""}
          ${phone && phone.length !== 10 ? "<li>Phone must be 10 digits</li>" : ""}
          ${!consent ? "<li>Consent is required</li>" : ""}
        </ul>
      `,
        icon: "warning",
      });
      return;
    }

    /* ================= WALLET CHECK ================= */
    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    /* ================= CONFIRM ================= */
    const confirm = await swal.fire({
      title: "Confirm Digital Footprint Fetch",
      html: `
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Email:</b> ${email || "-"}</p>
      <p><b>Name:</b> ${name || "-"}</p>
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
      /* ================= CACHE CHECK ================= */
      const checkRes = await api.post("api/checkDigitalFootprintCache", {
        mas_ser_id,
        mas_cat_id,
        phone,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
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
          cancelButtonText: "Cancel",

          customClass: {
            confirmButton: "btn-use-old",
            denyButton: "btn-fetch-fresh",
          },

          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (cacheConfirm.isConfirmed) {
          useCache = true;
        } else if (cacheConfirm.isDenied) {
          useCache = false;
        } else {
          setLoading(false);
          return;
        }
      }

      /* ================= EXECUTE ================= */
      const executeRes = await api.post("api/executeDigitalFootprint", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        phone,
        email,
        name,
        consent: "Y",
        use_cache: useCache,
      });

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;
// console.log("first" , apiData)
      setResult(apiData);
      fetchWallet();

      /* ================= RESPONSE HANDLING ================= */
      if (code === "1030") {
        swal.fire({
          title: "Success",
          html: apiData?.data?.message,
          icon: "success",
        });
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "info");
      }
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Server error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };
const exportPdf = () => {
  if (!result) {
    swal.fire("No Data", "Nothing to export", "warning");
    return;
  }

  const profiles = result?.data?.digital_profile_data || [];

  const safe = (v) =>
    v === undefined || v === null || v === ""
      ? "-"
      : Array.isArray(v)
      ? v.join(", ")
      : String(v);

  const section = (title, size = "sub") => ({
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

  /* ⭐ special handling for scores */
  if (title.toLowerCase().includes("score")) {
    return [
      section(title, "subSection"),
      {
        table: {
          headerRows: 1,
          widths: ["50%", "25%", "25%"],
          body: [
            [
              { text: "Score Type", bold: true },
              { text: "Checked", bold: true },
              { text: "User Exist", bold: true },
            ],
            ...arr.map((s) => [
              s.score_type || "-",
              s.score_data?.checked ?? "-",
              s.score_data?.user_exist ?? "-",
            ]),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 5],
      },
    ];
  }

  /* ⭐ normal dynamic table */
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

  /* ⭐ recursive builder */
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

  const content = [
    { text: "Digital Footprint Detailed Report", style: "header" },

    { text: `File Number: ${fileNo}` },
    { text: `Phone: ${phone}` },
    { text: `Transaction ID: ${result.transaction_id || "-"}` },
    { text: `Request ID: ${result.request_id || "-"}` },

    {
      qr: result.transaction_id || "-",
      fit: 70,
      alignment: "right",
      margin: [0, 10],
    },

    section("Digital Profile Data", "section"),
  ];

  profiles.forEach((profile, i) => {
    content.push(section(`Profile ${i + 1} — ${profile.data_type}`, "sub"));
    content.push(...buildObject(profile));
  });

  content.push({
    text: `Generated On: ${new Date().toLocaleString()}`,
    margin: [0, 20, 0, 0],
    fontSize: 9,
    italics: true,
  });

  const doc = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [35, 50, 35, 50],
    content,
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      section: { fontSize: 14, bold: true },
      sub: { fontSize: 12, bold: true },
      subSection: { fontSize: 11, bold: true },
    },
    defaultStyle: { fontSize: 9 },
  };

  pdfMake.createPdf(doc).download(`DIGITAL_FOOTPRINT_${fileNo}.pdf`);
};

  const profiles = result?.data?.digital_profile_data || [];
  const code = result?.data?.code;

  return (
    <Row>
      <Col md={12}>
        {/* ================= HEADER CARD ================= */}
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        {/* ================= FORM CARD ================= */}
        <Card body className="mt-3">
          <Row>
            <Col md={6}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>
                Phone <Required />
              </Form.Label>
              <Form.Control
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={6}>
              <Form.Label>Email</Form.Label>
              <Form.Control
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : "Fetch Digital Footprint"}
          </Button>
        </Card>

        {/* ================= RESULT ================= */}
        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>
                📄 Digital Footprint Result{" "}
                <Badge bg={getBadgeVariant(code)}>{code}</Badge>
              </h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <div style={{ maxHeight: 400, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>

    
          </Card>
        )}
      </Col>
    </Row>
  );
}
