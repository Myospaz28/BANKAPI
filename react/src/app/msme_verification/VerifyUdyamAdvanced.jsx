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

export default function VerifyUdyamAdvanced() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [udyamNo, setUdyamNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    api
      .get("api/getLoggedInUserWallet")
      .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
  }, [usr_ser_id, navigate]);

  const handleFetch = async () => {
    if (!fileNo || !udyamNo || !consent) {
      swal.fire("Validation Error", "All fields required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const checkRes = await api.post("api/checkVerifyUdyamAdvancedCache", {
        mas_ser_id,
        mas_cat_id,
        udyam_reference_number: udyamNo,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const confirm = await swal.fire({
          title: "Use Cached Data?",
          showCancelButton: true,
        });

        if (confirm.isConfirmed) useCache = true;
      }

      const res = await api.post("api/executeVerifyUdyamAdvanced", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        udyam_reference_number: udyamNo,
        use_cache: useCache,
      });

      const fullResponse = res.data?.data;
      setResult(fullResponse);

      swal.fire("Completed", "Verification processed", "success");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    if (!result) return;

    const requestId = result?.request_id;
    const transactionId = result?.transaction_id;

    const rows = Object.entries(result?.data || {}).map(([k, v]) => [
      k,
      typeof v === "object" ? JSON.stringify(v) : v,
    ]);

    const doc = {
      content: [
        { text: "Udyam Advanced Verification", style: "header" },
        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },
        { qr: requestId, fit: 80, alignment: "right" },
        {
          table: {
            widths: ["40%", "60%"],
            body: rows,
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`UDYAM_${udyamNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: {credits}</p>
        </Card>

        <Card body className="mt-3">
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
              Udyam Reference Number <Required />
            </Form.Label>
            <Form.Control
              value={udyamNo}
              onChange={(e) => setUdyamNo(e.target.value)}
            />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Verify Udyam"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-3">
            <div className="d-flex justify-content-between">
              <h5>Result</h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
