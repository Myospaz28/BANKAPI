// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';
// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';

// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function VerifyBusinessPan() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [pan, setPan] = useState('');
//   const [fileNo, setFileNo] = useState('');
//   const [consent, setConsent] = useState(false);
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

//   const handleVerify = async () => {
//     if (!pan || !fileNo || !consent) {
//       swal.fire('Validation Error', 'All fields are required', 'warning');
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     const confirm = await swal.fire({
//       title: 'Confirm Business PAN Verification',
//       html: `
//         <p><b>Credits:</b> ${credits}</p>
//         <p><b>File No:</b> ${fileNo}</p>
//       `,
//       showCancelButton: true,
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/verifyBusinessPan', {
//         usr_ser_id,
//         pan_number: pan,
//         file_no: fileNo,
//         consent: 'Y',
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code === '1004') {
//         swal.fire('Not Found', 'PAN does not exist', 'info');
//         return;
//       }

//       if (code !== '1013') {
//         swal.fire('Failed', apiData?.data?.message, 'error');
//         return;
//       }

//       setResult(apiData);
//       swal.fire('Success', 'Business details fetched', 'success');
//       fetchWallet();
//     } catch (err) {
//       swal.fire('Error', err.response?.data?.message, 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const business = result?.data?.business_data;

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!business) return;

//     const a = business.address || {};
//     const safe = (v) => (v ? v : '-');

//     const doc = {
//       content: [
//         { text: 'BUSINESS PAN VERIFICATION REPORT', style: 'header' },

//         {
//           columns: [
//             { text: `PAN: ${pan}` },
//             { text: `File No: ${fileNo}`, alignment: 'right' },
//           ],
//           marginBottom: 10,
//         },

//         {
//           table: {
//             widths: ['35%', '65%'],
//             body: [
//               ['Business Name', safe(business.business_name)],
//               ['Company ID', safe(business.company_id)],
//               ['Incorporation Date', safe(business.date_of_incorporation)],
//               ['Email', safe(business.email)],
//               ['Phone', safe(business.phone)],
//               [
//                 'Address',
//                 `${safe(a.line_1)}, ${safe(a.line_2)}, ${safe(a.city)}, ${safe(a.state)} - ${safe(a.pincode)}`,
//               ],
//             ],
//           },
//         },
//       ],
//       styles: {
//         header: {
//           fontSize: 18,
//           bold: true,
//           alignment: 'center',
//           marginBottom: 15,
//         },
//       },
//     };

//     pdfMake.createPdf(doc).download(`BUSINESS_PAN_${fileNo}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER CARD */}
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         {/* WALLET CARD */}
//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         {/* INPUT CARD */}
//         <Card body>
//           <Row>
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   Business PAN <Required />
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

//           <Button className="mt-3" disabled={loading} onClick={handleVerify}>
//             {loading ? <Spinner size="sm" /> : 'Verify Business PAN'}
//           </Button>
//         </Card>

//         {/* RESULT CARD */}
//         {/* RESULT CARD */}
//         {business && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>Business PAN Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr>
//                   <th>Business Name</th>
//                   <td>{business.business_name}</td>
//                 </tr>
//                 <tr>
//                   <th>PAN Number</th>
//                   <td>{pan}</td>
//                 </tr>
//                 <tr>
//                   <th>Date of Incorporation</th>
//                   <td>{business.date_of_incorporation}</td>
//                 </tr>
//                 <tr>
//                   <th>Email</th>
//                   <td>{business.email}</td>
//                 </tr>
//                 <tr>
//                   <th>Phone</th>
//                   <td>{business.phone}</td>
//                 </tr>
//                 <tr>
//                   <th>Address</th>
//                   <td>
//                     {business.address?.line_1}, {business.address?.city},{' '}
//                     {business.address?.state} - {business.address?.pincode}
//                   </td>
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
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "app/components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function VerifyBusinessPan() {
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

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);

    api.get("api/getLoggedInUserWallet").then((res) => {
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    });
  }, []);

  const handleVerify = async () => {
    if (!pan || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Business PAN Verification",
      html: `<p><b>PAN:</b> ${pan}</p>
             <p><b>File No:</b> ${fileNo}</p>`,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      /* ================= CACHE CHECK ================= */
      const checkRes = await api.post("api/checkBusinessPanCache", {
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
  icon: "question",
  showConfirmButton: true,
  showDenyButton: true,
  showCancelButton: true,   // ✅ Add cancel button
  confirmButtonText: "Use Old Data",
  denyButtonText: "Fetch Fresh",
  cancelButtonText: "Cancel",  // ✅ Explicit label
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

      /* ================= EXECUTE ================= */
      const res = await api.post("api/executeBusinessPan", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        pan_number: pan,
        use_cache: useCache,
      });

      console.log("API Response:", res.data);
      console.log("API Response2:", res.data.data);
      setResult(res.data?.data);

      if (res.data?.wallet?.closing_balance !== undefined) {
        setWallet(res.data.wallet.closing_balance);
      }

      swal.fire("Success", "Business PAN verified successfully", "success");
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

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const b = result?.data?.business_data || {};
    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";

    pdfMake
      .createPdf({
        content: [
          { text: "BUSINESS PAN VERIFICATION REPORT", style: "header" },
          {
            columns: [
              {
                stack: [
                  { text: `Request ID: ${requestId}` },
                  { text: `Transaction ID: ${transactionId}` },
                ],
              },
              {
                qr: transactionId !== "-" ? transactionId : requestId,
                fit: 90,
                alignment: "right",
              },
            ],
          },
          {
            table: {
              widths: ["35%", "65%"],
              body: [
                ["PAN", pan],
                ["Business Name", b.business_name || "-"],
                // ["Company ID", b.company_id || "-"],
                // ["Incorporation Date", b.date_of_incorporation || "-"],
                // ["Email", b.email || "-"],
                // ["Phone", b.phone || "-"],
                [
                  "Address",
                  `${b.address?.line_1 || ""}, ${b.address?.city || ""}, ${
                    b.address?.state || ""
                  } - ${b.address?.pincode || ""}`,
                ],
                ["Generated On", new Date().toLocaleString()],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
        styles: {
          header: { fontSize: 18, bold: true, marginBottom: 10 },
        },
      })
      .download(`BUSINESS_PAN_${fileNo}.pdf`);
  };

  const code = result?.data?.code;
  const badgeVariant = code === "1013" ? "success" : "secondary";

  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mt-3">
          <Row>
            <Col md={6}>
              <Form.Label>File No</Form.Label> <Required />
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Business PAN</Form.Label> <Required />
              <Form.Control
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

          <Button className="mt-3" onClick={handleVerify} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Verify Business PAN"}
          </Button>
        </Card>

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