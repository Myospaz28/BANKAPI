import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

const Required = () => <span style={{ color: "red" }}> *</span>;
const safe = (v) => (v ? v : "-");

export default function FetchMobileNameLookup() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobile, setMobile] = useState("");
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
      swal.fire("Validation Error", "Mobile, File Number & Consent required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Name Lookup",
      html: `
        <p><b>Mobile Number:</b> ${mobile}</p>
        <p><b>File Number:</b> ${fileNo}</p>
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Wallet Balance:</b> ${wallet}</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchMobileNameLookupController", {
        usr_ser_id,
        mobile_number: mobile,
        file_no: fileNo,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const grid = apiData?.data || apiData;

      if (grid?.code === "1014") {
        setResult(apiData);
        swal.fire(
          "Success",
          `Name fetched successfully<br/>
           Credits Deducted: <b>${credits}</b><br/>
           Remaining Balance: <b>${wallet - credits}</b>`,
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

  const nameData = result?.data?.name_lookup_data;

  /* ================= EXPORT PDF ================= */
  const exportPdf = async () => {
    const pdfMake = (await import("pdfmake/build/pdfmake")).default;
    const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;
    pdfMake.vfs = pdfFonts.vfs;

    const tableBlock = (rows) => ({
      table: {
        widths: ["35%", "65%"],
        body: rows.map((r) => [{ text: r[0], bold: true }, r[1] || "-"]),
      },
      layout: "lightHorizontalLines",
      marginBottom: 10,
    });

    const doc = {
      content: [
        { text: "Mobile Name Lookup Report", style: "header" },
        { text: `File Number: ${fileNo}` },
        { text: `Mobile Number: ${mobile}`, marginBottom: 10 },

        { text: "Name Details", style: "sub" },
        tableBlock([
          ["First Name", nameData?.first_name],
          ["Last Name", nameData?.last_name],
          ["Full Name", nameData?.full_name],
        ]),

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginTop: 15,
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true, marginTop: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`MOBILE_NAME_LOOKUP_${fileNo}.pdf`);
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
            <Form.Label>File Number <Required /></Form.Label>
            <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Mobile Number <Required /></Form.Label>
            <Form.Control maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch Name"}
          </Button>
        </Card>

        {nameData && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>📄 Name Lookup Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>First Name</th>
                  <td>{safe(nameData.first_name)}</td>
                </tr>
                <tr>
                  <th>Last Name</th>
                  <td>{safe(nameData.last_name)}</td>
                </tr>
                <tr>
                  <th>Full Name</th>
                  <td>{safe(nameData.full_name)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}