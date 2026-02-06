import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchPanByPhone() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= GUARD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  /* ================= WALLET ================= */
  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH PAN ================= */
  const handleFetch = async () => {
    if (!phone || phone.length !== 10 || !firstName || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "Phone, First Name, File Number and Consent are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm PAN Fetch",
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Available Credits:</b> ${wallet}</p>
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
      const res = await api.post("api/fetchPanByPhoneController", {
        usr_ser_id,
        phone,
        first_name: firstName,
        last_name: lastName || "",
        consent_text: "I provide consent to fetch information.",
        file_no: fileNo,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === "1004") {
        swal.fire("No Records", "No PAN found", "info");
        return;
      }

      if (code !== "1003") {
        swal.fire("Failed", "Unable to fetch PAN", "error");
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        PAN fetched successfully<br/>
        Credits Deducted: <b>${credits}</b><br/>
        Remaining Credits: <b>${wallet - credits}</b>
        `,
        "success"
      );

      fetchWallet();
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

  /* ================= PDF ================= */
  const exportPdf = () => {
    const panData = result?.data?.pan_data;
    if (!panData || panData.length === 0) return;

    const safe = (v) =>
      v === null || v === undefined || v === "" ? "-" : String(v);

    const doc = {
      content: [
        { text: "PAN Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        {
          table: {
            headerRows: 1,
            widths: ["20%", "80%"],
            body: [
              ["#", "PAN Number"],
              ...panData.map((p) => [
                safe(p.serial_number),
                safe(p.value),
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

    pdfMake.createPdf(doc).download(`PAN_${fileNo}.pdf`);
  };

  const panData = result?.data?.pan_data || [];

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button variant="primary" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h4 className="mt-3">{service_name}</h4>
          <p className="text-muted">
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        {/* WALLET */}
        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        {/* FORM */}
        <Card body className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Label>Phone <Required /></Form.Label>
              <Form.Control
                maxLength={10}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, ""))
                }
              />
            </Col>

            <Col md={4}>
              <Form.Label>First Name <Required /></Form.Label>
              <Form.Control
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-3">
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
            type="checkbox"
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
            {loading ? <Spinner size="sm" /> : "Fetch PAN"}
          </Button>
        </Card>

        {/* RESULT */}
        {panData.length > 0 && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>PAN Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>PAN Number</th>
                </tr>
              </thead>
              <tbody>
                {panData.map((p, i) => (
                  <tr key={i}>
                    <td>{p.serial_number}</td>
                    <td>{p.value}</td>
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
