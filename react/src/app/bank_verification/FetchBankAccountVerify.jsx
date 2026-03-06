import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "../components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

export default function FetchBankAccountVerify() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const Required = () => <span style={{ color: "red" }}>*</span>;

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
    if (loading) return;

    if (!fileNo || !accountNumber || !ifsc || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough balance", "error");
      return;
    }

    /* ✅ PROPER CONFIRM BOX WITH DETAILS */
    const confirm = await swal.fire({
      title: "Confirm Bank Account Verification",
      html: `
        <p><b>Account Number:</b> ${accountNumber}</p>
        <p><b>IFSC:</b> ${ifsc}</p>
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
      /* CACHE CHECK */
      const checkRes = await api.post("api/checkBankAccountVerifyCache", {
        mas_ser_id,
        mas_cat_id,
        account_number: accountNumber,
        ifsc,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          icon: "question",
          showConfirmButton: true,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Use Old Data",
          denyButtonText: "Fetch Fresh",
          cancelButtonText: "Cancel",
     customClass: {
            confirmButton: "btn-use-old",
            denyButton: "btn-fetch-fresh",
          },
            allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (cacheConfirm.isConfirmed) useCache = true;
        else if (cacheConfirm.isDenied) useCache = false;
        else {
          setLoading(false);
          return;
        }
      }

      const executeRes = await api.post("api/executeBankAccountVerify", {
        usr_ser_id,
        mas_cat_id,
        mas_ser_id,
        file_no: fileNo,
        account_number: accountNumber,
        ifsc,
        use_cache: useCache,
      });

      setResult(executeRes.data?.data);
      fetchWallet();

      swal.fire("Completed", "Request processed successfully", "success");
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!result) return;

    const bank = result?.data?.bank_account_data || {};
    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";

    const doc = {
      content: [
        {
          text: "Bank Account Verification Report",
          style: "header",
        },

        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },

        /* ✅ QR CODE */
        {
          qr: requestId !== "-" ? requestId : "BANK-VERIFY",
          fit: 100,
          alignment: "right",
          margin: [0, 10],
        },

        { text: "Bank Details", style: "sub" },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Reference ID", bank.reference_id || "-"],
              ["Name", bank.name || "-"],
              ["Bank Name", bank.bank_name || "-"],
              ["UTR", bank.utr || "-"],
              ["City", bank.city || "-"],
              ["Branch", bank.branch || "-"],
              ["MICR", bank.micr || "-"],
              ["Account Number", accountNumber || "-"],
              ["IFSC", ifsc || "-"],
            ],
          },
          layout: "lightHorizontalLines",
        },

        { text: "Full API Response", style: "sub", margin: [0, 10] },

        {
          text: JSON.stringify(result, null, 2),
          fontSize: 8,
        },
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        sub: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5],
        },
      },
    };

    pdfMake.createPdf(doc).download(`Bank_Verification_${fileNo}.pdf`);
  };

  const code = result?.data?.code;
  const badgeVariant = code === "1000" ? "success" : "warning";

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

        {result && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
