import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchPersonalProfile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pan, setPan] = useState("");
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

  const row = (label, value) => (
  <tr>
    <th style={{ width: "35%" }}>{label}</th>
    <td>{value || "-"}</td>
  </tr>
);


  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH PROFILE ================= */
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
      title: "Confirm Personal Profile Fetch",
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
      const res = await api.post(
        "api/fetchPersonalProfileController",
        {
          usr_ser_id,
          phone,
          first_name: firstName,
          last_name: lastName || "",
          pan: pan || "",
          consent_text: "I provide consent to fetch information.",
          file_no: fileNo,
          consent: "Y",
        }
      );

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === "1004") {
        swal.fire("No Records", "No records found", "info");
        return;
      }

      if (code !== "1000") {
        swal.fire("Failed", "Unable to fetch personal profile", "error");
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        Personal profile fetched successfully<br/>
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
  const p = result?.data?.personal_data;
  if (!p) return;

  const section = (title, rows) => [
    { text: title, style: "section" },
    {
      table: {
        widths: ["35%", "65%"],
        body: rows.map(r => [{ text: r[0], bold: true }, r[1] || "-"]),
      },
      layout: "lightHorizontalLines",
      marginBottom: 10,
    },
  ];

  const doc = {
    content: [
      { text: "Personal Profile Report", style: "header" },
      { text: `File Number: ${fileNo}`, marginBottom: 10 },

      ...section("Personal Information", [
        ["Full Name", p.personal_information?.full_name],
        ["Gender", p.personal_information?.gender],
        ["Age", p.personal_information?.age],
        ["Date of Birth", p.personal_information?.date_of_birth],
      ]),

      ...section(
        "Alternate Phone Numbers",
        (p.alternate_phone || []).map(a => [
          `Phone ${a.serial_number}`,
          a.value,
        ])
      ),

      ...section(
        "Email Addresses",
        (p.email || []).map(e => [
          `Email ${e.serial_number}`,
          e.value,
        ])
      ),

      ...section(
        "Addresses",
        (p.address || []).map((a, i) => [
          `Address ${i + 1}`,
          `${a.type} | ${a.detailed_address}, ${a.state} - ${a.pincode} (Reported: ${a.date_of_reporting})`,
        ])
      ),

      ...section(
        "Document Data",
        [
          ...(p.document_data?.pan || []).map(d => [
            `PAN ${d.serial_number}`,
            d.value,
          ]),
          ...(p.document_data?.passport || []).map(d => [
            `Passport ${d.serial_number}`,
            d.value,
          ]),
        ]
      ),

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        marginTop: 15,
        fontSize: 9,
        italics: true,
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true, marginBottom: 10 },
      section: { fontSize: 14, bold: true, marginTop: 10 },
    },
  };

  pdfMake.createPdf(doc).download(`PERSONAL_PROFILE_${fileNo}.pdf`);
};


  const p = result?.data?.personal_data;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button variant="primary" onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p className="text-muted">Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Label>Phone <Required /></Form.Label>
              <Form.Control
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
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

            <Col md={4}>
              <Form.Label>PAN</Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
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
            variant="success"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch Personal Profile"}
          </Button>
        </Card>

       {p && (
  <Card body>
    <div className="d-flex justify-content-between align-items-center">
      <h5>Personal Profile Details</h5>
      <Button variant="outline-primary" onClick={exportPdf}>
        Export PDF
      </Button>
    </div>

    {/* PERSONAL INFO */}
    <h6 className="text-primary mt-3">Personal Information</h6>
    <Table bordered size="sm">
      <tbody>
        {row("Full Name", p.personal_information?.full_name)}
        {row("Gender", p.personal_information?.gender)}
        {row("Age", p.personal_information?.age)}
        {row("Date of Birth", p.personal_information?.date_of_birth)}
      </tbody>
    </Table>

    {/* PHONES */}
    <h6 className="text-primary mt-3">Alternate Phone Numbers</h6>
    <Table bordered size="sm">
      <tbody>
        {(p.alternate_phone || []).map(ph => (
          <tr key={ph.serial_number}>
            <th>Phone {ph.serial_number}</th>
            <td>{ph.value}</td>
          </tr>
        ))}
      </tbody>
    </Table>

    {/* EMAILS */}
    <h6 className="text-primary mt-3">Email Addresses</h6>
    <Table bordered size="sm">
      <tbody>
        {(p.email || []).map(em => (
          <tr key={em.serial_number}>
            <th>Email {em.serial_number}</th>
            <td>{em.value}</td>
          </tr>
        ))}
      </tbody>
    </Table>

    {/* ADDRESSES */}
    <h6 className="text-primary mt-3">Address History</h6>
    <Table bordered size="sm">
      <thead>
        <tr>
          <th>Type</th>
          <th>Address</th>
          <th>State</th>
          <th>Pincode</th>
          <th>Reported On</th>
        </tr>
      </thead>
      <tbody>
        {(p.address || []).map((a, i) => (
          <tr key={i}>
            <td>{a.type}</td>
            <td>{a.detailed_address}</td>
            <td>{a.state}</td>
            <td>{a.pincode}</td>
            <td>{a.date_of_reporting}</td>
          </tr>
        ))}
      </tbody>
    </Table>

    {/* DOCUMENTS */}
    <h6 className="text-primary mt-3">Document Data</h6>
    <Table bordered size="sm">
      <tbody>
        {(p.document_data?.pan || []).map(d => (
          <tr key={`pan-${d.serial_number}`}>
            <th>PAN</th>
            <td>{d.value}</td>
          </tr>
        ))}
        {(p.document_data?.passport || []).map(d => (
          <tr key={`pass-${d.serial_number}`}>
            <th>Passport</th>
            <td>{d.value}</td>
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
