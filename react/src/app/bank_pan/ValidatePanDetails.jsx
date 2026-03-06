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
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "app/components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function ValidatePanDetails() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [pan, setPan] = useState('');
//   const [dob, setDob] = useState('');
//   const [fileNo, setFileNo] = useState('');
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [panData, setPanData] = useState(null);

//   /* ================= INIT ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get('api/getLoggedInUserWallet');
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   const safe = (v) => (v ? v : '-');

//   /* ================= VALIDATE PAN ================= */
// const handleValidate = async () => {
//   if (!pan || !dob || !fileNo || !consent) {
//     swal.fire('Validation Error', 'All fields are required', 'warning');
//     return;
//   }

//   if (wallet < credits) {
//     swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//     return;
//   }

//   setLoading(true);
//   setPanData(null);

//   try {
//     const res = await api.post('api/validatePan', {
//       usr_ser_id,
//       pan_number: pan,
//       date_of_birth: dob,
//       file_no: fileNo,
//       consent: 'Y',
//     });

//     /**
//      * res.data.data        → full Gridlines response
//      * res.data.data.data   → Gridlines "data" object
//      */
//     const gridResponse = res.data?.data;
//     const grid = gridResponse?.data;

//     /* 🔴 UPSTREAM / GOVT SERVER ERROR HANDLING */
//     if (gridResponse?.error?.code === 'UPSTREAM_INTERNAL_SERVER_ERROR') {
//       swal.fire(
//         'Service Unavailable',
//         'Government PAN server is temporarily down. Please try again after some time.',
//         'warning'
//       );
//       return;
//     }

//     const code = grid?.code;

//     if (code === '1004') {
//       swal.fire('Not Found', 'PAN does not exist', 'info');
//       return;
//     }

//     if (code === '1009') {
//       swal.fire('Mismatch', 'PAN & DOB do not match', 'warning');
//       return;
//     }

//     if (!['1000', '1018'].includes(code)) {
//       swal.fire('Failed', grid?.message || 'Validation failed', 'error');
//       return;
//     }

//     /* ✅ SUCCESS */
//     setPanData(grid.pan_data);
//     swal.fire('Success', grid.message, 'success');
//     fetchWallet();

//   } catch (err) {
//     swal.fire(
//       'Error',
//       err.response?.data?.message || 'Something went wrong',
//       'error'
//     );
//   } finally {
//     setLoading(false);
//   }
// };

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     if (!panData) return;

//     const safe = (v) => (v ? v : '-');

//     pdfMake
//       .createPdf({
//         content: [
//           { text: 'PAN VALIDATION REPORT', style: 'header' },
//           {
//             columns: [
//               { text: `PAN: ${pan}` },
//               { text: `DOB: ${dob}`, alignment: 'right' },
//             ],
//             marginBottom: 10,
//           },
//           { text: `File No: ${fileNo}\n\n` },
//           {
//             table: {
//               widths: ['40%', '60%'],
//               body: [
//                 ['Full Name', safe(panData.name)],
//                 ['First Name', safe(panData.first_name)],
//                 ['Middle Name', safe(panData.middle_name)],
//                 ['Last Name', safe(panData.last_name)],
//                 ['Date of Birth', safe(panData.date_of_birth)],
//               ],
//             },
//           },
//         ],
//         styles: {
//           header: {
//             fontSize: 18,
//             bold: true,
//             alignment: 'center',
//             marginBottom: 15,
//           },
//         },
//       })
//       .download(`PAN_VALIDATE_${fileNo}.pdf`);
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
//             <Col md={4}>
//               <Form.Group>
//                 <Form.Label>
//                   PAN <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={pan}
//                   maxLength={10}
//                   onChange={(e) => setPan(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={4}>
//               <Form.Group>
//                 <Form.Label>
//                   Date of Birth <Required />
//                 </Form.Label>
//                 <Form.Control
//                   type="date"
//                   value={dob}
//                   onChange={(e) => setDob(e.target.value)}
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={4}>
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

//           <Button className="mt-3" disabled={loading} onClick={handleValidate}>
//             {loading ? <Spinner size="sm" /> : 'Validate PAN'}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {panData && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>PAN Details</h5>
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
//                 <tr>
//                   <th>First Name</th>
//                   <td>{panData.first_name}</td>
//                 </tr>
//                 <tr>
//                   <th>Middle Name</th>
//                   <td>{safe(panData.middle_name)}</td>
//                 </tr>
//                 <tr>
//                   <th>Last Name</th>
//                   <td>{panData.last_name}</td>
//                 </tr>
//                 <tr>
//                   <th>Date of Birth</th>
//                   <td>{panData.date_of_birth}</td>
//                 </tr>
//               </tbody>
//             </Table>
//           </Card>
//         )}
//       </Col>
//     </Row>
//   );
// }

export default function ValidatePanDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [pan, setPan] = useState("");
  const [dob, setDob] = useState("");
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

  const handleValidate = async () => {
    if (!pan || !dob || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm PAN Validation",
      html: `<p><b>PAN:</b> ${pan}</p>
             <p><b>DOB:</b> ${dob}</p>`,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post("api/checkPanValidateCache", {
        mas_ser_id,
        mas_cat_id,
        pan_number: pan,
        date_of_birth: dob,
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

      const res = await api.post("api/executePanValidate", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        pan_number: pan,
        date_of_birth: dob,
        use_cache: useCache,
      });

      setResult(res.data?.data);

      if (res.data?.wallet?.closing_balance !== undefined) {
        setWallet(res.data.wallet.closing_balance);
      }

      swal.fire("Success", "PAN validated successfully", "success");
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

  /* ===== PDF WITH QR ===== */
  const exportPdf = () => {
    if (!result) return;

    const d = result?.data?.pan_data || {};
    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";

    pdfMake
      .createPdf({
        content: [
          { text: "PAN VALIDATION REPORT", style: "header" },
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
                ["DOB", dob],
                ["Full Name", d.name || "-"],
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
      .download(`PAN_VALIDATE_${fileNo}.pdf`);
  };

  const code = result?.data?.code;
  const badgeVariant =
    code === "1000" || code === "1018" ? "success" : "secondary";

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
            <Col md={4}>
              <Form.Label>File No</Form.Label> <Required />
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Label>PAN</Form.Label> <Required />
              <Form.Control
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
              />
            </Col>
            <Col md={4}>
              <Form.Label>DOB</Form.Label> <Required />
              <Form.Control
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleValidate} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Validate PAN"}
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
