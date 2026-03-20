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
// const val = (v) => (v !== undefined && v !== null ? v : "-");

// export default function FaceMatch() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [img1, setImg1] = useState(null);
//   const [img2, setImg2] = useState(null);
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= INIT ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= SUBMIT ================= */
//   const handleFetch = async () => {
//     if (!fileNo || !img1 || !img2 || !consent) {
//       swal.fire("Validation Error", "All fields are required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     /* ===== CONFIRM (AADHAAR STYLE) ===== */
//     const confirm = await swal.fire({
//       title: "Confirm Face Match",
//       html: `
//         <p><b>File No:</b> ${fileNo}</p>
       
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     const formData = new FormData();
//     formData.append("usr_ser_id", usr_ser_id);
//     formData.append("file_no", fileNo);
//     formData.append("file_1", img1);
//     formData.append("file_2", img2);
//     formData.append("consent", "Y");

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchFaceMatchController", formData);

//       const grid = res.data?.data;
//       const apiData = grid?.data;

//       if (!apiData || !["1000", "1001"].includes(apiData.code)) {
//         swal.fire(
//           "Failed",
//           apiData?.message || "Face verification failed",
//           "error",
//         );
//         return;
//       }

//       setResult(apiData);

//       /* ===== SUCCESS (AADHAAR STYLE) ===== */
//       swal.fire(
//         "Success",
//         `
//         Face verification completed successfully<br/>
//         Credits Deducted: <b>${credits}</b><br/>
//         Remaining Wallet: <b>${wallet - credits}</b>
//         `,
//         "success",
//       );

//       fetchWallet();
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const doc = {
//       content: [
//         { text: "Face Match Report", style: "header" },
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               [
//                 { text: "Field", bold: true },
//                 { text: "Value", bold: true },
//               ],
//               ["Result", val(result.message)],
//               ["Confidence Score", val(result.confidence)],
//               [
//                 "Decision",
//                 result.code === "1000" ? "Same Person" : "Different Person",
//               ],
//               ["Threshold Used", "0.25"],
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
//       },
//     };

//     pdfMake.createPdf(doc).download(`FACE_MATCH_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name || "Face Match"}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         {/* FORM */}
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
//               Image 1 <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               accept="image/*"
//               onChange={(e) => setImg1(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>
//               Image 2 <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               accept="image/*"
//               onChange={(e) => setImg2(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label="I give consent for face verification"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Verify Face"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {result && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>Face Match Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr>
//                   <th>Status</th>
//                   <td>{val(result.message)}</td>
//                 </tr>
//                 <tr>
//                   <th>Confidence Score</th>
//                   <td>{val(result.confidence)}</td>
//                 </tr>
//                 <tr>
//                   <th>Decision</th>
//                   <td>
//                     {result.code === "1000"
//                       ? "Same Person"
//                       : "Different Person"}
//                   </td>
//                 </tr>
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

/* PDF */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FaceMatch() {
  const navigate = useNavigate();
  const { state } = useLocation();
  // const { usr_ser_id, service_name, credits } = state || {};
const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } = state || {};
  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!fileNo || !img1 || !img2 || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!img1 ? "<li>Image 1 is required</li>" : ""}
            ${!img2 ? "<li>Image 2 is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Face Match",
      html: `<p><b>File Number:</b> ${fileNo}</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    const formData = new FormData();
    formData.append("usr_ser_id", usr_ser_id);
    formData.append("file_no", fileNo);
    formData.append("file_1", img1);
    formData.append("file_2", img2);
    formData.append("mas_ser_id", mas_ser_id);
formData.append("mas_cat_id", mas_cat_id);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post(
        "api/fetchFaceMatchController",
        formData
      );

      const full = res.data?.data;
      const apiData = full?.data;

      setResult(full);

      if (apiData?.code === "1000" || apiData?.code === "1001") {
        swal.fire({
          title: "Success",
          html: apiData?.message || "Face verification completed",
          icon: "success",
        });
      } else {
        swal.fire({
          title: "Completed",
          html: apiData?.message || "Request processed",
          icon: "info",
        });
      }

      fetchWallet();
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

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const txn = result?.transaction_id || "-";
    const reqId = result?.request_id || "-";
    const d = result?.data || {};

    const doc = {
      content: [
        { text: "Face Match Report", style: "header" },

        { text: `File Number: ${fileNo}` },
        { text: `Transaction ID: ${txn}` },
        { text: `Request ID: ${reqId}` },

        { qr: txn, fit: 80, alignment: "right", margin: [0, 10] },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Result", d.message || "-"],
              ["Confidence Score", d.confidence || "-"],
              [
                "Decision",
                d.code === "1000"
                  ? "Same Person"
                  : d.code === "1001"
                  ? "Different Person"
                  : "-",
              ],
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
      defaultStyle: { fontSize: 9 },
    };

    pdfMake.createPdf(doc).download(`FACE_MATCH_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1000") return "success";
    if (code === "1001") return "warning";
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
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>Image 1 <Required /></Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => setImg1(e.target.files[0])}
              />
            </Col>

            <Col md={4}>
              <Form.Label>Image 2 <Required /></Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => setImg2(e.target.files[0])}
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
            {loading ? <Spinner size="sm" /> : "Verify Face"}
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