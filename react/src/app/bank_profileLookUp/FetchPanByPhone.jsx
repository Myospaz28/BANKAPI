// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchPanByPhone() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [phone, setPhone] = useState("");
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
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

//   /* ================= FETCH PAN ================= */
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
//       title: "Confirm PAN Fetch",
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
//       const res = await api.post("api/fetchPanByPhoneController", {
//         usr_ser_id,
//         phone,
//         first_name: firstName,
//         last_name: lastName || "",
//         consent_text: "I provide consent to fetch information.",
//         file_no: fileNo,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code === "1004") {
//         swal.fire("No Records", "No PAN found", "info");
//         return;
//       }

//       if (code !== "1003") {
//         swal.fire("Failed", "Unable to fetch PAN", "error");
//         return;
//       }

//       setResult(apiData);

//       swal.fire(
//         "Success",
//         `
//         PAN fetched successfully<br/>
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
//     const panData = result?.data?.pan_data;
//     if (!panData || panData.length === 0) return;

//     const safe = (v) =>
//       v === null || v === undefined || v === "" ? "-" : String(v);

//     const doc = {
//       content: [
//         { text: "PAN Report", style: "header" },
//         { text: `File Number: ${fileNo}`, marginBottom: 10 },

//         {
//           table: {
//             headerRows: 1,
//             widths: ["20%", "80%"],
//             body: [
//               ["#", "PAN Number"],
//               ...panData.map((p) => [
//                 safe(p.serial_number),
//                 safe(p.value),
//               ]),
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

//     pdfMake.createPdf(doc).download(`PAN_${fileNo}.pdf`);
//   };

//   const panData = result?.data?.pan_data || [];

//   /* ================= UI ================= */
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
//             {loading ? <Spinner size="sm" /> : "Fetch PAN"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {panData.length > 0 && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>PAN Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>PAN Number</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {panData.map((p, i) => (
//                   <tr key={i}>
//                     <td>{p.serial_number}</td>
//                     <td>{p.value}</td>
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
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "app/components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

export default function FetchPanByPhone() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INITIAL LOAD ================= */
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
    if (code === "1003") return "success";
    if (code === "1004") return "warning";
    return "danger";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ================= VALIDATION ================= */
    if (!phone || !firstName || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
        <ul style="text-align:left">
          ${!phone ? "<li>Phone Number is required</li>" : ""}
          ${!firstName ? "<li>First Name is required</li>" : ""}
          ${!fileNo ? "<li>File Number is required</li>" : ""}
          ${!consent ? "<li>Consent is required</li>" : ""}
        </ul>
      `,
        icon: "warning",
      });
      return;
    }

    /* ================= WALLET CHECK ================= */
    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    /* ================= CONFIRM ================= */
    const confirm = await swal.fire({
      title: "Confirm PAN Fetch",
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
      const checkRes = await api.post("api/checkPanByPhoneCache", {
        mas_ser_id,
        mas_cat_id,
        phone,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
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
      const executeRes = await api.post("api/executePanByPhone", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        phone,
        first_name: firstName,
        last_name: lastName || "",
        use_cache: useCache,
      });

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      /* ================= RESPONSE HANDLING ================= */
      if (code === "1003") {
        swal.fire({
          title: "Success",
          html: apiData?.data?.message,
          icon: "success",
        });
      } else if (code === "1004") {
        swal.fire("No Records Found", apiData?.data?.message, "warning");
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "info");
      }
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Server error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const transactionId = result?.transaction_id || "-";
    const requestId = result?.request_id || "-";
    const panData = result?.data?.pan_data || [];

    const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

    const doc = {
      content: [
        { text: "PAN Detailed Report", style: "header" },
        { text: `File Number: ${fileNo}` },
        { text: `Transaction ID: ${transactionId}` },
        { text: `Request ID: ${requestId}` },

        { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

        { text: "PAN Details", style: "section", margin: [0, 12, 0, 6] },

        {
          table: {
            widths: ["30%", "70%"],
            body: [
              ["Serial Number", "PAN Number"],
              ...panData.map((p) => [safe(p.serial_number), safe(p.value)]),
            ],
          },
          layout: "lightHorizontalLines",
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          margin: [0, 15, 0, 0],
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        section: { fontSize: 14, bold: true },
      },
      defaultStyle: { fontSize: 10 },
    };

    pdfMake.createPdf(doc).download(`PAN_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

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
            <Col md={4}>
              <Form.Label>
                Phone <Required />
              </Form.Label>
              <Form.Control
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </Col>

            <Col md={4}>
              <Form.Label>
                First Name <Required />
              </Form.Label>
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
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : "Fetch PAN"}
          </Button>
        </Card>
        {result && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
              </h5>

              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
