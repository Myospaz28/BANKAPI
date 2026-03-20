

// import React, { useState, useEffect } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchVoterOCR() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileFront, setFileFront] = useState(null);
//   const [fileBack, setFileBack] = useState(null);
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

//   /* ================= OCR DATA ================= */
//   const ocr = result?.data?.ocr_data || {};

//   const normalizedOcr = {
//     id_number: ocr.id_number || '-',
//     name: ocr.name || '-',
//     date_of_birth: ocr.date_of_birth || '-',
//     issue_date: ocr.issue_date || '-',
//     gender: ocr.gender || '-',
//     state: ocr.state || '-',
//     address: ocr.address || '-',
//   };

//   /* ================= FETCH OCR ================= */
//   const handleFetch = async () => {
//     if (!fileFront || !fileNo || !consent) {
//       swal.fire('Validation Error', 'Required fields missing', 'warning');
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     const formData = new FormData();
//     formData.append('usr_ser_id', usr_ser_id);
//     formData.append('file_no', fileNo);
//     formData.append('file_front', fileFront);
//     if (fileBack) formData.append('file_back', fileBack);
//     formData.append('consent', 'Y');

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/voterOcr', formData);
//       const code = res.data?.data?.data?.code;

//       if (code !== '1008') {
//         swal.fire('Failed', res.data?.data?.data?.message, 'error');
//         return;
//       }

//       setResult(res.data.data);
//       fetchWallet();
//       swal.fire('Success', 'Voter ID OCR extracted', 'success');
//     } catch (err) {
//       swal.fire('Error', err.response?.data?.message, 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const safe = (v) =>
//     v === undefined || v === null || v === '' ? '-' : String(v);

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const o = normalizedOcr;

//     const doc = {
//       content: [
//         { text: 'Voter ID OCR Report', style: 'header' },

//         { text: `Request ID: ${safe(result.request_id)}` },
//         { text: `Transaction ID: ${safe(result.transaction_id)}` },
//         { text: `Status: ${safe(result.status)}` },
//         { text: `Message: ${safe(result.data?.message)}` },
//         { text: `File Number: ${safe(fileNo)}`, marginBottom: 10 },

//         {
//           table: {
//             widths: ['35%', '65%'],
//             body: [
//               ['Voter ID Number', safe(o.id_number)],
//               ['Name', safe(o.name)],
//               ['Date of Birth', safe(o.date_of_birth)],
//               ['Issue Date', safe(o.issue_date)],
//               ['Gender', safe(o.gender)],
//               ['State', safe(o.state)],
//               ['Address', safe(o.address)],
//             ],
//           },
//           layout: 'lightHorizontalLines',
//         },

//         {
//           text: '\nDisclaimer: This document is generated using OCR and may contain inaccuracies.',
//           fontSize: 9,
//           italics: true,
//           color: 'gray',
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//       defaultStyle: { fontSize: 11 },
//     };

//     pdfMake.createPdf(doc).download(`VOTER_OCR_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body>
//           <Form.Group>
//             <Form.Label>
//               Front Image <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               onChange={(e) => setFileFront(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Back Image</Form.Label>
//             <Form.Control
//               type="file"
//               onChange={(e) => setFileBack(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>
//               File Number <Required />
//             </Form.Label>
//             <Form.Control
//               value={fileNo}
//               onChange={(e) => setFileNo(e.target.value)}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-2"
//             label={
//               <>
//                 I give consent <Required />
//               </>
//             }
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : 'Upload & Extract'}
//           </Button>
//         </Card>

//         {result && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5 className="mb-0">Voter Details</h5>

//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 {/* <tr><th>Request ID</th><td>{safe(result.request_id)}</td></tr>
//                 <tr><th>Transaction ID</th><td>{safe(result.transaction_id)}</td></tr>
//                 <tr><th>Status</th><td>{safe(result.status)}</td></tr> */}
//                 <tr>
//                   <th>Message</th>
//                   <td>{safe(result.data?.message)}</td>
//                 </tr>
//                 <tr>
//                   <th>Voter ID</th>
//                   <td>{safe(normalizedOcr.id_number)}</td>
//                 </tr>
//                 <tr>
//                   <th>Name</th>
//                   <td>{safe(normalizedOcr.name)}</td>
//                 </tr>
//                 <tr>
//                   <th>DOB</th>
//                   <td>{safe(normalizedOcr.date_of_birth)}</td>
//                 </tr>
//                 <tr>
//                   <th>Issue Date</th>
//                   <td>{safe(normalizedOcr.issue_date)}</td>
//                 </tr>
//                 <tr>
//                   <th>Gender</th>
//                   <td>{safe(normalizedOcr.gender)}</td>
//                 </tr>
//                 <tr>
//                   <th>State</th>
//                   <td>{safe(normalizedOcr.state)}</td>
//                 </tr>
//                 <tr>
//                   <th>Address</th>
//                   <td>{safe(normalizedOcr.address)}</td>
//                 </tr>
//                 {/* <tr><th>Timestamp</th><td>{safe(result.timestamp)}</td></tr> */}
//                 {/* <tr><th>API Path</th><td>{safe(result.path)}</td></tr> */}
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

export default function FetchVoterOCR() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [fileFront, setFileFront] = useState(null);
  const [fileBack, setFileBack] = useState(null);
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, []);

  const handleFetch = async () => {
    if (!fileFront || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileFront ? "<li>Front Image required</li>" : ""}
            ${!fileNo ? "<li>File Number required</li>" : ""}
            ${!consent ? "<li>Consent required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Voter OCR",
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
    formData.append("file_front", fileFront);
    if (fileBack) formData.append("file_back", fileBack);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/voterOcr", formData);

      const full = res.data?.data;
      const apiData = full?.data;
console.log("apiData" , apiData)
      setResult(full);

      if (apiData?.code === "1008") {
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

  const exportPdf1 = () => {
    if (!result) return;

    const txn = result?.transaction_id || "-";
    const reqId = result?.request_id || "-";
    const d = result?.data?.ocr_data || {};

    const safe = (v) =>
      v === undefined || v === null || v === "" ? "-" : v;

    const doc = {
      content: [
        { text: "Voter ID OCR Report", style: "header" },

        { text: `File Number: ${fileNo}` },
        { text: `Transaction ID: ${txn}` },
        { text: `Request ID: ${reqId}` },

        { qr: txn, fit: 80, alignment: "right", margin: [0, 10] },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Voter ID", safe(d.id_number)],
              ["Name", safe(d.name)],
              ["DOB", safe(d.date_of_birth)],
              ["Issue Date", safe(d.issue_date)],
              ["Gender", safe(d.gender)],
              ["State", safe(d.state)],
              ["Address", safe(d.address)],
            ],
          },
          layout: "lightHorizontalLines",
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          margin: [0, 15],
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`VOTER_OCR_${fileNo}.pdf`);
  };
const exportPdf = () => {
  if (!result) return;

  const txn = result?.transaction_id || "-";
  const reqId = result?.request_id || "-";
  const d = result?.data?.ocr_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const doc = {
    content: [
      { text: "Voter ID OCR Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Transaction ID: ${txn}` },
      { text: `Request ID: ${reqId}` },

      { qr: txn, fit: 80, alignment: "right", margin: [0, 10] },

      {
        table: {
          widths: ["40%", "60%"],
          body: [
            ["Voter ID Number", safe(d.id_number)],
            ["Name", safe(d.name)],
            ["Guardian Name", safe(d.guardian_name)],   // ⭐ added
            ["Date of Birth", safe(d.date_of_birth)],
            ["Gender", safe(d.gender)],
            ["Issue Date", safe(d.issue_date)],
            ["State", safe(d.state)],
            ["Address", safe(d.address)],
          ],
        },
        layout: "lightHorizontalLines",
      },

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 15],
        fontSize: 9,
        italics: true,
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true },
    },
    defaultStyle: {
      fontSize: 9,
    },
  };

  pdfMake.createPdf(doc).download(`VOTER_OCR_${fileNo}.pdf`);
};
  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1008") return "success";
    return "secondary";
  };

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
              <Form.Control value={fileNo} onChange={(e)=>setFileNo(e.target.value)}/>
            </Col>
            <Col md={4}>
              <Form.Label>Front Image <Required /></Form.Label>
              <Form.Control type="file" onChange={(e)=>setFileFront(e.target.files[0])}/>
            </Col>

            <Col md={4}>
              <Form.Label>Back Image</Form.Label>
              <Form.Control type="file" onChange={(e)=>setFileBack(e.target.files[0])}/>
            </Col>

      
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e)=>setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm"/> : "Run Voter OCR"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>Result <Badge bg={getBadgeVariant()}>{code}</Badge></h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <div style={{maxHeight:400,overflow:"auto"}}>
              <JsonTableViewer data={result}/>
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}