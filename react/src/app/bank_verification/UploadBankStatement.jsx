// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function UploadBankStatement() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [file, setFile] = useState(null);
//   const [fileNo, setFileNo] = useState("");
//   const [bankName, setBankName] = useState("");
//   const [password, setPassword] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [txnId, setTxnId] = useState(null);
//   const [report, setReport] = useState(null);

//   /* ================= INIT ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//   }, [usr_ser_id, navigate]);

//   useEffect(() => {
//     api.get("api/getLoggedInUserWallet").then((res) => {
//       setWallet(Number(res.data?.data?.wallet_amount || 0));
//     });
//   }, []);

//   /* ================= UPLOAD ================= */
//   const uploadStatement = async () => {
//     console.log("🚀 uploadStatement CALLED");

//     console.log("📄 file:", file);
//     console.log("📁 fileNo:", fileNo);
//     console.log("🏦 bankName:", bankName);
//     console.log("🔐 password:", password);
//     console.log("💳 wallet:", wallet);
//     console.log("💰 credits required:", credits);
//     console.log("✅ consent:", consent);
//     console.log("🆔 usr_ser_id:", usr_ser_id);

//     /* ================= VALIDATION ================= */
//     if (!file || !fileNo || !consent) {
//       console.warn("❌ VALIDATION FAILED");
//       swal.fire("Validation Error", "All required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       console.warn("❌ INSUFFICIENT WALLET");
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     /* ================= CONFIRM ================= */
//     const confirm = await swal.fire({
//       title: "Confirm Upload",
//       html: `<b>Credits:</b> ${credits}<br/><b>File No:</b> ${fileNo}`,
//       showCancelButton: true,
//     });

//     console.log("🟡 User confirmation:", confirm.isConfirmed);
//     if (!confirm.isConfirmed) return;

//     /* ================= FORMDATA ================= */
//     const formData = new FormData();
//     formData.append("usr_ser_id", usr_ser_id);
//     formData.append("file_no", fileNo);
//     formData.append("file", file);
//     if (bankName) formData.append("bank_name", bankName);
//     if (password) formData.append("password", password);
//     formData.append("consent", "Y");

//     console.log("📦 FormData prepared");
//     console.log("📄 file type:", file?.type);
//     console.log("📄 file size (MB):", (file?.size / (1024 * 1024)).toFixed(2));

//     setLoading(true);

//     try {
//       console.log("🌐 Sending API request...");

//       const res = await api.post(
//         "api/fetchUploadBankStatementController",
//         formData,
//       );

//       console.log("✅ API RESPONSE FULL:", res.data);

//       /* ================= IMPORTANT FIX ================= */
//       const apiData = res.data?.data;

//       console.log("🧾 apiData:", apiData);

//       const code =
//         apiData?.data?.code || // success case
//         apiData?.error?.code; // error case

//       const message =
//         apiData?.data?.message || // success case
//         apiData?.error?.message; // error case

//       console.log("📌 FINAL Code:", code);
//       console.log("📌 FINAL Message:", message);

//       /* ================= HANDLE FAILURE ================= */
//       if (code !== "1019") {
//         console.error("❌ UPLOAD FAILED:", apiData?.error);
//         swal.fire("Upload Failed", message || "Upload failed", "error");
//         return;
//       }

//       /* ================= SUCCESS ================= */
//       const transactionId = apiData?.data?.transaction_id;
//       console.log("🎯 Transaction ID:", transactionId);

//       setTxnId(transactionId);
//       swal.fire("Success", "Statement uploaded successfully", "success");
//     } catch (err) {
//       console.error("🔥 API ERROR:", err);
//       swal.fire("Error", "Something went wrong", "error");
//     } finally {
//       setLoading(false);
//       console.log("🛑 uploadStatement FINISHED");
//     }
//   };

//   /* ================= FETCH REPORT ================= */
//   const fetchReport = async () => {
//     const res = await api.get(
//       `api/fetchBankStatementReportController?transaction_id=${txnId}`,
//     );
//     setReport(res.data?.data);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
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
//               PDF Statement <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               accept="application/pdf"
//               onChange={(e) => setFile(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Bank Name (optional)</Form.Label>
//             <Form.Control
//               value={bankName}
//               onChange={(e) => setBankName(e.target.value)}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Password (optional)</Form.Label>
//             <Form.Control
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={uploadStatement} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Upload Statement"}
//           </Button>

//           {txnId && (
//             <Button
//               variant="success"
//               className="mt-3 ms-2"
//               onClick={fetchReport}
//             >
//               Fetch Report
//             </Button>
//           )}

//           {report?.data?.code === "1022" && (
//             <Card body className="mt-3">
//               <h6>📊 Report Ready</h6>
//               <a href={report.data.excel_link} target="_blank" rel="noreferrer">
//                 Download Excel
//               </a>
//               <br />
//               <a href={report.data.json_link} target="_blank" rel="noreferrer">
//                 Download JSON
//               </a>
//             </Card>
//           )}
//         </Card>
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

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function UploadBankStatement() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [file, setFile] = useState(null);
  const [fileNo, setFileNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, []);

  /* ================= UPLOAD ================= */
  const handleUpload = async () => {
    if (!file || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!file ? "<li>PDF Statement required</li>" : ""}
            ${!fileNo ? "<li>File Number required</li>" : ""}
            ${!consent ? "<li>Consent required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Bank Statement Upload",
      html: `<p><b>File Number:</b> ${fileNo}</p>
             <p><b>Credits Required:</b> ${credits}</p>`,
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
    formData.append("file", file);
    if (bankName) formData.append("bank_name", bankName);
    if (password) formData.append("password", password);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);
    setReport(null);

    try {
      const res = await api.post(
        "api/fetchUploadBankStatementController",
        formData
      );

      const full = res.data?.data;
      const apiData = full?.data;

      setResult(full);

      if (apiData?.code === "1019") {
        swal.fire({
          title: "Success",
          html: apiData?.message || "Upload accepted",
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

  /* ================= FETCH REPORT ================= */
  const fetchReport = async () => {
    const txn = result?.data?.transaction_id;
    if (!txn) return;

    const res = await api.get(
      `api/fetchBankStatementReportController?transaction_id=${txn}`
    );

    setReport(res.data?.data);
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
                PDF Statement <Required />
              </Form.Label>
              <Form.Control
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={6}>
              <Form.Label>Bank Name</Form.Label>
              <Form.Control
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Password</Form.Label>
              <Form.Control
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Upload Statement"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result <Badge bg={getBadgeVariant()}>{code}</Badge>
              </h5>

              {code === "1019" && (
                <Button variant="success" onClick={fetchReport}>
                  Fetch Report
                </Button>
              )}
            </div>

            <div style={{ maxHeight: 400, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}

        {report?.data?.code === "1022" && (
          <Card body className="mt-3">
            <h6>📊 Report Ready</h6>

            <a href={report.data.excel_link} target="_blank" rel="noreferrer">
              Download Excel
            </a>
            <br />
            <a href={report.data.json_link} target="_blank" rel="noreferrer">
              Download JSON
            </a>
          </Card>
        )}
      </Col>
    </Row>
  );
}