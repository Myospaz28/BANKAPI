
// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchCompany() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [companyId, setCompanyId] = useState('');
//   const [fileNo, setFileNo] = useState('');
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//   }, [usr_ser_id, navigate]);

//   useEffect(() => {
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     try {
//       const res = await api.get('api/getLoggedInUserWallet');
//       setWallet(Number(res.data?.data?.wallet_amount || 0));
//     } catch {
//       setWallet(0);
//     }
//   };

//   const handleFetch = async () => {
//     if (!companyId || !fileNo || !consent) {
//       swal.fire(
//         'Validation Error',
//         'Company ID, File No, and Consent are required',
//         'warning',
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     const confirm = await swal.fire({
//       title: 'Confirm Company Fetch',
//       html: `<p><b>Credits Required:</b> ${credits}</p>
//              <p><b>Available Credits:</b> ${wallet}</p>`,
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Proceed',
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/fetchCompany', {
//         usr_ser_id,
//         company_id: companyId.toUpperCase(),
//         file_no: fileNo.toUpperCase(),
//         consent: 'Y',
//       });

//       const data = res.data?.data;

//       if (data?.code === '1001') {
//         swal.fire('Not Found', data.message, 'info');
//         return;
//       }

//       if (data?.code !== '1000') {
//         swal.fire(
//           'Failed',
//           data.message || 'Unable to fetch company details',
//           'warning',
//         );
//         return;
//       }

//       setResult(data.company_data);

//       swal.fire(
//         'Success',
//         `Company details fetched successfully<br/>
//         Credits Deducted: <b>${credits}</b><br/>
//         Remaining Credits: <b>${wallet - credits}</b>`,
//         'success',
//       );

//       fetchWallet();
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
//     if (!result?.company_details) {
//       swal.fire('No Data', 'Nothing to export', 'warning');
//       return;
//     }

//     const comp = result.company_details;

//     const doc = {
//       content: [
//         { text: 'Company Details Report', style: 'header' },
//         {
//           table: {
//             widths: ['35%', '65%'],
//             body: Object.entries(comp).map(([key, val]) => [
//               { text: key.replace(/_/g, ' ').toUpperCase(), bold: true },
//               val,
//             ]),
//           },
//           layout: 'lightHorizontalLines',
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

//     pdfMake.createPdf(doc).download(`Company_${companyId}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button variant="primary" onClick={() => navigate(-1)}>
//             ← Back
//           </Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p className="text-muted">
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         {/* WALLET */}
//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         {/* FORM */}
//         {/* FORM */}
//         <Card body className="mb-4">
//           <Row className="g-3">
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   Company ID <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={companyId}
//                   onChange={(e) => setCompanyId(e.target.value.toUpperCase())}
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
//             {loading ? <Spinner size="sm" /> : 'Fetch Company'}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {result?.company_details && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>Company Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 {Object.entries(result.company_details).map(([key, val]) => (
//                   <tr key={key}>
//                     <th>{key.replace(/_/g, ' ').toUpperCase()}</th>
//                     <td>{val}</td>
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

export default function FetchCompany() {
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
  const [companyId, setCompanyId] = useState("");
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
    if (code === "1000") return "success";
    if (code === "1001") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    if (!companyId || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!companyId ? "<li>Company ID is required</li>" : ""}
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
      title: "Confirm Company Fetch",
      html: `
        <p><b>Company ID:</b> ${companyId}</p>
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
      const checkRes = await api.post("api/checkCompanyCache", {
        mas_ser_id,
        mas_cat_id,
        company_id: companyId,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on <b>${fetchedDate}</b>`,
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
      const execRes = await api.post("api/executeCompany", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        company_id: companyId,
        file_no: fileNo,
        use_cache: useCache,
      });

      const apiData = normalize(execRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1000") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else {
        swal.fire("Info", apiData?.data?.message, "info");
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

    const companyData = result?.data?.company_data || {};
    const details = companyData.company_details || {};
    const assets = companyData.assets_under_charge || [];
    const directors =
      companyData.director_and_signatory_details || [];

    const content = [
      { text: "Company Detailed Report", style: "header" },
      { text: `File Number: ${fileNo}` },
      { text: `Company ID: ${companyId}` },
      { text: `Transaction ID: ${safe(result.transaction_id)}` },
      { text: `Request ID: ${safe(result.request_id)}` },
      { qr: safe(result.transaction_id), fit: 80, alignment: "right" },
      { text: "Company Details", style: "section", margin: [0, 15, 0, 6] },
      {
        table: {
          widths: ["35%", "65%"],
          body: Object.entries(details).map(([k, v]) => [
            { text: k.replace(/_/g, " ").toUpperCase(), bold: true },
            safe(v),
          ]),
        },
        layout: "lightHorizontalLines",
      },
    ];

    if (assets.length > 0) {
      content.push({
        text: "Assets Under Charge",
        style: "section",
        margin: [0, 15, 0, 6],
      });

      assets.forEach((item, index) => {
        content.push(
          { text: `#${index + 1}`, bold: true, margin: [0, 6] },
          {
            table: {
              widths: ["35%", "65%"],
              body: Object.entries(item).map(([k, v]) => [
                { text: k.toUpperCase(), bold: true },
                safe(v),
              ]),
            },
            layout: "lightHorizontalLines",
          }
        );
      });
    }

    if (directors.length > 0) {
      content.push({
        text: "Director & Signatory Details",
        style: "section",
        margin: [0, 15, 0, 6],
      });

      directors.forEach((item, index) => {
        content.push(
          { text: `#${index + 1}`, bold: true, margin: [0, 6] },
          {
            table: {
              widths: ["35%", "65%"],
              body: Object.entries(item).map(([k, v]) => [
                { text: k.toUpperCase(), bold: true },
                safe(v),
              ]),
            },
            layout: "lightHorizontalLines",
          }
        );
      });
    }

    content.push({
      text: `Generated On: ${new Date().toLocaleString()}`,
      margin: [0, 20],
      fontSize: 9,
      italics: true,
    });

    pdfMake.createPdf({
      content,
      styles: {
        header: { fontSize: 18, bold: true },
        section: { fontSize: 14, bold: true },
      },
    }).download(`COMPANY_${fileNo}.pdf`);
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

        <Card body className="mb-4">
          <Row>
         
            <Col md={6}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) =>
                  setFileNo(e.target.value.toUpperCase())
                }
              />
            </Col>
               <Col md={6}>
              <Form.Label>Company ID <Required /></Form.Label>
              <Form.Control
                value={companyId}
                onChange={(e) =>
                  setCompanyId(e.target.value.toUpperCase())
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
            {loading ? <Spinner size="sm" /> : "Fetch Company"}
          </Button>
        </Card>

        {result && (
          <Card body>
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