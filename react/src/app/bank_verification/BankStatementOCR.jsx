import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

/* ===== PDF ===== */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function BankStatementOCR() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);

    api
      .get("api/getLoggedInUserWallet")
      .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
  }, [usr_ser_id, navigate]);

  /* ================= OCR CALL ================= */
  const uploadOCR = async () => {
    if (!fileNo || !file || !consent) {
      swal.fire(
        "Validation Error",
        "File Number, File & Consent are required",
        "warning",
      );
      return;
    }

    const formData = new FormData();
    formData.append("usr_ser_id", usr_ser_id);
    formData.append("file_no", fileNo);
    formData.append("file_front", file);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post(
        "api/fetchBankStatementOCRController",
        formData,
      );

      console.log("✅ OCR RESPONSE:", res.data);

      const apiData = res.data?.data?.data;
      const code = apiData?.code;
      const message = apiData?.message;

      if (code !== "1030") {
        swal.fire("OCR Failed", message || "OCR failed", "error");
        return;
      }

      setResult(apiData);
      swal.fire("Success", "Bank Statement OCR completed", "success");
    } catch (err) {
      console.error(err);
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const ocr = result?.ocr_data;

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!ocr) return;

    const rows = Object.entries(ocr).map(([k, v]) => [
      k.replaceAll("_", " ").toUpperCase(),
      v || "-",
    ]);

    const doc = {
      content: [
        { text: "Bank Statement OCR Report", style: "header" },

        { text: "Service Details", style: "sub" },
        {
          table: {
            widths: ["35%", "65%"],
            body: [
              ["Service Name", service_name || "Bank Statement OCR"],
              ["File Number", fileNo],
            ],
          },
          layout: "lightHorizontalLines",
          marginBottom: 10,
        },

        { text: "Extracted Details", style: "sub" },
        {
          table: {
            widths: ["40%", "60%"],
            body: rows,
          },
          layout: "lightHorizontalLines",
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginTop: 15,
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
        sub: { fontSize: 14, bold: true, marginTop: 10, marginBottom: 5 },
      },
    };

    pdfMake.createPdf(doc).download(`Bank_Statement_OCR_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Bank Statement OCR"}</h4>
        </Card>

        {/* WALLET */}
        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        {/* FORM */}
        <Card body className="mb-4">
          <Form.Group>
            <Form.Label>
              File Number <Required />
            </Form.Label>
            <Form.Control
              value={fileNo}
              onChange={(e) => setFileNo(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>
              Bank Statement File <Required />
            </Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <small className="text-muted">PDF / JPG / PNG (single page)</small>
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent to process my bank statement"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={uploadOCR} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Run OCR"}
          </Button>
        </Card>

        {/* RESULT */}
        {ocr && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>OCR Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                {Object.entries(ocr).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k.replaceAll("_", " ")}</th>
                    <td>{v || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
