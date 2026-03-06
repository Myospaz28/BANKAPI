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

// export default function FetchGstinByPan() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [pan, setPan] = useState("");
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
//     if (!pan || !fileNo || !consent) {
//       swal.fire(
//         "Validation Error",
//         "PAN, File Number and Consent are required",
//         "warning"
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm GSTIN Fetch by PAN",
//       html: `
//         <p><b>PAN:</b> ${pan}</p>
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
//       const res = await api.post("api/fetchGstinByPanController", {
//         usr_ser_id,
//         pan_number: pan,
//         file_no: fileNo,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code === "1002") {
//         setResult(apiData);
//         swal.fire(
//           "Success",
//           `
//           GSTIN records fetched successfully<br/>
//           Credits Deducted: <b>${credits}</b><br/>
//           Remaining Balance: <b>${wallet - credits}</b>
//           `,
//           "success"
//         );
//         fetchWallet();
//       } else if (code === "1004") {
//         swal.fire("Not Found", "No GSTIN found for given PAN", "info");
//       } else if (code === "1006") {
//         swal.fire("Invalid PAN", "PAN does not exist", "warning");
//       } else {
//         swal.fire("Failed", apiData?.data?.message || "Failed", "warning");
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

//   const records = result?.data?.results || [];

//   /* ================= EXPORT PDF ================= */
//   const exportPdf = () => {
//     if (!records.length) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const tableBlock = (rows) => ({
//       table: {
//         widths: ["35%", "65%"],
//         body: rows.map((r) => [
//           { text: r[0], bold: true },
//           r[1] || "-",
//         ]),
//       },
//       layout: "lightHorizontalLines",
//       marginBottom: 10,
//     });

//     const doc = {
//       content: [
//         { text: "GSTIN Fetch By PAN Report", style: "header" },
//         { text: `File Number: ${fileNo}`, marginBottom: 8 },
//         { text: `PAN: ${pan}`, marginBottom: 10 },

//         { text: "GSTIN Records", style: "sub" },
//         {
//           table: {
//             widths: ["10%", "30%", "20%", "25%", "15%"],
//             body: [
//               ["#", "GSTIN", "Status", "State", "State Code"],
//               ...records.map((r, i) => [
//                 i + 1,
//                 r.document_id,
//                 r.status,
//                 r.state,
//                 r.state_code,
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
//         sub: { fontSize: 14, bold: true, marginTop: 10 },
//       },
//     };

//     pdfMake
//       .createPdf(doc)
//       .download(`GSTIN_BY_PAN_${fileNo}.pdf`);
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
//               <Form.Label>PAN <Required /></Form.Label>
//               <Form.Control
//                 value={pan}
//                 onChange={(e) => setPan(e.target.value.toUpperCase())}
//                 maxLength={10}
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
//             {loading ? <Spinner size="sm" /> : "Fetch GSTIN by PAN"}
//           </Button>
//         </Card>

//         {records.length > 0 && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>📄 GSTIN Records</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered size="sm" className="mt-3">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>GSTIN</th>
//                   <th>Status</th>
//                   <th>State</th>
//                   <th>State Code</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {records.map((r, i) => (
//                   <tr key={i}>
//                     <td>{i + 1}</td>
//                     <td>{safe(r.document_id)}</td>
//                     <td>{safe(r.status)}</td>
//                     <td>{safe(r.state)}</td>
//                     <td>{safe(r.state_code)}</td>
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

// FULL UPDATED FetchGstinByPan COMPONENT
// (Architecture same as GSTIN by Mobile)

import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Badge,
  Table,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "app/components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

const safe = (v) => (v ? v : "-")

export default function FetchGstinByPan() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [pan, setPan] = useState("");
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

  const normalizeResult = (data) => {
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

    /* VALIDATION */
    if (!fileNo || !pan || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!pan ? "<li>PAN is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    /* WALLET CHECK */
    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    /* CONFIRMATION */
    const confirm = await swal.fire({
      title: "Confirm GSTIN Fetch by PAN",
      html: `
        <p><b>PAN:</b> ${pan}</p>
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
      const checkRes = await api.post("api/checkGstinByPanCache", {
        mas_ser_id,
        mas_cat_id,
        pan_number: pan,
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
      const executeRes = await api.post("api/executeGstinByPan", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        pan_number: pan,
        use_cache: useCache,
      });

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;

      setResult(normalizeResult(apiData));
      fetchWallet();

      if (code === "1002") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1006") {
        swal.fire("Invalid PAN", apiData?.data?.message, "warning");
      } else {
        swal.fire("Completed", apiData?.data?.message, "info");
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

  const records = result?.data?.results || [];
  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1002") return "success";
    if (code === "1006") return "warning";
    return "secondary";
  };

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const requestId = result?.request_id || "-";
    const traxtId = result?.transaction_id || "-";

    const tableBlock =
      records.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: ["10%", "30%", "20%", "25%", "15%"],
              body: [
                [
                  { text: "#", bold: true },
                  { text: "GSTIN", bold: true },
                  { text: "Status", bold: true },
                  { text: "State", bold: true },
                  { text: "State Code", bold: true },
                ],
                ...records.map((r, i) => [
                  i + 1,
                  r.document_id,
                  r.status,
                  r.state,
                  r.state_code,
                ]),
              ],
            },
            layout: "lightHorizontalLines",
            margin: [0, 10],
          }
        : {
            text: result?.data?.message || "No GSTIN records found",
            margin: [0, 10],
          };

    const doc = {
      content: [
        { text: "GSTIN Fetch By PAN Report", style: "header" },
        { text: `File Number: ${fileNo}` },
        { text: `PAN: ${pan}` },
        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${traxtId}` },
        { qr: requestId, fit: 80, alignment: "right", margin: [0, 10] },
        { text: "GSTIN Records", style: "sub", margin: [0, 10] },
        tableBlock,
        { text: "Full API Response", style: "sub", margin: [0, 10] },
        { text: JSON.stringify(result, null, 2), fontSize: 8 },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`GSTIN_BY_PAN_${fileNo}.pdf`);
  };

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
        

            <Col md={4}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
                <Col md={4}>
              <Form.Label>
                PAN <Required />
              </Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                maxLength={10}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN"}
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

            {records.length > 0 && (
              <Table bordered size="sm" className="mt-3">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GSTIN</th>
                    <th>Status</th>
                    <th>State</th>
                    <th>State Code</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{safe(r.document_id)}</td>
                      <td>{safe(r.status)}</td>
                      <td>{safe(r.state)}</td>
                      <td>{safe(r.state_code)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
