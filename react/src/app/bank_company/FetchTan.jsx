// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchTan() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [tan, setTan] = useState("");
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
//     if (!tan || !fileNo || !consent) {
//       swal.fire("Validation Error", "All fields & consent are required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchTan", {
//         usr_ser_id,
//         tan,
//         file_no: fileNo,
//         consent: consent ? "Y" : "N",
//       });

//       const code = res.data?.data?.data?.code;

//       if (code !== "1012") {
//         swal.fire("Failed", res.data?.data?.data?.message, "warning");
//         return;
//       }

//       setResult(res.data.data.data.tan_details);
//       fetchWallet();

//       swal.fire("Success", "TAN verified successfully", "success");
//     } catch (err) {
//       swal.fire("Error", err.response?.data?.message || "Server error", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const doc = {
//       content: [
//         { text: "TAN Verification Report", style: "header" },
//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: Object.entries(result).map(([k, v]) => [
//               { text: k.replace(/_/g, " ").toUpperCase(), bold: true },
//               Array.isArray(v) ? v.join(", ") : v,
//             ]),
//           },
//           layout: "lightHorizontalLines",
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 15 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`TAN_${fileNo}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>Credits Required: <b>{credits}</b></p>
//         </Card>

//         <Card body className="mt-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mt-3">
//           <Row className="g-3">
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>TAN <Required /></Form.Label>
//                 <Form.Control
//                   value={tan}
//                   onChange={(e) => setTan(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>File No <Required /></Form.Label>
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
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : "Verify TAN"}
//           </Button>
//         </Card>

//         {result && (
//           <>
//             <Card body className="mt-3 d-flex justify-content-between">
//               <h5>TAN Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </Card>

//             <Card body className="mt-2">
//               <Table bordered size="sm">
//                 <tbody>
//                   {Object.entries(result).map(([k, v]) => (
//                     <tr key={k}>
//                       <th>{k.replace(/_/g, " ").toUpperCase()}</th>
//                       <td>{Array.isArray(v) ? v.join(", ") : v}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </Table>
//             </Card>
//           </>
//         )}
//       </Col>
//     </Row>
//   );
// }
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchTan() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [tan, setTan] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get('api/getLoggedInUserWallet');
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const handleFetch = async () => {
    // Validation first
    if (!tan || !fileNo || !consent) {
      swal.fire(
        'Validation Error',
        'All fields & consent are required',
        'warning',
      );
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    // ✅ Confirm with the user before proceeding
    const confirm = await swal.fire({
      title: 'Confirm TAN Fetch',
      html: `
      <p><b>Credits Required:</b> ${credits}</p>
      <p><b>Available Credits:</b> ${wallet}</p>
    `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Proceed',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return; // User cancelled

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('api/fetchTan', {
        usr_ser_id,
        tan,
        file_no: fileNo,
        consent: consent ? 'Y' : 'N',
      });

      const code = res.data?.data?.code;

      if (code !== '1012') {
        swal.fire('Failed', res.data?.data?.message, 'warning');
        return;
      }

      // Include request_id and transaction_id in result
      setResult({
        request_id: res.data?.request_id,
        transaction_id: res.data?.transaction_id,
        message: res.data?.data?.message,
        ...res.data?.data?.tan_details,
      });

      fetchWallet();

      swal.fire('Success', 'TAN verified successfully', 'success');
    } catch (err) {
      swal.fire(
        'Error',
        err.response?.data?.message || 'Server error',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const tableBody = [
      [
        { text: 'FIELD', bold: true },
        { text: 'VALUE', bold: true },
      ],
      ...Object.entries(result).map(([key, value]) => [
        {
          text: key.replace(/_/g, ' ').toUpperCase(),
          margin: [0, 5, 0, 5],
        },
        {
          text: Array.isArray(value) ? value.join(', ') : value || '-',
          margin: [0, 5, 0, 5],
        },
      ]),
    ];

    const docDefinition = {
      content: [
        {
          text: 'TAN VERIFICATION REPORT',
          style: 'header',
          alignment: 'center',
        },
        {
          text: `File No: ${fileNo}`,
          margin: [0, 10, 0, 10],
        },
        {
          table: {
            widths: ['35%', '65%'],
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          marginBottom: 15,
        },
      },
      footer: function (currentPage, pageCount) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'right',
          margin: [0, 0, 20, 0],
          fontSize: 9,
        };
      },
    };

    pdfMake.createPdf(docDefinition).download(`TAN_${fileNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        {/* ===== HEADER ===== */}
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        {/* ===== WALLET ===== */}
        <Card body className="mt-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        {/* ===== FORM ===== */}
        <Card body className="mt-3">
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  TAN <Required />
                </Form.Label>
                <Form.Control
                  value={tan}
                  onChange={(e) => setTan(e.target.value.toUpperCase())}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  File No <Required />
                </Form.Label>
                <Form.Control
                  value={fileNo}
                  onChange={(e) => setFileNo(e.target.value.toUpperCase())}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            type="checkbox"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : 'Verify TAN'}
          </Button>
        </Card>

        {/* ===== RESULT ===== */}
        {result && (
          <>
            {/* ===== RESULT HEADER + EXPORT ===== */}
            <Card body className="mt-4">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">TAN Verification Result</h5>
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              </div>
            </Card>

            {/* ===== RESULT TABLE ===== */}
            <Card body className="mt-2">
              <Table bordered size="sm">
                <tbody>
                  {Object.entries(result).map(([key, value]) => (
                    <tr key={key}>
                      <th style={{ width: '35%' }}>
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </th>
                      <td>
                        {Array.isArray(value) ? value.join(', ') : value || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </>
        )}
      </Col>
    </Row>
  );
}