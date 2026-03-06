// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

// export default function FetchGstinLite() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [gstin, setGstin] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   const handleFetch = async () => {
//     if (!fileNo || !gstin || !consent) {
//       swal.fire("Validation Error", "Required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm GSTIN Fetch",
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Available Credits:</b> ${wallet}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchGstinLiteController", {
//         usr_ser_id,
//         file_no: fileNo,
//         gstin,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       setResult(apiData);

//       if (code === "1000") {
//         swal.fire(
//           "Success",
//           `GSTIN fetched successfully<br/>
//            Credits Deducted: <b>${credits}</b><br/>
//            Remaining Balance: <b>${wallet - credits}</b>`,
//           "success"
//         );
//         fetchWallet();
//       } else {
//         swal.fire("Info", apiData?.data?.message, "info");
//       }
//     } catch (err) {
//       swal.fire("Service Unavailable", "Please try again later", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exportPdf = () => {
//   const d = result?.data?.gstin_data;
//   if (!d) return;

//   const row = (k, v) => [k, v ?? "-"];
//   const section = (t) => ({ text: t, style: "section", margin: [0, 10, 0, 5] });

//   const doc = {
//     content: [
//       { text: "GSTIN Lite Report", style: "header" },

//       section("Basic Information"),
//       {
//         table: {
//           widths: ["40%", "60%"],
//           body: [
//             row("GSTIN", d.document_id),
//             row("Status", d.status),
//             row("PAN", d.pan),
//             row("Legal Name", d.legal_name),
//             row("Trade Name", d.trade_name),
//             row("Taxpayer Type", d.taxpayer_type),
//             row("Constitution", d.constitution_of_business),
//             row("Registration Date", d.date_of_registration),
//           ],
//         },
//       },

//       section("Jurisdiction"),
//       {
//         table: {
//           widths: ["40%", "60%"],
//           body: [
//             row("Center Jurisdiction", d.center_jurisdiction),
//             row("State Jurisdiction", d.state_jurisdiction),
//           ],
//         },
//       },

//       section("Verification"),
//       {
//         table: {
//           widths: ["40%", "60%"],
//           body: [
//             row("Aadhaar Verified", d.aadhaar_verified ? "Yes" : "No"),
//             row("eKYC Verified", d.ekyc_verified ? "Yes" : "No"),
//             row("Field Visit Conducted", d.field_visit_conducted ? "Yes" : "No"),
//           ],
//         },
//       },

//       section("Principal Address"),
//       d.principal_address?.address || "-",

//       ...(d.hsn_data?.services?.length
//         ? [
//             section("HSN / Services"),
//             {
//               table: {
//                 widths: ["30%", "70%"],
//                 body: [
//                   ["HSN", "Description"],
//                   ...d.hsn_data.services.map((s) => [s.hsn, s.description]),
//                 ],
//               },
//             },
//           ]
//         : []),

//       ...(d.filing_data?.length
//         ? [
//             section("Filing History"),
//             {
//               table: {
//                 widths: ["15%", "20%", "15%", "20%", "20%"],
//                 body: [
//                   ["Return", "FY", "Period", "Filed On", "Status"],
//                   ...d.filing_data.map((f) => [
//                     f.return_type,
//                     f.financial_year,
//                     f.tax_period,
//                     f.date_of_filing,
//                     f.status,
//                   ]),
//                 ],
//               },
//             },
//           ]
//         : []),

//       ...(d.filing_frequency?.length
//         ? [
//             section("Filing Frequency"),
//             {
//               table: {
//                 widths: ["33%", "33%", "34%"],
//                 body: [
//                   ["FY", "Quarter", "Frequency"],
//                   ...d.filing_frequency.map((f) => [
//                     f.financial_year,
//                     f.quarter,
//                     f.frequency,
//                   ]),
//                 ],
//               },
//             },
//           ]
//         : []),
//     ],
//     styles: {
//       header: { fontSize: 18, bold: true },
//       section: { fontSize: 14, bold: true },
//     },
//     defaultStyle: { fontSize: 10 },
//   };

//   pdfMake.createPdf(doc).download(`GSTIN_${fileNo}.pdf`);
// };

//   const d = result?.data?.gstin_data;

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//   <Button onClick={() => navigate(-1)}>← Back</Button>
//   <h4 className="mt-3">{service_name}</h4>
//   <p>
//     Credits Required: <b>{credits}</b>
//   </p>
// </Card>

// {/* ✅ ADD THIS */}
// <Card body className="text-center mt-2">
//   <h6>💰 Wallet Balance</h6>
//   <h2 className="text-success">{wallet}</h2>
// </Card>



//         <Card body className="mt-3">
//           <Form.Group>
//             <Form.Label>File Number <Required /></Form.Label>
//             <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>GSTIN <Required /></Form.Label>
//             <Form.Control
//               value={gstin}
//               onChange={(e) => setGstin(e.target.value.toUpperCase())}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-2"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : "Fetch GSTIN"}
//           </Button>
//         </Card>

//        {d && (
//   <Card body className="mt-4">
//     <div className="d-flex justify-content-between">
//       <h5>📄 GSTIN Details</h5>
//       <Button variant="outline-primary" onClick={exportPdf}>
//         Export PDF
//       </Button>
//     </div>

//     {/* BASIC DETAILS */}
//     <h6 className="mt-3">Basic Information</h6>
//     <Table bordered size="sm">
//       <tbody>
//         <tr><th>GSTIN</th><td>{d.document_id}</td></tr>
//         <tr><th>Status</th><td>{d.status}</td></tr>
//         <tr><th>PAN</th><td>{d.pan}</td></tr>
//         <tr><th>Legal Name</th><td>{d.legal_name}</td></tr>
//         <tr><th>Trade Name</th><td>{d.trade_name}</td></tr>
//         <tr><th>Date of Registration</th><td>{d.date_of_registration}</td></tr>
//         <tr><th>Taxpayer Type</th><td>{d.taxpayer_type}</td></tr>
//         <tr><th>Constitution</th><td>{d.constitution_of_business}</td></tr>
//       </tbody>
//     </Table>

//     {/* JURISDICTION */}
//     <h6 className="mt-4">Jurisdiction Details</h6>
//     <Table bordered size="sm">
//       <tbody>
//         <tr><th>Center Jurisdiction</th><td>{d.center_jurisdiction}</td></tr>
//         <tr><th>State Jurisdiction</th><td>{d.state_jurisdiction}</td></tr>
//       </tbody>
//     </Table>

//     {/* VERIFICATION */}
//     <h6 className="mt-4">Verification Status</h6>
//     <Table bordered size="sm">
//       <tbody>
//         <tr><th>Aadhaar Verified</th><td>{d.aadhaar_verified ? "Yes" : "No"}</td></tr>
//         <tr><th>eKYC Verified</th><td>{d.ekyc_verified ? "Yes" : "No"}</td></tr>
//         <tr><th>Field Visit Conducted</th><td>{d.field_visit_conducted ? "Yes" : "No"}</td></tr>
//       </tbody>
//     </Table>

//     {/* ADDRESS */}
//     <h6 className="mt-4">Principal Address</h6>
//     <p className="border p-2">{d.principal_address?.address}</p>

//     {/* HSN */}
//     {d.hsn_data?.services?.length > 0 && (
//       <>
//         <h6 className="mt-4">HSN / Services</h6>
//         <Table bordered size="sm">
//           <thead>
//             <tr>
//               <th>HSN</th>
//               <th>Description</th>
//             </tr>
//           </thead>
//           <tbody>
//             {d.hsn_data.services.map((s, i) => (
//               <tr key={i}>
//                 <td>{s.hsn}</td>
//                 <td>{s.description}</td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       </>
//     )}

//     {/* FILING HISTORY */}
//     {d.filing_data?.length > 0 && (
//       <>
//         <h6 className="mt-4">Filing History</h6>
//         <Table bordered size="sm">
//           <thead>
//             <tr>
//               <th>Return</th>
//               <th>FY</th>
//               <th>Period</th>
//               <th>Filed On</th>
//               <th>Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {d.filing_data.map((f, i) => (
//               <tr key={i}>
//                 <td>{f.return_type}</td>
//                 <td>{f.financial_year}</td>
//                 <td>{f.tax_period}</td>
//                 <td>{f.date_of_filing}</td>
//                 <td>{f.status}</td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       </>
//     )}

//     {/* FILING FREQUENCY */}
//     {d.filing_frequency?.length > 0 && (
//       <>
//         <h6 className="mt-4">Filing Frequency</h6>
//         <Table bordered size="sm">
//           <thead>
//             <tr>
//               <th>FY</th>
//               <th>Quarter</th>
//               <th>Frequency</th>
//             </tr>
//           </thead>
//           <tbody>
//             {d.filing_frequency.map((f, i) => (
//               <tr key={i}>
//                 <td>{f.financial_year}</td>
//                 <td>{f.quarter}</td>
//                 <td>{f.frequency}</td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       </>
//     )}
//   </Card>
// )}
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

export default function FetchGstinLite() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [fileNo, setFileNo] = useState("");
  const [gstin, setGstin] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, []);

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
    if (!fileNo || !gstin || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!gstin ? "<li>GSTIN is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm GSTIN Lite Fetch",
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
        "api/checkGstinLiteCache",
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

      /* ================= EXECUTE ================= */
      const executeRes = await api.post(
        "api/executeGstinLite",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          gstin,
          use_cache: useCache,
        }
      );

      const apiData = normalizeResult(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);

      if (code === "1000") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1005") {
        swal.fire("Not Found", apiData?.data?.message, "info");
      } else {
        swal.fire("Completed", apiData?.data?.message, "info");
      }

    } catch (err) {
      swal.fire("Service Unavailable", "Please try again later", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */
 const exportPdf = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";
  const timestamp = result?.timestamp || "-";
  const path = result?.path || "-";

  const d = result?.data?.gstin_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const section = (t) => ({
    text: t,
    style: "section",
    margin: [0, 14, 0, 6],
  });

  const twoCol = (rows) => ({
    table: {
      widths: ["40%", "60%"],
      body: rows.map((r) => [
        { text: r[0], bold: true },
        safe(r[1]),
      ]),
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10],
  });

  const doc = {
    content: [
      { text: "GSTIN Lite Report", style: "header" },

      twoCol([
        ["File Number", fileNo],
        ["GSTIN", gstin],
        ["Transaction ID", transactionId],
        ["Request ID", requestId],
        ["Timestamp", timestamp],
        ["API Path", path],
      ]),

      { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

      section("Basic Information"),
      twoCol([
        ["Document Type", d.document_type],
        ["GSTIN", d.document_id],
        ["Status", d.status],
        ["PAN", d.pan],
        ["Legal Name", d.legal_name],
        ["Trade Name", d.trade_name],
        ["Taxpayer Type", d.taxpayer_type],
        ["Constitution", d.constitution_of_business],
        ["Registration Date", d.date_of_registration],
      ]),

      section("Jurisdiction"),
      twoCol([
        ["Center Jurisdiction", d.center_jurisdiction],
        ["State Jurisdiction", d.state_jurisdiction],
      ]),

      section("Verification"),
      twoCol([
        ["Aadhaar Verified", d.aadhaar_verified ? "Yes" : "No"],
        ["eKYC Verified", d.ekyc_verified ? "Yes" : "No"],
        ["Field Visit Conducted", d.field_visit_conducted ? "Yes" : "No"],
      ]),

      section("Principal Address"),
      twoCol([
        ["Address", d.principal_address?.address],
      ]),

      /* ================= HSN SERVICES ================= */
      ...(d.hsn_data?.services?.length
        ? [
            section("HSN / Services"),
            {
              table: {
                headerRows: 1,
                widths: ["30%", "70%"],
                body: [
                  [
                    { text: "HSN", bold: true },
                    { text: "Description", bold: true },
                  ],
                  ...d.hsn_data.services.map((s) => [
                    safe(s.hsn),
                    safe(s.description),
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),

      /* ================= FILING HISTORY ================= */
      ...(d.filing_data?.length
        ? [
            section("Filing History"),
            {
              table: {
                headerRows: 1,
                widths: ["15%", "18%", "17%", "20%", "15%", "15%"],
                body: [
                  [
                    { text: "Return", bold: true },
                    { text: "FY", bold: true },
                    { text: "Period", bold: true },
                    { text: "Filed On", bold: true },
                    { text: "Mode", bold: true },
                    { text: "Status", bold: true },
                  ],
                  ...d.filing_data.map((f) => [
                    safe(f.return_type),
                    safe(f.financial_year),
                    safe(f.tax_period),
                    safe(f.date_of_filing),
                    safe(f.mode_of_filing),
                    safe(f.status),
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),

      /* ================= FILING FREQUENCY ================= */
      ...(d.filing_frequency?.length
        ? [
            section("Filing Frequency"),
            {
              table: {
                headerRows: 1,
                widths: ["33%", "33%", "34%"],
                body: [
                  [
                    { text: "Financial Year", bold: true },
                    { text: "Quarter", bold: true },
                    { text: "Frequency", bold: true },
                  ],
                  ...d.filing_frequency.map((f) => [
                    safe(f.financial_year),
                    safe(f.quarter),
                    safe(f.frequency),
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),
    ],

    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 15],
      },
      section: {
        fontSize: 14,
        bold: true,
      },
    },

    defaultStyle: {
      fontSize: 9,
    },
  };

  pdfMake.createPdf(doc).download(`GSTIN_LITE_${fileNo}.pdf`);
};


  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1000") return "success";
    if (code === "1005") return "warning";
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
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>GSTIN <Required /></Form.Label>
              <Form.Control
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN Lite"}
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
