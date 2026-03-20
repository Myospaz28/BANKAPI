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

// export default function UdyamCertificateOCR() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [file, setFile] = useState(null);
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     api
//       .get("api/getLoggedInUserWallet")
//       .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
//   }, [usr_ser_id, navigate]);

//   const handleFetch = async () => {
//     if (!fileNo || !file || !consent) {
//       swal.fire("Validation Error", "All fields required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm OCR",
//       html: `
//       <b>File No:</b> ${fileNo}<br/>
//       <b>Credits:</b> ${credits}
//     `,
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
//       const res = await api.post(
//         "api/fetchUdyamCertificateOcrController",
//         formData,
//       );

//       const apiData = res.data?.data?.data;
//       const code = apiData?.code;

//       if (code !== "1013") {
//         swal.fire("Failed", apiData?.message || "OCR failed", "error");
//         setResult(apiData);
//         return;
//       }

//       setResult(apiData);
//       swal.fire("Success", "Udyam Certificate OCR successful", "success");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exportPdf = () => {
//     if (!result) return;

//     const rows = [
//       ...Object.entries(result.enterprise_data || {}),
//       ...Object.entries(result.nic_data || {}),
//     ].map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : v]);

//     const doc = {
//       content: [
//         { text: "Udyam Certificate OCR Report", style: "header" },
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: rows,
//           },
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`UDYAM_CERT_OCR_${fileNo}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name || "Udyam Certificate OCR"}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body>
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
//               Udyam Certificate File <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               accept=".pdf,.jpg,.jpeg,.png"
//               onChange={(e) => setFile(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Run OCR"}
//           </Button>
//         </Card>

//         {result?.enterprise_data && (
//           <Card body className="mt-3">
//             <div className="d-flex justify-content-between">
//               <h5>OCR Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 {Object.entries(result.enterprise_data).map(([k, v]) => (
//                   <tr key={k}>
//                     <th>{k}</th>
//                     <td>{typeof v === "object" ? JSON.stringify(v) : v}</td>
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

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function UdyamCertificateOCR() {
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
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, []);

  const handleFetch = async () => {
    if (!fileNo || !file || !consent) {
      swal.fire("Validation Error", "All fields required", "warning");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Udyam OCR",
      html: `<b>File No:</b> ${fileNo}`,
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
        "api/fetchUdyamCertificateOcrController",
        formData
      );

      const full = res.data?.data;
      const apiData = full?.data;

      setResult(full);

      if (apiData?.code === "1013") {
        swal.fire("Success", apiData?.message || "OCR success", "success");
      } else {
        swal.fire("Completed", apiData?.message || "Processed", "info");
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

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : String(v);

  const sectionTitle = (text) => ({
    text,
    style: "section",
    margin: [0, 12, 0, 5],
  });

  const tableBlock = (rows) => ({
    table: {
      widths: ["40%", "60%"],
      body: [
        [
          { text: "Field", bold: true },
          { text: "Value", bold: true },
        ],
        ...rows,
      ],
    },
    layout: "lightHorizontalLines",
  });

  /* ⭐ flatten but clean */
  const buildRows = (obj) => {
    let rows = [];

    Object.entries(obj || {}).forEach(([k, v]) => {
      if (k === "code" || k === "message") return;

      if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === "object") {
            Object.entries(item).forEach(([ik, iv]) => {
              rows.push([`${ik} (${i + 1})`, safe(iv)]);
            });
          } else {
            rows.push([`${k} (${i + 1})`, safe(item)]);
          }
        });
      } else if (typeof v === "object" && v !== null) {
        Object.entries(v).forEach(([ik, iv]) => {
          rows.push([ik, safe(iv)]);
        });
      } else {
        rows.push([k, safe(v)]);
      }
    });

    return rows;
  };

  /* ⭐ dynamic sections */
  const sections = [];

  const dataObj = result?.data || {};

  Object.entries(dataObj).forEach(([key, value]) => {
    if (typeof value === "object" && value !== null) {
      const rows = buildRows(value);
      if (rows.length) {
        sections.push(
          sectionTitle(key.replace(/_/g, " ").toUpperCase()),
          tableBlock(rows)
        );
      }
    }
  });

  const doc = {
    content: [
      { text: "OCR Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Transaction ID: ${txn}` },
      { text: `Request ID: ${reqId}` },

      { qr: txn, fit: 80, alignment: "right", margin: [0, 10] },

      ...sections,

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

  pdfMake.createPdf(doc).download(`OCR_${fileNo}.pdf`);
};
const exportPdf = () => {
  if (!result) return;

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  /* ================= CLEAN JSON BUILDER ================= */
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
      if (key === "code" || key === "message") return;

      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      /* ===== ARRAY ===== */
      if (Array.isArray(value)) {
        if (!value.length) return;

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
            widths: ["45%", "55%"],
            body: [
              [
                { text: label, bold: true },
                safe(value),
              ],
            ],
          },
          layout: "noBorders",
          margin: [0, 2],
        });
      }
    });

    return content;
  };

  const doc = {
    content: [
      { text: "Udyam Certificate Detailed Report", style: "header" },

      { text: `File No: ${fileNo}`, margin: [0, 5] },
      { text: `Transaction ID: ${result?.transaction_id || "-"}` },
      { text: `Request ID: ${result?.request_id || "-"}`, margin: [0, 0, 0, 10] },

      { qr: result?.transaction_id || "-", fit: 80, alignment: "right" },

      /* ⭐ FULL DATA */
      ...buildContent(result?.data, "Udyam Data"),

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

  pdfMake.createPdf(doc).download(`UDYAM_DETAILED_${fileNo}.pdf`);
};

  const code = result?.data?.code;

  const getBadgeVariant = () =>
    code === "1013" ? "success" : "secondary";

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
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Udyam File <Required /></Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Run OCR"}
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