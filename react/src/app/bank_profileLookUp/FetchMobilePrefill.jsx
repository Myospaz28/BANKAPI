// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) => (v ? v : "-");

// export default function FetchMobilePrefill() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [mobile, setMobile] = useState("");
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
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
//     if (!fileNo || !mobile || !consent) {
//       swal.fire("Validation Error", "Required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//  const confirm = await swal.fire({
//   title: "Confirm Mobile Prefill Fetch",
//   html: `
//     <p><b>Mobile Number:</b> ${mobile}</p>
//     <p><b>File Number:</b> ${fileNo}</p>
//     <p><b>Credits Required:</b> ${credits}</p>
//     <p><b>Available Wallet Balance:</b> ${wallet}</p>
//   `,
//   icon: "question",
//   showCancelButton: true,
//   confirmButtonText: "Proceed",
// });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchMobilePrefillController", {
//         usr_ser_id,
//         file_no: fileNo,
//         mobile_number: mobile,
//         first_name: firstName,
//         last_name: lastName,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const grid = apiData?.data || apiData;

//       if (grid?.code === "1015") {
//         setResult(apiData);
//       swal.fire(
//   "Success",
//   `
//   Mobile Prefill fetched successfully<br/>
//   Credits Deducted: <b>${credits}</b><br/>
//   Remaining Wallet Balance: <b>${wallet - credits}</b>
//   `,
//   "success"
// );
//         fetchWallet();
//       } else if (grid?.code === "1004") {
//         swal.fire("No Records", grid.message, "info");
//       } else {
//         swal.fire("Failed", grid?.message || "Failed", "warning");
//       }
//     } catch {
//       swal.fire("Error", "Service unavailable", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const personal = result?.data?.personal_data;

//   /* ================= EXPORT PDF ================= */
// const exportPdf = async () => {
//   const pdfMake = (await import("pdfmake/build/pdfmake")).default;
//   const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;
//   pdfMake.vfs = pdfFonts.vfs;

//   const tableBlock = (rows) => ({
//     table: {
//       widths: ["35%", "65%"],
//       body: rows.map((r) => [
//         { text: r[0], bold: true },
//         r[1] || "-",
//       ]),
//     },
//     layout: "lightHorizontalLines",
//     marginBottom: 10,
//   });

//   const doc = {
//     content: [
//       { text: "Mobile Prefill Report", style: "header" },
//       { text: `File Number: ${fileNo}`, marginBottom: 5 },
//       { text: `Mobile Number: ${mobile}`, marginBottom: 10 },

//       { text: "Personal Information", style: "sub" },
//       tableBlock([
//         ["Full Name", personal?.personal_information?.full_name],
//         ["Gender", personal?.personal_information?.gender],
//         ["Age", personal?.personal_information?.age],
//         ["Date of Birth", personal?.personal_information?.date_of_birth],
//       ]),

//       { text: "Document Details", style: "sub" },
//       tableBlock([
//         ["PAN", personal?.document_data?.pan?.[0]?.value],
//       ]),

//       { text: "Contact Details", style: "sub" },
//       tableBlock([
//         ["Email", personal?.email?.[0]?.value],
//         ["Alternate Mobile", personal?.alternate_phone?.[0]?.value],
//       ]),

//       { text: "Address History", style: "sub" },
//       ...(personal?.address || []).map((a, i) =>
//         tableBlock([
//           ["Address", a.detailed_address],
//           ["State", a.state],
//           ["Pincode", a.pincode],
//         ])
//       ),

//       {
//         text: `Generated On: ${new Date().toLocaleString()}`,
//         marginTop: 15,
//         fontSize: 9,
//         italics: true,
//       },
//     ],
//     styles: {
//       header: { fontSize: 18, bold: true, marginBottom: 10 },
//       sub: { fontSize: 14, bold: true, marginTop: 10 },
//     },
//   };

//   pdfMake.createPdf(doc).download(`MOBILE_PREFILL_${fileNo}.pdf`);
// };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>Credits Required: <b>{credits}</b></p>
//         </Card>

//         <Card body className="mt-3">
//           <Form.Group>
//             <Form.Label>File No <Required /></Form.Label>
//             <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Mobile <Required /></Form.Label>
//             <Form.Control value={mobile} maxLength={10} onChange={(e) => setMobile(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>First Name</Form.Label>
//             <Form.Control value={firstName} onChange={(e) => setFirstName(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Last Name</Form.Label>
//             <Form.Control value={lastName} onChange={(e) => setLastName(e.target.value)} />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Fetch Mobile Prefill"}
//           </Button>
//         </Card>

//      {personal && (
//   <Card body className="mt-4">
//     <div className="d-flex justify-content-between">
//       <h5>📄 Mobile Prefill Details</h5>
//       <Button variant="outline-primary" onClick={exportPdf}>
//         Export PDF
//       </Button>
//     </div>

//     {/* ================= PERSONAL INFO ================= */}
//     <h6 className="mt-4">Personal Information</h6>
//     <Table bordered>
//       <tbody>
//         <tr>
//           <th>Full Name</th>
//           <td>{safe(personal?.personal_information?.full_name)}</td>
//         </tr>
//         <tr>
//           <th>Gender</th>
//           <td>{safe(personal?.personal_information?.gender)}</td>
//         </tr>
//         <tr>
//           <th>Age</th>
//           <td>{safe(personal?.personal_information?.age)}</td>
//         </tr>
//         <tr>
//           <th>Date of Birth</th>
//           <td>{safe(personal?.personal_information?.date_of_birth)}</td>
//         </tr>
//       </tbody>
//     </Table>

//     {/* ================= DOCUMENT DETAILS ================= */}
//     <h6 className="mt-4">Document Details</h6>
//     <Table bordered>
//       <tbody>
//         <tr>
//           <th>PAN</th>
//           <td>{safe(personal?.document_data?.pan?.[0]?.value)}</td>
//         </tr>
//       </tbody>
//     </Table>

//     {/* ================= CONTACT DETAILS ================= */}
//     <h6 className="mt-4">Contact Details</h6>
//     <Table bordered>
//       <tbody>
//         <tr>
//           <th>Email</th>
//           <td>{safe(personal?.email?.[0]?.value)}</td>
//         </tr>
//         <tr>
//           <th>Alternate Mobile</th>
//           <td>{safe(personal?.alternate_phone?.[0]?.value)}</td>
//         </tr>
//       </tbody>
//     </Table>

//     {/* ================= ADDRESS HISTORY ================= */}
//     <h6 className="mt-4">Address History</h6>
//     {(personal?.address || []).length === 0 && (
//       <p className="text-muted">No address records found</p>
//     )}

//     {(personal?.address || []).map((addr, idx) => (
//       <Table bordered key={idx} className="mb-3">
//         <tbody>
//           <tr>
//             <th style={{ width: "30%" }}>Address</th>
//             <td>{safe(addr.detailed_address)}</td>
//           </tr>
//           <tr>
//             <th>State</th>
//             <td>{safe(addr.state)}</td>
//           </tr>
//           <tr>
//             <th>Pincode</th>
//             <td>{safe(addr.pincode)}</td>
//           </tr>
//         </tbody>
//       </Table>
//     ))}
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

export default function FetchMobilePrefill() {
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
  const [mobile, setMobile] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
      try { return JSON.parse(data); }
      catch { return data; }
    }
    return data;
  };

  const getBadgeVariant = (code) => {
    if (code === "1015") return "success";
    if (code === "1004") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ===== VALIDATION ===== */
    if (!mobile || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!mobile ? "<li>Mobile Number is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    /* ===== WALLET CHECK ===== */
    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "Not enough wallet balance",
        "error"
      );
      return;
    }

    /* ===== CONFIRM ===== */
    const confirm = await swal.fire({
      title: "Confirm Mobile Prefill Fetch",
      html: `
        <p><b>Mobile Number:</b> ${mobile}</p>
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
        "api/checkMobilePrefillCache",
        { mas_ser_id, mas_cat_id, mobile_number: mobile }
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
        else { setLoading(false); return; }
      }

      /* ================= EXECUTE ================= */
      const executeRes = await api.post(
        "api/executeMobilePrefill",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          mobile_number: mobile,
          first_name: firstName,
          last_name: lastName,
          use_cache: useCache,
        }
      );

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      /* ================= RESPONSE HANDLING ================= */
      if (code === "1015") {
        swal.fire({
          title: "Success",
          html: apiData?.data?.message,
          icon: "success",
        });
      } else if (code === "1004") {
        swal.fire("No Records", apiData?.data?.message, "warning");
      } else {
        swal.fire(
          "Completed",
          apiData?.data?.message || "Processed",
          "info"
        );
      }

    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Server error",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };
const exportPdf = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";
  const p = result?.data?.personal_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : String(v);

  const section = (title, rows) => [
    { text: title, style: "section", margin: [0, 12, 0, 6] },
    {
      table: {
        widths: ["40%", "60%"],
        body: rows,
      },
      layout: "lightHorizontalLines",
    },
  ];

  const content = [
    { text: "Mobile Prefill Detailed Report", style: "header" },
    { text: `File Number: ${fileNo}` },
    { text: `Mobile Number: ${mobile}` },
    { text: `Transaction ID: ${transactionId}` },
    { text: `Request ID: ${requestId}` },
    { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },
  ];

  /* ================= PERSONAL INFO ================= */
  if (p.personal_information) {
    content.push(
      ...section("Personal Information", [
        [{ text: "Full Name", bold: true }, safe(p.personal_information.full_name)],
        [{ text: "Gender", bold: true }, safe(p.personal_information.gender)],
        [{ text: "Age", bold: true }, safe(p.personal_information.age)],
        [{ text: "Date of Birth", bold: true }, safe(p.personal_information.date_of_birth)],
      ])
    );
  }

  /* ================= DOCUMENT DATA ================= */
  if (p.document_data?.pan?.length) {
    content.push(
      ...section(
        "Document Data",
        p.document_data.pan.map((pan, i) => [
          { text: `PAN ${i + 1}`, bold: true },
          safe(pan.value),
        ])
      )
    );
  }

  /* ================= EMAIL ================= */
  if (p.email?.length) {
    content.push(
      ...section(
        "Email Addresses",
        p.email.map((e, i) => [
          { text: `Email ${i + 1}`, bold: true },
          safe(e.value),
        ])
      )
    );
  }

  /* ================= ALTERNATE PHONE ================= */
  if (p.alternate_phone?.length) {
    content.push(
      ...section(
        "Alternate Phone Numbers",
        p.alternate_phone.map((a, i) => [
          { text: `Phone ${i + 1}`, bold: true },
          safe(a.value),
        ])
      )
    );
  }

  /* ================= ADDRESS ================= */
  if (p.address?.length) {
    content.push(
      ...section(
        "Address History",
        p.address.map((a, i) => [
          { text: `Address ${i + 1}`, bold: true },
          `${safe(a.detailed_address)}, ${safe(a.state)} - ${safe(a.pincode)}`,
        ])
      )
    );
  }

  content.push({
    text: `Generated On: ${new Date().toLocaleString()}`,
    margin: [0, 15, 0, 0],
    fontSize: 9,
    italics: true,
  });

  const doc = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      section: { fontSize: 14, bold: true },
    },
    defaultStyle: { fontSize: 10 },
  };

  pdfMake.createPdf(doc).download(`MOBILE_PREFILL_${fileNo}.pdf`);
};
  const code = result?.data?.code;

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
            <Col md={6}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Mobile Number <Required /></Form.Label>
              <Form.Control
                value={mobile}
                maxLength={10}
                onChange={(e) => setMobile(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={6}>
              <Form.Label>First Name</Form.Label>
              <Form.Control
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : "Fetch Mobile Prefill"}
          </Button>
        </Card>

        {result && (
          <Card body>
          <div className="d-flex justify-content-between">
  <h5>
    Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
  </h5>
  <Button onClick={exportPdf}>Export PDF</Button>
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