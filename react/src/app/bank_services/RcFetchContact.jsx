


import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function RcFetchContact() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [rcNumber, setRcNumber] = useState("");
  const [fileNo, setFileNo] = useState(""); // ✅ FILE NUMBER
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
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch {
      setWallet(0);
    }
  };

  /* ================= FETCH RC CONTACT ================= */
  const handleFetch = async () => {
    if (!rcNumber || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "RC Number, File Number and consent are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm RC Contact Fetch",
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
      const res = await api.post("api/fetchRcContactController", {
        usr_ser_id,
        rc_number: rcNumber,
        file_no: fileNo, // ✅ SEND FILE NUMBER
        consent: "Y",
      });

      const wrapper = res.data?.data;
      const inner = wrapper?.data;
      const code = inner?.code;

      if (code !== "1000") {
        let msg = "Unable to fetch RC contact details";
        if (code === "1011") msg = "No record found";

        swal.fire("Failed", msg, "warning");
        return;
      }

      setResult(inner);

      swal.fire(
        "Success",
        `
        RC Contact fetched successfully<br/>
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

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!result?.rc_data) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const rc = result.rc_data;

    const doc = {
      content: [
        { text: "RC Contact Details Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        {
          table: {
            widths: ["35%", "65%"],
            body: [
              [{ text: "RC Number", bold: true }, rc.rc_number],
              [{ text: "Mobile Number", bold: true }, rc.mobile_number],
              [{ text: "Document Type", bold: true }, rc.document_type],
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

    pdfMake.createPdf(doc).download(`RC_Contact_${fileNo}.pdf`);
  };

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
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  RC Number <Required />
                </Form.Label>
                <Form.Control
                  value={rcNumber}
                  onChange={(e) =>
                    setRcNumber(e.target.value.toUpperCase())
                  }
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  File Number <Required />
                </Form.Label>
                <Form.Control
                  value={fileNo}
                  onChange={(e) => setFileNo(e.target.value)}
                  placeholder="Enter File Number"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            type="checkbox"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            className="mt-3"
            variant="primary"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch RC Contact"}
          </Button>
        </Card>

        {/* RESULT */}
        {result?.rc_data && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>RC Contact Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>RC Number</th>
                  <td>{result.rc_data.rc_number}</td>
                </tr>
                <tr>
                  <th>Mobile Number</th>
                  <td>{result.rc_data.mobile_number}</td>
                </tr>
                <tr>
                  <th>Document Type</th>
                  <td>{result.rc_data.document_type}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );

}
