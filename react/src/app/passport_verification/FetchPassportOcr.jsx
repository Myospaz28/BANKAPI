// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchPassportOcr() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [frontFile, setFrontFile] = useState(null);
//   const [backFile, setBackFile] = useState(null);
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//   }, [usr_ser_id, navigate]);

//   useEffect(() => {
//     api
//       .get("api/getLoggedInUserWallet")
//       .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
//   }, []);

//   const handleFetch = async () => {
//     if (!fileNo || !frontFile || !consent) {
//       swal.fire("Validation Error", "Required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("usr_ser_id", usr_ser_id);
//     formData.append("file_no", fileNo);
//     formData.append("file_front", frontFile);
//     if (backFile) formData.append("file_back", backFile);
//     formData.append("consent", "Y");

//     setLoading(true);
//     try {
//       const res = await api.post("api/fetchPassportOcrController", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });

//       const code = res.data?.data?.data?.code;

//       if (code !== "1007") {
//         swal.fire("Failed", res.data?.data?.data?.message, "error");
//         return;
//       }

//       setResult(res.data.data);
//       swal.fire("Success", "Passport OCR completed", "success");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const ocr = result?.data?.ocr_data;

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     if (!ocr) return;

//     const rows = Object.entries(ocr).map(([k, v]) => [k, v]);

//     const doc = {
//       content: [
//         { text: "Passport OCR Report", style: "header" },
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: rows,
//           },
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

//     pdfMake.createPdf(doc).download(`Passport_OCR_${fileNo}.pdf`);
//   };

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

//         <Card body className="mb-4">
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
//               Passport Front <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               onChange={(e) => setFrontFile(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Passport Back (optional)</Form.Label>
//             <Form.Control
//               type="file"
//               onChange={(e) => setBackFile(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Run Passport OCR"}
//           </Button>
//         </Card>

//         {ocr && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>OCR Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 {Object.entries(ocr).map(([k, v]) => (
//                   <tr key={k}>
//                     <th>{k}</th>
//                     <td>{v}</td>
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

const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

export default function FetchPassportOcr() {
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
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, []);

  const handleFetch = async () => {
    if (!fileNo || !frontFile || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number required</li>" : ""}
            ${!frontFile ? "<li>Front Image required</li>" : ""}
            ${!consent ? "<li>Consent required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Passport OCR",
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
    formData.append("file_front", frontFile);
    if (backFile) formData.append("file_back", backFile);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchPassportOcrController", formData);

      const full = res.data?.data;
      const apiData = full?.data;

      setResult(full);

      if (apiData?.code === "1007") {
        swal.fire("Success", apiData?.message || "OCR extracted", "success");
      } else {
        swal.fire("Completed", apiData?.message || "Request processed", "info");
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
    const ocr = result?.data?.ocr_data || {};

    const safe = (v) =>
      v === undefined || v === null || v === "" ? "-" : v;

    const rows = Object.entries(ocr).map(([k, v]) => [
      k.replace(/_/g, " ").toUpperCase(),
      safe(v),
    ]);

    const doc = {
      content: [
        { text: "Passport OCR Report", style: "header" },

        { text: `File Number: ${fileNo}` },
        { text: `Transaction ID: ${txn}` },
        { text: `Request ID: ${reqId}` },

        { qr: txn, fit: 80, alignment: "right", margin: [0, 10] },

        {
          table: {
            widths: ["40%", "60%"],
            body: rows,
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

    pdfMake.createPdf(doc).download(`PASSPORT_OCR_${fileNo}.pdf`);
  };
const exportPdf = () => {
  if (!result) return;

  const txn = result?.transaction_id || "-";
  const reqId = result?.request_id || "-";
  const ocrData = result?.data?.ocr_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  /* ⭐ recursive renderer */
  const renderDynamic = (obj, title = null) => {
    let content = [];

    if (title) {
      content.push({
        text: title,
        style: "section",
        margin: [0, 14, 0, 6],
      });
    }

    Object.entries(obj || {}).forEach(([key, value]) => {
      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      /* ===== ARRAY ===== */
      if (Array.isArray(value)) {
        if (!value.length) return;

        if (typeof value[0] === "object") {
          const headers = Object.keys(value[0]);

          content.push({
            text: label,
            bold: true,
            margin: [0, 8, 0, 3],
          });

          content.push({
            table: {
              headerRows: 1,
              widths: headers.map(() => "*"),
              body: [
                headers.map((h) => ({
                  text: h
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
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
            margin: [0, 8, 0, 3],
          });

          content.push({
            ul: value.map((v) => safe(v)),
          });
        }
      }

      /* ===== OBJECT ===== */
      else if (typeof value === "object" && value !== null) {
        content = content.concat(renderDynamic(value, label));
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
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 6],
        });
      }
    });

    return content;
  };

  const doc = {
    content: [
      { text: "Passport OCR Report", style: "header" },

      {
        table: {
          widths: ["40%", "60%"],
          body: [
            ["File Number", fileNo],
            ["Transaction ID", txn],
            ["Request ID", reqId],
          ].map((r) => [
            { text: r[0], bold: true },
            safe(r[1]),
          ]),
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10],
      },

      { qr: txn, fit: 80, alignment: "right", margin: [0, 10] },

      /* ⭐ FULL OCR DATA AUTO */
      ...renderDynamic(ocrData, "OCR Details"),

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

  pdfMake.createPdf(doc).download(`PASSPORT_OCR_${fileNo}.pdf`);
};
  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1007") return "success";
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
              <Form.Control value={fileNo} onChange={(e)=>setFileNo(e.target.value)} />
            </Col>

            <Col md={4}>
              <Form.Label>Passport Front <Required /></Form.Label>
              <Form.Control type="file" onChange={(e)=>setFrontFile(e.target.files[0])}/>
            </Col>

            <Col md={4}>
              <Form.Label>Passport Back</Form.Label>
              <Form.Control type="file" onChange={(e)=>setBackFile(e.target.files[0])}/>
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e)=>setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm"/> : "Run Passport OCR"}
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