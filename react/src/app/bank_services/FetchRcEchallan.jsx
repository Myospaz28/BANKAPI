// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) => (v ? v : "-");

// export default function FetchRcEchallan() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [rcNumber, setRcNumber] = useState("");
//   const [chassis, setChassis] = useState("");
//   const [engine, setEngine] = useState("");
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

//   const handleFetch = async () => {
//     if (!rcNumber || !chassis || !engine || !fileNo || !consent) {
//       swal.fire("Validation Error", "All fields are required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm E-Challan Fetch",
//       html: `
//         <p><b>RC Number:</b> ${rcNumber}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Wallet Balance:</b> ${wallet}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchRcEchallanController", {
//         usr_ser_id,
//         rc_number: rcNumber,
//         chassis_number: chassis,
//         engine_number: engine,
//         file_no: fileNo,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const grid = apiData?.data || apiData;

//       if (grid?.code === "1005") {
//         setResult(apiData);
//         swal.fire(
//           "Success",
//           `Challan fetched successfully<br/>
//            Credits Deducted: <b>${credits}</b><br/>
//            Remaining Balance: <b>${wallet - credits}</b>`,
//           "success"
//         );
//         fetchWallet();
//       } else if (grid?.code === "1006") {
//         swal.fire("No Challan", grid.message, "info");
//       } else {
//         swal.fire("Failed", grid?.message || "Failed", "warning");
//       }
//     } catch {
//       swal.fire("Error", "Service unavailable", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const challans = result?.data?.challan_data || [];

//   /* ================= EXPORT PDF ================= */
//   const exportPdf = async () => {
//     const pdfMake = (await import("pdfmake/build/pdfmake")).default;
//     const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;
//     pdfMake.vfs = pdfFonts.vfs;

//     const tableBlock = (rows) => ({
//       table: {
//         widths: ["35%", "65%"],
//         body: rows.map((r) => [{ text: r[0], bold: true }, r[1] || "-"]),
//       },
//       layout: "lightHorizontalLines",
//       marginBottom: 10,
//     });

//     const content = [
//       { text: "RC E-Challan Report", style: "header" },
//       { text: `File Number: ${fileNo}` },
//       { text: `RC Number: ${rcNumber}`, marginBottom: 10 },
//     ];

//     challans.forEach((c, i) => {
//       content.push(
//         { text: `Challan #${i + 1}`, style: "sub" },
//         tableBlock([
//           ["Challan No", c.document_id],
//           ["Status", c.status],
//           ["Area", c.area_name],
//           ["Date", c.date_issued],
//           ["Accused", c.accused_name],
//           ["Amount", c.amount],
//           ["State", c.state],
//           ["Offence", c.offence_data?.[0]?.offence_description],
//         ])
//       );
//     });

//     content.push({
//       text: `Generated On: ${new Date().toLocaleString()}`,
//       marginTop: 15,
//       fontSize: 9,
//       italics: true,
//     });

//     pdfMake.createPdf({
//       content,
//       styles: {
//         header: { fontSize: 18, bold: true },
//         sub: { fontSize: 14, bold: true, marginTop: 10 },
//       },
//     }).download(`RC_ECHALLAN_${fileNo}.pdf`);
//   };

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
//             <Col md={3}>
//               <Form.Label>RC Number <Required /></Form.Label>
//               <Form.Control value={rcNumber} onChange={(e) => setRcNumber(e.target.value)} />
//             </Col>
//             <Col md={3}>
//               <Form.Label>Chassis No <Required /></Form.Label>
//               <Form.Control value={chassis} onChange={(e) => setChassis(e.target.value)} />
//             </Col>
//             <Col md={3}>
//               <Form.Label>Engine No <Required /></Form.Label>
//               <Form.Control value={engine} onChange={(e) => setEngine(e.target.value)} />
//             </Col>
//             <Col md={3}>
//               <Form.Label>File No <Required /></Form.Label>
//               <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Fetch E-Challan"}
//           </Button>
//         </Card>

//         {challans.length > 0 && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between">
//               <h5>📄 E-Challan Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <thead>
//                 <tr>
//                   <th>Challan No</th>
//                   <th>Status</th>
//                   <th>Offence</th>
//                   <th>Amount</th>
//                   <th>Date</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {challans.map((c, i) => (
//                   <tr key={i}>
//                     <td>{safe(c.document_id)}</td>
//                     <td>{safe(c.status)}</td>
//                     <td>{safe(c.offence_data?.[0]?.offence_description)}</td>
//                     <td>{safe(c.amount)}</td>
//                     <td>{safe(c.date_issued)}</td>
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

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FetchRcEchallan() {
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
  const [rcNumber, setRcNumber] = useState("");
  const [chassis, setChassis] = useState("");
  const [engine, setEngine] = useState("");
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
    if (code === "1005") return "success";
    if (code === "1006") return "danger";
    return "secondary";
  };

  const handleFetch = async () => {
    if (loading) return;

    if (!rcNumber || !chassis || !engine || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!rcNumber ? "<li>RC Number is required</li>" : ""}
            ${!chassis ? "<li>Chassis Number is required</li>" : ""}
            ${!engine ? "<li>Engine Number is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "Not enough wallet balance",
        "error"
      );
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm E-Challan Fetch",
      html: `
        <p><b>RC Number:</b> ${rcNumber}</p>
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
      const checkRes = await api.post(
        "api/checkRcEchallanCache",
        { mas_ser_id, mas_cat_id, rc_number: rcNumber }
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
        else if (!cacheConfirm.isDenied) {
          setLoading(false);
          return;
        }
      }

      const executeRes = await api.post(
        "api/executeRcEchallan",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          rc_number: rcNumber,
          chassis_number: chassis,
          engine_number: engine,
          use_cache: useCache,
        }
      );

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1005") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1006") {
        swal.fire("No Challan", apiData?.data?.message, "info");
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "info");
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
               <Col md={3}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            
            <Col md={3}>
              <Form.Label>RC Number <Required /></Form.Label>
              <Form.Control value={rcNumber}
                onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Chassis Number <Required /></Form.Label>
              <Form.Control value={chassis}
                onChange={(e) => setChassis(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Engine Number <Required /></Form.Label>
              <Form.Control value={engine}
                onChange={(e) => setEngine(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : "Fetch E-Challan"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
              </h5>
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
