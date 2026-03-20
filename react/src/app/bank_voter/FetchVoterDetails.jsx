// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';
// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchVoterDetails() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [voterId, setVoterId] = useState('');
//   const [fileNo, setFileNo] = useState('');
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
//     const res = await api.get('api/getLoggedInUserWallet');
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     if (!voterId || !fileNo || !consent) {
//       swal.fire('Validation Error', 'All fields are required', 'warning');
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     const confirm = await swal.fire({
//       title: 'Confirm Voter Fetch',
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Available Credits:</b> ${wallet}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Proceed',
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/fetchVoterDetails', {
//         usr_ser_id,
//         voter_id: voterId,
//         file_no: fileNo,
//         consent: 'Y',
//       });

//       const code = res.data?.data?.data?.code;

//       if (code === '1007') {
//         swal.fire('Not Found', 'Voter ID does not exist', 'info');
//         return;
//       }

//       if (code !== '1000') {
//         swal.fire(
//           'Failed',
//           res.data?.data?.data?.message || 'Fetch failed',
//           'error',
//         );
//         return;
//       }

//       setResult(res.data.data.data.voter_data);

//       swal.fire(
//         'Success',
//         `Credits Deducted: <b>${credits}</b><br/>
//          Remaining Credits: <b>${wallet - credits}</b>`,
//         'success',
//       );

//       fetchWallet();
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

//   const exportPdf = () => {
//     if (!result) return;

//     const safe = (v) => (v && v !== '-' ? v : '-');

//     const doc = {
//       content: [
//         { text: 'Voter Details Report', style: 'header' },
//         { text: `Voter ID: ${safe(voterId)}` },
//         { text: `File Number: ${safe(fileNo)}`, marginBottom: 10 },

//         {
//           table: {
//             widths: ['40%', '60%'],
//             body: [
//               ['Document Type', safe(result.document_type)],
//               ['Name', safe(result.name)],
//               ['Father Name', safe(result.father_name)],
//               ['Gender', safe(result.gender)],
//               ['Age', safe(result.age)],
//               ['District', safe(result.district)],
//               ['State', safe(result.state)],
//               [
//                 'Assembly Constituency No',
//                 safe(result.assembly_constituency_number),
//               ],
//               [
//                 'Assembly Constituency Name',
//                 safe(result.assembly_constituency_name),
//               ],
//               [
//                 'Parliamentary Constituency',
//                 safe(result.parliamentary_constituency_name),
//               ],
//               ['Part Number', safe(result.part_number)],
//               ['Part Name', safe(result.part_name)],
//               ['Serial Number', safe(result.serial_number)],
//               ['Polling Station', safe(result.polling_station)],
//             ],
//           },
//         },

//         {
//           text: '\nDisclaimer: Voter information is fetched from government sources. Availability of fields depends on electoral records.',
//           fontSize: 9,
//           italics: true,
//           color: 'gray',
//           marginTop: 10,
//         },
//       ],

//       styles: {
//         header: {
//           fontSize: 18,
//           bold: true,
//           marginBottom: 10,
//         },
//       },
//     };

//     pdfMake.createPdf(doc).download(`VOTER_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         {/* WALLET */}
//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         {/* FORM */}
//         <Card body>
//           <Row>
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   Voter ID <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={voterId}
//                   onChange={(e) => setVoterId(e.target.value)}
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
//             {loading ? <Spinner size="sm" /> : 'Fetch Voter Details'}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {result && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5 className="mb-0">Voter Details</h5>

//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 {Object.entries(result).map(([key, val]) => (
//                   <tr key={key}>
//                     <th>{key.replaceAll('_', ' ').toUpperCase()}</th>
//                     <td>{val}</td>
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

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function FetchVoterDetails() {
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
  const [voterId, setVoterId] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INITIAL ================= */
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
    if (code === "1000") return "success";
    if (code === "1007") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    if (!voterId || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
        <ul style="text-align:left">
          ${!voterId ? "<li>Voter ID required</li>" : ""}
          ${!fileNo ? "<li>File Number required</li>" : ""}
          ${!consent ? "<li>Consent required</li>" : ""}
        </ul>`,
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
      title: "Confirm Voter Fetch",
      html: `
      <p><b>Voter ID:</b> ${voterId}</p>
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
      const checkRes = await api.post("api/checkVoterCache", {
        mas_ser_id,
        mas_cat_id,
        voter_id: voterId,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

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
      const execRes = await api.post("api/executeVoterFetch", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        voter_id: voterId,
        file_no: fileNo,
        use_cache: useCache,
      });

      const apiData = normalize(execRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1000") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1007") {
        swal.fire("Not Found", apiData?.data?.message, "warning");
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

  /* ================= PDF ================= */
const exportPdf = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const rows = Object.entries(
    result?.data?.voter_data || {}
  ).map(([k, v]) => [
    { text: k.replaceAll("_", " ").toUpperCase(), bold: true },
    safe(v),
  ]);

  const doc = {
    content: [
      { text: "Voter Boson Detailed Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Voter ID: ${voterId}` },

      { text: `Transaction ID: ${transactionId}` },
      { text: `Request ID: ${requestId}` },

      {
        qr: transactionId,
        fit: 80,
        alignment: "right",
        margin: [0, 10],
      },

      { text: "Voter Details", style: "section", margin: [0, 12, 0, 6] },

      {
        table: {
          widths: ["40%", "60%"],
          body: rows,
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

  pdfMake.createPdf(doc).download(`VOTER_${fileNo}.pdf`);
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
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <Form.Label>
                Voter ID <Required />
              </Form.Label>
              <Form.Control
                value={voterId}
                onChange={(e) =>
                  setVoterId(e.target.value.toUpperCase())
                }
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

          <Button
            className="mt-3"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Fetch Voter"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result{" "}
                <Badge bg={getBadgeVariant(code)}>{code}</Badge>
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