import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchDigitalFootprint() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
    if (!fileNo || !phone || phone.length !== 10 || !consent) {
      swal.fire("Validation Error", "Required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Digital Footprint Fetch",
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
      const res = await api.post("api/digitalFootprintController", {
        usr_ser_id,
        file_no: fileNo,
        phone,
        email,
        name,
        consent: "Y",
      });

      setResult(res.data?.data);

      const code = res.data?.data?.data?.code;

      if (code === "1030") {
        swal.fire(
          "Success",
          `Digital Footprint fetched successfully<br/>
           Credits Deducted: <b>${credits}</b><br/>
           Remaining Balance: <b>${wallet - credits}</b>`,
          "success"
        );
        fetchWallet();
      } else {
        swal.fire("Info", res.data?.data?.data?.message, "info");
      }
    } catch (err) {
      swal.fire(
        "Service Unavailable",
        err.response?.data?.message || "Please try again later",
        "warning"
      );
    } finally {
      setLoading(false);
    }
  };


  const exportPdf = () => {
  if (!result?.data?.digital_profile_data) {
    swal.fire("No Data", "Nothing to export", "warning");
    return;
  }

  const profiles = result.data.digital_profile_data;

  const section = (t) => ({
    text: t,
    style: "section",
    margin: [0, 10, 0, 5],
  });

  const row = (k, v) => [k, v ?? "-"];

  const accountTables = [];

  profiles.forEach((p) => {
    if (p.primary_data?.account_details) {
      accountTables.push(
        section(`Platform Presence (${p.data_type})`),
        {
          table: {
            widths: ["50%", "50%"],
            body: [
              ["Platform", "Status"],
              ...p.primary_data.account_details.map((a) => [
                a.platform,
                a.error
                  ? "Error"
                  : a.user_exist === true
                  ? "Exists"
                  : "Not Found",
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        }
      );
    }

    if (p.intelligence_data?.digital_age) {
      accountTables.push(
        section("Digital Intelligence"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Verified Names Status", p.intelligence_data.verified_names_status),
              row("Digital Age", p.intelligence_data.digital_age?.age),
              row("First Seen Year", p.intelligence_data.digital_age?.year),
            ],
          },
          layout: "lightHorizontalLines",
        }
      );
    }
  });

  const doc = {
    content: [
      { text: "Digital Footprint Report", style: "header" },

      section("Request Details"),
      {
        table: {
          widths: ["40%", "60%"],
          body: [
            row("File Number", fileNo),
            row("Phone", phone),
            row("Email", email || "-"),
            row("Name", name || "-"),
            row("Request ID", result.request_id),
            row("Transaction ID", result.transaction_id),
            row("Status", result.status),
            row("Message", result.data.message),
          ],
        },
        layout: "lightHorizontalLines",
      },

      ...accountTables,

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        marginTop: 15,
        fontSize: 9,
        italics: true,
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true },
      section: { fontSize: 14, bold: true },
    },
    defaultStyle: { fontSize: 11 },
  };

  pdfMake.createPdf(doc).download(`DIGITAL_FOOTPRINT_${fileNo}.pdf`);
};

  const profiles = result?.data?.digital_profile_data || [];

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
            <Form.Label>Phone <Required /></Form.Label>
            <Form.Control
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Email</Form.Label>
            <Form.Control value={email} onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : "Fetch Digital Footprint"}
          </Button>
        </Card>

    {profiles.length > 0 && (
  <Card body className="mt-4">
    <div className="d-flex justify-content-between">
      <h5>📄 Digital Footprint Result</h5>
      <Button variant="outline-primary" onClick={exportPdf}>
        Export PDF
      </Button>
    </div>
            {profiles.map((p, i) => (
              <div key={i} className="mt-3">
                <h6>{p.data_type}</h6>
                {p.primary_data?.account_details && (
                  <Table bordered>
                    <tbody>
                      {p.primary_data.account_details.map((a, idx) => (
                        <tr key={idx}>
                          <td>{a.platform}</td>
                          <td>
                            {a.user_exist === true && <Badge bg="success">Exists</Badge>}
                            {a.user_exist === false && <Badge bg="secondary">Not Found</Badge>}
                            {a.error && <Badge bg="warning">Error</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            ))}
          </Card>
        )}
      </Col>
    </Row>
  );
}