// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

// export default function FetchElectricityBill() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [provider, setProvider] = useState("");
//   const [consumerNo, setConsumerNo] = useState("");
//   const [mobile, setMobile] = useState("");
//   const [installationNo, setInstallationNo] = useState("");
//   const [operatorCode, setOperatorCode] = useState("");
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
//     if (!fileNo || !provider || !consumerNo || !consent) {
//       swal.fire("Validation Error", "Required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm Electricity Bill Fetch",
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Available Credits:</b> ${wallet}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchElectricityBillController", {
//         usr_ser_id,
//         file_no: fileNo,
//         electricity_provider: provider,
//         consumer_number: consumerNo,
//         mobile_number: mobile,
//         installation_number: installationNo,
//         operator_code: operatorCode,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       setResult(apiData);

//       if (code === "1006") {
//         swal.fire(
//           "Success",
//           `Electricity bill fetched successfully<br/>
//            Credits Deducted: <b>${credits}</b><br/>
//            Remaining Credits: <b>${wallet - credits}</b>`,
//           "success"
//         );
//         fetchWallet();
//       } else {
//         swal.fire("Info", apiData?.data?.message || "No records found", "info");
//       }
//     } catch (err) {
//       swal.fire("Error", "Service unavailable", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exportPdf = () => {
//     const d = result?.data?.electricity_bill_data;
//     if (!d) return;

//     const row = (k, v) => [k, safe(v)];

//     const doc = {
//       content: [
//         { text: "Electricity Bill Report", style: "header" },

//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("File Number", fileNo),
//               row("Provider", provider),
//               row("Consumer Number", consumerNo),
//               row("Bill Amount", d.bill_amount),
//               row("Due Date", d.due_date),
//               row("Bill Date", d.bill_date),
//               row("Customer Name", d.customer_name),
//             ],
//           },
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`ELECTRICITY_BILL_${fileNo}.pdf`);
//   };

//   const d = result?.data?.electricity_bill_data;

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
//             <Form.Label>File Number <Required /></Form.Label>
//             <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Electricity Provider <Required /></Form.Label>
//             <Form.Control value={provider} onChange={(e) => setProvider(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Consumer Number <Required /></Form.Label>
//             <Form.Control value={consumerNo} onChange={(e) => setConsumerNo(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Mobile Number</Form.Label>
//             <Form.Control value={mobile} onChange={(e) => setMobile(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Installation Number</Form.Label>
//             <Form.Control value={installationNo} onChange={(e) => setInstallationNo(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>Operator Code</Form.Label>
//             <Form.Control value={operatorCode} onChange={(e) => setOperatorCode(e.target.value)} />
//           </Form.Group>

//           <Form.Check
//             className="mt-2"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : "Fetch Electricity Bill"}
//           </Button>
//         </Card>

//         {d && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between">
//               <h5>📄 Electricity Bill Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr><th>Customer Name</th><td>{safe(d.customer_name)}</td></tr>
//                 <tr><th>Bill Amount</th><td>{safe(d.bill_amount)}</td></tr>
//                 <tr><th>Bill Date</th><td>{safe(d.bill_date)}</td></tr>
//                 <tr><th>Due Date</th><td>{safe(d.due_date)}</td></tr>
//                 <tr><th>Status</th><td>{safe(d.bill_status)}</td></tr>
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
  Table,
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

const safe = (v) =>
  v === undefined || v === null || v === "" ? "-" : v;

export default function FetchElectricityBill() {
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
  const [fileNo, setFileNo] = useState("");
  const [provider, setProvider] = useState("");
  const [consumerNo, setConsumerNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [installationNo, setInstallationNo] = useState("");
  const [operatorCode, setOperatorCode] = useState("");
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

  /* ================= BADGE HANDLING ================= */
  const getBadgeVariant = (code) => {
    if (code === "1006") return "success";
    if (code === "1004") return "danger";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ===== VALIDATION ===== */
    if (!fileNo || !provider || !consumerNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!provider ? "<li>Electricity Provider is required</li>" : ""}
            ${!consumerNo ? "<li>Consumer Number is required</li>" : ""}
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
      title: "Confirm Electricity Bill Fetch",
      html: `
        <p><b>Provider:</b> ${provider}</p>
        <p><b>Consumer Number:</b> ${consumerNo}</p>
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
        "api/checkElectricityBillCache",
        {
          mas_ser_id,
          mas_cat_id,
          consumer_number: consumerNo,
        }
      );

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

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
        "api/executeElectricityBill",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          electricity_provider: provider,
          consumer_number: consumerNo,
          mobile_number: mobile,
          installation_number: installationNo,
          operator_code: operatorCode,
          consent: "Y",
          use_cache: useCache,
        }
      );

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      /* ================= RESPONSE HANDLING ================= */
      if (code === "1006") {
        swal.fire({
          title: "Success",
          html: apiData?.data?.message,
          icon: "success",
        });
      } else if (code === "1004") {
        swal.fire(
          "No Records Found",
          apiData?.data?.message,
          "warning"
        );
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

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const transactionId = result?.transaction_id || "-";
    const requestId = result?.request_id || "-";
    const bill = result?.data?.electricity_bill_data || {};

    const doc = {
      content: [
        { text: "Electricity Bill Detailed Report", style: "header" },
        { text: `File Number: ${fileNo}` },
        { text: `Provider: ${provider}` },
        { text: `Consumer Number: ${consumerNo}` },
        { text: `Transaction ID: ${transactionId}` },
        { text: `Request ID: ${requestId}` },
        {
          qr: transactionId,
          fit: 80,
          alignment: "right",
          margin: [0, 10],
        },
        {
          text: "Electricity Bill Details",
          style: "section",
          margin: [0, 12, 0, 6],
        },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Customer Name", safe(bill.name)],
              ["Bill Amount", safe(bill.bill_amount)],
              ["Amount Payable", safe(bill.amount_payable)],
              ["Due Date", safe(bill.bill_due_date)],
              ["Consumer Number", safe(bill.consumer_number)],
              ["Provider", safe(bill.electricity_provider)],
            ],
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

    pdfMake.createPdf(doc).download(
      `ELECTRICITY_BILL_${fileNo}.pdf`
    );
  };

  const code = result?.data?.code;
  const bill = result?.data?.electricity_bill_data;

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
                Electricity Provider <Required />
              </Form.Label>
              <Form.Control
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={6}>
              <Form.Label>
                Consumer Number <Required />
              </Form.Label>
              <Form.Control
                value={consumerNo}
                onChange={(e) => setConsumerNo(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : "Fetch Electricity Bill"}
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