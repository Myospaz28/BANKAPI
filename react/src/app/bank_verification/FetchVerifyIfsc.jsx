import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const val = (v) => (v ? v : "-");

export default function FetchVerifyIfsc() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!fileNo || !ifsc || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm IFSC Verification",
      html: `
        <p><b>File No:</b> ${fileNo}</p>
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
      const res = await api.post("api/fetchVerifyIfscController", {
        usr_ser_id,
        file_no: fileNo,
        ifsc,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code !== "1041") {
        swal.fire(
          "Invalid IFSC",
          apiData?.data?.message || "Invalid IFSC code",
          "info",
        );
        setResult(apiData);
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        IFSC verified successfully<br/>
        Credits Deducted: <b>${credits}</b><br/>
        Remaining Wallet: <b>${wallet - credits}</b>
        `,
        "success",
      );

      fetchWallet();
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    const bank = result?.data?.bank_ifsc_data;
    if (!bank) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const doc = {
      content: [
        { text: "IFSC Verification Report", style: "header" },

        {
          table: {
            widths: ["35%", "65%"],
            body: [
              ["Service Name", service_name],
              ["File Number", fileNo],
              ["Credits Used", credits],
            ],
          },
          layout: "lightHorizontalLines",
          marginBottom: 10,
        },

        {
          table: {
            widths: ["35%", "65%"],
            body: [
              ["IFSC Code", val(bank.ifsc_code)],
              ["Bank Name", val(bank.bank_name)],
              ["Branch", val(bank.branch_name)],
              ["Address", val(bank.address)],
              ["City", val(bank.city)],
              ["State", val(bank.state)],
              ["MICR Code", val(bank.micr_code)],
              ["NEFT", val(bank.payment_channels?.neft)],
              ["IMPS", val(bank.payment_channels?.imps)],
              ["RTGS", val(bank.payment_channels?.rtgs)],
              ["UPI", val(bank.payment_channels?.upi)],
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

    pdfMake.createPdf(doc).download(`IFSC_Verification_${fileNo}.pdf`);
  };

  const bank = result?.data?.bank_ifsc_data;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
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
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>
                IFSC <Required />
              </Form.Label>
              <Form.Control
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Verify IFSC"}
          </Button>
        </Card>

        {/* RESULT */}
        {bank && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>IFSC Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Bank</th>
                  <td>{val(bank.bank_name)}</td>
                </tr>
                <tr>
                  <th>Branch</th>
                  <td>{val(bank.branch_name)}</td>
                </tr>
                <tr>
                  <th>IFSC</th>
                  <td>{val(bank.ifsc_code)}</td>
                </tr>
                <tr>
                  <th>City</th>
                  <td>{val(bank.city)}</td>
                </tr>
                <tr>
                  <th>State</th>
                  <td>{val(bank.state)}</td>
                </tr>
                <tr>
                  <th>Address</th>
                  <td>{val(bank.address)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
