// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchCinByPan() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};
//   const [consent, setConsent] = useState(false);
//   const [wallet, setWallet] = useState(0);
//   const [pan, setPan] = useState('');
//   const [fileNo, setFileNo] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get('api/getLoggedInUserWallet');
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   const handleFetch = async () => {
//     if (!pan || !fileNo || !consent) {
//       swal.fire(
//         'Validation Error',
//         'PAN, File No and Consent are required',
//         'warning',
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     const confirm = await swal.fire({
//       title: 'Confirm CIN Fetch',
//       html: `<p><b>Credits Required:</b> ${credits}</p>
//            <p><b>Available Credits:</b> ${wallet}</p>`,
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Proceed',
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/fetchCinByPan', {
//         usr_ser_id,
//         pan_number: pan.toUpperCase(),
//         file_no: fileNo.toUpperCase(),
//         consent: 'Y',
//       });

//       const data = res.data?.data;
//       const code = data?.code;

//       if (code !== '1014') {
//         swal.fire('Info', data?.message || 'No CIN found', 'info');
//         return;
//       }

//       setResult(data.cin_data);
//       fetchWallet();

//       swal.fire('Success', 'CIN details fetched successfully', 'success');
//     } catch (err) {
//       swal.fire(
//         'Error',
//         err.response?.data?.message || 'Server error',
//         'error',
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const doc = {
//       content: [
//         { text: 'CIN by PAN Report', style: 'header' },
//         { text: `PAN: ${pan}`, marginBottom: 10 },

//         {
//           table: {
//             widths: ['40%', '60%'],
//             body: [
//               ['Total CINs Found', result.cin_list.length],
//               ...result.cin_details.map((c, i) => [
//                 `CIN ${i + 1}`,
//                 `${c.cin} - ${c.entity_name}`,
//               ]),
//             ],
//           },
//           layout: 'lightHorizontalLines',
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 15 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`CIN_BY_PAN_${fileNo}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mt-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mt-3">
//           <Row className="g-3">
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   PAN Number <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={pan}
//                   onChange={(e) => setPan(e.target.value.toUpperCase())}
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
//                   onChange={(e) => setFileNo(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             type="checkbox"
//             label={
//               <>
//                 I give consent <Required />
//               </>
//             }
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : 'Fetch CIN by PAN'}
//           </Button>
//         </Card>

//         {result && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>CIN Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3" size="sm">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>CIN</th>
//                   <th>Company Name</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {result.cin_details.map((c, i) => (
//                   <tr key={i}>
//                     <td>{i + 1}</td>
//                     <td>{c.cin}</td>
//                     <td>{c.entity_name}</td>
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

export default function FetchCinByPan() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [pan, setPan] = useState("");
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

  /* ================= BADGE ================= */
  const getBadgeVariant = (code) => {
    if (code === "1014") return "success";
    if (["1015", "1016", "1017"].includes(code)) return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ===== VALIDATION ===== */
    if (!pan || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!pan ? "<li>PAN Number is required</li>" : ""}
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
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    /* ===== CONFIRM ===== */
    const confirm = await swal.fire({
      title: "Confirm CIN by PAN Fetch",
      html: `
        <p><b>PAN:</b> ${pan}</p>
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
      const checkRes = await api.post("api/checkCinByPanCache", {
        mas_ser_id,
        mas_cat_id,
        pan_number: pan,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on <b>${fetchedDate}</b>`,
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
      const execRes = await api.post("api/executeCinByPan", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        pan_number: pan,
        file_no: fileNo,
        use_cache: useCache,
      });

      const apiData = normalize(execRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1014") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else {
        swal.fire("Info", apiData?.data?.message, "info");
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

    const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

    const cinData = result?.data || {};
    const cinList = cinData?.cin_list || [];
    const cinDetails = cinData?.cin_details || [];

    const content = [
      { text: "CIN by PAN Report", style: "header" },
      { text: `File Number: ${fileNo}` },
      { text: `Transaction ID: ${safe(result.transaction_id)}` },
      { text: `Request ID: ${safe(result.request_id)}` },
      {
        qr: safe(result.transaction_id),
        fit: 80,
        alignment: "right",
        margin: [0, 10],
      },
    ];

    /* ================= CIN LIST ================= */
    if (cinList.length > 0) {
      content.push({
        text: "CIN LIST",
        style: "section",
        margin: [0, 15, 0, 6],
      });

      cinList.forEach((cin, index) => {
        content.push({
          text: `#${index + 1}   ${cin}`,
          margin: [0, 2],
        });
      });
    }

    /* ================= CIN DETAILS ================= */
    if (cinDetails.length > 0) {
      content.push({
        text: "CIN DETAILS",
        style: "section",
        margin: [0, 15, 0, 6],
      });

      cinDetails.forEach((item, index) => {
        content.push(
          {
            text: `#${index + 1}`,
            bold: true,
            margin: [0, 8, 0, 4],
          },
          {
            table: {
              widths: ["35%", "65%"],
              body: [
                [{ text: "CIN", bold: true }, safe(item.cin)],
                [{ text: "ENTITY NAME", bold: true }, safe(item.entity_name)],
              ],
            },
            layout: "lightHorizontalLines",
          },
        );
      });
    }

    /* ================= FOOTER ================= */
    content.push({
      text: `Generated On: ${new Date().toLocaleString()}`,
      margin: [0, 20, 0, 0],
      fontSize: 9,
      italics: true,
    });

    const doc = {
      content,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        section: {
          fontSize: 14,
          bold: true,
        },
      },
      defaultStyle: { fontSize: 10 },
    };

    pdfMake.createPdf(doc).download(`CIN_BY_PAN_${fileNo}.pdf`);
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
            <Col md={6}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value.toUpperCase())}
              />
            </Col>

            <Col md={6}>
              <Form.Label>
                PAN Number <Required />
              </Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
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

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch CIN by PAN"}
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
