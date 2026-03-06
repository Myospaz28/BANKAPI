// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) => (v ? v : "-");

// export default function FetchGstinMccCodes() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [gstin, setGstin] = useState("");
//   const [fileNo, setFileNo] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= GUARD + WALLET ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     if (!gstin || !fileNo || !consent) {
//       swal.fire(
//         "Validation Error",
//         "GSTIN, File Number and Consent are required",
//         "warning"
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm GSTIN MCC Fetch",
//       html: `
//         <p><b>GSTIN:</b> ${gstin}</p>
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Wallet Balance:</b> ${wallet}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchGstinMccCodesController", {
//         usr_ser_id,
//         gstin,
//         file_no: fileNo,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;

//       // 🔥 NORMALIZE GRIDLINES RESPONSE
//       const gridData = apiData?.data || apiData;
//       const code = gridData?.code;
//       const message = gridData?.message || "Request failed";

//       if (code === "1015") {
//         setResult(apiData);

//         swal.fire(
//           "Success",
//           `
//           GSTIN MCC codes fetched successfully<br/>
//           Credits Deducted: <b>${credits}</b><br/>
//           Remaining Balance: <b>${wallet - credits}</b>
//           `,
//           "success"
//         );

//         fetchWallet();
//       } else if (code === "1005") {
//         swal.fire("Invalid GSTIN", message, "warning");
//       } else if (code === "1016") {
//         swal.fire("Not Found", message, "info");
//       } else {
//         swal.fire("Failed", message, "warning");
//       }
//     } catch (err) {
//       swal.fire(
//         "Error",
//         err.response?.data?.message || "Server error",
//         "error"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const mccData = result?.data?.gstin_data;

//   /* ================= EXPORT PDF ================= */
//   const exportPdf = () => {
//     if (!mccData) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const doc = {
//       content: [
//         { text: "GSTIN MCC Codes Report", style: "header" },
//         { text: `File Number: ${fileNo}`, marginBottom: 5 },
//         { text: `GSTIN: ${gstin}`, marginBottom: 10 },

//         {
//           table: {
//             widths: ["20%", "80%"],
//             body: [
//               ["MCC Code", "Description"],
//               ...mccData.mcc_code_data.map((m) => [
//                 m.mcc_code,
//                 m.mcc_description,
//               ]),
//             ],
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

//     pdfMake.createPdf(doc).download(`GSTIN_MCC_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p className="text-muted">
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mb-4">
//           <Row>
//             <Col md={4}>
//               <Form.Label>GSTIN <Required /></Form.Label>
//               <Form.Control
//                 value={gstin}
//                 onChange={(e) => setGstin(e.target.value.toUpperCase())}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>File Number <Required /></Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             variant="primary"
//             disabled={loading}
//             onClick={handleFetch}
//           >
//             {loading ? <Spinner size="sm" /> : "Fetch GSTIN MCC Codes"}
//           </Button>
//         </Card>

//         {mccData && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>📄 MCC Codes</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <thead>
//                 <tr>
//                   <th>MCC Code</th>
//                   <th>Description</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {mccData.mcc_code_data.map((m, i) => (
//                   <tr key={i}>
//                     <td>{m.mcc_code}</td>
//                     <td>{m.mcc_description}</td>
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
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "app/components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FetchGstinMccCodes() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [wallet, setWallet] = useState(0); // internal only
  const [gstin, setGstin] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const normalize = (data) => {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ===== VALIDATION ===== */
    if (!gstin || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!gstin ? "<li>GSTIN is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    /* ===== WALLET CHECK ===== */
    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "Not enough wallet balance",
        "error"
      );
      return;
    }

    /* ===== CONFIRMATION ===== */
    const confirm = await swal.fire({
      title: "Confirm GSTIN MCC Fetch",
      html: `
        <p><b>GSTIN:</b> ${gstin}</p>
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
      const checkRes = await api.post(
        "api/checkGstinMccCache",
        { mas_ser_id, mas_cat_id, gstin }
      );

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          icon: "question",
          showCancelButton: true,
          showDenyButton: true,
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

      /* ================= EXECUTE ================= */
      const executeRes = await api.post(
        "api/executeGstinMcc",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          gstin,
          use_cache: useCache,
        }
      );

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      /* ================= RESPONSE HANDLING ================= */
      if (code === "1015") {
        swal.fire({
          title: "Success",
          html: `
            ${apiData?.data?.message}<br/>
            Credits Deducted: <b>${credits}</b>
          `,
          icon: "success",
        });
      } else if (code === "1016") {
        swal.fire("No Records Found", apiData?.data?.message, "info");
      } else if (code === "1005") {
        swal.fire("Invalid GSTIN", apiData?.data?.message, "warning");
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "info");
      }

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
    if (!result) return;

    const transactionId = result?.transaction_id || "-";
    const requestId = result?.request_id || "-";
    const records = result?.data?.gstin_data?.mcc_code_data || [];

    const tableBlock =
      records.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: ["20%", "80%"],
              body: [
                [
                  { text: "MCC Code", bold: true },
                  { text: "Description", bold: true },
                ],
                ...records.map((r) => [
                  r.mcc_code || "-",
                  r.mcc_description || "-",
                ]),
              ],
            },
            layout: "lightHorizontalLines",
            margin: [0, 10],
          }
        : { text: "No MCC codes found", margin: [0, 10] };

    const doc = {
      content: [
        { text: "GSTIN MCC Codes Report", style: "header" },

        { text: `File Number: ${fileNo}` },
        { text: `GSTIN: ${gstin}` },
        { text: `Transaction ID: ${transactionId}` },
        { text: `Request ID: ${requestId}` },

        { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

        { text: "MCC Code Details", style: "sub", margin: [0, 10] },
        tableBlock,
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`GSTIN_MCC_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1015") return "success";
    if (code === "1016") return "warning";
    if (code === "1005") return "danger";
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
            <Col md={4}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>GSTIN <Required /></Form.Label>
              <Form.Control
                value={gstin}
                onChange={(e) =>
                  setGstin(e.target.value.toUpperCase())
                }
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
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN MCC Codes"}
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

            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
