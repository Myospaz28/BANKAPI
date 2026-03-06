// import React, { useEffect, useState } from "react";
// import {
//   Card,
//   Row,
//   Col,
//   Form,
//   Button,
//   Spinner,
//   Table,
//   Badge,
// } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// /* ===== PDF ===== */
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// import JsonTableViewer from "app/components/JsonTableViewer";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchVerifyMrz() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
//     state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");

//   const [form, setForm] = useState({
//     country_code: "IND",
//     passport_number: "",
//     surname: "",
//     given_name: "",
//     gender: "",
//     date_of_birth: "",
//     date_of_expiry: "",
//     mrz_first_line: "",
//     mrz_second_line: "",
//   });

//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= INIT ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//   }, [usr_ser_id, navigate]);

//   useEffect(() => {
//     api
//       .get("api/getLoggedInUserWallet")
//       .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
//   }, []);

//   /* ================= HANDLE CHANGE ================= */
//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value.toUpperCase() });
//   };

//   // Replace your handleVerify() with this

//   const handleVerify = async () => {
//     if (!fileNo || !consent) {
//       swal.fire("Validation Error", "All required fields missing", "warning");
//       return;
//     }

//     setLoading(true);
//     setResult(null);

//     try {
//       /* ===== CACHE CHECK ===== */
//       const checkRes = await api.post("api/checkVerifyMrzCache", {
//         mas_ser_id,
//         mas_cat_id,
//         passport_number: form.passport_number,
//       });

//       let useCache = false;

//       if (checkRes.data.hasCache) {
//         const fetchedDate = new Date(
//           checkRes.data.lastFetchedAt,
//         ).toLocaleString("en-IN");

//         const cacheConfirm = await swal.fire({
//           title: "Previous Data Found",
//           html: `Last fetched on: <b>${fetchedDate}</b>`,
//           showConfirmButton: true,
//           showDenyButton: true,
//           showCancelButton: true,
//           confirmButtonText: "Use Old Data",
//           denyButtonText: "Fetch Fresh",
//         });

//         if (cacheConfirm.isConfirmed) useCache = true;
//         else if (!cacheConfirm.isDenied) {
//           setLoading(false);
//           return;
//         }
//       }

//       const res = await api.post("api/executeVerifyMrz", {
//         usr_ser_id,
//         mas_ser_id,
//         mas_cat_id,
//         file_no: fileNo,
//         ...form,
//         use_cache: useCache,
//       });

//       setResult(res.data?.data);

//       if (res.data?.wallet?.closing_balance !== undefined) {
//         setWallet(res.data.wallet.closing_balance);
//       }
//     } catch (err) {
//       swal.fire(
//         "Error",
//         err?.response?.data?.message || "Server error",
//         "error",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };
//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     const data = result?.data;
//     if (!data) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const doc = {
//       content: [
//         { text: "MRZ Verification Report", style: "header" },

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
//         },

//         { text: "Passport Input Details", style: "sub" },
//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["Country Code", form.country_code],
//               ["Passport Number", form.passport_number],
//               ["Name", `${form.given_name} ${form.surname}`],
//               ["Gender", form.gender],
//               ["DOB", form.date_of_birth],
//               ["Expiry", form.date_of_expiry],
//             ],
//           },
//           layout: "lightHorizontalLines",
//         },

//         { text: "MRZ Lines", style: "sub" },
//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["MRZ Line 1", form.mrz_first_line],
//               ["MRZ Line 2", form.mrz_second_line],
//             ],
//           },
//           layout: "lightHorizontalLines",
//         },

//         { text: "Verification Result", style: "sub" },
//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: [
//               ["Status Code", data.code],
//               ["Message", data.message],
//             ],
//           },
//           layout: "lightHorizontalLines",
//         },

//         {
//           text: `Generated On: ${new Date().toLocaleString()}`,
//           fontSize: 9,
//           italics: true,
//           marginTop: 10,
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//         sub: { fontSize: 14, bold: true, marginTop: 10, marginBottom: 5 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`MRZ_Verify_${fileNo}.pdf`);
//   };

//   const data = result?.data;

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
//             <Col md={4}>
//               <Form.Label>
//                 File No <Required />
//               </Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>
//             <Col md={4}>
//               <Form.Label>
//                 Country Code <Required />
//               </Form.Label>
//               <Form.Control
//                 name="country_code"
//                 value={form.country_code}
//                 onChange={handleChange}
//               />
//             </Col>
//             <Col md={4}>
//               <Form.Label>
//                 Passport Number <Required />
//               </Form.Label>
//               <Form.Control
//                 name="passport_number"
//                 value={form.passport_number}
//                 onChange={handleChange}
//               />
//             </Col>
//           </Row>

//           <Row className="mt-2">
//             <Col md={4}>
//               <Form.Label>
//                 Surname <Required />
//               </Form.Label>
//               <Form.Control
//                 name="surname"
//                 value={form.surname}
//                 onChange={handleChange}
//               />
//             </Col>
//             <Col md={4}>
//               <Form.Label>
//                 Given Name <Required />
//               </Form.Label>
//               <Form.Control
//                 name="given_name"
//                 value={form.given_name}
//                 onChange={handleChange}
//               />
//             </Col>
//             <Col md={4}>
//               <Form.Label>
//                 Gender <Required />
//               </Form.Label>
//               <Form.Select
//                 name="gender"
//                 value={form.gender}
//                 onChange={handleChange}
//               >
//                 <option value="">Select</option>
//                 <option value="MALE">MALE</option>
//                 <option value="FEMALE">FEMALE</option>
//               </Form.Select>
//             </Col>
//           </Row>

//           <Row className="mt-2">
//             <Col md={6}>
//               <Form.Label>
//                 Date of Birth <Required />
//               </Form.Label>
//               <Form.Control
//                 type="date"
//                 name="date_of_birth"
//                 value={form.date_of_birth}
//                 onChange={handleChange}
//               />
//             </Col>
//             <Col md={6}>
//               <Form.Label>
//                 Date of Expiry <Required />
//               </Form.Label>
//               <Form.Control
//                 type="date"
//                 name="date_of_expiry"
//                 value={form.date_of_expiry}
//                 onChange={handleChange}
//               />
//             </Col>
//           </Row>

//           <Row className="mt-2">
//             <Col md={6}>
//               <Form.Label>
//                 MRZ Line 1 <Required />
//               </Form.Label>
//               <Form.Control
//                 name="mrz_first_line"
//                 value={form.mrz_first_line}
//                 onChange={handleChange}
//               />
//             </Col>
//             <Col md={6}>
//               <Form.Label>
//                 MRZ Line 2 <Required />
//               </Form.Label>
//               <Form.Control
//                 name="mrz_second_line"
//                 value={form.mrz_second_line}
//                 onChange={handleChange}
//               />
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleVerify} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Verify MRZ"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {result && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>
//                 Verification Result{" "}
//                 <Badge
//                   bg={result?.data?.code === "1001" ? "success" : "danger"}
//                 >
//                   {result?.data?.message}
//                 </Badge>
//               </h5>

//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <h6 className="mt-3">Full API Response</h6>
//             <JsonTableViewer data={result} />
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
import JsonTableViewer from "../components/JsonTableViewer";

/* ===== PDF ===== */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchVerifyMrz() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");

  const [form, setForm] = useState({
    country_code: "IND",
    passport_number: "",
    surname: "",
    given_name: "",
    gender: "",
    date_of_birth: "",
    date_of_expiry: "",
    mrz_first_line: "",
    mrz_second_line: "",
  });

  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);

    api
      .get("api/getLoggedInUserWallet")
      .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
  }, [usr_ser_id, navigate]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value.toUpperCase() });
  };

  /* ================= VERIFY ================= */
  const handleVerify = async () => {
    if (!fileNo || !consent) {
      swal.fire("Validation Error", "All required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post("api/checkVerifyMrzCache", {
        mas_ser_id,
        mas_cat_id,
        passport_number: form.passport_number,
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

      const res = await api.post("api/executeVerifyMrz", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        ...form,
        use_cache: useCache,
      });

      setResult(res.data?.data);

      if (res.data?.wallet?.closing_balance !== undefined) {
        setWallet(res.data.wallet.closing_balance);
      }

      const code = res.data?.data?.data?.code;

      swal.fire(
        code === "1001" ? "Valid MRZ" : "Invalid MRZ",
        res.data?.data?.data?.message || "",
        code === "1001" ? "success" : "error",
      );
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

  /* ================= PDF EXPORT (WITH QR SCANNER) ================= */
  const exportPdf = () => {
    if (!result) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";
    const data = result?.data;

    const docDefinition = {
      pageSize: "A4",
      content: [
        { text: "MRZ Verification Report", style: "header" },

        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },

        {
          qr: requestId || "MRZ_VERIFY",
          fit: 90,
          alignment: "right",
          margin: [0, 10],
        },

        { text: "Passport Input Details", style: "sub" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["File Number", fileNo],
              ["Passport Number", form.passport_number],
              ["Name", `${form.given_name} ${form.surname}`],
              ["Country", form.country_code],
              ["Gender", form.gender],
              ["DOB", form.date_of_birth],
              ["Expiry", form.date_of_expiry],
              ["MRZ Line 1", form.mrz_first_line],
              ["MRZ Line 2", form.mrz_second_line],
            ],
          },
          layout: "lightHorizontalLines",
        },

        { text: "Verification Result", style: "sub" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["Status Code", data?.code],
              ["Message", data?.message],
            ],
          },
          layout: "lightHorizontalLines",
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          alignment: "right",
          fontSize: 9,
          italics: true,
          margin: [0, 10],
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
        sub: { fontSize: 14, bold: true, marginTop: 10, marginBottom: 5 },
      },
    };

    pdfMake.createPdf(docDefinition).download(`MRZ_Verify_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Verify Passport MRZ"}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mt-3">
          {/* ALL INPUTS SAME — NOTHING REMOVED */}
          <Row>
            <Col md={4}>
              <Form.Label>
                File No <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Country Code <Required />
              </Form.Label>
              <Form.Control
                name="country_code"
                value={form.country_code}
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Passport Number <Required />
              </Form.Label>
              <Form.Control
                name="passport_number"
                value={form.passport_number}
                onChange={handleChange}
              />
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={4}>
              <Form.Label>
                Surname <Required />
              </Form.Label>
              <Form.Control
                name="surname"
                value={form.surname}
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Given Name <Required />
              </Form.Label>
              <Form.Control
                name="given_name"
                value={form.given_name}
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Gender <Required />
              </Form.Label>
              <Form.Select
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </Form.Select>
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={6}>
              <Form.Label>
                Date of Birth <Required />
              </Form.Label>
              <Form.Control
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label>
                Date of Expiry <Required />
              </Form.Label>
              <Form.Control
                type="date"
                name="date_of_expiry"
                value={form.date_of_expiry}
                onChange={handleChange}
              />
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={6}>
              <Form.Label>
                MRZ Line 1 <Required />
              </Form.Label>
              <Form.Control
                name="mrz_first_line"
                value={form.mrz_first_line}
                onChange={handleChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label>
                MRZ Line 2 <Required />
              </Form.Label>
              <Form.Control
                name="mrz_second_line"
                value={form.mrz_second_line}
                onChange={handleChange}
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
            {loading ? <Spinner size="sm" /> : "Verify MRZ"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Verification Result{" "}
                <Badge bg={code === "1001" ? "success" : "danger"}>
                  {result?.data?.message}
                </Badge>
              </h5>

              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
