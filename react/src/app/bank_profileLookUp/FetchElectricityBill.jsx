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

export default function FetchElectricityBill() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [provider, setProvider] = useState("");
  const [consumerNo, setConsumerNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [installationNo, setInstallationNo] = useState("");
  const [operatorCode, setOperatorCode] = useState("");
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

  const handleFetch = async () => {
    if (!fileNo || !provider || !consumerNo || !consent) {
      swal.fire("Validation Error", "Required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Electricity Bill Fetch",
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Available Credits:</b> ${wallet}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchElectricityBillController", {
        usr_ser_id,
        file_no: fileNo,
        electricity_provider: provider,
        consumer_number: consumerNo,
        mobile_number: mobile,
        installation_number: installationNo,
        operator_code: operatorCode,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);

      if (code === "1006") {
        swal.fire(
          "Success",
          `Electricity bill fetched successfully<br/>
           Credits Deducted: <b>${credits}</b><br/>
           Remaining Credits: <b>${wallet - credits}</b>`,
          "success"
        );
        fetchWallet();
      } else {
        swal.fire("Info", apiData?.data?.message || "No records found", "info");
      }
    } catch (err) {
      swal.fire("Error", "Service unavailable", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    const d = result?.data?.electricity_bill_data;
    if (!d) return;

    const row = (k, v) => [k, safe(v)];

    const doc = {
      content: [
        { text: "Electricity Bill Report", style: "header" },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("File Number", fileNo),
              row("Provider", provider),
              row("Consumer Number", consumerNo),
              row("Bill Amount", d.bill_amount),
              row("Due Date", d.due_date),
              row("Bill Date", d.bill_date),
              row("Customer Name", d.customer_name),
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`ELECTRICITY_BILL_${fileNo}.pdf`);
  };

  const d = result?.data?.electricity_bill_data;

  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="mt-3">
          <Form.Group>
            <Form.Label>File Number <Required /></Form.Label>
            <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Electricity Provider <Required /></Form.Label>
            <Form.Control value={provider} onChange={(e) => setProvider(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Consumer Number <Required /></Form.Label>
            <Form.Control value={consumerNo} onChange={(e) => setConsumerNo(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Mobile Number</Form.Label>
            <Form.Control value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Installation Number</Form.Label>
            <Form.Control value={installationNo} onChange={(e) => setInstallationNo(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Operator Code</Form.Label>
            <Form.Control value={operatorCode} onChange={(e) => setOperatorCode(e.target.value)} />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : "Fetch Electricity Bill"}
          </Button>
        </Card>

        {d && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>📄 Electricity Bill Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr><th>Customer Name</th><td>{safe(d.customer_name)}</td></tr>
                <tr><th>Bill Amount</th><td>{safe(d.bill_amount)}</td></tr>
                <tr><th>Bill Date</th><td>{safe(d.bill_date)}</td></tr>
                <tr><th>Due Date</th><td>{safe(d.due_date)}</td></tr>
                <tr><th>Status</th><td>{safe(d.bill_status)}</td></tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}