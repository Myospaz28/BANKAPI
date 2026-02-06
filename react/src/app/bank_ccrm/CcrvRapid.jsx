import React, { useEffect, useState, useRef } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

export default function CcrvRapid() {
  
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const pollRef = useRef(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
    return () => pollRef.current && clearInterval(pollRef.current);
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= STEP 1: SEARCH ================= */
  const handleSearch = async () => {
    if (!fileNo || !name || !consent) {
      swal.fire("Validation Error", "Required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm CCRV Search",
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
    setTransactionId(null);

    try {
      const res = await api.post("api/ccrvRapidSearchController", {
        usr_ser_id,
        file_no: fileNo,
        name,
        father_name: fatherName,
        address,
        date_of_birth: dob,
        consent: "Y",
      });

      const code = res.data?.data?.data?.code;
      if (code !== "1016") {
        swal.fire("Error", res.data?.data?.data?.message, "error");
        return;
      }

      const txnId = res.data.data.data.transaction_id;
      setTransactionId(txnId);
      setStatus("REQUESTED");

      swal.fire("Success", "CCRV search initiated", "success");
      fetchWallet();
      startPolling(txnId);
    } catch (e) {
      swal.fire("Service Error", "Unable to start CCRV search", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STEP 2: POLLING ================= */
  const startPolling = (txnId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`api/ccrvRapidResultController/${txnId}`);
        const d = res.data?.data?.data;

        setStatus(d?.ccrv_status);

        if (d?.code === "1019" || d?.code === "1020") {
          setResult(d?.ccrv_data);
          clearInterval(pollRef.current);
        }
      } catch (e) {
        clearInterval(pollRef.current);
      }
    }, 10000);
  };

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    pdfMake.createPdf({
      content: [
        { text: "CCRV Rapid Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },
        { text: `Case Count: ${result.case_count}`, marginBottom: 10 },
        {
          table: {
            widths: ["20%", "20%", "20%", "20%", "20%"],
            body: [
              ["Case No", "Type", "Category", "Status", "Decision Date"],
              ...result.cases.map((c) => [
                safe(c.case_number),
                safe(c.case_type),
                safe(c.case_category),
                safe(c.case_status),
                safe(c.case_decision_date),
              ]),
            ],
          },
        },
      ],
      styles: { header: { fontSize: 18, bold: true } },
      defaultStyle: { fontSize: 10 },
    }).download(`CCRV_${fileNo}.pdf`);
  };

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
            <Form.Label>Name <Required /></Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Father Name</Form.Label>
            <Form.Control value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Address</Form.Label>
            <Form.Control value={address} onChange={(e) => setAddress(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Date of Birth</Form.Label>
            <Form.Control type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>File Number <Required /></Form.Label>
            <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleSearch}>
            {loading ? <Spinner size="sm" /> : "Start CCRV Search"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>📄 CCRV Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <p>Status: <b>{status}</b></p>
            <p>Case Count: <b>{result.case_count}</b></p>
          </Card>
        )}
      </Col>
    </Row>
  );

}
