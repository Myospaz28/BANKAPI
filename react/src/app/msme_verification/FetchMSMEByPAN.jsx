import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "../components/JsonTableViewer";

/* ================= PDF ================= */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchMSMEByPAN() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, mas_ser_id, mas_cat_id } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [pan, setPan] = useState("");
  const [detailed, setDetailed] = useState(false);
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
    if (!fileNo || !pan || !consent) {
      swal.fire("Validation Error", "All required fields missing", "warning");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm MSME Fetch",
      html: `
        <p><b>PAN:</b> ${pan}</p>
        <p><b>File Number:</b> ${fileNo}</p>
        <p><b>Detailed:</b> ${detailed ? "YES" : "NO"}</p>
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post("api/checkMSMEPanCache", {
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

      const res = await api.post("api/executeMSMEPan", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        pan_number: pan,
        detailed_response: detailed,
        use_cache: useCache,
      });

      const fullResponse = res.data?.data;
      setResult(fullResponse);

      const code = fullResponse?.data?.code;

      if (!["1014", "1016"].includes(code)) {
        swal.fire(
          "Info",
          fullResponse?.data?.message || "No record found",
          "info",
        );
      } else {
        swal.fire("Success", "MSME details fetched", "success");
      }
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const code = result?.data?.code;
  const badgeVariant = ["1014", "1016"].includes(code)
    ? "success"
    : "secondary";

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!result) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const requestId = result?.request_id || "MSME_REQUEST";
    const transactionId = result?.transaction_id || "-";

    const rows = [];

    if (result?.data?.udyam_number)
      rows.push(["Udyam Number", result.data.udyam_number]);

    if (result?.data?.enterprise_data) {
      Object.entries(result.data.enterprise_data).forEach(([k, v]) => {
        rows.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
      });
    }

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],

      content: [
        { text: "MSME Fetch by PAN Report", style: "header" },

        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },

        {
          qr: requestId,
          fit: 90,
          alignment: "right",
          margin: [0, 10],
        },

        { text: "Request Details", style: "subHeader" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["File Number", fileNo],
              ["PAN Number", pan],
              ["Detailed Response", detailed ? "YES" : "NO"],
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 5],
        },

        { text: "MSME Data", style: "subHeader" },
        {
          table: {
            widths: ["40%", "60%"],
            body: rows,
          },
          layout: "lightHorizontalLines",
          margin: [0, 5],
        },

        { text: "Full API Response", style: "subHeader", margin: [0, 15] },
        {
          text: JSON.stringify(result, null, 2),
          fontSize: 7,
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          alignment: "right",
          fontSize: 9,
          italics: true,
          margin: [0, 10],
        },
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          marginBottom: 10,
        },
        subHeader: {
          fontSize: 14,
          bold: true,
          marginTop: 10,
          marginBottom: 5,
        },
      },
    };

    pdfMake.createPdf(docDefinition).download(`MSME_By_PAN_${fileNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Fetch MSME by PAN"}</h4>
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
                value={pan}
                maxLength={10}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-2"
            label="Detailed Response"
            checked={detailed}
            onChange={(e) => setDetailed(e.target.checked)}
          />

          <Form.Check
            className="mt-2"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch MSME"}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
