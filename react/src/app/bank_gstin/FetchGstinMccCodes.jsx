import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const safe = (v) => (v ? v : "-");

export default function FetchGstinMccCodes() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [gstin, setGstin] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= GUARD + WALLET ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!gstin || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "GSTIN, File Number and Consent are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm GSTIN MCC Fetch",
      html: `
        <p><b>GSTIN:</b> ${gstin}</p>
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Wallet Balance:</b> ${wallet}</p>
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
      const res = await api.post("api/fetchGstinMccCodesController", {
        usr_ser_id,
        gstin,
        file_no: fileNo,
        consent: "Y",
      });

      const apiData = res.data?.data;

      // 🔥 NORMALIZE GRIDLINES RESPONSE
      const gridData = apiData?.data || apiData;
      const code = gridData?.code;
      const message = gridData?.message || "Request failed";

      if (code === "1015") {
        setResult(apiData);

        swal.fire(
          "Success",
          `
          GSTIN MCC codes fetched successfully<br/>
          Credits Deducted: <b>${credits}</b><br/>
          Remaining Balance: <b>${wallet - credits}</b>
          `,
          "success"
        );

        fetchWallet();
      } else if (code === "1005") {
        swal.fire("Invalid GSTIN", message, "warning");
      } else if (code === "1016") {
        swal.fire("Not Found", message, "info");
      } else {
        swal.fire("Failed", message, "warning");
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

  const mccData = result?.data?.gstin_data;

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!mccData) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const doc = {
      content: [
        { text: "GSTIN MCC Codes Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 5 },
        { text: `GSTIN: ${gstin}`, marginBottom: 10 },

        {
          table: {
            widths: ["20%", "80%"],
            body: [
              ["MCC Code", "Description"],
              ...mccData.mcc_code_data.map((m) => [
                m.mcc_code,
                m.mcc_description,
              ]),
            ],
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
      },
    };

    pdfMake.createPdf(doc).download(`GSTIN_MCC_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p className="text-muted">
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Label>GSTIN <Required /></Form.Label>
              <Form.Control
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
              />
            </Col>

            <Col md={4}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
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
            variant="primary"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN MCC Codes"}
          </Button>
        </Card>

        {mccData && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>📄 MCC Codes</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <thead>
                <tr>
                  <th>MCC Code</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {mccData.mcc_code_data.map((m, i) => (
                  <tr key={i}>
                    <td>{m.mcc_code}</td>
                    <td>{m.mcc_description}</td>
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