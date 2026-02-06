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

export default function FetchGstinContactDetails() {
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
      title: "Confirm GSTIN Contact Fetch",
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
      const res = await api.post("api/fetchGstinContactDetailsController", {
        usr_ser_id,
        gstin,
        file_no: fileNo,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === "1013") {
        setResult(apiData);
        swal.fire(
          "Success",
          `
          GSTIN contact details fetched successfully<br/>
          Credits Deducted: <b>${credits}</b><br/>
          Remaining Balance: <b>${wallet - credits}</b>
          `,
          "success"
        );
        fetchWallet();
      } else if (code === "1014") {
        swal.fire("Not Found", "GSTIN contact details not found", "info");
      } else {
        swal.fire("Failed", apiData?.data?.message || "Failed", "warning");
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

  const contact = result?.data?.gstin_data;

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!contact) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const tableBlock = (rows) => ({
      table: {
        widths: ["35%", "65%"],
        body: rows.map((r) => [
          { text: r[0], bold: true },
          r[1] || "-",
        ]),
      },
      layout: "lightHorizontalLines",
      marginBottom: 10,
    });

    const doc = {
      content: [
        { text: "GSTIN Contact Details Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 8 },
        { text: `GSTIN: ${gstin}`, marginBottom: 10 },

        { text: "Contact Details", style: "sub" },
        tableBlock([
          ["Email", contact.email],
          ["Mobile", contact.mobile],
        ]),

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginTop: 15,
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
        sub: { fontSize: 14, bold: true, marginTop: 10 },
      },
    };

    pdfMake
      .createPdf(doc)
      .download(`GSTIN_CONTACT_${fileNo}.pdf`);
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
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN Contact Details"}
          </Button>
        </Card>

        {contact && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>📄 GSTIN Contact Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Email</th>
                  <td>{safe(contact.email)}</td>
                </tr>
                <tr>
                  <th>Mobile</th>
                  <td>{safe(contact.mobile)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}