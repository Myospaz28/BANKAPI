

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

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

const safe = (v) =>
  v === undefined || v === null || v === "" ? "-" : v;

export default function FetchNationalIdsByPhone() {
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

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const getBadgeVariant = (code) => {
    if (code === "1001") return "success";
    if (code === "1004") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
const handleFetch = async () => {
  if (!phone || !firstName || !fileNo || !consent) {
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

  if (phone.length !== 10) {
    swal.fire("Invalid Phone", "Phone must be 10 digits", "warning");
    return;
  }

  if (wallet < credits) {
    swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
    return;
  }

  const confirm = await swal.fire({
    title: "Confirm National ID Fetch",
    html: `
      <p><b>Phone:</b> ${phone}</p>
      <p><b>First Name:</b> ${firstName}</p>
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
    const checkRes = await api.post(
      "api/checkNationalIdsByPhoneCache",
      {
        mas_ser_id,
        mas_cat_id,
        phone,
        pan_number: pan || "",
      }
    );

    let useCache = false;

    if (checkRes.data.hasCache) {
      const fetchedDate = new Date(
        checkRes.data.lastFetchedAt
      ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

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

      if (cacheConfirm.isConfirmed) {
        useCache = true;
      } else if (!cacheConfirm.isDenied) {
        setLoading(false);
        return;
      }
    }

    /* ================= EXECUTE ================= */
    const executeRes = await api.post(
      "api/executeNationalIdsByPhone",
      {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        phone,
        first_name: firstName,
        last_name: lastName || "",
        pan: pan || "",
        consent: "Y",
        use_cache: useCache,
      }
    );

    const apiData = executeRes.data?.data;
    const code = apiData?.data?.code;

    setResult(apiData);
    fetchWallet();

    /* ================= RESULT ALERT ================= */
    if (code === "1001") {
      swal.fire("Success", apiData?.data?.message, "success");
    } else if (code === "1004") {
      swal.fire("No Records Found", apiData?.data?.message, "info");
    } else {
      swal.fire("Completed", apiData?.data?.message, "info");
    }

  } catch (err) {
    swal.fire("Service Unavailable", "Please try again later", "error");
  } finally {
    setLoading(false);
  }
};

  /* ================= PDF ================= */
const exportPdf = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";
  const timestamp = result?.timestamp || "-";

  const d = result?.data?.national_document_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const rows = [];

  Object.entries(d).forEach(([type, values]) => {
    values.forEach((v) => {
      rows.push([
        type.toUpperCase(),
        safe(v.serial_number),
        safe(v.value),
      ]);
    });
  });

  const doc = {
    content: [
      { text: "National IDs Report", style: "header" },

      {
        table: {
          widths: ["40%", "60%"],
          body: [
            ["File Number", fileNo],
            ["Transaction ID", transactionId],
            ["Request ID", requestId],
          ],
        },
        layout: "lightHorizontalLines",
      },

      { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

      {
        text: "National Documents",
        style: "section",
        margin: [0, 15, 0, 8],
      },

      {
        table: {
          headerRows: 1,
          widths: ["30%", "30%", "40%"],
          body: [
            [
              { text: "Document Type", bold: true },
              { text: "Serial No", bold: true },
              { text: "Value", bold: true },
            ],
            ...rows,
          ],
        },
        layout: "lightHorizontalLines",
      },
    ],

    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 15] },
      section: { fontSize: 14, bold: true },
    },

    defaultStyle: { fontSize: 9 },
  };

  pdfMake.createPdf(doc).download(`NATIONAL_IDS_${fileNo}.pdf`);
};

  const docs = result?.data?.national_document_data;
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

            <Col md={4}>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={4}>
              <Form.Label>PAN</Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) =>
                  setPan(e.target.value.toUpperCase())
                }
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
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch National IDs"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result{" "}
                <Badge bg={getBadgeVariant(code)}>
                  {code}
                </Badge>
              </h5>

              {docs && (
                <Button
                  variant="outline-primary"
                  onClick={exportPdf}
                >
                  Export PDF
                </Button>
              )}
            </div>

            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}