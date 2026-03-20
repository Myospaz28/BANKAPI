// import React, { useEffect, useState, useRef } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

// export default function CcrvRapid() {

//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [name, setName] = useState("");
//   const [fatherName, setFatherName] = useState("");
//   const [address, setAddress] = useState("");
//   const [dob, setDob] = useState("");
//   const [consent, setConsent] = useState(false);

//   const [loading, setLoading] = useState(false);
//   const [transactionId, setTransactionId] = useState(null);
//   const [status, setStatus] = useState(null);
//   const [result, setResult] = useState(null);

//   const pollRef = useRef(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//     return () => pollRef.current && clearInterval(pollRef.current);
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= STEP 1: SEARCH ================= */
//   const handleSearch = async () => {
//     if (!fileNo || !name || !consent) {
//       swal.fire("Validation Error", "Required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm CCRV Search",
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
//     setTransactionId(null);

//     try {
//       const res = await api.post("api/ccrvRapidSearchController", {
//         usr_ser_id,
//         file_no: fileNo,
//         name,
//         father_name: fatherName,
//         address,
//         date_of_birth: dob,
//         consent: "Y",
//       });

//       const code = res.data?.data?.data?.code;
//       if (code !== "1016") {
//         swal.fire("Error", res.data?.data?.data?.message, "error");
//         return;
//       }

//       const txnId = res.data.data.data.transaction_id;
//       setTransactionId(txnId);
//       setStatus("REQUESTED");

//       swal.fire("Success", "CCRV search initiated", "success");
//       fetchWallet();
//       startPolling(txnId);
//     } catch (e) {
//       swal.fire("Service Error", "Unable to start CCRV search", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= STEP 2: POLLING ================= */
//   const startPolling = (txnId) => {
//     pollRef.current = setInterval(async () => {
//       try {
//         const res = await api.get(`api/ccrvRapidResultController/${txnId}`);
//         const d = res.data?.data?.data;

//         setStatus(d?.ccrv_status);

//         if (d?.code === "1019" || d?.code === "1020") {
//           setResult(d?.ccrv_data);
//           clearInterval(pollRef.current);
//         }
//       } catch (e) {
//         clearInterval(pollRef.current);
//       }
//     }, 10000);
//   };

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     pdfMake.createPdf({
//       content: [
//         { text: "CCRV Rapid Report", style: "header" },
//         { text: `File Number: ${fileNo}`, marginBottom: 10 },
//         { text: `Case Count: ${result.case_count}`, marginBottom: 10 },
//         {
//           table: {
//             widths: ["20%", "20%", "20%", "20%", "20%"],
//             body: [
//               ["Case No", "Type", "Category", "Status", "Decision Date"],
//               ...result.cases.map((c) => [
//                 safe(c.case_number),
//                 safe(c.case_type),
//                 safe(c.case_category),
//                 safe(c.case_status),
//                 safe(c.case_decision_date),
//               ]),
//             ],
//           },
//         },
//       ],
//       styles: { header: { fontSize: 18, bold: true } },
//       defaultStyle: { fontSize: 10 },
//     }).download(`CCRV_${fileNo}.pdf`);
//   };

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
//             <Form.Label>Name <Required /></Form.Label>
//             <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Father Name</Form.Label>
//             <Form.Control value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Address</Form.Label>
//             <Form.Control value={address} onChange={(e) => setAddress(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Date of Birth</Form.Label>
//             <Form.Control type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>File Number <Required /></Form.Label>
//             <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
//           </Form.Group>

//           <Form.Check
//             className="mt-2"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleSearch}>
//             {loading ? <Spinner size="sm" /> : "Start CCRV Search"}
//           </Button>
//         </Card>

//         {result && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between">
//               <h5>📄 CCRV Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <p>Status: <b>{status}</b></p>
//             <p>Case Count: <b>{result.case_count}</b></p>
//           </Card>
//         )}
//       </Col>
//     </Row>
//   );

// }

// import React, { useEffect, useState, useRef } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";
// import JsonTableViewer from "app/components/JsonTableViewer";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

// export default function FetchCcrvRapid() {
//   const navigate = useNavigate();
//   const { state } = useLocation();

//   const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } =
//     state || {};

//   const [fileNo, setFileNo] = useState("");
//   const [name, setName] = useState("");
//   const [fatherName, setFatherName] = useState("");
//   const [address, setAddress] = useState("");
//   const [dob, setDob] = useState("");
//   const [consent, setConsent] = useState(false);

//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState(null);
//   const [transactionId, setTransactionId] = useState(null);
//   const [result, setResult] = useState(null);

//   const pollRef = useRef(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);

//     const savedTxn = localStorage.getItem("ccrv_txn");

//     if (savedTxn) {
//       setTransactionId(savedTxn);
//       setStatus("PROCESSING");
//       startPolling(savedTxn);
//     }

//     return () => {
//       if (pollRef.current) clearInterval(pollRef.current);
//     };
//   }, []);

//   /* ================= POLLING ================= */

//   const startPolling = (txnId) => {
//     if (pollRef.current) clearInterval(pollRef.current);

//     pollRef.current = setInterval(async () => {
//       try {
//         const res = await api.get(`api/ccrvRapidResult/${txnId}`);

//         const data = res.data?.data?.data;

//         setStatus(data?.ccrv_status || "PROCESSING");

//         if (data?.code === "1019" || data?.code === "1020") {
//           setResult(data?.ccrv_data);

//           clearInterval(pollRef.current);

//           localStorage.removeItem("ccrv_txn");

//           swal.fire("Completed", "CCRV result received", "success");
//         }
//       } catch {
//         clearInterval(pollRef.current);
//       }
//     }, 10000);
//   };

//   /* ================= MANUAL REFRESH ================= */

// const handleRefresh = async () => {

//   if (!transactionId) return;

//   try {

//     const res = await api.get(
//       `api/ccrvRapidResult/${transactionId}`
//     );

//     if (res.data.alreadyCompleted) {

//       swal.fire(
//         "Completed",
//         "Result already fetched earlier",
//         "info"
//       );

//       return;
//     }

//     const data = res.data?.data?.data;

//     setStatus(data?.ccrv_status);

//     if (data?.code === "1019" || data?.code === "1020") {

//       setResult(data?.ccrv_data);

//       localStorage.removeItem("ccrv_txn");

//       swal.fire(
//         "Completed",
//         "CCRV result received",
//         "success"
//       );
//     }

//   } catch {

//     swal.fire(
//       "Error",
//       "Unable to fetch result",
//       "error"
//     );

//   }
// };
//   /* ================= FETCH ================= */

//   const handleFetch = async () => {
//     if (!fileNo || !name || !consent) {
//       swal.fire({
//         title: "Validation Error",
//         html: `
//           <ul style="text-align:left">
//             ${!fileNo ? "<li>File Number required</li>" : ""}
//             ${!name ? "<li>Name required</li>" : ""}
//             ${!consent ? "<li>Consent required</li>" : ""}
//           </ul>
//         `,
//         icon: "warning",
//       });

//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm CCRV Rapid Search",
//       html: `
//         <p><b>Name:</b> ${name}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       /* ================= CACHE CHECK ================= */

//       const checkRes = await api.post("api/checkCcrvRapidCache", {
//         mas_ser_id,
//         mas_cat_id,
//         name,
//         dob,
//       });

//       let useCache = false;

//       if (checkRes.data.hasCache) {
//         const fetchedDate = new Date(
//           checkRes.data.lastFetchedAt,
//         ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

//         const cacheConfirm = await swal.fire({
//           title: "Previous Data Found",
//           html: `Last fetched on <b>${fetchedDate}</b>`,
//           icon: "question",
//           showCancelButton: true,
//           showDenyButton: true,
//           confirmButtonText: "Use Old Data",
//           denyButtonText: "Fetch Fresh",
//           allowOutsideClick: false,
//           allowEscapeKey: false,
//         });

//         if (cacheConfirm.isConfirmed) useCache = true;
//         else if (!cacheConfirm.isDenied) {
//           setLoading(false);
//           return;
//         }
//       }

//       /* ================= EXECUTE ================= */

//       const res = await api.post("api/executeCcrvRapid", {
//         usr_ser_id,
//         mas_ser_id,
//         mas_cat_id,
//         file_no: fileNo,
//         name,
//         father_name: fatherName,
//         address,
//         dob,
//         use_cache: useCache,
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code === "1016") {
//         const txnId = apiData?.data?.transaction_id;

//         setTransactionId(txnId);
//         setStatus("PROCESSING");

//         localStorage.setItem("ccrv_txn", txnId);

//         swal.fire("Search Started", "CCRV search initiated", "success");

//         startPolling(txnId);
//       } else {
//         swal.fire(
//           "Completed",
//           apiData?.data?.message || "Request completed",
//           "info",
//         );
//       }
//     } catch {
//       swal.fire("Service Unavailable", "Please try again later", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF ================= */

//   const exportPdf = () => {
//     if (!result) return;

//     pdfMake
//       .createPdf({
//         content: [
//           { text: "CCRV Rapid Report", style: "header" },

//           { text: `File Number: ${fileNo}`, margin: [0, 10] },

//           { text: `Case Count: ${result.case_count}`, margin: [0, 10] },

//           {
//             table: {
//               widths: ["20%", "20%", "20%", "20%", "20%"],
//               body: [
//                 ["Case No", "Type", "Category", "Status", "Decision Date"],
//                 ...(result.cases || []).map((c) => [
//                   c.case_number || "-",
//                   c.case_type || "-",
//                   c.case_category || "-",
//                   c.case_status || "-",
//                   c.case_decision_date || "-",
//                 ]),
//               ],
//             },
//           },
//         ],

//         styles: {
//           header: { fontSize: 18, bold: true },
//         },

//         defaultStyle: { fontSize: 10 },
//       })
//       .download(`CCRV_${fileNo}.pdf`);
//   };

//   /* ================= STATUS BADGE ================= */

//   const getBadgeVariant = () => {
//     if (status === "COMPLETED") return "success";
//     if (status === "PROCESSING") return "warning";
//     return "secondary";
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

//         {/* FORM */}

//         <Card body className="mb-4">
//           <Row>
//             <Col md={4}>
//               <Form.Label>
//                 File Number <Required />
//               </Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>
//                 Name <Required />
//               </Form.Label>
//               <Form.Control
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>Date of Birth</Form.Label>
//               <Form.Control
//                 type="date"
//                 value={dob}
//                 onChange={(e) => setDob(e.target.value)}
//               />
//             </Col>
//           </Row>

//           <Row className="mt-3">
//             <Col md={4}>
//               <Form.Label>Father Name</Form.Label>
//               <Form.Control
//                 value={fatherName}
//                 onChange={(e) => setFatherName(e.target.value)}
//               />
//             </Col>

//             <Col md={8}>
//               <Form.Label>Address</Form.Label>
//               <Form.Control
//                 value={address}
//                 onChange={(e) => setAddress(e.target.value)}
//               />
//             </Col>
//           </Row>

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

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : "Start CCRV Search"}
//           </Button>
//         </Card>

//         {/* STATUS CARD */}

//         {transactionId && !result && (
//           <Card body className="mb-3">
//             <h5>
//               CCRV Request Status{" "}
//               <Badge bg={getBadgeVariant()}>{status || "PROCESSING"}</Badge>
//             </h5>
//             <p>
//               Transaction ID: <b>{transactionId}</b>
//             </p>
//             <Spinner animation="border" size="sm" /> Processing...
//             <div className="mt-3">
//               <Button variant="outline-primary" onClick={handleRefresh}>
//                 Refresh Status
//               </Button>
//             </div>
//           </Card>
//         )}

//         {/* RESULT */}

//         {result && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>CCRV Result</h5>

//               <Button onClick={exportPdf}>Export PDF</Button>
//             </div>

//             <div style={{ maxHeight: 400, overflow: "auto" }}>
//               <JsonTableViewer data={result} />
//             </div>
//           </Card>
//         )}
//       </Col>
//     </Row>
//   );
// }




// import React, { useEffect, useState } from "react";
// import {
//   Card,
//   Row,
//   Col,
//   Form,
//   Button,
//   Spinner,
//   Badge
// } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";
// import JsonTableViewer from "app/components/JsonTableViewer";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => (
//   <span style={{ color: "red", marginLeft: 4 }}>*</span>
// );

// export default function FetchCcrvRapid() {

//   const navigate = useNavigate();
//   const { state } = useLocation();

//   const {
//     usr_ser_id,
//     mas_ser_id,
//     mas_cat_id,
//     service_name,
//     credits
//   } = state || {};

//   const [fileNo, setFileNo] = useState("");
//   const [name, setName] = useState("");
//   const [fatherName, setFatherName] = useState("");
//   const [address, setAddress] = useState("");
//   const [dob, setDob] = useState("");
//   const [consent, setConsent] = useState(false);

//   const [loading, setLoading] = useState(false);
//   const [transactionId, setTransactionId] = useState(null);
//   const [status, setStatus] = useState(null);
//   const [result, setResult] = useState(null);

//   /* ================= RESUME TRANSACTION ================= */

//   useEffect(() => {

//     if (!usr_ser_id) navigate(-1);

//   const savedTxn = localStorage.getItem("ccrv_txn");

// if (savedTxn) {

//   const parsed = JSON.parse(savedTxn);

//   const age = Date.now() - parsed.createdAt;

//   // expire after 24 hours
//   const MAX_AGE = 24 * 60 * 60 * 1000;

//   if (age > MAX_AGE) {

//     console.log("⚠️ Old transaction cleared");

//     localStorage.removeItem("ccrv_txn");

//   } else {

//     checkStatus(parsed.txnId);

//   }

// }

//   }, []);

//   /* ================= CHECK STATUS FROM DB ================= */

// const checkStatus = async (txnId) => {

//   try {

//     const res = await api.get(`api/getCcrvResult/${txnId}`);

//     if (res.data.status === "not_found") {

//       localStorage.removeItem("ccrv_txn");
//       setTransactionId(null);
//       setStatus(null);
//       return;

//     }

//     if (res.data.status === "processing") {

//       setTransactionId(txnId);
//       setStatus("IN_PROGRESS");

//     }

//     if (res.data.status === "completed") {

//       setTransactionId(txnId);
//       setStatus("COMPLETED");
//       setResult(res.data.data);

//       localStorage.removeItem("ccrv_txn");

//     }

//   } catch {

//     localStorage.removeItem("ccrv_txn");

//   }

// };

//   /* ================= MANUAL REFRESH ================= */

//   const handleRefresh = async () => {

//     if (!transactionId) return;

//     try {

//       const res = await api.get(
//         `api/getCcrvResult/${transactionId}`
//       );

//       if (res.data.status === "processing") {

//         setStatus("IN_PROGRESS");

//         swal.fire(
//           "Still Processing",
//           "Result not ready yet",
//           "info"
//         );

//       }
//       else if (res.data.status === "completed") {

//         setStatus("COMPLETED");
//         setResult(res.data.data);

//         localStorage.removeItem("ccrv_txn");

//         swal.fire(
//           "Completed",
//           "CCRV result received",
//           "success"
//         );

//       }

//     } catch {

//       swal.fire(
//         "Error",
//         "Unable to fetch result",
//         "error"
//       );

//     }

//   };

//   /* ================= FETCH SEARCH ================= */

//   const handleFetch = async () => {

//     if (!fileNo || !name || !consent) {

//       swal.fire({
//         title: "Validation Error",
//         html: `
//           <ul style="text-align:left">
//             ${!fileNo ? "<li>File Number is required</li>" : ""}
//             ${!name ? "<li>Name is required</li>" : ""}
//             ${!consent ? "<li>Consent is required</li>" : ""}
//           </ul>
//         `,
//         icon: "warning"
//       });

//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm CCRV Rapid Search",
//       html: `
//         <p><b>Name:</b> ${name}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed"
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {

//       /* ================= CACHE CHECK ================= */

//      /* ================= CACHE CHECK ================= */

// const cacheRes = await api.post(
//   "api/checkCcrvRapidCache",
//   { mas_ser_id, mas_cat_id, name, dob }
// );

// /* ================= PROCESSING CHECK ================= */

// if (cacheRes.data.status === "processing") {

//   const txnId = cacheRes.data.transaction_id;

//   setTransactionId(txnId);
//   setStatus("IN_PROGRESS");

//   localStorage.setItem(
//   "ccrv_txn",
//   JSON.stringify({
//     txnId,
//     createdAt: Date.now()
//   })
// );

//   swal.fire(
//     "Search Already Running",
//     "This record is already being processed. You can refresh the status.",
//     "info"
//   );

//   setLoading(false);
//   return;
// }

//       let useCache = false;

//       if (cacheRes.data.hasCache) {

//         const fetchedDate = new Date(
//           cacheRes.data.lastFetchedAt
//         ).toLocaleString("en-IN");

//         const cacheConfirm = await swal.fire({
//           title: "Previous Data Found",
//           html: `Last fetched on <b>${fetchedDate}</b>`,
//           icon: "question",
//           showCancelButton: true,
//           showDenyButton: true,
//           confirmButtonText: "Use Old Data",
//           denyButtonText: "Fetch Fresh"
//         });

//         if (cacheConfirm.isConfirmed) useCache = true;
//         else if (!cacheConfirm.isDenied) {
//           setLoading(false);
//           return;
//         }
//       }

//       /* ================= EXECUTE SEARCH ================= */

//       const res = await api.post("api/executeCcrvRapid", {
//         usr_ser_id,
//         mas_ser_id,
//         mas_cat_id,
//         file_no: fileNo,
//         name,
//         father_name: fatherName,
//         address,
//         dob,
//         use_cache: useCache
//       });

//       const txnId = res.data?.data?.data?.transaction_id;

//       if (txnId) {

//         setTransactionId(txnId);
//         setStatus("IN_PROGRESS");

//         localStorage.setItem("ccrv_txn", txnId);

//         swal.fire(
//           "Search Started",
//           "CCRV search initiated",
//           "success"
//         );

//       }

//     } catch {

//       swal.fire(
//         "Service Unavailable",
//         "Please try again later",
//         "error"
//       );

//     } finally {

//       setLoading(false);

//     }

//   };

//   /* ================= RESET ================= */

//   const resetRequest = () => {

//     localStorage.removeItem("ccrv_txn");

//     setTransactionId(null);
//     setStatus(null);
//     setResult(null);

//   };

//   /* ================= EXPORT PDF ================= */

//   const exportPdf = () => {

//     if (!result) return;

//     pdfMake.createPdf({

//       content: [

//         { text: "CCRV Rapid Report", style: "header" },

//         { text: `File Number: ${fileNo}`, margin: [0, 10] },

//         {
//           table: {
//             widths: ["20%", "20%", "20%", "20%", "20%"],
//             body: [
//               ["Case No", "Type", "Category", "Status", "Decision Date"],
//               ...(result.cases || []).map((c) => [
//                 c.case_number || "-",
//                 c.case_type || "-",
//                 c.case_category || "-",
//                 c.case_status || "-",
//                 c.case_decision_date || "-"
//               ])
//             ]
//           }
//         }

//       ],

//       styles: { header: { fontSize: 18, bold: true } }

//     }).download(`CCRV_${fileNo}.pdf`);

//   };

//   const getBadgeVariant = () => {

//     if (status === "COMPLETED") return "success";
//     if (status === "IN_PROGRESS") return "warning";
//     return "secondary";

//   };

//   return (
//     <Row>

//       <Col md={12}>

//         <Card body className="mb-3">

//           <Button onClick={() => navigate(-1)}>← Back</Button>

//           <h4 className="mt-3">{service_name}</h4>

//           <p>Credits Required: <b>{credits}</b></p>

//         </Card>

//         <Card body className="mb-4">

//           <Row>

//             <Col md={4}>
//               <Form.Label>File Number <Required/></Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e)=>setFileNo(e.target.value)}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>Name <Required/></Form.Label>
//               <Form.Control
//                 value={name}
//                 onChange={(e)=>setName(e.target.value)}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>Date of Birth</Form.Label>
//               <Form.Control
//                 type="date"
//                 value={dob}
//                 onChange={(e)=>setDob(e.target.value)}
//               />
//             </Col>

//           </Row>

//           <Row className="mt-3">

//             <Col md={4}>
//               <Form.Label>Father Name</Form.Label>
//               <Form.Control
//                 value={fatherName}
//                 onChange={(e)=>setFatherName(e.target.value)}
//               />
//             </Col>

//             <Col md={8}>
//               <Form.Label>Address</Form.Label>
//               <Form.Control
//                 value={address}
//                 onChange={(e)=>setAddress(e.target.value)}
//               />
//             </Col>

//           </Row>

//           <Form.Check
//             className="mt-3"
//             label={<>I give consent <Required/></>}
//             checked={consent}
//             onChange={(e)=>setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             disabled={loading}
//             onClick={handleFetch}
//           >
//             {loading ? <Spinner size="sm"/> : "Start CCRV Search"}
//           </Button>

//         </Card>

//         {transactionId && !result && (

//           <Card body className="mb-3">

//             <h5>
//               CCRV Request Status{" "}
//               <Badge bg={getBadgeVariant()}>
//                 {status}
//               </Badge>
//             </h5>

//             <p>Transaction ID: <b>{transactionId}</b></p>

//             <Spinner animation="border" size="sm"/> Processing...

//             <div className="mt-3">

//               <Button
//                 variant="outline-primary"
//                 onClick={handleRefresh}
//               >
//                 Refresh Status
//               </Button>

//               <Button
//                 variant="outline-danger"
//                 className="ms-2"
//                 onClick={resetRequest}
//               >
//                 Reset
//               </Button>

//             </div>

//           </Card>

//         )}

//         {result && (

//           <Card body>

//             <div className="d-flex justify-content-between">

//               <h5>CCRV Result</h5>

//               <Button onClick={exportPdf}>
//                 Export PDF
//               </Button>

//             </div>

//             <div style={{maxHeight:400,overflow:"auto"}}>
//               <JsonTableViewer data={result}/>
//             </div>

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
  Badge
} from "react-bootstrap";

import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "app/components/JsonTableViewer";

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FetchCcrvRapid() {

  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits
  } = state || {};

  const [fileNo,setFileNo] = useState("");
  const [name,setName] = useState("");
  const [fatherName,setFatherName] = useState("");
  const [address,setAddress] = useState("");
  const [dob,setDob] = useState("");
  const [consent,setConsent] = useState(false);

  const [loading,setLoading] = useState(false);

  const [transactionId,setTransactionId] = useState(null);
  const [status,setStatus] = useState(null);
  const [result,setResult] = useState(null);

  /* ================= RESUME TRANSACTION ================= */

  useEffect(()=>{

    if(!usr_ser_id) navigate(-1);

    const saved = localStorage.getItem("ccrv_txn");

    if(saved){

      const parsed = JSON.parse(saved);

      const age = Date.now() - parsed.createdAt;

      if(age > 24*60*60*1000){

        localStorage.removeItem("ccrv_txn");

      }else{

        setTransactionId(parsed.txnId);
        setStatus("IN_PROGRESS");

        checkStatus(parsed.txnId);

      }

    }

  },[]);

  /* ================= RESULT CHECK ================= */

  const checkStatus = async (txnId)=>{

    try{

      const res = await api.get(
        `api/getCcrvResult/${txnId}`
      );

      if(res.data.status === "processing"){

        setStatus("IN_PROGRESS");

      }

      if(res.data.status === "completed"){

        setStatus("COMPLETED");

        setResult(res.data.data);

        localStorage.removeItem("ccrv_txn");

      }

      if(res.data.status === "not_found"){

        resetRequest();

      }

    }catch{

      console.log("Result fetch failed");

    }

  };

  /* ================= MANUAL REFRESH ================= */

  const handleRefresh = async ()=>{

    if(!transactionId) return;

    await checkStatus(transactionId);

  };

  /* ================= SEARCH ================= */

  const handleFetch = async ()=>{

    if(!fileNo || !name || !consent){

      swal.fire(
        "Validation Error",
        "Required fields missing",
        "warning"
      );

      return;

    }

    const confirm = await swal.fire({

      title:"Confirm CCRV Search",

      html:`
        <p><b>Name:</b> ${name}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,

      showCancelButton:true,
      confirmButtonText:"Proceed"

    });

    if(!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try{

      /* ================= CACHE CHECK ================= */

      const cacheRes = await api.post(
        "api/checkCcrvRapidCache",
        { mas_ser_id, mas_cat_id, name, dob }
      );

      if(cacheRes.data.hasCache){

        const fetchedDate = new Date(
          cacheRes.data.lastFetchedAt
        ).toLocaleString("en-IN");

        const cacheConfirm = await swal.fire({

          title:"Previous Data Found",

          html:`Last fetched on <b>${fetchedDate}</b>`,

          icon:"question",

          showCancelButton:true,

          showDenyButton:true,

          confirmButtonText:"Use Old Data",

          denyButtonText:"Fetch Fresh"

        });

        if(cacheConfirm.isConfirmed){

          setResult(cacheRes.data.data);

          setStatus("COMPLETED");

          return;

        }

      }

      /* ================= EXECUTE SEARCH ================= */

      const res = await api.post(
        "api/executeCcrvRapid",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no:fileNo,
          name,
          father_name:fatherName,
          address,
          dob
        }
      );

      const txnId = res.data?.data?.data?.transaction_id;

      if(txnId){

        setTransactionId(txnId);

        setStatus("IN_PROGRESS");

        localStorage.setItem(
          "ccrv_txn",
          JSON.stringify({
            txnId,
            createdAt:Date.now()
          })
        );

        swal.fire(
          "Search Started",
          "CCRV verification initiated",
          "success"
        );

      }

    }catch{

      swal.fire(
        "Service Error",
        "Unable to start search",
        "error"
      );

    }finally{

      setLoading(false);

    }

  };

  /* ================= RESET ================= */

  const resetRequest = ()=>{

    localStorage.removeItem("ccrv_txn");

    setTransactionId(null);
    setStatus(null);
    setResult(null);

  };

  /* ================= BADGE COLOR ================= */

  const badgeVariant = ()=>{

    if(status === "COMPLETED") return "success";

    if(status === "IN_PROGRESS") return "warning";

    return "secondary";

  };

  return (

    <Row>

      <Col md={12}>

        <Card body className="mb-3">

          <Button onClick={()=>navigate(-1)}>
            ← Back
          </Button>

          <h4 className="mt-3">{service_name}</h4>

          <p>
            Credits Required: <b>{credits}</b>
          </p>

        </Card>

        {/* INPUT FORM */}

        <Card body className="mb-4">

          <Row>

            <Col md={4}>
              <Form.Label>
                File Number <Required/>
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e)=>setFileNo(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>
                Name <Required/>
              </Form.Label>
              <Form.Control
                value={name}
                onChange={(e)=>setName(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>Date of Birth</Form.Label>
              <Form.Control
                type="date"
                value={dob}
                onChange={(e)=>setDob(e.target.value)}
              />
            </Col>

          </Row>

          <Row className="mt-3">

            <Col md={4}>
              <Form.Label>Father Name</Form.Label>
              <Form.Control
                value={fatherName}
                onChange={(e)=>setFatherName(e.target.value)}
              />
            </Col>

            <Col md={8}>
              <Form.Label>Address</Form.Label>
              <Form.Control
                value={address}
                onChange={(e)=>setAddress(e.target.value)}
              />
            </Col>

          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required/></>}
            checked={consent}
            onChange={(e)=>setConsent(e.target.checked)}
          />

          <Button
            className="mt-3"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading
              ? <Spinner size="sm"/>
              : "Start CCRV Search"}
          </Button>

        </Card>

        {/* STATUS CARD */}

        {transactionId && !result && (

          <Card body className="mb-3">

            <h5>

              CCRV Request Status{" "}

              <Badge bg={badgeVariant()}>
                {status}
              </Badge>

            </h5>

            <p>
              Transaction ID:
              <b> {transactionId}</b>
            </p>

            <Spinner
              animation="border"
              size="sm"
            /> Processing...

            <div className="mt-3">

              <Button
                variant="outline-primary"
                onClick={handleRefresh}
              >
                Refresh Status
              </Button>

              <Button
                variant="outline-danger"
                className="ms-2"
                onClick={resetRequest}
              >
                Reset
              </Button>

            </div>

          </Card>

        )}

        {/* RESULT */}

        {result && (

          <Card body>

            <h5>CCRV Result</h5>

            <div style={{
              maxHeight:400,
              overflow:"auto"
            }}>
              <JsonTableViewer data={result}/>
            </div>

          </Card>

        )}

      </Col>

    </Row>

  );

}