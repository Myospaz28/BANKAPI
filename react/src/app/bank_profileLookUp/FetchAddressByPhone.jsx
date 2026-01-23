import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchAddressByPhone() {
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

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH ADDRESS ================= */
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
      title: "Confirm Address Fetch",
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
        "api/fetchAddressByPhoneController",
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
        swal.fire("No Records", "No address data found", "info");
        return;
      }

      if (code !== "1002") {
        swal.fire("Failed", "Unable to fetch address data", "error");
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        Address data fetched successfully<br/>
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
  const p = result?.data;
  if (!p) return;

  const safe = (v) =>
    v === null || v === undefined || v === "" ? "-" : String(v);

  const doc = {
    content: [
      { text: "Address Report", style: "header" },
      { text: `File Number: ${fileNo}`, marginBottom: 10 },

      {
        table: {
          widths: ["35%", "65%"],
          body: [
            ["Full Name", safe(p.personal_information?.full_name)],
            ["Gender", safe(p.personal_information?.gender)],
            ["Age", safe(p.personal_information?.age)],
            ["Date of Birth", safe(p.personal_information?.date_of_birth)],
          ],
        },
        layout: "lightHorizontalLines",
        marginBottom: 15,
      },

      {
        table: {
          headerRows: 1,
          widths: ["20%", "40%", "15%", "10%", "15%"],
          body: [
            ["Type", "Address", "State", "Pincode", "Reported On"],
            ...(p.address_data || []).map((a) => [
              safe(a.type),
              safe(a.detailed_address),
              safe(a.state),
              safe(a.pincode),
              safe(a.date_of_reporting),
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

  pdfMake.createPdf(doc).download(`ADDRESS_${fileNo}.pdf`);
};


  const data = result?.data;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button variant="primary" onClick={() => navigate(-1)}>
            ← Back
          </Button>
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
              <Form.Label>PAN</Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
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
            {loading ? <Spinner size="sm" /> : "Fetch Address"}
          </Button>
        </Card>

        {data && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>Address Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <h6 className="mt-3">Personal Information</h6>
            <Table bordered size="sm">
              <tbody>
                <tr><th>Name</th><td>{data.personal_information?.full_name}</td></tr>
                <tr><th>Gender</th><td>{data.personal_information?.gender}</td></tr>
                <tr><th>Age</th><td>{data.personal_information?.age}</td></tr>
                <tr><th>DOB</th><td>{data.personal_information?.date_of_birth}</td></tr>
              </tbody>
            </Table>

            <h6 className="mt-3">Address History</h6>
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
                {(data.address_data || []).map((a, i) => (
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
          </Card>
        )}
      </Col>
    </Row>
  );
}
