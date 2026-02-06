import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchPassportDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [passportFileNo, setPassportFileNo] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  useEffect(() => {
    api
      .get("api/getLoggedInUserWallet")
      .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
  }, []);

  const handleFetch = async () => {
    if (!fileNo || !passportFileNo || !dob || !consent) {
      swal.fire("Validation Error", "All fields required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchPassportDetailsController", {
        usr_ser_id,
        file_no: fileNo,
        file_number: passportFileNo,
        date_of_birth: dob,
        consent: "Y",
      });

      const code = res.data?.data?.data?.code;

      if (code !== "1006") {
        swal.fire("Failed", "Passport details not found", "info");
        setResult(res.data.data);
        return;
      }

      setResult(res.data.data);
      swal.fire("Success", "Passport details fetched", "success");
    } finally {
      setLoading(false);
    }
  };

  const passport = result?.data?.passport_data;

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!passport) return;

    const doc = {
      content: [
        { text: "Passport Fetch Report", style: "header" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["File Number", passport.file_number],
              ["Document ID", passport.document_id],
              ["First Name", passport.first_name],
              ["Last Name", passport.last_name],
              ["Date of Birth", passport.date_of_birth],
              ["Application Date", passport.application_received_date],
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

    pdfMake.createPdf(doc).download(`Passport_Fetch_${fileNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mb-4">
          <Form.Group>
            <Form.Label>
              File Number <Required />
            </Form.Label>
            <Form.Control
              value={fileNo}
              onChange={(e) => setFileNo(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>
              Passport File Number <Required />
            </Form.Label>
            <Form.Control
              value={passportFileNo}
              onChange={(e) => setPassportFileNo(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>
              Date of Birth <Required />
            </Form.Label>
            <Form.Control
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch Passport"}
          </Button>
        </Card>

        {passport && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>Passport Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>First Name</th>
                  <td>{passport.first_name}</td>
                </tr>
                <tr>
                  <th>Last Name</th>
                  <td>{passport.last_name}</td>
                </tr>
                <tr>
                  <th>File Number</th>
                  <td>{passport.file_number}</td>
                </tr>
                <tr>
                  <th>Date of Birth</th>
                  <td>{passport.date_of_birth}</td>
                </tr>
                <tr>
                  <th>Application Date</th>
                  <td>{passport.application_received_date}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
