// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) => (v ? v : "-");

// export default function FetchGstinByMobile() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [mobile, setMobile] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= GUARD + WALLET ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     if (!fileNo || !mobile || !consent) {
//       swal.fire("Validation Error", "Required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm GSTIN Fetch by Mobile",
//       html: `
//         <p><b>Mobile:</b> ${mobile}</p>
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Wallet Balance:</b> ${wallet}</p>
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
//       const res = await api.post("api/fetchGstinByMobile", {
//         usr_ser_id,
//         file_no: fileNo,
//         mobile_number: mobile,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       setResult(apiData);

//       if (apiData?.data?.code === "1017") {
//         swal.fire(
//           "Success",
//           `
//           GSTIN records fetched successfully<br/>
//           Credits Deducted: <b>${credits}</b><br/>
//           Remaining Balance: <b>${wallet - credits}</b>
//           `,
//           "success"
//         );
//         fetchWallet();
//       } else {
//         swal.fire("Info", apiData?.data?.message, "info");
//       }
//     } catch {
//       swal.fire("Service Unavailable", "Please try again later", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const records = result?.data?.gstin_data || [];

//   /* ================= EXPORT PDF ================= */
//   const exportPdf = () => {
//     if (!records.length) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const tableBlock = (rows) => ({
//       table: {
//         widths: ["35%", "65%"],
//         body: rows.map((r) => [
//           { text: r[0], bold: true },
//           r[1] || "-",
//         ]),
//       },
//       layout: "lightHorizontalLines",
//       marginBottom: 10,
//     });

//     const doc = {
//       content: [
//         { text: "GSTIN Fetch By Mobile Report", style: "header" },
//         { text: `File Number: ${fileNo}`, marginBottom: 10 },
//         { text: `Mobile Number: ${mobile}`, marginBottom: 10 },

//         { text: "GSTIN Records", style: "sub" },
//         tableBlock(
//           records.map((r, i) => [
//             `Record ${i + 1}`,
//             `${safe(r.document_id)} (${safe(r.status)})`,
//           ])
//         ),

//         {
//           text: `Generated On: ${new Date().toLocaleString()}`,
//           marginTop: 15,
//           fontSize: 9,
//           italics: true,
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//         sub: { fontSize: 14, bold: true, marginTop: 10 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`GSTIN_BY_MOBILE_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p className="text-muted">
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="text-center mb-3">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mb-4">
//           <Form.Group>
//             <Form.Label>File Number <Required /></Form.Label>
//             <Form.Control
//               value={fileNo}
//               onChange={(e) => setFileNo(e.target.value)}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Mobile Number <Required /></Form.Label>
//             <Form.Control
//               value={mobile}
//               onChange={(e) => setMobile(e.target.value)}
//               maxLength={10}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             variant="primary"
//             onClick={handleFetch}
//             disabled={loading}
//           >
//             {loading ? <Spinner size="sm" /> : "Fetch GSTIN by Mobile"}
//           </Button>
//         </Card>

//         {records.length > 0 && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>📄 GSTIN Records</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered size="sm" className="mt-3">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>GSTIN</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {records.map((r, i) => (
//                   <tr key={i}>
//                     <td>{i + 1}</td>
//                     <td>{safe(r.document_id)}</td>
//                     <td>{safe(r.status)}</td>
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
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "app/components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FetchGstinByMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const normalizeResult = (data) => {
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

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ===== VALIDATION ===== */
    if (!fileNo || !mobile || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!mobile ? "<li>Mobile Number is required</li>" : ""}
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

    /* ===== CONFIRMATION ===== */
    const confirm = await swal.fire({
      title: "Confirm GSTIN Fetch by Mobile",
      html: `
        <p><b>Mobile:</b> ${mobile}</p>
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
        "api/checkGstinByMobileCache",
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
        else {
          setLoading(false);
          return;
        }
      }

      /* ================= EXECUTE ================= */
      const executeRes = await api.post(
        "api/executeGstinByMobile",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          mobile_number: mobile,
          use_cache: useCache,
        }
      );

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;

      setResult(normalizeResult(apiData));
      fetchWallet();

      /* ================= RESPONSE HANDLING ================= */
      if (code === "1017") {
        swal.fire({
          title: "Success",
          html: `
            ${apiData?.data?.message}<br/>
            Credits Deducted: <b>${credits}</b>
          `,
          icon: "success",
        });
      } 
      else if (code === "1018") {
        swal.fire({
          title: "No Records Found",
          html: apiData?.data?.message,
          icon: "info",
        });
      } 
      else {
        swal.fire({
          title: "Completed",
          html: apiData?.data?.message || "Request processed",
          icon: "info",
        });
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

  /* ================= EXPORT PDF ================= */

const exportPdf = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const records = result?.data?.gstin_data || [];

  const gstinTable =
    records.length > 0
      ? {
          table: {
            headerRows: 1,
            widths: ["10%", "40%", "25%", "25%"],
            body: [
              [
                { text: "#", bold: true },
                { text: "GSTIN", bold: true },
                { text: "Document Type", bold: true },
                { text: "Status", bold: true },
              ],
              ...records.map((r, index) => [
                index + 1,
                r.document_id || "-",
                r.document_type || "-",
                r.status || "-",
              ]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 10, 0, 10],
        }
      : {
          text: result?.data?.message || "No GSTIN records found",
          margin: [0, 10],
        };

  const doc = {
    content: [
      { text: "GSTIN Fetch By Mobile Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Mobile Number: ${mobile}` },
      { text: `Transaction ID: ${transactionId}` },

      { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

      { text: "GSTIN Records", style: "sub", margin: [0, 10] },

      gstinTable,

      { text: "Full API Response", style: "sub", margin: [0, 10] },
      { text: JSON.stringify(result, null, 2), fontSize: 8 },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      sub: {
        fontSize: 14,
        bold: true,
      },
    },
  };

  pdfMake.createPdf(doc).download(`GSTIN_BY_MOBILE_${fileNo}.pdf`);
};

  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1017") return "success";
    if (code === "1018") return "warning";
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
                Mobile Number <Required />
              </Form.Label>
              <Form.Control
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
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
            {loading ? <Spinner size="sm" /> : "Fetch GSTIN"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result{" "}
                <Badge bg={getBadgeVariant()}>
                  {code}
                </Badge>
              </h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <h6 className="mt-3">Full API Response</h6>

            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
