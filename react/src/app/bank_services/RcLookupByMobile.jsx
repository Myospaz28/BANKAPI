// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";

// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function RcLookupByMobile() {
//   const navigate = useNavigate();
//   const { state } = useLocation();

//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [mobile, setMobile] = useState("");
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

//   /* ================= FETCH RC ================= */
//   const handleFetch = async () => {
//     if (!mobile || mobile.length !== 10 || !consent) {
//       swal.fire(
//         "Validation Error",
//         "Mobile number and consent are required",
//         "warning"
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm RC Lookup",
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Available Credits:</b> ${wallet}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchRcLookupByMobileController", {
//         usr_ser_id,
//         mobile_number: mobile,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code !== "1000") {
//         swal.fire("Failed", "No record found", "warning");
//         return;
//       }

//       setResult(apiData);

//       swal.fire(
//         "Success",
//         `
//         RC lookup successful<br/>
//         Credits Deducted: <b>${credits}</b><br/>
//         Remaining Credits: <b>${wallet - credits}</b>
//         `,
//         "success"
//       );

//       fetchWallet();
//     } catch (err) {
//       swal.fire(
//         "Error",
//         err.response?.data?.message || "Server error",
//         "error"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= EXPORT PDF ================= */
//   const exportPdf = () => {
//     if (!result?.data?.vehicle_data) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const vehicle = result.data.vehicle_data;

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
//         { text: "RC Lookup by Mobile Report", style: "header" },

//         { text: "Service Information", style: "sub" },
//         tableBlock([
//           ["Service Name", service_name],
//           ["Credits Used", credits],
//         ]),

//         { text: "Lookup Details", style: "sub" },
//         tableBlock([
//           ["Mobile Number", vehicle.mobile_number],
//           ["RC Number", vehicle.rc_number],
//         ]),

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

//     pdfMake.createPdf(doc).download(
//       `RC_Lookup_${vehicle.mobile_number}.pdf`
//     );
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button variant="primary" onClick={() => navigate(-1)}>
//             ← Back
//           </Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p className="text-muted">
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
//               <Form.Group>
//                 <Form.Label>
//                   Mobile Number <Required />
//                 </Form.Label>
//                 <Form.Control
//                   maxLength={10}
//                   value={mobile}
//                   onChange={(e) =>
//                     setMobile(e.target.value.replace(/\D/g, ""))
//                   }
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={6} className="d-flex align-items-end">
//               <Form.Check
//                 type="checkbox"
//                 label={
//                   <>
//                     I give consent <Required />
//                   </>
//                 }
//                 checked={consent}
//                 onChange={(e) => setConsent(e.target.checked)}
//               />
//             </Col>
//           </Row>

//           <Button
//             className="mt-3"
//             variant="success"
//             disabled={loading}
//             onClick={handleFetch}
//           >
//             {loading ? <Spinner size="sm" /> : "Lookup RC by Mobile"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {result?.data?.vehicle_data && (
//           <Card body>
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>Vehicle Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr>
//                   <th>Mobile Number</th>
//                   <td>{result.data.vehicle_data.mobile_number}</td>
//                 </tr>
//                 <tr>
//                   <th>RC Number</th>
//                   <td>{result.data.vehicle_data.rc_number}</td>
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
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function RcLookupByMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [mobile, setMobile] = useState("");
  const [fileNo, setFileNo] = useState(""); // ✅ FILE NUMBER
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= GUARD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  /* ================= WALLET ================= */
  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH RC ================= */
  const handleFetch = async () => {
    if (!mobile || mobile.length !== 10 || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "Mobile number, File Number and consent are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm RC Lookup",
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Available Credits:</b> ${wallet}</p>
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
      const res = await api.post("api/fetchRcLookupByMobileController", {
        usr_ser_id,
        mobile_number: mobile,
        file_no: fileNo, // ✅ SEND FILE NUMBER
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code !== "1000") {
        swal.fire("Failed", "No record found", "warning");
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        RC lookup successful<br/>
        Credits Deducted: <b>${credits}</b><br/>
        Remaining Credits: <b>${wallet - credits}</b>
        `,
        "success"
      );

      fetchWallet();
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
    if (!result?.data?.vehicle_data) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const vehicle = result.data.vehicle_data;

    const tableBlock = (rows) => ({
      table: {
        widths: ["35%", "65%"],
        body: rows.map((r) => [
          { text: r[0], bold: true },
          r[1] || "-",
        ]),
      },
      layout: "lightHorizontalLines",
      marginBottom: 10,
    });

    const doc = {
      content: [
        { text: "RC Lookup by Mobile Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        { text: "Lookup Details", style: "sub" },
        tableBlock([
          ["Mobile Number", vehicle.mobile_number],
          ["RC Number", vehicle.rc_number],
        ]),

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginTop: 15,
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
        sub: { fontSize: 14, bold: true, marginTop: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`RC_LOOKUP_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button variant="primary" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h4 className="mt-3">{service_name}</h4>
          <p className="text-muted">
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  Mobile Number <Required />
                </Form.Label>
                <Form.Control
                  maxLength={10}
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, ""))
                  }
                />
              </Form.Group>
            </Col>

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

            <Col md={4} className="d-flex align-items-end">
              <Form.Check
                type="checkbox"
                label={
                  <>
                    I give consent <Required />
                  </>
                }
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
            </Col>
          </Row>

          <Button
            className="mt-3"
            variant="success"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Lookup RC by Mobile"}
          </Button>
        </Card>

        {result?.data?.vehicle_data && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>Vehicle Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Mobile Number</th>
                  <td>{result.data.vehicle_data.mobile_number}</td>
                </tr>
                <tr>
                  <th>RC Number</th>
                  <td>{result.data.vehicle_data.rc_number}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
