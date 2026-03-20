

// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useNavigate, useLocation } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// /* ===== PDF ===== */
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function ChequeOCR() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [file, setFile] = useState(null);
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= INIT ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, [usr_ser_id, navigate]);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= SUBMIT ================= */
//   const handleOCR = async () => {
//     if (!file || !fileNo || !consent) {
//       swal.fire("Validation Error", "All required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     /* ===== CONFIRM ALERT (AADHAAR STYLE) ===== */
//     const confirm = await swal.fire({
//       title: "Confirm Cheque OCR",
//       html: `
//         <p><b>File No:</b> ${fileNo}</p>
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Wallet Balance:</b> ${wallet}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     const formData = new FormData();
//     formData.append("usr_ser_id", usr_ser_id);
//     formData.append("file_no", fileNo);
//     formData.append("file_front", file);
//     formData.append("consent", "Y");

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchChequeOcrController", formData);

//       const apiData = res.data?.data?.data;
//       const code = apiData?.code;

//       if (code !== "1030") {
//         swal.fire(
//           "OCR Failed",
//           apiData?.message || "Unable to process cheque",
//           "error",
//         );
//         return;
//       }

//       setResult(apiData);

//       /* ===== SUCCESS ALERT (AADHAAR STYLE) ===== */
//       swal.fire(
//         "Success",
//         `
//         Cheque OCR completed successfully<br/>
//         Credits Deducted: <b>${credits}</b><br/>
//         Remaining Wallet: <b>${wallet - credits}</b>
//         `,
//         "success",
//       );

//       fetchWallet();
//     } finally {
//       setLoading(false);
//     }
//   };

//   const ocr = result?.ocr_data;

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     if (!ocr) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const rows = Object.entries(ocr).map(([k, v]) => [
//       k.replaceAll("_", " ").toUpperCase(),
//       v || "-",
//     ]);

//     const doc = {
//       content: [
//         { text: "Cheque OCR Report", style: "header" },
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: rows,
//           },
//           layout: "lightHorizontalLines",
//         },
//         {
//           text: `Generated On: ${new Date().toLocaleString()}`,
//           marginTop: 15,
//           fontSize: 9,
//           italics: true,
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`Cheque_OCR_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name || "Cheque OCR"}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         {/* WALLET */}
//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         {/* FORM */}
//         <Card body className="mb-4">
//           <Form.Group>
//             <Form.Label>
//               File Number <Required />
//             </Form.Label>
//             <Form.Control
//               value={fileNo}
//               onChange={(e) => setFileNo(e.target.value)}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>
//               Cheque Image / PDF <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               accept=".jpg,.jpeg,.png,.pdf"
//               onChange={(e) => setFile(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleOCR} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Run Cheque OCR"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {ocr && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>OCR Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 {Object.entries(ocr).map(([k, v]) => (
//                   <tr key={k}>
//                     <th>{k.replaceAll("_", " ")}</th>
//                     <td>{v || "-"}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </Table>
//           </Card>
//         )}
//       </Col>
//     </Row>
//   );
// }


import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Badge,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "app/components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function ChequeOCR() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [file, setFile] = useState(null);
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, []);

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!file || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!file ? "<li>Cheque required</li>" : ""}
            ${!fileNo ? "<li>File Number required</li>" : ""}
            ${!consent ? "<li>Consent required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Cheque OCR",
      html: `<p><b>File Number:</b> ${fileNo}</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    const formData = new FormData();
    formData.append("usr_ser_id", usr_ser_id);
    formData.append("mas_ser_id", mas_ser_id);
    formData.append("mas_cat_id", mas_cat_id);
    formData.append("file_no", fileNo);
    formData.append("file_front", file);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post(
        "api/fetchChequeOcrController",
        formData
      );

      const full = res.data?.data;
      const apiData = full?.data;
// console.log("first" , full)
      setResult(full);

      if (apiData?.code === "1030") {
        swal.fire({
          title: "Success",
          html: apiData?.message || "OCR extracted",
          icon: "success",
        });
      } else {
        swal.fire({
          title: "Completed",
          html: apiData?.message || "Request processed",
          icon: "info",
        });
      }
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Service unavailable",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */
const exportPdf = () => {
  if (!result) return;

  const txn = result?.transaction_id || "-";
  const reqId = result?.request_id || "-";

  const code = result?.data?.code || "-";
  const message = result?.data?.message || "-";
  const ocr = result?.data?.ocr_data || {};

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

  /* ⭐ dynamic OCR rows */
  const rows = Object.entries(ocr).map(([k, v]) => [
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
      { text: "Cheque OCR Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Transaction ID: ${txn}` },
      { text: `Request ID: ${reqId}` },

      {
        qr: txn,
        fit: 70,
        alignment: "right",
        margin: [0, 10],
      },

      section("Extraction Status"),
      twoCol([
        ["Status Code", code],
        ["Message", message],
      ]),

      section("Cheque Details"),
      twoCol(rows),

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 15],
        fontSize: 9,
        italics: true,
      },
    ],

    styles: {
      header: { fontSize: 18, bold: true },
      sub: { fontSize: 14, bold: true },
    },

    defaultStyle: { fontSize: 10 },
  };

  pdfMake
    .createPdf(doc)
    .download(`CHEQUE_OCR_${fileNo}.pdf`);
};

  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1030") return "success";
    return "secondary";
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
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
                Cheque <Required />
              </Form.Label>
              <Form.Control
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            className="mt-3"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Run Cheque OCR"}
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

            <div style={{ maxHeight: 400, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}