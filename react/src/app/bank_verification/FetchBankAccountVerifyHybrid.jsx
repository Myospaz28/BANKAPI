// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchBankAccountVerifyHybrid() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { mas_cat_id ,usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [accountNumber, setAccountNumber] = useState("");
//   const [ifsc, setIfsc] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= INIT ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, [usr_ser_id, navigate]);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= SUBMIT ================= */
//   const handleFetch = async () => {
//     if (!fileNo || !accountNumber || !ifsc || !consent) {
//       swal.fire("Validation Error", "All fields are required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     /* ===== CONFIRM ALERT (AADHAAR STYLE) ===== */
//     const confirm = await swal.fire({
//       title: "Confirm Bank Verification",
//       html: `
//         <p><b>File No:</b> ${fileNo}</p>
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
//       const res = await api.post("api/fetchBankAccountVerifyHybridController", {
//         usr_ser_id,
//         mas_cat_id,
//         file_no: fileNo,
//         account_number: accountNumber,
//         ifsc,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code !== "1000") {
//         swal.fire(
//           "Verification Failed",
//           apiData?.data?.message || "Unable to verify bank account",
//           "info",
//         );
//         setResult(apiData);
//         return;
//       }

//       setResult(apiData);

//       /* ===== SUCCESS ALERT (AADHAAR STYLE) ===== */
//       swal.fire(
//         "Success",
//         `
//         Bank account verified successfully<br/>
//         Credits Deducted: <b>${credits}</b><br/>
//         Remaining Wallet: <b>${wallet - credits}</b>
//         `,
//         "success",
//       );

//       fetchWallet();
//     } catch (err) {
//       swal.fire("Error", "Server error", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     const bank = result?.data?.bank_account_data;
//     if (!bank) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const doc = {
//       content: [
//         { text: "Bank Account Verification Report", style: "header" },

//         { text: "Service Details", style: "sub" },
//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["Service Name", service_name],
//               ["File Number", fileNo],
//               ["Credits Used", credits],
//             ],
//           },
//           layout: "lightHorizontalLines",
//           marginBottom: 10,
//         },

//         { text: "Bank Account Details", style: "sub" },
//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["Account Holder Name", bank.name],
//               ["Bank Name", bank.bank_name],
//               ["Branch", bank.branch],
//               ["Account Number", bank.account_number],
//               ["IFSC", bank.ifsc],
//               ["Account Status", bank.account_status],
//               ["Verification Method", bank.utr ? "Penny Drop" : "Penniless"],
//               ["UTR", bank.utr || "-"],
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
//         sub: { fontSize: 14, bold: true, marginTop: 10, marginBottom: 5 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`Bank_Verification_${fileNo}.pdf`);
//   };

//   const bank = result?.data?.bank_account_data;

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
//         <Card body className="mb-4">
//           <Row>
//             <Col md={6}>
//               <Form.Label>
//                 File Number <Required />
//               </Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>

//             <Col md={6}>
//               <Form.Label>
//                 Account Number <Required />
//               </Form.Label>
//               <Form.Control
//                 value={accountNumber}
//                 onChange={(e) => setAccountNumber(e.target.value)}
//               />
//             </Col>
//           </Row>

//           <Row className="mt-2">
//             <Col md={6}>
//               <Form.Label>
//                 IFSC <Required />
//               </Form.Label>
//               <Form.Control
//                 value={ifsc}
//                 onChange={(e) => setIfsc(e.target.value.toUpperCase())}
//               />
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Verify Bank Account"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {bank && (
//           <Card body>
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>Bank Account Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr>
//                   <th>Name</th>
//                   <td>{bank.name}</td>
//                 </tr>
//                 <tr>
//                   <th>Bank</th>
//                   <td>{bank.bank_name}</td>
//                 </tr>
//                 <tr>
//                   <th>Branch</th>
//                   <td>{bank.branch}</td>
//                 </tr>
//                 <tr>
//                   <th>Account</th>
//                   <td>{bank.account_number}</td>
//                 </tr>
//                 <tr>
//                   <th>IFSC</th>
//                   <td>{bank.ifsc}</td>
//                 </tr>
//                 <tr>
//                   <th>Status</th>
//                   <td>{bank.account_status}</td>
//                 </tr>
//                 <tr>
//                   <th>Verification Method</th>
//                   <td>{bank.utr ? "Penny Drop" : "Penniless"}</td>
//                 </tr>
//               </tbody>
//             </Table>
//           </Card>
//         )}
//       </Col>
//     </Row>
//   );
// }

// FULL COMPONENT — CLEAN & COMPLETE
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
pdfMake.vfs = pdfFonts.vfs;

export default function FetchBankAccountVerifyHybrid() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { mas_cat_id, mas_ser_id,usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const handleFetch = async (forceRefresh = false) => {
    if (!fileNo || !accountNumber || !ifsc || !consent) {
      if (!fileNo || !accountNumber || !ifsc || !consent) {
        swal.fire({
          title: "Validation Error",
          html: `
      <ul style="text-align:left">
        ${!fileNo ? "<li>File Number is required</li>" : ""}
        ${!accountNumber ? "<li>Account Number is required</li>" : ""}
        ${!ifsc ? "<li>IFSC Code is required</li>" : ""}
        ${!consent ? "<li>Consent is required</li>" : ""}
      </ul>
    `,
          icon: "warning",
        });
        return;
      }

      return;
    }

    setLoading(true);

    try {
      const res = await api.post("api/fetchBankAccountVerifyHybridController", {
        usr_ser_id,
        mas_cat_id,
        mas_ser_id,
        file_no: fileNo,
        account_number: accountNumber,
        ifsc,
        consent: "Y",
        force_refresh: forceRefresh,
      });

      if (res.data.isFromCache) {
        const confirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${new Date(
            res.data.lastFetchedAt,
          ).toLocaleString()}</b>`,
          showCancelButton: true,
          confirmButtonText: "Use Old Data",
          cancelButtonText: "Fetch Fresh (Deduct Credits)",
        });

        if (confirm.isConfirmed) {
          setResult(res.data.data);
        } else {
          handleFetch(true);
        }

        return;
      }

      setResult(res.data.data);
      fetchWallet();
    } catch (err) {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    if (!result) return;

    const bank = result?.data?.bank_account_data || {};
    const transactionId = result?.transaction_id || "-";

    const doc = {
      content: [
        { text: "Bank Account Verification Report", style: "header" },
        { text: `Request ID: ${result?.request_id}` },
        { text: `Transaction ID: ${transactionId}` },
        { qr: transactionId, fit: 100, alignment: "right" },

        { text: "Bank Details", style: "sub" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Name", bank.name || "-"],
              ["Bank", bank.bank_name || "-"],
              ["Branch", bank.branch || "-"],
              ["Account", bank.account_number || "-"],
              ["IFSC", bank.ifsc || "-"],
              ["Status", bank.account_status || "-"],
            ],
          },
        },

        { text: "Full API Response", style: "sub", margin: [0, 10] },
        { text: JSON.stringify(result, null, 2), fontSize: 8 },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      },
    };

    pdfMake.createPdf(doc).download(`Bank_Verification_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  const getBadgeVariant = () => {
    if (code === "1000") return "success";
    if (code === "1028") return "danger";
    return "warning";
  };

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

        <Card body className="mb-3 text-center">
          <h6>Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  File Number <Required />
                </Form.Label>
                <Form.Control
                  value={fileNo}
                  onChange={(e) => setFileNo(e.target.value)}
                  placeholder="Enter File Number"
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  Account Number <Required />
                </Form.Label>
                <Form.Control
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter Account Number"
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  IFSC Code <Required />
                </Form.Label>
                <Form.Control
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="Enter IFSC Code"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mt-3">
            <Form.Check
              label={
                <>
                  I give consent <Required />
                </>
              }
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
          </Form.Group>

          <Button
            className="mt-3"
            onClick={() => handleFetch()}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Verify"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result <Badge bg={getBadgeVariant()}>{code}</Badge>
              </h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Request ID</th>
                  <td>{result?.request_id}</td>
                </tr>
                <tr>
                  <th>Transaction ID</th>
                  <td>{result?.transaction_id}</td>
                </tr>
                <tr>
                  <th>Message</th>
                  <td>{result?.data?.message}</td>
                </tr>
              </tbody>
            </Table>

            <h6>Full API Response</h6>
            <pre style={{ maxHeight: 300, overflow: "auto" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </Card>
        )}
      </Col>
    </Row>
  );
}
