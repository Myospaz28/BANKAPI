import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

/* ===== PDF ===== */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const val = (v) => (v ? v : "-");

export default function FetchBankAccountVerify() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
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
    if (!fileNo || !accountNumber || !ifsc || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Bank Account Verification",
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
      const res = await api.post("api/fetchBankAccountVerifyController", {
        usr_ser_id,
        file_no: fileNo,
        account_number: accountNumber,
        ifsc,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code !== "1000") {
        swal.fire(
          "Verification Failed",
          apiData?.data?.message || "Unable to verify bank account",
          "info",
        );
        setResult(apiData);
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        Bank account verified successfully<br/>
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
    const bank = result?.data?.bank_account_data;
    if (!bank) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const doc = {
      content: [
        { text: "Bank Account Verification Report", style: "header" },

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
              ["Account Holder Name", val(bank.name)],
              ["Bank Name", val(bank.bank_name)],
              ["Branch", val(bank.branch)],
              ["City", val(bank.city)],
              ["MICR", val(bank.micr)],
              ["UTR", val(bank.utr)],
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

    pdfMake.createPdf(doc).download(`Bank_Verification_${fileNo}.pdf`);
  };

  const bank = result?.data?.bank_account_data;

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
                Account Number <Required />
              </Form.Label>
              <Form.Control
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-2">
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
            {loading ? <Spinner size="sm" /> : "Verify Bank Account"}
          </Button>
        </Card>

        {/* RESULT */}
        {bank && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>Bank Account Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Name</th>
                  <td>{val(bank.name)}</td>
                </tr>
                <tr>
                  <th>Bank</th>
                  <td>{val(bank.bank_name)}</td>
                </tr>
                <tr>
                  <th>Branch</th>
                  <td>{val(bank.branch)}</td>
                </tr>
                <tr>
                  <th>City</th>
                  <td>{val(bank.city)}</td>
                </tr>
                <tr>
                  <th>MICR</th>
                  <td>{val(bank.micr)}</td>
                </tr>
                <tr>
                  <th>UTR</th>
                  <td>{val(bank.utr)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
