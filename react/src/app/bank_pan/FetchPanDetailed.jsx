import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "../components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchPanDetailed() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [pan, setPan] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);

    api.get("api/getLoggedInUserWallet").then((res) => {
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    });
  }, [usr_ser_id, navigate]);

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!pan || pan.length !== 10 || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm PAN Detailed Fetch",
      html: `
        <p><b>PAN:</b> ${pan}</p>
        <p><b>File No:</b> ${fileNo}</p>
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post("api/checkPanDetailedCache", {
        mas_ser_id,
        mas_cat_id,
        pan_number: pan,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN");

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          showConfirmButton: true,
          showDenyButton: true,
          showCancelButton: true,
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
        else if (!cacheConfirm.isDenied) {
          setLoading(false);
          return;
        }
      }

      /* ===== EXECUTE ===== */
      const res = await api.post("api/executePanDetailed", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        pan_number: pan,
        use_cache: useCache,
      });

      const fullResponse = res.data?.data;
      setResult(fullResponse);

      if (res.data?.wallet?.closing_balance !== undefined) {
        setWallet(res.data.wallet.closing_balance);
      }

      const code = fullResponse?.data?.code;

      if (code !== "1000") {
        swal.fire(
          "Info",
          fullResponse?.data?.message || "PAN not found",
          "info",
        );
      } else {
        swal.fire("Success", "PAN detailed fetched successfully", "success");
      }
    } catch (err) {
      swal.fire(
        "Error",
        err?.response?.data?.message || "Server error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */
const exportPdf1 = () => {
  const d = result?.data?.pan_data;
  if (!d) return;

  const requestId = result?.request_id || "-";
  const transactionId = result?.transaction_id || "-";

  const safe = (v) => (v && v !== "" ? v : "-");

  const fullName =
    `${safe(d.first_name)} ${safe(d.last_name)}`.trim();

  const address = d.address_data
    ? `${safe(d.address_data.line_1)}, ${safe(
        d.address_data.line_2
      )}, ${safe(d.address_data.city)} - ${safe(
        d.address_data.pincode
      )}`
    : "-";

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],

    content: [
      /* ===== HEADER ===== */
      {
        text: "PAN DETAILED REPORT",
        style: "header",
      },

      /* ===== REQUEST + TRANSACTION + QR ===== */
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: `Request ID: ${requestId}`, margin: [0, 10, 0, 5] },
              { text: `Transaction ID: ${transactionId}` },
            ],
          },
          {
            width: "auto",
            qr: transactionId !== "-" ? transactionId : requestId,
            fit: 90,
            alignment: "right",
          },
        ],
      },

      { text: "\n" },

      /* ===== PAN DETAILS TABLE ===== */
      {
        table: {
          widths: ["40%", "60%"],
          body: [
            ["PAN Number", safe(d.document_id)],
            ["Full Name", fullName],
            ["First Name", safe(d.first_name)],
            ["Last Name", safe(d.last_name)],
            ["Gender", safe(d.gender)],
            ["Category", safe(d.category)],
            ["Date of Birth", safe(d.date_of_birth)],
            ["Email", safe(d.email)],
            ["Document Type", safe(d.document_type)],
            ["Aadhaar Linked", d.aadhaar_linked ? "Yes" : "No"],
            ["Masked Aadhaar", safe(d.masked_aadhaar_number)],

            /* ===== ADDRESS ===== */
            ["Address", address],

          ],
        },
        layout: "lightHorizontalLines",
      },

    
    ],

    styles: {
      header: {
        fontSize: 18,
        bold: true,
        marginBottom: 5,
      },
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`PAN_DETAILED_${fileNo || "Report"}.pdf`);
}; 
const exportPdf = () => {
  const root = result?.data;
  const d = root?.pan_data;
  if (!d) return;

  const requestId = result?.request_id || "-";
  const transactionId = result?.transaction_id || "-";

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  /* ⭐ BUILD ADDRESS DYNAMICALLY */
  const address =
    d?.address_data && Object.keys(d.address_data).length
      ? Object.values(d.address_data)
          .filter((x) => x && x !== "")
          .join(", ")
      : "-";

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],

    content: [
      /* ===== HEADER ===== */
      {
        text: "PAN DETAILED REPORT",
        style: "header",
      },

      /* ===== REQUEST + TRANSACTION + QR ===== */
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: `File Number: ${fileNo || "-"}`,
                margin: [0, 10, 0, 5],
              },
              { text: `Request ID: ${requestId}` },
              { text: `Transaction ID: ${transactionId}` },
            ],
          },
          {
            width: "auto",
            qr:
              transactionId !== "-"
                ? transactionId
                : requestId,
            fit: 90,
            alignment: "right",
          },
        ],
      },

      { text: "\n" },

      /* ===== PAN DETAILS ===== */
      {
        table: {
          widths: ["40%", "60%"],
          body: [
            ["PAN Number", safe(d.document_id)],
            ["Full Name", safe(d.name)],
            ["First Name", safe(d.first_name)],
            ["Middle Name", safe(d.middle_name)],
            ["Last Name", safe(d.last_name)],
            ["Document ID", safe(d.document_id)],
            ["Gender", safe(d.gender)],
            ["Category", safe(d.category)],
            ["Date of Birth", safe(d.date_of_birth)],
            ["Document Type", safe(d.document_type)],
            ["Aadhaar Linked", d.aadhaar_linked ? "Yes" : "No"],
            ["Masked Aadhaar", safe(d.masked_aadhaar_number)],
            ["Email", safe(d.email)],

            /* ⭐ ADDRESS FULL */
            ["Address", address],
          ],
        },
        layout: "lightHorizontalLines",
      },
    ],

    styles: {
      header: {
        fontSize: 18,
        bold: true,
        marginBottom: 5,
      },
    },

    defaultStyle: {
      fontSize: 10,
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`PAN_DETAILED_${fileNo || "REPORT"}.pdf`);
};

const panData = result?.data?.pan_data;
  const code = result?.data?.code;
  const badgeVariant = code === "1000" ? "success" : "secondary";

  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Fetch PAN Detailed"}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        {/* FORM */}
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
                PAN Number <Required />
              </Form.Label>
              <Form.Control
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch PAN"}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              {panData && (
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              )}
            </div>

            <h6 className="mt-4">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
