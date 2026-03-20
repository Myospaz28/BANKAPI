import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Table,
  Badge,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

export default function FetchBankAccountVerifyHybrid() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { mas_cat_id, mas_ser_id, usr_ser_id, service_name, credits } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const normalizeResult = (data) => {
    if (!data) return null;

    // agar string hai to JSON parse karo
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    }

    return data;
  };

  const handleFetch = async () => {
    if (loading) return;

    /* ================= VALIDATION ================= */
    if (!fileNo || !accountNumber || !ifsc || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
        <ul style="text-align:left">
          ${!fileNo ? "<li>File Number is required</li>" : ""}
          ${!accountNumber ? "<li>Account Number is required</li>" : ""}
          ${!ifsc ? "<li>IFSC Code is required</li>" : ""}
          ${!consent ? "<li>Consent is required</li>" : ""}
        </ul>
      `,
        icon: "warning",
      });
      return;
    }

    /* ================= WALLET CHECK ================= */
    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    /* ================= CONFIRMATION ================= */
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
      /* ================= CACHE CHECK ================= */
      const checkRes = await api.post("api/checkBankAccountVerifyCache", {
        mas_ser_id,
        mas_cat_id,
        account_number: accountNumber,
        ifsc,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = checkRes.data.lastFetchedAt
          ? new Date(checkRes.data.lastFetchedAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : "Unknown";

           const cacheConfirm = await swal.fire({
                title: "Previous Data Found",
                html: `Last fetched on: <b>${fetchedDate}</b>`,
                icon: "question",
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: "Use Old Data",
                denyButtonText: "Fetch Fresh",
                   customClass: {
                  confirmButton: "btn-use-old",
                  denyButton: "btn-fetch-fresh",
                },
                  allowOutsideClick: false,
                allowEscapeKey: false,
              });

        if (cacheConfirm.isConfirmed) {
  useCache = true; // Use old data
} else if (cacheConfirm.isDenied) {
  useCache = false; // Fetch fresh
} else {
  // Cancel clicked → STOP execution
  setLoading(false);
  return;
}
      }

      /* ================= EXECUTION ================= */
      const executeRes = await api.post("api/executeBankAccountVerifyHybrid", {
        usr_ser_id,
        mas_cat_id,
        mas_ser_id,
        file_no: fileNo,
        account_number: accountNumber,
        ifsc,
        use_cache: useCache,
      });

      const apiData = executeRes.data?.data;
      // console.log("apidata" , apiData)
      const code = apiData?.data?.code;

      setResult(normalizeResult(apiData));
      fetchWallet();

      /* ================= SUCCESS / STATUS HANDLING ================= */
      if (code === "1000") {
        swal.fire(
          "Success",
          `
        Bank Account Verified Successfully<br/>
        `,
          "success",
        );
      } else if (code === "1028") {
        swal.fire("Invalid Account", "Account verification failed", "warning");
      } else {
        swal.fire(
          "Completed",
          apiData?.data?.message || "Request processed",
          "info",
        );
      }
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Server error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const exportPdf1 = () => {
    if (!result) return;

    const bank = result?.data?.bank_account_data || {};
    const transactionId = result?.transaction_id || "-";

    const doc = {
      content: [
        { text: "Bank Account Verification Report", style: "header" },
        { text: `Request ID: ${result?.request_id}` },
        { text: `Transaction ID: ${transactionId}` },
        { qr: transactionId, fit: 100, alignment: "right" },

        { text: "Bank Details", style: "sub" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Name", bank.name || "-"],
              ["Bank", bank.bank_name || "-"],
              ["Branch", bank.branch || "-"],
              ["Account", bank.account_number || "-"],
              ["IFSC", bank.ifsc || "-"],
              ["Status", bank.account_status || "-"],
            ],
          },
        },

      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      },
    };

    pdfMake.createPdf(doc).download(`Bank_Verification_${fileNo}.pdf`);
  };
const exportPdf = () => {
  if (!result) return;

  const requestId = result?.request_id || "-";
  const transactionId = result?.transaction_id || "-";

  const data = result?.data || {};
  const bank = data?.bank_account_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : String(v);

  const section = (title) => ({
    text: title,
    style: "sub",
    margin: [0, 12, 0, 6],
  });

  const twoCol = (rows) => ({
    table: {
      widths: ["45%", "55%"],
      body: rows.map(([k, v]) => [
        { text: k, bold: true },
        safe(v),
      ]),
    },
    layout: "lightHorizontalLines",
  });

  /* ⭐ dynamic rows builder */
  const buildRows = (obj) =>
    Object.entries(obj || {}).map(([k, v]) => [
      k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      v,
    ]);

  const doc = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [40, 60, 40, 60],

    content: [
      { text: "Bank Account Verification Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Request ID: ${requestId}` },
      { text: `Transaction ID: ${transactionId}` },

      {
        qr: transactionId,
        fit: 70,
        alignment: "right",
        margin: [0, 10],
      },

      section("Status Details"),
      twoCol([
        ["Status Code", data?.code],
        ["Message", data?.message],
      ]),

      section("Bank Account Details"),
      twoCol(buildRows(bank)),

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 15],
        italics: true,
        fontSize: 9,
      },
    ],

    styles: {
      header: { fontSize: 18, bold: true },
      sub: { fontSize: 14, bold: true },
    },

    defaultStyle: {
      fontSize: 10,
    },
  };

  pdfMake.createPdf(doc).download(`Bank_Verification_${fileNo}.pdf`);
};
  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1000") return "success";
    if (code === "1028") return "danger";
    return "warning";
  };

  const JsonToTable = ({ data }) => {
    if (data === null || data === undefined) return <span>-</span>;

    if (typeof data !== "object") {
      return <span style={{ whiteSpace: "pre-wrap" }}>{String(data)}</span>;
    }

    if (Array.isArray(data)) {
      return (
        <Table bordered size="sm" className="mb-2">
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <th style={{ width: "30%" }}>#{index + 1}</th>
                <td>
                  <JsonToTable data={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      );
    }

    return (
      <Table bordered size="sm" className="mb-2">
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <th style={{ width: "30%" }}>
                {key.replaceAll("_", " ").toUpperCase()}
              </th>
              <td>
                <JsonToTable data={value} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
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

        {/* <Card body className="mb-3 text-center">
          <h6>Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card> */}

        <Card body className="mb-4">
          <Row>
            <Col md={4}>
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

            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  Account Number <Required />
                </Form.Label>
                <Form.Control
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter Account Number"
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  IFSC Code <Required />
                </Form.Label>
                <Form.Control
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="Enter IFSC Code"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mt-3">
            <Form.Check
              label={
                <>
                  I give consent <Required />
                </>
              }
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
          </Form.Group>

          <Button
            className="mt-3"
            onClick={() => handleFetch()}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Verify"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result <Badge bg={getBadgeVariant()}>{code}</Badge>
              </h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>
            <h6>Full API Response</h6>
            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <JsonToTable data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
