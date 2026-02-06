import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

export default function FetchGstinDetailed() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [gstin, setGstin] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= WALLET ================= */
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
    if (!fileNo || !gstin || !consent) {
      swal.fire("Validation Error", "Required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm GSTIN Detailed Fetch",
      html: `
        <p><b>GSTIN:</b> ${gstin}</p>
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Wallet Balance:</b> ${wallet}</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchGstinDetailed", {
        usr_ser_id,
        file_no: fileNo,
        gstin,
        consent: "Y",
      });

      const apiData = res.data?.data;
      setResult(apiData);

      if (apiData?.data?.code === "1000") {
        swal.fire(
          "Success",
          `GSTIN details fetched successfully<br/>
           Remaining Balance: <b>${wallet - credits}</b>`,
          "success"
        );
        fetchWallet();
      } else {
        swal.fire("Info", apiData?.data?.message, "info");
      }
    } catch {
      swal.fire("Service Unavailable", "Please try again later", "error");
    } finally {
      setLoading(false);
    }
  };

  const d = result?.data?.gstin_data;

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!d) return;

    const row = (k, v) => [k, safe(v)];
    const section = (t) => ({ text: t, style: "section", margin: [0, 10, 0, 5] });

    const doc = {
      content: [
        { text: "GSTIN Detailed Report", style: "header" },

        section("Basic Information"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("GSTIN", d.document_id),
              row("Status", d.status),
              row("PAN", d.pan),
              row("Legal Name", d.legal_name),
              row("Trade Name", d.trade_name),
              row("Taxpayer Type", d.taxpayer_type),
              row("Constitution", d.constitution_of_business),
              row("Registration Date", d.date_of_registration),
            ],
          },
        },

        section("Jurisdiction"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Center Jurisdiction", d.center_jurisdiction),
              row("State Jurisdiction", d.state_jurisdiction),
            ],
          },
        },

        section("Verification"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Aadhaar Verified", d.aadhaar_verified ? "Yes" : "No"),
              row("eKYC Verified", d.ekyc_verified ? "Yes" : "No"),
              row("Field Visit Conducted", d.field_visit_conducted ? "Yes" : "No"),
            ],
          },
        },

        section("Turnover"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Annual Turnover", d.annual_aggregate_turnover),
              row("Turnover Year", d.annual_aggregate_turnover_year),
            ],
          },
        },

        section("Directors"),
        d.directors?.length ? d.directors.map((x) => `• ${x}`) : "-",

        section("Principal Address"),
        d.principal_address?.address || "-",

        ...(d.additional_addresses?.length
          ? [
              section("Additional Addresses"),
              ...d.additional_addresses.map((a) => a.address),
            ]
          : []),

        ...(d.hsn_data?.services?.length
          ? [
              section("HSN / Services"),
              {
                table: {
                  widths: ["30%", "70%"],
                  body: [
                    ["HSN", "Description"],
                    ...d.hsn_data.services.map((s) => [
                      s.hsn,
                      s.description,
                    ]),
                  ],
                },
              },
            ]
          : []),

        ...(d.filing_data?.length
          ? [
              section("Filing History"),
              {
                table: {
                  widths: ["15%", "20%", "15%", "20%", "20%"],
                  body: [
                    ["Return", "FY", "Period", "Filed On", "Status"],
                    ...d.filing_data.map((f) => [
                      f.return_type,
                      f.financial_year,
                      f.tax_period,
                      f.date_of_filing,
                      f.status,
                    ]),
                  ],
                },
              },
            ]
          : []),

        ...(d.filing_frequency?.length
          ? [
              section("Filing Frequency"),
              {
                table: {
                  widths: ["33%", "33%", "34%"],
                  body: [
                    ["FY", "Quarter", "Frequency"],
                    ...d.filing_frequency.map((f) => [
                      f.financial_year,
                      f.quarter,
                      f.frequency,
                    ]),
                  ],
                },
              },
            ]
          : []),
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        section: { fontSize: 14, bold: true },
      },
      defaultStyle: { fontSize: 10 },
    };

    pdfMake.createPdf(doc).download(`GSTIN_DETAILED_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="text-center mt-2">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mt-3">
          <Form.Group>
            <Form.Label>File Number <Required /></Form.Label>
            <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>GSTIN <Required /></Form.Label>
            <Form.Control
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
            />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN Detailed"}
          </Button>
        </Card>

        {d && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>📄 GSTIN Detailed Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered size="sm" className="mt-3">
              <tbody>
                <tr><th>Legal Name</th><td>{safe(d.legal_name)}</td></tr>
                <tr><th>Trade Name</th><td>{safe(d.trade_name)}</td></tr>
                <tr><th>Status</th><td>{safe(d.status)}</td></tr>
                <tr><th>PAN</th><td>{safe(d.pan)}</td></tr>
                <tr><th>Taxpayer Type</th><td>{safe(d.taxpayer_type)}</td></tr>
                <tr><th>Registration Date</th><td>{safe(d.date_of_registration)}</td></tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}