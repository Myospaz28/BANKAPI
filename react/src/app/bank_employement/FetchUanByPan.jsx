import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "../components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

export default function FetchUanByPan() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [panNumber, setPanNumber] = useState("");
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

  const handleFetch = async () => {
    if (!fileNo || !panNumber || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
      swal.fire(
        "Validation Error",
        "Please enter a valid PAN number (e.g. ABCDE1234F)",
        "warning",
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm UAN Fetch by PAN",
      html: `
        <p><b>PAN Number:</b> ${panNumber.toUpperCase()}</p>
        <p><b>File Number:</b> ${fileNo}</p>
       
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const checkRes = await api.post("api/checkUanPanCache", {
        mas_ser_id,
        mas_cat_id,
        pan_number: panNumber.toUpperCase(),
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN");

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          showConfirmButton: true,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Use Old Data",
          denyButtonText: "Fetch Fresh",
          customClass: {
            confirmButton: "btn-use-old",
            denyButton: "btn-fetch-fresh",
          },
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (cacheConfirm.isConfirmed) useCache = true;
        else if (!cacheConfirm.isDenied) {
          setLoading(false);
          return;
        }
      }

      const res = await api.post("api/executeUanPan", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        pan_number: panNumber.toUpperCase(),
        use_cache: useCache,
      });

      setResult(res.data?.data);
      fetchWallet();
      swal.fire("Completed", "Request processed", "success");
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= EXPORT PDF ================= */
  const exportPdf1 = () => {
    if (!result) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";
    const code = result?.data?.code;
    const message = result?.data?.message || "-";
    const uanNumber = result?.data?.uan_number || "-";

    const tableRows = [
      ["PAN Number", panNumber.toUpperCase()],
      ["UAN Number", uanNumber],
      ["Status Code", code],
      ["Message", message],
      ["Request ID", requestId],
      ["Transaction ID", transactionId],
    ];

    const doc = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: "UAN Fetch by PAN Report", style: "header" },
        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },
        {
          qr: requestId !== "-" ? requestId : "UAN_PAN",
          fit: 80,
          alignment: "right",
          margin: [0, 10],
        },
        { text: "UAN Details", style: "sub", margin: [0, 10, 0, 4] },
        {
          table: {
            widths: ["35%", "65%"],
            body: tableRows.map(([k, v]) => [
              { text: k, bold: true },
              v || "-",
            ]),
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 15],
        },
        { text: "Full API Response", style: "sub", margin: [0, 10] },
        { text: JSON.stringify(result, null, 2), fontSize: 7 },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`UAN_PAN_${panNumber.toUpperCase()}.pdf`);
  };
const exportPdf = () => {
  if (!result) {
    swal.fire("No Data", "Nothing to export", "warning");
    return;
  }

  const requestId = result?.request_id || "-";
  const transactionId = result?.transaction_id || "-";

  const code = result?.data?.code || "-";
  const message = result?.data?.message || "-";
  const uanList = result?.data?.uan_list || [];

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : String(v);

  const section = (title) => ({
    text: title,
    style: "sub",
    margin: [0, 12, 0, 6],
  });

  const twoCol = (rows) => ({
    table: {
      widths: ["40%", "60%"],
      body: rows.map(([k, v]) => [
        { text: k, bold: true },
        safe(v),
      ]),
    },
    layout: "lightHorizontalLines",
  });

  /* ⭐ build UAN list rows */
  const buildUanRows = () => {
    if (!uanList.length) {
      return [["UAN Number", "-"]];
    }

    return uanList.map((u, i) => [
      `UAN ${i + 1}`,
      u,
    ]);
  };

  const doc = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [40, 60, 40, 60],

    content: [
      { text: "UAN Fetch by PAN Report", style: "header" },

      { text: `PAN Number: ${panNumber.toUpperCase()}` },
      { text: `Request ID: ${requestId}` },
      { text: `Transaction ID: ${transactionId}` },

      {
        qr: requestId !== "-" ? requestId : "UAN_PAN",
        fit: 70,
        alignment: "right",
        margin: [0, 10],
      },

      section("Status Details"),
      twoCol([
        ["Status Code", code],
        ["Message", message],
      ]),

      section("UAN Details"),
      twoCol(buildUanRows()),

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

  pdfMake.createPdf(doc).download(
    `UAN_PAN_${panNumber.toUpperCase()}.pdf`
  );
};
  const code = result?.data?.code;
  const badgeVariant =
    code === "1029" ? "success" : code === "1030" ? "warning" : "secondary";

  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mt-3">
          <Row>
            <Col md={6}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
                placeholder="Enter file number"
              />
            </Col>

            <Col md={6}>
              <Form.Label>
                PAN Number <Required />
              </Form.Label>
              <Form.Control
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="Enter PAN number (e.g. ABCDE1234F)"
                maxLength={10}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent to fetch UAN details linked to this PAN number"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch UAN by PAN"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              {code === "1029" && (
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              )}
            </div>

            {/* UAN Number quick view */}
            {code === "1029" && result?.data?.uan_number && (
              <div className="mt-3">
                <h6>UAN Details</h6>
                <table className="table table-bordered w-50">
                  <tbody>
                    <tr>
                      <th>PAN Number</th>
                      <td>{panNumber.toUpperCase()}</td>
                    </tr>
                    <tr>
                      <th>UAN Number</th>
                      <td>{result.data.uan_number}</td>
                    </tr>
                    <tr>
                      <th>Message</th>
                      <td>{result.data.message}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {code === "1030" && (
              <div className="mt-3 text-warning">
                <p>
                  {result?.data?.message || "No UAN linked or invalid PAN."}
                </p>
              </div>
            )}

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
