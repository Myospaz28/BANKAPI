import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "../components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

const val = (v) => (v !== null && v !== undefined && v !== "" ? v : "-");

export default function FetchVerifyIfsc() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_cat_id, mas_ser_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

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
    if (loading) return;

    if (!fileNo || !ifsc || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm IFSC Verification",
      html: `
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
      const checkRes = await api.post("api/checkVerifyIfscCache", {
        mas_ser_id,
        mas_cat_id,
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
          showConfirmButton: true,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Use Old Data",
          denyButtonText: "Fetch Fresh (Deduct Credits)",
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

      const executeRes = await api.post("api/executeVerifyIfsc", {
        usr_ser_id,
        mas_cat_id,
        mas_ser_id,
        file_no: fileNo,
        ifsc,
        use_cache: useCache,
      });

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1041") {
        swal.fire("Success", "IFSC Verified Successfully", "success");
      } else {
        swal.fire(
          "Invalid IFSC",
          apiData?.data?.message || "Verification failed",
          "warning",
        );
      }
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };


  const exportPdf1 = () => {
    if (!result) return;

    const bank = result?.data?.bank_ifsc_data || {};
    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";

    const doc = {
      content: [
        {
          text: "IFSC Verification Report",
          style: "header",
        },

        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },

        // ✅ QR Code
        {
          qr: requestId !== "-" ? requestId : "IFSC-VERIFICATION",
          fit: 100,
          alignment: "right",
          margin: [0, 10],
        },

        { text: "IFSC Details", style: "sub" },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["IFSC Code", bank.ifsc_code || "-"],
              ["Bank Name", bank.bank_name || "-"],
              ["Branch", bank.branch_name || "-"],
              ["Address", bank.address || "-"],
              ["City", bank.city || "-"],
              ["State", bank.state || "-"],
              ["MICR Code", bank.micr_code || "-"],
              ["NEFT", bank.payment_channels?.neft || "-"],
              ["IMPS", bank.payment_channels?.imps || "-"],
              ["RTGS", bank.payment_channels?.rtgs || "-"],
              ["UPI", bank.payment_channels?.upi || "-"],
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

    pdfMake.createPdf(doc).download(`IFSC_Verification_${fileNo}.pdf`);
  };
const exportPdf = () => {
  if (!result) return;

  const requestId = result?.request_id || "-";
  const transactionId = result?.transaction_id || "-";

  const data = result?.data || {};
  const bank = data?.bank_ifsc_data || {};

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

  const content = [
    {
      text: "IFSC Verification Report",
      style: "header",
    },

    { text: `File Number: ${fileNo}` },
    { text: `Request ID: ${requestId}` },
    { text: `Transaction ID: ${transactionId}` },

    {
      qr: requestId !== "-" ? requestId : "IFSC-VERIFICATION",
      fit: 70,
      alignment: "right",
      margin: [0, 10],
    },

    section("Status Details"),
    twoCol([
      ["Status Code", data?.code],
      ["Message", data?.message],
    ]),
  ];

  /* 🔹 dynamically process IFSC data */
  Object.entries(bank).forEach(([key, value]) => {
    const label = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      content.push(section(label));
      content.push(
        twoCol(
          Object.entries(value).map(([k, v]) => [
            k
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            v,
          ])
        )
      );
    } else {
      content.push(
        twoCol([
          [label, value],
        ])
      );
    }
  });

  content.push({
    text: `Generated On: ${new Date().toLocaleString()}`,
    margin: [0, 15],
    italics: true,
    fontSize: 9,
  });

  const doc = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content,
    styles: {
      header: { fontSize: 18, bold: true },
      sub: { fontSize: 14, bold: true },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  pdfMake.createPdf(doc).download(`IFSC_Verification_${fileNo}.pdf`);
};

  const code = result?.data?.code;
  const badgeVariant = code === "1041" ? "success" : "warning";
  const bank = result?.data?.bank_ifsc_data;

  /* ================= UI ================= */
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

        {result && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>
              {bank && (
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              )}
            </div>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
