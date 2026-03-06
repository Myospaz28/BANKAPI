
// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchTan() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [tan, setTan] = useState('');
//   const [fileNo, setFileNo] = useState('');
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get('api/getLoggedInUserWallet');
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   const handleFetch = async () => {
//     // Validation first
//     if (!tan || !fileNo || !consent) {
//       swal.fire(
//         'Validation Error',
//         'All fields & consent are required',
//         'warning',
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     // ✅ Confirm with the user before proceeding
//     const confirm = await swal.fire({
//       title: 'Confirm TAN Fetch',
//       html: `
//       <p><b>Credits Required:</b> ${credits}</p>
//       <p><b>Available Credits:</b> ${wallet}</p>
//     `,
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Proceed',
//       cancelButtonText: 'Cancel',
//     });

//     if (!confirm.isConfirmed) return; // User cancelled

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/fetchTan', {
//         usr_ser_id,
//         tan,
//         file_no: fileNo,
//         consent: consent ? 'Y' : 'N',
//       });

//       const code = res.data?.data?.code;

//       if (code !== '1012') {
//         swal.fire('Failed', res.data?.data?.message, 'warning');
//         return;
//       }

//       // Include request_id and transaction_id in result
//       setResult({
//         request_id: res.data?.request_id,
//         transaction_id: res.data?.transaction_id,
//         message: res.data?.data?.message,
//         ...res.data?.data?.tan_details,
//       });

//       fetchWallet();

//       swal.fire('Success', 'TAN verified successfully', 'success');
//     } catch (err) {
//       swal.fire(
//         'Error',
//         err.response?.data?.message || 'Server error',
//         'error',
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const tableBody = [
//       [
//         { text: 'FIELD', bold: true },
//         { text: 'VALUE', bold: true },
//       ],
//       ...Object.entries(result).map(([key, value]) => [
//         {
//           text: key.replace(/_/g, ' ').toUpperCase(),
//           margin: [0, 5, 0, 5],
//         },
//         {
//           text: Array.isArray(value) ? value.join(', ') : value || '-',
//           margin: [0, 5, 0, 5],
//         },
//       ]),
//     ];

//     const docDefinition = {
//       content: [
//         {
//           text: 'TAN VERIFICATION REPORT',
//           style: 'header',
//           alignment: 'center',
//         },
//         {
//           text: `File No: ${fileNo}`,
//           margin: [0, 10, 0, 10],
//         },
//         {
//           table: {
//             widths: ['35%', '65%'],
//             body: tableBody,
//           },
//           layout: 'lightHorizontalLines',
//         },
//       ],
//       styles: {
//         header: {
//           fontSize: 18,
//           bold: true,
//           marginBottom: 15,
//         },
//       },
//       footer: function (currentPage, pageCount) {
//         return {
//           text: `Page ${currentPage} of ${pageCount}`,
//           alignment: 'right',
//           margin: [0, 0, 20, 0],
//           fontSize: 9,
//         };
//       },
//     };

//     pdfMake.createPdf(docDefinition).download(`TAN_${fileNo}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         {/* ===== HEADER ===== */}
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         {/* ===== WALLET ===== */}
//         <Card body className="mt-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         {/* ===== FORM ===== */}
//         <Card body className="mt-3">
//           <Row className="g-3">
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   TAN <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={tan}
//                   onChange={(e) => setTan(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   File No <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={fileNo}
//                   onChange={(e) => setFileNo(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             type="checkbox"
//             label={
//               <>
//                 I give consent <Required />
//               </>
//             }
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : 'Verify TAN'}
//           </Button>
//         </Card>

//         {/* ===== RESULT ===== */}
//         {result && (
//           <>
//             {/* ===== RESULT HEADER + EXPORT ===== */}
//             <Card body className="mt-4">
//               <div className="d-flex justify-content-between align-items-center">
//                 <h5 className="mb-0">TAN Verification Result</h5>
//                 <Button variant="outline-primary" onClick={exportPdf}>
//                   Export PDF
//                 </Button>
//               </div>
//             </Card>

//             {/* ===== RESULT TABLE ===== */}
//             <Card body className="mt-2">
//               <Table bordered size="sm">
//                 <tbody>
//                   {Object.entries(result).map(([key, value]) => (
//                     <tr key={key}>
//                       <th style={{ width: '35%' }}>
//                         {key.replace(/_/g, ' ').toUpperCase()}
//                       </th>
//                       <td>
//                         {Array.isArray(value) ? value.join(', ') : value || '-'}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </Table>
//             </Card>
//           </>
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

export default function FetchTan() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [wallet, setWallet] = useState(0);
  const [tan, setTan] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
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

  const getBadgeVariant = (code) => {
    if (code === "1012") return "success";
    if (code === "1013") return "danger";
    return "secondary";
  };

  /* ================= FETCH ================= */

  const handleFetch = async () => {
    if (loading) return;

    if (!tan || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!tan ? "<li>TAN is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "Not enough wallet balance",
        "error"
      );
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm TAN Verification",
      html: `
        <p><b>TAN:</b> ${tan}</p>
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
      /* ===== CACHE CHECK ===== */

      const checkRes = await api.post("api/checkTanCache", {
        mas_ser_id,
        mas_cat_id,
        tan,
      });

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

      /* ===== EXECUTE ===== */

      const executeRes = await api.post("api/executeTan", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        tan,
        use_cache: useCache,
      });

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1012") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1013") {
        swal.fire("Invalid TAN", apiData?.data?.message, "warning");
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

  /* ================= PDF ================= */

  const exportPdf = () => {
    if (!result) return;

    const transactionId = result?.transaction_id || "-";
    const requestId = result?.request_id || "-";
    const tanDetails = result?.data?.tan_details || {};

    const safe = (v) =>
      v === undefined || v === null || v === "" ? "-" : v;

    const doc = {
      content: [
        { text: "TAN Verification Detailed Report", style: "header" },

        { text: `File Number: ${fileNo}` },
        { text: `TAN: ${safe(tanDetails.tan)}` },
        { text: `Transaction ID: ${transactionId}` },
        { text: `Request ID: ${requestId}` },

        {
          qr: transactionId,
          fit: 80,
          alignment: "right",
          margin: [0, 10],
        },

        { text: "TAN Details", style: "section" },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Company Name", safe(tanDetails.company_name)],
              ["Address", safe(tanDetails.address)],
              ["State", safe(tanDetails.state)],
              ["Pincode", safe(tanDetails.pincode)],
              ["Mobile", safe(tanDetails.mobile_number)],
              ["Email", (tanDetails.email || []).join(", ") || "-"],
              ["Allotment Date", safe(tanDetails.tan_allotment_date)],
            ],
          },
          layout: "lightHorizontalLines",
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          margin: [0, 15, 0, 0],
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        section: { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
      },
      defaultStyle: { fontSize: 10 },
    };

    pdfMake.createPdf(doc).download(`TAN_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body>
          <Row>

                  <Col md={6}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>


            <Col md={6}>
              <Form.Label>TAN <Required /></Form.Label>
              <Form.Control
                value={tan}
                onChange={(e) => setTan(e.target.value.toUpperCase())}
              />
            </Col>

      
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Verify TAN"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>
                Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
              </h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <div style={{ maxHeight: 350, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}