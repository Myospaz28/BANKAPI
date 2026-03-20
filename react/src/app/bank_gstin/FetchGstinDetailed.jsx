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

// export default function FetchGstinDetailed() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [gstin, setGstin] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= WALLET ================= */
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
//     if (!fileNo || !gstin || !consent) {
//       swal.fire("Validation Error", "Required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm GSTIN Detailed Fetch",
//       html: `
//         <p><b>GSTIN:</b> ${gstin}</p>
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Wallet Balance:</b> ${wallet}</p>
//       `,
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchGstinDetailed", {
//         usr_ser_id,
//         file_no: fileNo,
//         gstin,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       setResult(apiData);

//       if (apiData?.data?.code === "1000") {
//         swal.fire(
//           "Success",
//           `GSTIN details fetched successfully<br/>
//            Remaining Balance: <b>${wallet - credits}</b>`,
//           "success"
//         );
//         fetchWallet();
//       } else {
//         swal.fire("Info", apiData?.data?.message, "info");
//       }
//     } catch {
//       swal.fire("Service Unavailable", "Please try again later", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const d = result?.data?.gstin_data;

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!d) return;

//     const row = (k, v) => [k, safe(v)];
//     const section = (t) => ({ text: t, style: "section", margin: [0, 10, 0, 5] });

//     const doc = {
//       content: [
//         { text: "GSTIN Detailed Report", style: "header" },

//         section("Basic Information"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("GSTIN", d.document_id),
//               row("Status", d.status),
//               row("PAN", d.pan),
//               row("Legal Name", d.legal_name),
//               row("Trade Name", d.trade_name),
//               row("Taxpayer Type", d.taxpayer_type),
//               row("Constitution", d.constitution_of_business),
//               row("Registration Date", d.date_of_registration),
//             ],
//           },
//         },

//         section("Jurisdiction"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("Center Jurisdiction", d.center_jurisdiction),
//               row("State Jurisdiction", d.state_jurisdiction),
//             ],
//           },
//         },

//         section("Verification"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("Aadhaar Verified", d.aadhaar_verified ? "Yes" : "No"),
//               row("eKYC Verified", d.ekyc_verified ? "Yes" : "No"),
//               row("Field Visit Conducted", d.field_visit_conducted ? "Yes" : "No"),
//             ],
//           },
//         },

//         section("Turnover"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("Annual Turnover", d.annual_aggregate_turnover),
//               row("Turnover Year", d.annual_aggregate_turnover_year),
//             ],
//           },
//         },

//         section("Directors"),
//         d.directors?.length ? d.directors.map((x) => `• ${x}`) : "-",

//         section("Principal Address"),
//         d.principal_address?.address || "-",

//         ...(d.additional_addresses?.length
//           ? [
//               section("Additional Addresses"),
//               ...d.additional_addresses.map((a) => a.address),
//             ]
//           : []),

//         ...(d.hsn_data?.services?.length
//           ? [
//               section("HSN / Services"),
//               {
//                 table: {
//                   widths: ["30%", "70%"],
//                   body: [
//                     ["HSN", "Description"],
//                     ...d.hsn_data.services.map((s) => [
//                       s.hsn,
//                       s.description,
//                     ]),
//                   ],
//                 },
//               },
//             ]
//           : []),

//         ...(d.filing_data?.length
//           ? [
//               section("Filing History"),
//               {
//                 table: {
//                   widths: ["15%", "20%", "15%", "20%", "20%"],
//                   body: [
//                     ["Return", "FY", "Period", "Filed On", "Status"],
//                     ...d.filing_data.map((f) => [
//                       f.return_type,
//                       f.financial_year,
//                       f.tax_period,
//                       f.date_of_filing,
//                       f.status,
//                     ]),
//                   ],
//                 },
//               },
//             ]
//           : []),

//         ...(d.filing_frequency?.length
//           ? [
//               section("Filing Frequency"),
//               {
//                 table: {
//                   widths: ["33%", "33%", "34%"],
//                   body: [
//                     ["FY", "Quarter", "Frequency"],
//                     ...d.filing_frequency.map((f) => [
//                       f.financial_year,
//                       f.quarter,
//                       f.frequency,
//                     ]),
//                   ],
//                 },
//               },
//             ]
//           : []),
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true },
//         section: { fontSize: 14, bold: true },
//       },
//       defaultStyle: { fontSize: 10 },
//     };

//     pdfMake.createPdf(doc).download(`GSTIN_DETAILED_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>Credits Required: <b>{credits}</b></p>
//         </Card>

//         <Card body className="text-center mt-2">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

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

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Fetch GSTIN Detailed"}
//           </Button>
//         </Card>

//         {d && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between">
//               <h5>📄 GSTIN Detailed Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered size="sm" className="mt-3">
//               <tbody>
//                 <tr><th>Legal Name</th><td>{safe(d.legal_name)}</td></tr>
//                 <tr><th>Trade Name</th><td>{safe(d.trade_name)}</td></tr>
//                 <tr><th>Status</th><td>{safe(d.status)}</td></tr>
//                 <tr><th>PAN</th><td>{safe(d.pan)}</td></tr>
//                 <tr><th>Taxpayer Type</th><td>{safe(d.taxpayer_type)}</td></tr>
//                 <tr><th>Registration Date</th><td>{safe(d.date_of_registration)}</td></tr>
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

export default function FetchGstinDetailed() {
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
      title: "Confirm GSTIN Detailed Fetch",
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
        "api/checkGstinDetailedCache",
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
        "api/executeGstinDetailed",
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
        swal.fire({
          title: "Success",
          html: apiData?.data?.message || "GSTIN detailed fetched",
          icon: "success",
        });
      } else {
        swal.fire({
          title: "Completed",
          html: apiData?.data?.message || "Request processed",
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

  /* ================= EXPORT PDF ================= */
 const exportPdf1 = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";
  const d = result?.data?.gstin_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const sectionTitle = (text) => ({
    text,
    style: "section",
    margin: [0, 12, 0, 6],
  });

  const twoColTable = (rows) => ({
    table: {
      widths: ["40%", "60%"],
      body: rows.map((r) => [
        { text: r[0], bold: true },
        safe(r[1]),
      ]),
    },
    layout: "lightHorizontalLines",
  });

  const doc = {
    content: [
      { text: "GSTIN Detailed Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `GSTIN: ${gstin}` },
      { text: `Transaction ID: ${transactionId}` },
      { text: `Request ID: ${requestId}` },

      { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

      /* ================= BASIC INFO ================= */
      sectionTitle("Basic Information"),
      twoColTable([
        ["Legal Name", d.legal_name],
        ["Trade Name", d.trade_name],
        ["Status", d.status],
        ["PAN", d.pan],
        ["Taxpayer Type", d.taxpayer_type],
        ["Constitution", d.constitution_of_business],
        ["Registration Date", d.date_of_registration],
        ["Annual Turnover", d.annual_aggregate_turnover],
        ["Turnover Year", d.annual_aggregate_turnover_year],
      ]),

      /* ================= JURISDICTION ================= */
      sectionTitle("Jurisdiction"),
      twoColTable([
        ["Center Jurisdiction", d.center_jurisdiction],
        ["State Jurisdiction", d.state_jurisdiction],
      ]),

      /* ================= VERIFICATION ================= */
      sectionTitle("Verification"),
      twoColTable([
        ["Aadhaar Verified", d.aadhaar_verified ? "Yes" : "No"],
        ["Field Visit Conducted", d.field_visit_conducted ? "Yes" : "No"],
      ]),

      /* ================= PRINCIPAL ADDRESS ================= */
      sectionTitle("Principal Address"),
      twoColTable([
        ["Address", d.principal_address?.address],
        ["Email", d.principal_address?.email],
        ["Mobile", d.principal_address?.mobile],
        [
          "Nature of Business",
          d.principal_address?.nature_of_business_activity,
        ],
      ]),

      /* ================= DIRECTORS ================= */
      ...(d.directors?.length
        ? [
            sectionTitle("Directors"),
            {
              ul: d.directors.map((x) => safe(x)),
            },
          ]
        : []),

      /* ================= HSN SERVICES ================= */
      ...(d.hsn_data?.services?.length
        ? [
            sectionTitle("HSN / Services"),
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
            sectionTitle("Filing History"),
            {
              table: {
                headerRows: 1,
                widths: ["15%", "20%", "15%", "20%", "15%", "15%"],
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
            sectionTitle("Filing Frequency"),
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

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 15],
        fontSize: 9,
        italics: true,
      },
    ],

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

    defaultStyle: {
      fontSize: 9,
    },
  };

  pdfMake.createPdf(doc).download(`GSTIN_DETAILED_${fileNo}.pdf`);
};
const exportPdf = () => {
  if (!result) return;

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  /* ================= RECURSIVE JSON BUILDER ================= */
  const buildContent = (obj, title = null) => {
    let content = [];

    if (title) {
      content.push({
        text: title,
        style: "section",
        margin: [0, 12, 0, 6],
      });
    }

    Object.entries(obj || {}).forEach(([key, value]) => {
      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      /* ===== ARRAY ===== */
      if (Array.isArray(value)) {
        if (!value.length) return;

        /* array of object → table */
        if (typeof value[0] === "object") {
          const headers = Object.keys(value[0]);

          content.push({
            text: label,
            bold: true,
            margin: [0, 6, 0, 3],
          });

          content.push({
            table: {
              headerRows: 1,
              widths: headers.map(() => "*"),
              body: [
                headers.map((h) => ({
                  text: h
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase()),
                  bold: true,
                })),
                ...value.map((row) =>
                  headers.map((h) => safe(row[h]))
                ),
              ],
            },
            layout: "lightHorizontalLines",
          });
        } else {
          /* simple array → bullet */
          content.push({
            text: label,
            bold: true,
            margin: [0, 6, 0, 3],
          });

          content.push({
            ul: value.map((v) => safe(v)),
          });
        }
      }

      /* ===== OBJECT ===== */
      else if (typeof value === "object" && value !== null) {
        content = content.concat(buildContent(value, label));
      }

      /* ===== PRIMITIVE ===== */
      else {
        content.push({
          table: {
            widths: ["40%", "60%"],
            body: [
              [
                { text: label, bold: true },
                safe(value),
              ],
            ],
          },
          layout: "noBorders",
        });
      }
    });

    return content;
  };

  const doc = {
    content: [
      { text: "GSTIN Detailed Report", style: "header" },

      {
        text: `File No: ${fileNo}`,
        margin: [0, 5],
      },
      {
        text: `GSTIN: ${gstin}`,
        margin: [0, 2],
      },
      {
        text: `Transaction ID: ${result?.transaction_id || "-"}`,
      },
      {
        text: `Request ID: ${result?.request_id || "-"}`,
        margin: [0, 0, 0, 10],
      },

      { qr: result?.transaction_id || "-", fit: 80, alignment: "right" },

      /* ⭐ FULL DATA */
      ...buildContent(result?.data?.gstin_data, "GSTIN Data"),

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 15],
        italics: true,
        fontSize: 9,
      },
    ],

    styles: {
      header: {
        fontSize: 18,
        bold: true,
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

  pdfMake.createPdf(doc).download(`GSTIN_DETAILED_${fileNo}.pdf`);
};

  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1000") return "success";
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
                GSTIN <Required />
              </Form.Label>
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

          <Button
            className="mt-3"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN Detailed"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result{" "}
                <Badge bg={getBadgeVariant()}>
                  {code}
                </Badge>
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
