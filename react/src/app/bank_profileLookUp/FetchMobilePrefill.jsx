import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

const Required = () => <span style={{ color: "red" }}> *</span>;
const safe = (v) => (v ? v : "-");

export default function FetchMobilePrefill() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    if (!fileNo || !mobile || !consent) {
      swal.fire("Validation Error", "Required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

 const confirm = await swal.fire({
  title: "Confirm Mobile Prefill Fetch",
  html: `
    <p><b>Mobile Number:</b> ${mobile}</p>
    <p><b>File Number:</b> ${fileNo}</p>
    <p><b>Credits Required:</b> ${credits}</p>
    <p><b>Available Wallet Balance:</b> ${wallet}</p>
  `,
  icon: "question",
  showCancelButton: true,
  confirmButtonText: "Proceed",
});

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchMobilePrefillController", {
        usr_ser_id,
        file_no: fileNo,
        mobile_number: mobile,
        first_name: firstName,
        last_name: lastName,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const grid = apiData?.data || apiData;

      if (grid?.code === "1015") {
        setResult(apiData);
      swal.fire(
  "Success",
  `
  Mobile Prefill fetched successfully<br/>
  Credits Deducted: <b>${credits}</b><br/>
  Remaining Wallet Balance: <b>${wallet - credits}</b>
  `,
  "success"
);
        fetchWallet();
      } else if (grid?.code === "1004") {
        swal.fire("No Records", grid.message, "info");
      } else {
        swal.fire("Failed", grid?.message || "Failed", "warning");
      }
    } catch {
      swal.fire("Error", "Service unavailable", "error");
    } finally {
      setLoading(false);
    }
  };

  const personal = result?.data?.personal_data;

  /* ================= EXPORT PDF ================= */
const exportPdf = async () => {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;
  pdfMake.vfs = pdfFonts.vfs;

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
      { text: "Mobile Prefill Report", style: "header" },
      { text: `File Number: ${fileNo}`, marginBottom: 5 },
      { text: `Mobile Number: ${mobile}`, marginBottom: 10 },

      { text: "Personal Information", style: "sub" },
      tableBlock([
        ["Full Name", personal?.personal_information?.full_name],
        ["Gender", personal?.personal_information?.gender],
        ["Age", personal?.personal_information?.age],
        ["Date of Birth", personal?.personal_information?.date_of_birth],
      ]),

      { text: "Document Details", style: "sub" },
      tableBlock([
        ["PAN", personal?.document_data?.pan?.[0]?.value],
      ]),

      { text: "Contact Details", style: "sub" },
      tableBlock([
        ["Email", personal?.email?.[0]?.value],
        ["Alternate Mobile", personal?.alternate_phone?.[0]?.value],
      ]),

      { text: "Address History", style: "sub" },
      ...(personal?.address || []).map((a, i) =>
        tableBlock([
          ["Address", a.detailed_address],
          ["State", a.state],
          ["Pincode", a.pincode],
        ])
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
      sub: { fontSize: 14, bold: true, marginTop: 10 },
    },
  };

  pdfMake.createPdf(doc).download(`MOBILE_PREFILL_${fileNo}.pdf`);
};

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
            <Form.Label>File No <Required /></Form.Label>
            <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Mobile <Required /></Form.Label>
            <Form.Control value={mobile} maxLength={10} onChange={(e) => setMobile(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>First Name</Form.Label>
            <Form.Control value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Last Name</Form.Label>
            <Form.Control value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch Mobile Prefill"}
          </Button>
        </Card>

     {personal && (
  <Card body className="mt-4">
    <div className="d-flex justify-content-between">
      <h5>📄 Mobile Prefill Details</h5>
      <Button variant="outline-primary" onClick={exportPdf}>
        Export PDF
      </Button>
    </div>

    {/* ================= PERSONAL INFO ================= */}
    <h6 className="mt-4">Personal Information</h6>
    <Table bordered>
      <tbody>
        <tr>
          <th>Full Name</th>
          <td>{safe(personal?.personal_information?.full_name)}</td>
        </tr>
        <tr>
          <th>Gender</th>
          <td>{safe(personal?.personal_information?.gender)}</td>
        </tr>
        <tr>
          <th>Age</th>
          <td>{safe(personal?.personal_information?.age)}</td>
        </tr>
        <tr>
          <th>Date of Birth</th>
          <td>{safe(personal?.personal_information?.date_of_birth)}</td>
        </tr>
      </tbody>
    </Table>

    {/* ================= DOCUMENT DETAILS ================= */}
    <h6 className="mt-4">Document Details</h6>
    <Table bordered>
      <tbody>
        <tr>
          <th>PAN</th>
          <td>{safe(personal?.document_data?.pan?.[0]?.value)}</td>
        </tr>
      </tbody>
    </Table>

    {/* ================= CONTACT DETAILS ================= */}
    <h6 className="mt-4">Contact Details</h6>
    <Table bordered>
      <tbody>
        <tr>
          <th>Email</th>
          <td>{safe(personal?.email?.[0]?.value)}</td>
        </tr>
        <tr>
          <th>Alternate Mobile</th>
          <td>{safe(personal?.alternate_phone?.[0]?.value)}</td>
        </tr>
      </tbody>
    </Table>

    {/* ================= ADDRESS HISTORY ================= */}
    <h6 className="mt-4">Address History</h6>
    {(personal?.address || []).length === 0 && (
      <p className="text-muted">No address records found</p>
    )}

    {(personal?.address || []).map((addr, idx) => (
      <Table bordered key={idx} className="mb-3">
        <tbody>
          <tr>
            <th style={{ width: "30%" }}>Address</th>
            <td>{safe(addr.detailed_address)}</td>
          </tr>
          <tr>
            <th>State</th>
            <td>{safe(addr.state)}</td>
          </tr>
          <tr>
            <th>Pincode</th>
            <td>{safe(addr.pincode)}</td>
          </tr>
        </tbody>
      </Table>
    ))}
  </Card>
)}
      </Col>
    </Row>
  );
}