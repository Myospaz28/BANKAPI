// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchPanLite() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
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
//     if (!pan || !fileNo || !consent) {
//       swal.fire("Validation Error", "All fields are required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm PAN Lite Fetch",
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
//       const res = await api.post("api/fetchLite", {
//         usr_ser_id,
//         pan_number: pan,
//         file_no: fileNo,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code === "1004") {
//         swal.fire("Not Found", "PAN does not exist", "info");
//         return;
//       }

//       if (code !== "1000") {
//         swal.fire("Failed", apiData?.data?.message || "Fetch failed", "error");
//         return;
//       }

//       setResult(apiData);

//       swal.fire(
//         "Success",
//         `Credits Deducted: <b>${credits}</b><br/>
//          Remaining Credits: <b>${wallet - credits}</b>`,
//         "success",
//       );

//       fetchWallet();
//     } catch (err) {
//       swal.fire(
//         "Error",
//         err.response?.data?.message || "Server error",
//         "error",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= EXPORT PDF ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const safe = (v) => (v !== undefined && v !== null && v !== "" ? v : "-");

//     const api = result;
//     const d = api?.data?.pan_data || {};

//     const doc = {
//       content: [
//         { text: "PAN Lite Verification Report", style: "header" },

//         { text: "Input Details", style: "subHeader" },

//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["PAN Number", safe(pan)],
//               ["File Number", safe(fileNo)],
//             ],
//           },
//           marginBottom: 15,
//         },

//         { text: "PAN Details", style: "subHeader" },

//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["Document Type", safe(d.document_type)],
//               ["Full Name", safe(d.name)],
//             ],
//           },
//           marginBottom: 15,
//         },

//         {
//           text: "Disclaimer:\nPAN Lite fetch returns basic PAN validation data as per government records. This document is system generated.",
//           fontSize: 9,
//           italics: true,
//           color: "gray",
//         },
//       ],

//       styles: {
//         header: {
//           fontSize: 18,
//           bold: true,
//           marginBottom: 12,
//         },
//         subHeader: {
//           fontSize: 14,
//           bold: true,
//           marginBottom: 6,
//         },
//       },
//     };

//     pdfMake.createPdf(doc).download(`PAN_LITE_${fileNo}.pdf`);
//   };

//   const panData = result?.data?.pan_data;

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

//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body>
//           <Row>
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   PAN Number <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={pan}
//                   onChange={(e) => setPan(e.target.value)}
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   File Number <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={fileNo}
//                   onChange={(e) => setFileNo(e.target.value)}
//                 />
//               </Form.Group>
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
//             {loading ? <Spinner size="sm" /> : "Fetch PAN Lite"}
//           </Button>
//         </Card>

//         {panData && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>PAN Lite Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr>
//                   <th>Document Type</th>
//                   <td>{panData.document_type}</td>
//                 </tr>
//                 <tr>
//                   <th>Full Name</th>
//                   <td>{panData.name}</td>
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
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "../components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchPanLite() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [pan, setPan] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);

    api.get("api/getLoggedInUserWallet").then((res) => {
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    });
  }, [usr_ser_id, navigate]);

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!pan || pan.length !== 10 || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm PAN Lite Fetch",
      html: `
        <p><b>PAN:</b> ${pan}</p>
        <p><b>File No:</b> ${fileNo}</p>
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post("api/checkPanLiteCache", {
        mas_ser_id,
        mas_cat_id,
        pan_number: pan,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN");

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          showConfirmButton: true,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Use Old Data",
          denyButtonText: "Fetch Fresh",
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

      /* ===== EXECUTE ===== */
      const res = await api.post("api/executePanLite", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        pan_number: pan,
        use_cache: useCache,
      });

      const fullResponse = res.data?.data;
      setResult(fullResponse);

      if (res.data?.wallet?.closing_balance !== undefined) {
        setWallet(res.data.wallet.closing_balance);
      }

      const code = fullResponse?.data?.code;

      if (code !== "1000") {
        swal.fire(
          "Info",
          fullResponse?.data?.message || "PAN validation failed",
          "info",
        );
      } else {
        swal.fire("Success", "PAN Lite fetched successfully", "success");
      }
    } catch (err) {
      swal.fire(
        "Error",
        err?.response?.data?.message || "Server error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF WITH QR ================= */
  const exportPdf = () => {
    if (!result) return;

    const d = result?.data?.pan_data || {};
    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";

    const safe = (v) => (v && v !== "" ? v : "-");

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],

      content: [
        {
          text: "PAN LITE VERIFICATION REPORT",
          style: "header",
        },

        {
          columns: [
            {
              width: "*",
              stack: [
                { text: `Request ID: ${requestId}`, margin: [0, 10, 0, 5] },
                { text: `Transaction ID: ${transactionId}` },
              ],
            },
            {
              width: "auto",
              qr: transactionId !== "-" ? transactionId : requestId,
              fit: 90,
              alignment: "right",
            },
          ],
        },

        { text: "\n" },

        {
          table: {
            widths: ["35%", "65%"],
            body: [
              ["PAN Number", safe(pan)],
              ["File Number", safe(fileNo)],
              ["Document Type", safe(d.document_type)],
              ["Full Name", safe(d.name)],
            ],
          },
          layout: "lightHorizontalLines",
        },

    
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          marginBottom: 5,
        },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`PAN_LITE_${fileNo || "Report"}.pdf`);
  };

  const code = result?.data?.code;
  const badgeVariant = code === "1000" ? "success" : "secondary";

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Fetch PAN Lite"}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        {/* FORM */}
        <Card body className="mt-3">
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
                PAN Number <Required />
              </Form.Label>
              <Form.Control
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch PAN Lite"}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <h6 className="mt-4">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
