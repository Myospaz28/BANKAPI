
// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchCompanyByName() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};
//   const [consent, setConsent] = useState(false);
//   const [wallet, setWallet] = useState(0);
//   const [name, setName] = useState('');
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

// const handleFetch = async () => {
//   // ===== Validation =====
//   if (!name || name.length < 3) {
//     swal.fire('Validation Error', 'Company name must be at least 3 characters', 'warning');
//     return;
//   }

//   if (!fileNo) {
//     swal.fire('Validation Error', 'File number is required', 'warning');
//     return;
//   }

//   if (!consent) {
//     swal.fire('Consent Required', 'Please give consent to proceed', 'warning');
//     return;
//   }

//   if (wallet < credits) {
//     swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//     return;
//   }

//   // ✅ SAME CONFIRMATION UI AS REFERENCE
//   const confirm = await swal.fire({
//     title: 'Confirm Company Fetch',
//     html: `
//       <p><b>Credits Required:</b> ${credits}</p>
//       <p><b>Available Credits:</b> ${wallet}</p>
//     `,
//     icon: 'question',
//     showCancelButton: true,
//     confirmButtonText: 'Proceed',
//   });

//   if (!confirm.isConfirmed) return;

//   // ===== Continue only after confirmation =====
//   setLoading(true);
//   setResult(null);

//   try {
//     const res = await api.post('api/fetchCompanyByName', {
//       usr_ser_id,
//       name,
//       file_no: fileNo,
//       consent: 'Y',
//     });

//     const { code, message, company_data } = res.data?.data || {};

//     switch (code) {
//       case '1004':
//         setResult(company_data);
//         fetchWallet();
//         swal.fire(
//           'Success',
//           `Company details fetched successfully<br/>
//            Credits Deducted: <b>${credits}</b><br/>
//            Remaining Credits: <b>${wallet - credits}</b>`,
//           'success'
//         );
//         break;

//       case '1005':
//         swal.fire('Info', message, 'info');
//         break;

//       default:
//         swal.fire('Error', message || 'Invalid request', 'error');
//     }
//   } catch (err) {
//     swal.fire('Error', err.response?.data?.message || 'Server error', 'error');
//   } finally {
//     setLoading(false);
//   }
// };


//   /* ===== PDF EXPORT ===== */
//  const exportPdf = () => {
//   if (!result || !result.companies?.length) return;

//   const doc = {
//     content: [
//       { text: 'Company Search Report', style: 'header' },
//       { text: `Search Keyword: ${name}`, marginBottom: 5 },
//       { text: `Total Records: ${result.total_records}`, marginBottom: 10 },

//       {
//         table: {
//           headerRows: 1,
//           widths: [50, 80, '*', 80, 80],
//           body: [
//             // table headers
//             [
//               { text: 'Type', bold: true },
//               { text: 'Company ID', bold: true },
//               { text: 'Name', bold: true },
//               { text: 'State', bold: true },
//               { text: 'Status', bold: true },
//             ],
//             // table rows
//             ...result.companies.map((c) => [
//               c.type || '-',
//               c.company_id || '-',
//               c.name || '-',
//               c.state || '-',
//               c.company_name_status || '-',
//             ]),
//           ],
//         },
//         layout: 'lightHorizontalLines',
//       },
//     ],
//     styles: {
//       header: { fontSize: 18, bold: true, marginBottom: 15 },
//     },
//     defaultStyle: {
//       fontSize: 10,
//     },
//     pageMargins: [40, 40, 40, 40],
//   };

//   pdfMake.createPdf(doc).download(`COMPANY_SEARCH_${fileNo || 'REPORT'}.pdf`);
// };


//  return (
//   <Row>
//     <Col md={12}>
//       <Card body className="mb-3">
//         <Button onClick={() => navigate(-1)}>← Back</Button>
//         <h4 className="mt-3">{service_name}</h4>
//         <p>
//           Credits Required: <b>{credits}</b>
//         </p>
//       </Card>

//       <Card body className="mb-3 text-center">
//         <h6>💰 Wallet Balance</h6>
//         <h2 className="text-success">{wallet}</h2>
//       </Card>

//       <Card body>
//         <Row>
//           <Col md={6}>
//             <Form.Group>
//               <Form.Label>
//                 Company Name <Required />
//               </Form.Label>
//               <Form.Control
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 placeholder="Enter at least 3 characters"
//               />
//             </Form.Group>
//           </Col>

//           <Col md={6}>
//             <Form.Group>
//               <Form.Label>
//                 File Number <Required />
//               </Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Form.Group>
//           </Col>
//         </Row>

//         {/* ✅ SAME CONSENT UI AS PAN */}
//         <Form.Check
//           className="mt-3"
//           label={
//             <>
//               I give consent <Required />
//             </>
//           }
//           checked={consent}
//           onChange={(e) => setConsent(e.target.checked)}
//         />

//         <Button
//           className="mt-3"
//           disabled={loading}
//           onClick={handleFetch}
//         >
//           {loading ? <Spinner size="sm" /> : "Fetch Company"}
//         </Button>
//       </Card>

//       {result && (
//         <Card body className="mt-4">
//           <div className="d-flex justify-content-between">
//             <h5>Company Results</h5>
//             <Button variant="outline-primary" onClick={exportPdf}>
//               Export PDF
//             </Button>
//           </div>

//           <Table bordered className="mt-3" size="sm">
//             <thead>
//               <tr>
//                 <th>Type</th>
//                 <th>Company ID</th>
//                 <th>Name</th>
//                 <th>State</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {result.companies.map((c, i) => (
//                 <tr key={i}>
//                   <td>{c.type}</td>
//                   <td>{c.company_id}</td>
//                   <td>{c.name}</td>
//                   <td>{c.state}</td>
//                   <td>{c.company_name_status}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </Table>
//         </Card>
//       )}
//     </Col>
//   </Row>
// );

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

export default function FetchCompanyByName() {
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
  const [name, setName] = useState("");
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

  /* ================= BADGE ================= */
  const getBadgeVariant = (code) => {
    if (code === "1004") return "success";
    if (code === "1005") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ===== VALIDATION (SAME STYLE AS RC) ===== */
    if (!name || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!name ? "<li>Company Name is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    if (name.trim().length < 3) {
      swal.fire("Validation Error", "Minimum 3 characters required", "warning");
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

    /* ===== CONFIRM (SAME STRUCTURE AS RC) ===== */
    const confirm = await swal.fire({
      title: "Confirm Company Search",
      html: `
        <p><b>Company Name:</b> ${name}</p>
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
        "api/checkCompanyByNameCache",
        {
          mas_ser_id,
          mas_cat_id,
          company_name: name.trim(),
        }
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
      const execRes = await api.post(
        "api/executeCompanyByName",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          company_name: name.trim(),
          file_no: fileNo,
          use_cache: useCache,
        }
      );

      const apiData = normalize(execRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1004") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1005") {
        swal.fire("Info", apiData?.data?.message, "info");
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

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const companies = result?.data?.companies || [];
  const transactionId = safe(result?.transaction_id);
  const requestId = safe(result?.request_id);

  const content = [
    { text: "Company Search Detailed Report", style: "header" },

    { text: `File Number: ${fileNo}` },
    { text: `Search Keyword: ${name}` },
    { text: `Transaction ID: ${transactionId}` },
    { text: `Request ID: ${requestId}` },

    {
      qr: transactionId,
      fit: 80,
      alignment: "right",
      margin: [0, 10],
    },

  
  ];

  /* ================= COMPANY RESULTS ================= */
  if (companies.length > 0) {
    content.push({
      text: "Company Results",
      style: "section",
      margin: [0, 20, 0, 6],
    });

    companies.forEach((company, index) => {
      content.push(
        {
          text: `#${index + 1}`,
          bold: true,
          margin: [0, 8, 0, 4],
        },
        {
          table: {
            widths: ["35%", "65%"],
            body: [
              [{ text: "TYPE", bold: true }, safe(company.type)],
              [
                { text: "COMPANY ID", bold: true },
                safe(company.company_id),
              ],
              [{ text: "NAME", bold: true }, safe(company.name)],
              [{ text: "STATE", bold: true }, safe(company.state)],
              [
                { text: "STATUS", bold: true },
                safe(company.company_name_status),
              ],
              [
                { text: "INCORPORATION DATE", bold: true },
                safe(company.incorporation_date),
              ],
            ],
          },
          layout: "lightHorizontalLines",
        }
      );
    });
  }

  content.push({
    text: `Generated On: ${new Date().toLocaleString()}`,
    margin: [0, 25, 0, 0],
    fontSize: 9,
    italics: true,
  });

  const doc = {
    content,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      section: {
        fontSize: 14,
        bold: true,
      },
    },
    defaultStyle: { fontSize: 10 },
    pageMargins: [40, 40, 40, 40],
  };

  pdfMake.createPdf(doc).download(
    `COMPANY_SEARCH_${fileNo}.pdf`
  );
};

  const code = result?.data?.code;

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
                Company Name <Required />
              </Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => setName(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : "Search Company"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result{" "}
                <Badge bg={getBadgeVariant(code)}>
                  {code}
                </Badge>
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