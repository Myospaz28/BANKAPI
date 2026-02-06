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

export default function VerifyUdyamAdvanced() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

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

    const confirm = await swal.fire({
      title: "Confirm Verification",
      html: `<b>Udyam:</b> ${udyamNo}<br/><b>Credits:</b> ${credits}`,
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchVerifyUdyamAdvancedController", {
        usr_ser_id,
        file_no: fileNo,
        udyam_reference_number: udyamNo,
        consent: "Y",
      });

      const apiData = res.data?.data?.data;
      const code = apiData?.code;

      if (code !== "1000") {
        swal.fire("Info", apiData?.message, "info");
        setResult(apiData);
        return;
      }

      setResult(apiData);
      swal.fire("Success", "Udyam verified successfully", "success");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!result) return;

    const rows = Object.entries(result.enterprise_data || {}).map(([k, v]) => [
      k,
      typeof v === "object" ? JSON.stringify(v) : v,
    ]);

    const doc = {
      content: [
        { text: "Udyam Advanced Verification Report", style: "header" },
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
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Verify Udyam Advanced"}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body>
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

        {result?.enterprise_data && (
          <Card body className="mt-3">
            <div className="d-flex justify-content-between">
              <h5>Enterprise Details</h5>
              <div>
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>{" "}
                <a
                  href={result.udyam_certificate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-success"
                >
                  Download Certificate
                </a>
              </div>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                {Object.entries(result.enterprise_data).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{typeof v === "object" ? JSON.stringify(v) : v}</td>
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
