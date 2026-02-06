import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchPassportOcr() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  useEffect(() => {
    api
      .get("api/getLoggedInUserWallet")
      .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
  }, []);

  const handleFetch = async () => {
    if (!fileNo || !frontFile || !consent) {
      swal.fire("Validation Error", "Required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const formData = new FormData();
    formData.append("usr_ser_id", usr_ser_id);
    formData.append("file_no", fileNo);
    formData.append("file_front", frontFile);
    if (backFile) formData.append("file_back", backFile);
    formData.append("consent", "Y");

    setLoading(true);
    try {
      const res = await api.post("api/fetchPassportOcrController", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const code = res.data?.data?.data?.code;

      if (code !== "1007") {
        swal.fire("Failed", res.data?.data?.data?.message, "error");
        return;
      }

      setResult(res.data.data);
      swal.fire("Success", "Passport OCR completed", "success");
    } finally {
      setLoading(false);
    }
  };

  const ocr = result?.data?.ocr_data;

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!ocr) return;

    const rows = Object.entries(ocr).map(([k, v]) => [k, v]);

    const doc = {
      content: [
        { text: "Passport OCR Report", style: "header" },
        {
          table: {
            widths: ["40%", "60%"],
            body: rows,
          },
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
      },
    };

    pdfMake.createPdf(doc).download(`Passport_OCR_${fileNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

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
              Passport Front <Required />
            </Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => setFrontFile(e.target.files[0])}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Passport Back (optional)</Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => setBackFile(e.target.files[0])}
            />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Run Passport OCR"}
          </Button>
        </Card>

        {ocr && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>OCR Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                {Object.entries(ocr).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{v}</td>
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
