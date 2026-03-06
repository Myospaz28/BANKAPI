// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchNationalIdsByPhone() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [phone, setPhone] = useState("");
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
//   const [pan, setPan] = useState("");
//   const [fileNo, setFileNo] = useState("");
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

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     if (!phone || phone.length !== 10 || !firstName || !fileNo || !consent) {
//       swal.fire(
//         "Validation Error",
//         "Phone, First Name, File Number and Consent are required",
//         "warning"
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm National ID Fetch",
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Available Credits:</b> ${wallet}</p>
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
//       const res = await api.post(
//         "api/fetchNationalIdsByPhoneController",
//         {
//           usr_ser_id,
//           phone,
//           first_name: firstName,
//           last_name: lastName || "",
//           pan: pan || "",
//           consent_text: "I provide consent to fetch information.",
//           file_no: fileNo,
//           consent: "Y",
//         }
//       );

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code === "1004") {
//         swal.fire("No Records", "No national IDs found", "info");
//         return;
//       }

//       if (code !== "1001") {
//         swal.fire("Failed", "Unable to fetch national IDs", "error");
//         return;
//       }

//       setResult(apiData);

//       swal.fire(
//         "Success",
//         `
//         National IDs fetched successfully<br/>
//         Credits Deducted: <b>${credits}</b><br/>
//         Remaining Credits: <b>${wallet - credits}</b>
//         `,
//         "success"
//       );

//       fetchWallet();
//     } catch (err) {
//       swal.fire(
//         "Error",
//         err.response?.data?.message || "Server error",
//         "error"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     const data = result?.data?.national_document_data;
//     if (!data) return;

//     const rows = [];
//     Object.entries(data).forEach(([docType, docs]) => {
//       docs.forEach((d) => {
//         rows.push([
//           docType.toUpperCase(),
//           d.serial_number,
//           d.value,
//         ]);
//       });
//     });

//     const doc = {
//       content: [
//         { text: "National IDs Report", style: "header" },
//         { text: `File Number: ${fileNo}`, marginBottom: 10 },

//         {
//           table: {
//             headerRows: 1,
//             widths: ["30%", "20%", "50%"],
//             body: [
//               ["Document Type", "Serial No", "Value"],
//               ...rows,
//             ],
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

//     pdfMake.createPdf(doc).download(`NATIONAL_IDS_${fileNo}.pdf`);
//   };

//   const docs = result?.data?.national_document_data;

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button variant="primary" onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p className="text-muted">
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mb-4">
//           <Row>
//             <Col md={4}>
//               <Form.Label>Phone <Required /></Form.Label>
//               <Form.Control
//                 maxLength={10}
//                 value={phone}
//                 onChange={(e) =>
//                   setPhone(e.target.value.replace(/\D/g, ""))
//                 }
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>First Name <Required /></Form.Label>
//               <Form.Control
//                 value={firstName}
//                 onChange={(e) => setFirstName(e.target.value)}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>Last Name</Form.Label>
//               <Form.Control
//                 value={lastName}
//                 onChange={(e) => setLastName(e.target.value)}
//               />
//             </Col>
//           </Row>

//           <Row className="mt-3">
//             <Col md={4}>
//               <Form.Label>PAN</Form.Label>
//               <Form.Control
//                 value={pan}
//                 onChange={(e) => setPan(e.target.value.toUpperCase())}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>File Number <Required /></Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             type="checkbox"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             variant="primary"
//             disabled={loading}
//             onClick={handleFetch}
//           >
//             {loading ? <Spinner size="sm" /> : "Fetch National IDs"}
//           </Button>
//         </Card>

//         {docs && (
//           <Card body>
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>National IDs</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <thead>
//                 <tr>
//                   <th>Document Type</th>
//                   <th>Serial No</th>
//                   <th>Value</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {Object.entries(docs).map(([type, values]) =>
//                   values.map((v, i) => (
//                     <tr key={`${type}-${i}`}>
//                       <td>{type.toUpperCase()}</td>
//                       <td>{v.serial_number}</td>
//                       <td>{v.value}</td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </Table>
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
//   Badge,
//   Table,
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

// const safe = (v) =>
//   v === undefined || v === null || v === "" ? "-" : v;

// export default function FetchNationalIdsByPhone() {
//   const navigate = useNavigate();
//   const { state } = useLocation();

//   const {
//     usr_ser_id,
//     mas_ser_id,
//     mas_cat_id,
//     service_name,
//     credits,
//   } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [phone, setPhone] = useState("");
//   const [fullName, setFullName] = useState("");
//   const [dob, setDob] = useState("");
//   const [pan, setPan] = useState("");
//   const [address, setAddress] = useState("");
//   const [stateCode, setStateCode] = useState("");
//   const [pincode, setPincode] = useState("");
//   const [fileNo, setFileNo] = useState("");
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

//   const getBadgeVariant = (code) => {
//     if (code === "1001") return "success";
//     if (code === "1004") return "danger";
//     return "secondary";
//   };

//   const handleFetch = async () => {
//     if (loading) return;

//     if (
//       !phone ||
//       !fullName ||
//       !dob ||
//       !pan ||
//       !address ||
//       !stateCode ||
//       !pincode ||
//       !fileNo ||
//       !consent
//     ) {
//       swal.fire({
//         title: "Validation Error",
//         html: `
//           <ul style="text-align:left">
//             ${!phone ? "<li>Phone is required</li>" : ""}
//             ${!fullName ? "<li>Full Name is required</li>" : ""}
//             ${!dob ? "<li>Date of Birth is required</li>" : ""}
//             ${!pan ? "<li>PAN is required</li>" : ""}
//             ${!address ? "<li>Address is required</li>" : ""}
//             ${!stateCode ? "<li>State is required</li>" : ""}
//             ${!pincode ? "<li>Pincode is required</li>" : ""}
//             ${!fileNo ? "<li>File Number is required</li>" : ""}
//             ${!consent ? "<li>Consent is required</li>" : ""}
//           </ul>
//         `,
//         icon: "warning",
//       });
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm National ID Fetch",
//       html: `<p><b>Phone:</b> ${phone}</p>
//              <p><b>Name:</b> ${fullName}</p>
//              <p><b>File No:</b> ${fileNo}</p>`,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const executeRes = await api.post(
//         "api/executeNationalIdsByPhone",
//         {
//           usr_ser_id,
//           mas_ser_id,
//           mas_cat_id,
//           file_no: fileNo,
//           phone,
//           full_name: fullName,
//           date_of_birth: dob,
//           pan,
//           address,
//           state: stateCode,
//           pincode,
//           consent: "Y",
//         }
//       );

//       const apiData = executeRes.data?.data;
//       const code = apiData?.data?.code;

//       setResult(apiData);
//       fetchWallet();

//       if (code === "1001") {
//         swal.fire("Success", apiData?.data?.message, "success");
//       } else if (code === "1004") {
//         swal.fire("No Records Found", apiData?.data?.message, "warning");
//       } else {
//         swal.fire("Completed", apiData?.data?.message, "info");
//       }
//     } catch (err) {
//       swal.fire("Error", err.response?.data?.message || "Server error", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const docs = result?.data?.national_document_data;
//   const code = result?.data?.code;

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>Credits Required: <b>{credits}</b></p>
//         </Card>

//         <Card body className="mt-3">
//           <Row>
//             <Col md={4}>
//               <Form.Label>Phone <Required /></Form.Label>
//               <Form.Control value={phone} onChange={(e)=>setPhone(e.target.value)} />
//             </Col>
//             <Col md={4}>
//               <Form.Label>Full Name <Required /></Form.Label>
//               <Form.Control value={fullName} onChange={(e)=>setFullName(e.target.value)} />
//             </Col>
//             <Col md={4}>
//               <Form.Label>Date of Birth <Required /></Form.Label>
//               <Form.Control type="date" value={dob} onChange={(e)=>setDob(e.target.value)} />
//             </Col>
//           </Row>

//           <Row className="mt-3">
//             <Col md={4}>
//               <Form.Label>PAN <Required /></Form.Label>
//               <Form.Control value={pan} onChange={(e)=>setPan(e.target.value.toUpperCase())} />
//             </Col>
//             <Col md={4}>
//               <Form.Label>State <Required /></Form.Label>
//               <Form.Control value={stateCode} onChange={(e)=>setStateCode(e.target.value)} />
//             </Col>
//             <Col md={4}>
//               <Form.Label>Pincode <Required /></Form.Label>
//               <Form.Control value={pincode} onChange={(e)=>setPincode(e.target.value)} />
//             </Col>
//           </Row>

//           <Form.Group className="mt-3">
//             <Form.Label>Address <Required /></Form.Label>
//             <Form.Control as="textarea" rows={2} value={address} onChange={(e)=>setAddress(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-3">
//             <Form.Label>File Number <Required /></Form.Label>
//             <Form.Control value={fileNo} onChange={(e)=>setFileNo(e.target.value)} />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e)=>setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : "Fetch National IDs"}
//           </Button>
//         </Card>

//         {result && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between">
//               <h5>
//                 Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
//               </h5>
//             </div>

//             <JsonTableViewer data={result} />

//             {docs && (
//               <Table bordered className="mt-3">
//                 <thead>
//                   <tr>
//                     <th>Document Type</th>
//                     <th>Serial No</th>
//                     <th>Value</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {Object.entries(docs).map(([type, values]) =>
//                     values.map((v, i) => (
//                       <tr key={`${type}-${i}`}>
//                         <td>{type.toUpperCase()}</td>
//                         <td>{v.serial_number}</td>
//                         <td>{v.value}</td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </Table>
//             )}
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
  Table,
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

const safe = (v) =>
  v === undefined || v === null || v === "" ? "-" : v;

export default function FetchNationalIdsByPhone() {
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
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pan, setPan] = useState("");
  const [fileNo, setFileNo] = useState("");
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

  const getBadgeVariant = (code) => {
    if (code === "1001") return "success";
    if (code === "1004") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
const handleFetch = async () => {
  if (!phone || !firstName || !fileNo || !consent) {
    swal.fire({
      title: "Validation Error",
      html: `
        <ul style="text-align:left">
          ${!phone ? "<li>Phone is required</li>" : ""}
          ${!firstName ? "<li>First Name is required</li>" : ""}
          ${!fileNo ? "<li>File Number is required</li>" : ""}
          ${!consent ? "<li>Consent is required</li>" : ""}
        </ul>
      `,
      icon: "warning",
    });
    return;
  }

  if (phone.length !== 10) {
    swal.fire("Invalid Phone", "Phone must be 10 digits", "warning");
    return;
  }

  if (wallet < credits) {
    swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
    return;
  }

  const confirm = await swal.fire({
    title: "Confirm National ID Fetch",
    html: `
      <p><b>Phone:</b> ${phone}</p>
      <p><b>First Name:</b> ${firstName}</p>
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
      "api/checkNationalIdsByPhoneCache",
      {
        mas_ser_id,
        mas_cat_id,
        phone,
        pan_number: pan || "",
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
             customClass: {
            confirmButton: "btn-use-old",
            denyButton: "btn-fetch-fresh",
          },
            allowOutsideClick: false,
          allowEscapeKey: false,
      });

      if (cacheConfirm.isConfirmed) {
        useCache = true;
      } else if (!cacheConfirm.isDenied) {
        setLoading(false);
        return;
      }
    }

    /* ================= EXECUTE ================= */
    const executeRes = await api.post(
      "api/executeNationalIdsByPhone",
      {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        phone,
        first_name: firstName,
        last_name: lastName || "",
        pan: pan || "",
        consent: "Y",
        use_cache: useCache,
      }
    );

    const apiData = executeRes.data?.data;
    const code = apiData?.data?.code;

    setResult(apiData);
    fetchWallet();

    /* ================= RESULT ALERT ================= */
    if (code === "1001") {
      swal.fire("Success", apiData?.data?.message, "success");
    } else if (code === "1004") {
      swal.fire("No Records Found", apiData?.data?.message, "info");
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

  const d = result?.data?.national_document_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const rows = [];

  Object.entries(d).forEach(([type, values]) => {
    values.forEach((v) => {
      rows.push([
        type.toUpperCase(),
        safe(v.serial_number),
        safe(v.value),
      ]);
    });
  });

  const doc = {
    content: [
      { text: "National IDs Report", style: "header" },

      {
        table: {
          widths: ["40%", "60%"],
          body: [
            ["File Number", fileNo],
            ["Transaction ID", transactionId],
            ["Request ID", requestId],
          ],
        },
        layout: "lightHorizontalLines",
      },

      { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

      {
        text: "National Documents",
        style: "section",
        margin: [0, 15, 0, 8],
      },

      {
        table: {
          headerRows: 1,
          widths: ["30%", "30%", "40%"],
          body: [
            [
              { text: "Document Type", bold: true },
              { text: "Serial No", bold: true },
              { text: "Value", bold: true },
            ],
            ...rows,
          ],
        },
        layout: "lightHorizontalLines",
      },
    ],

    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 15] },
      section: { fontSize: 14, bold: true },
    },

    defaultStyle: { fontSize: 9 },
  };

  pdfMake.createPdf(doc).download(`NATIONAL_IDS_${fileNo}.pdf`);
};

  const docs = result?.data?.national_document_data;
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
            <Col md={4}>
              <Form.Label>Phone <Required /></Form.Label>
              <Form.Control
                maxLength={10}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, ""))
                }
              />
            </Col>

            <Col md={4}>
              <Form.Label>First Name <Required /></Form.Label>
              <Form.Control
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={4}>
              <Form.Label>PAN</Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) =>
                  setPan(e.target.value.toUpperCase())
                }
              />
            </Col>

            <Col md={4}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
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
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch National IDs"}
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

              {docs && (
                <Button
                  variant="outline-primary"
                  onClick={exportPdf}
                >
                  Export PDF
                </Button>
              )}
            </div>

            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}