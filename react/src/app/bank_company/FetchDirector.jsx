
// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchDirector() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};
//   const [consent, setConsent] = useState(false);
//   const [wallet, setWallet] = useState(0);
//   const [din, setDin] = useState('');
//   const [fileNo, setFileNo] = useState('');
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
//     // ===== Validation =====
//     if (!din || !fileNo || !consent) {
//       swal.fire(
//         'Validation Error',
//         'DIN, File No and Consent are required',
//         'warning',
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     // ✅ SAME CONFIRMATION UI (EXACT MATCH)
//     const confirm = await swal.fire({
//       title: 'Confirm Director Fetch',
//       html: `
//       <p><b>Credits Required:</b> ${credits}</p>
//       <p><b>Available Credits:</b> ${wallet}</p>
//     `,
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Proceed',
//     });

//     if (!confirm.isConfirmed) return;

//     // ===== Proceed after confirmation =====
//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/fetchDirector', {
//         usr_ser_id,
//         din,
//         file_no: fileNo,
//         consent: 'Y',
//       });

//       const data = res.data?.data?.data;
//       const code = data?.code;

//       if (code !== '1002') {
//         swal.fire(
//           'Failed',
//           data?.message || 'Unable to fetch director',
//           'warning',
//         );
//         return;
//       }

//       setResult(data.director_data);
//       fetchWallet();

//       // ✅ SAME SUCCESS UI PATTERN
//       swal.fire(
//         'Success',
//         `Director details fetched successfully<br/>
//        Credits Deducted: <b>${credits}</b><br/>
//        Remaining Credits: <b>${wallet - credits}</b>`,
//         'success',
//       );
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

//   const exportPdf = () => {
//     if (!result) {
//       swal.fire('No Data', 'Nothing to export', 'warning');
//       return;
//     }

//     const safe = (val) =>
//       val !== undefined && val !== null && val !== '' ? val : '-';

//     const doc = {
//       content: [
//         { text: 'Director Details Report', style: 'header' },
//         { text: `DIN: ${safe(result.din)}` },
//         { text: `Name: ${safe(result.name)}`, marginBottom: 10 },

//         // ===== COMPANY ASSOCIATIONS =====
//         ...(result.company_details?.length
//           ? [
//               { text: 'Company Associations', style: 'section' },
//               {
//                 table: {
//                   headerRows: 1,
//                   widths: ['25%', '35%', '20%', '20%'],
//                   body: [
//                     ['CIN', 'Company Name', 'Begin Date', 'Status'],
//                     ...result.company_details.map((c) => [
//                       safe(c.cin),
//                       safe(c.company_name),
//                       safe(c.begin_date),
//                       safe(c.active_compliance),
//                     ]),
//                   ],
//                 },
//                 layout: 'lightHorizontalLines',
//               },
//             ]
//           : []),

//         // ===== LLP ASSOCIATIONS =====
//         ...(result.llp_details?.length
//           ? [
//               { text: 'LLP Associations', style: 'section' },
//               {
//                 table: {
//                   headerRows: 1,
//                   widths: ['30%', '40%', '30%'],
//                   body: [
//                     ['LLPIN', 'LLP Name', 'Begin Date'],
//                     ...result.llp_details.map((l) => [
//                       safe(l.llpin),
//                       safe(l.llp_name),
//                       safe(l.begin_date),
//                     ]),
//                   ],
//                 },
//                 layout: 'lightHorizontalLines',
//               },
//             ]
//           : []),
//       ],

//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 15 },
//         section: { fontSize: 14, bold: true, marginTop: 15 },
//       },
//       defaultStyle: {
//         fontSize: 10,
//       },
//     };

//     pdfMake.createPdf(doc).download(`DIRECTOR_${fileNo || 'REPORT'}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mt-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mt-3">
//           <Row className="g-3">
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   DIN <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={din}
//                   onChange={(e) => setDin(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   File Number <Required />
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
//             {loading ? <Spinner size="sm" /> : 'Fetch Director'}
//           </Button>
//         </Card>

//         {result && (
//           <Card body className="mt-4">
//             {/* HEADER ROW (SAME AS COMPANY UI) */}
//             <div className="d-flex justify-content-between">
//               <h5>Director Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             {/* DIRECTOR BASIC INFO */}
//             <p className="mt-3">
//               <b>DIN:</b> {result.din}
//             </p>
//             <p>
//               <b>Name:</b> {result.name}
//             </p>

//             {/* COMPANY ASSOCIATIONS */}
//             {result.company_details?.length > 0 && (
//               <>
//                 <h6 className="mt-3">Company Associations</h6>
//                 <Table bordered className="mt-2" size="sm">
//                   <thead>
//                     <tr>
//                       <th>CIN</th>
//                       <th>Company Name</th>
//                       <th>Begin Date</th>
//                       <th>Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {result.company_details.map((c, i) => (
//                       <tr key={i}>
//                         <td>{c.cin}</td>
//                         <td>{c.company_name}</td>
//                         <td>{c.begin_date}</td>
//                         <td>{c.active_compliance}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </Table>
//               </>
//             )}

//             {/* LLP ASSOCIATIONS */}
//             {result.llp_details?.length > 0 && (
//               <>
//                 <h6 className="mt-3">LLP Associations</h6>
//                 <Table bordered className="mt-2" size="sm">
//                   <thead>
//                     <tr>
//                       <th>LLPIN</th>
//                       <th>LLP Name</th>
//                       <th>Begin Date</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {result.llp_details.map((l, i) => (
//                       <tr key={i}>
//                         <td>{l.llpin}</td>
//                         <td>{l.llp_name}</td>
//                         <td>{l.begin_date}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </Table>
//               </>
//             )}
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
  Table,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "app/components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FetchDirector() {
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
  const [din, setDin] = useState("");
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
    if (code === "1002") return "success";
    if (code === "1003") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */

  const handleFetch = async () => {
    if (loading) return;

    if (!din || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!din ? "<li>DIN is required</li>" : ""}
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
      title: "Confirm Director Fetch",
      html: `
        <p><b>DIN:</b> ${din}</p>
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
        "api/checkDirectorCache",
        { mas_ser_id, mas_cat_id, din }
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
        "api/executeDirectorFetch",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          din,
          use_cache: useCache,
        }
      );

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1002") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1003") {
        swal.fire("DIN Not Found", apiData?.data?.message, "warning");
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
  const director = result?.data?.director_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const doc = {
    content: [
      { text: "Director Detailed Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `DIN: ${safe(director.din)}` },
      { text: `Transaction ID: ${transactionId}` },
      { text: `Request ID: ${requestId}` },

      {
        qr: transactionId,
        fit: 80,
        alignment: "right",
        margin: [0, 10],
      },

      { text: "Director Information", style: "section" },

      {
        table: {
          widths: ["40%", "60%"],
          body: [
            ["DIN", safe(director.din)],
            ["Name", safe(director.name)],
          ],
        },
        layout: "lightHorizontalLines",
      },

      ...(director.company_details?.length
        ? [
            { text: "Company Associations", style: "section" },
            {
              table: {
                headerRows: 1,
                widths: ["25%", "35%", "20%", "20%"],
                body: [
                  ["CIN", "Company Name", "Begin Date", "Status"],
                  ...director.company_details.map((c) => [
                    safe(c.cin),
                    safe(c.company_name),
                    safe(c.begin_date),
                    safe(c.active_compliance),
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),

      ...(director.llp_details?.length
        ? [
            { text: "LLP Associations", style: "section" },
            {
              table: {
                headerRows: 1,
                widths: ["30%", "40%", "30%"],
                body: [
                  ["LLPIN", "LLP Name", "Begin Date"],
                  ...director.llp_details.map((l) => [
                    safe(l.llpin),
                    safe(l.llp_name),
                    safe(l.begin_date),
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),

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

  pdfMake.createPdf(doc).download(`DIRECTOR_${fileNo}.pdf`);
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
              <Form.Label>DIN <Required /></Form.Label>
              <Form.Control
                value={din}
                onChange={(e) => setDin(e.target.value.toUpperCase())}
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
            {loading ? <Spinner size="sm" /> : "Fetch Director"}
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