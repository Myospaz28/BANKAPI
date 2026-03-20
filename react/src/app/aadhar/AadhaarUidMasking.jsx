// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner } from "react-bootstrap";
// import { useNavigate, useLocation } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// /* ===== PDF ===== */
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function AadhaarUidMasking() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [file, setFile] = useState(null);
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= GUARD ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//   }, [usr_ser_id, navigate]);

//   /* ================= WALLET ================= */
//   useEffect(() => {
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= SUBMIT ================= */
//   const handleFetch = async () => {
//     if (!fileNo || !file || !consent) {
//       swal.fire("Validation Error", "All fields are required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     /* ✅ CONFIRM (RC LITE STYLE) */
//     const confirm = await swal.fire({
//       title: "Confirm Aadhaar UID Masking",
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Available Wallet:</b> ${wallet}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     const formData = new FormData();
//     formData.append("usr_ser_id", usr_ser_id);
//     formData.append("file_no", fileNo);
//     formData.append("file_front", file); // ✅ MUST MATCH MULTER
//     formData.append("consent", "Y");

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post(
//         "api/fetchAadhaarUidMaskingController",
//         formData,
//       );

//       const grid = res.data?.data; // Gridlines response
//       const apiData = grid?.data;
//       const code = apiData?.code;

//       if (code !== "1019") {
//         swal.fire("Failed", apiData?.message || "Masking failed", "error");
//         return;
//       }

//       setResult(apiData);

//       /* ✅ SUCCESS ALERT (RC LITE STYLE) */
//       swal.fire(
//         "Success",
//         `
//         Aadhaar UID masked successfully<br/>
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

//   /* ================= MASKED IMAGE ================= */
//   const maskedImage = result?.masked_aadhaar_data?.masked_base64
//     ? `data:image/jpeg;base64,${result.masked_aadhaar_data.masked_base64}`
//     : null;

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     if (!maskedImage) return;

//     const doc = {
//       content: [
//         { text: "Aadhaar UID Masking Report", style: "header" },
//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["Service Name", service_name],
//               ["File Number", fileNo],
//               ["Credits Used", credits],
//               ["Status", result?.message],
//             ],
//           },
//           layout: "lightHorizontalLines",
//           marginBottom: 15,
//         },
//         { text: "Masked Aadhaar", style: "sub" },
//         {
//           image: maskedImage,
//           width: 400,
//           alignment: "center",
//           marginTop: 10,
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
//         sub: { fontSize: 14, bold: true, marginBottom: 5 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`AADHAAR_MASKED_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name || "Aadhaar UID Masking"}</h4>
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
//               Aadhaar File <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               accept=".jpg,.jpeg,.png,.pdf"
//               onChange={(e) => setFile(e.target.files[0])}
//             />
//             <small className="text-muted">
//               Supported: JPG, PNG, PDF (max 1 page)
//             </small>
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label={
//               <>
//                 I give consent <Required />
//               </>
//             }
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             variant="primary"
//             disabled={loading}
//             onClick={handleFetch}
//           >
//             {loading ? <Spinner size="sm" /> : "Mask Aadhaar UID"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {maskedImage && (
//           <Card body className="mt-3 text-center">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>Masked Aadhaar Preview</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <img
//               src={maskedImage}
//               alt="Masked Aadhaar"
//               style={{
//                 maxWidth: "100%",
//                 marginTop: "15px",
//                 border: "1px solid #ddd",
//                 borderRadius: "8px",
//               }}
//             />

//             <p className="text-muted mt-2">
//               Aadhaar UID masked successfully (XXXX XXXX ****)
//             </p>
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

/* PDF */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function AadhaarUidMasking() {
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

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!fileNo || !file || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!file ? "<li>Aadhaar file is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Aadhaar UID Masking",
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
    formData.append("file_front", file);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post(
        "api/fetchAadhaarUidMaskingController",
        formData
      );

      const full = res.data?.data;
      const apiData = full?.data;

      setResult(full);

      if (apiData?.code === "1019") {
        swal.fire({
          title: "Success",
          html: apiData?.message || "UID masked successfully",
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

  /* ================= MASKED IMAGE ================= */
  const maskedImage = result?.data?.masked_aadhaar_data?.masked_base64
    ? `data:image/jpeg;base64,${
        result.data.masked_aadhaar_data.masked_base64
      }`
    : null;

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const txn = result?.transaction_id || "-";
    const reqId = result?.request_id || "-";
    const d = result?.data || {};

    const doc = {
      content: [
        { text: "Aadhaar UID Masking Report", style: "header" },

        { text: `File Number: ${fileNo}` },
        { text: `Transaction ID: ${txn}` },
        { text: `Request ID: ${reqId}` },

        { qr: txn, fit: 80, alignment: "right", margin: [0, 10] },

        {
          text: "Masked Aadhaar",
          style: "sub",
          margin: [0, 10],
        },

        maskedImage
          ? {
              image: maskedImage,
              width: 400,
              alignment: "center",
            }
          : { text: "Masked image not available" },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          margin: [0, 15],
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`AADHAAR_MASKED_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1019") return "success";
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
                Aadhaar File <Required />
              </Form.Label>
              <Form.Control
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
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
            {loading ? <Spinner size="sm" /> : "Mask Aadhaar UID"}
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

            {maskedImage && (
              <div className="text-center mt-3">
                <img
                  src={maskedImage}
                  alt="Masked Aadhaar"
                  style={{
                    maxWidth: "100%",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                />
              </div>
            )}
          </Card>
        )}
      </Col>
    </Row>
  );
}