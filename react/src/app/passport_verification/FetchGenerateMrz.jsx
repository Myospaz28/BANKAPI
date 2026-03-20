// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";
// import JsonTableViewer from "../components/JsonTableViewer";

// /* ===== PDF ===== */
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchGenerateMrz() {
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
//   });

//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= INIT ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);

//     api
//       .get("api/getLoggedInUserWallet")
//       .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
//   }, [usr_ser_id, navigate]);

//   /* ================= HANDLE CHANGE ================= */
//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value.toUpperCase() });
//   };

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     const {
//       country_code,
//       passport_number,
//       surname,
//       given_name,
//       gender,
//       date_of_birth,
//       date_of_expiry,
//     } = form;

//     if (
//       !fileNo ||
//       !country_code ||
//       !passport_number ||
//       !surname ||
//       !given_name ||
//       !gender ||
//       !date_of_birth ||
//       !date_of_expiry ||
//       !consent
//     ) {
//       swal.fire("Validation Error", "All required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     setLoading(true);
//     setResult(null);

//     try {
//       /* ===== CACHE CHECK ===== */
//       const checkRes = await api.post("api/checkGenerateMrzCache", {
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
//                customClass: {
//             confirmButton: "btn-use-old",
//             denyButton: "btn-fetch-fresh",
//           },
//             allowOutsideClick: false,
//           allowEscapeKey: false,
//         });

//         if (cacheConfirm.isConfirmed) useCache = true;
//         else if (!cacheConfirm.isDenied) {
//           setLoading(false);
//           return;
//         }
//       }

//       /* ===== EXECUTE API ===== */
//       const res = await api.post("api/executeGenerateMrz", {
//         usr_ser_id,
//         mas_ser_id,
//         mas_cat_id,
//         file_no: fileNo,
//         ...form,
//         use_cache: useCache,
//       });

//       const fullResponse = res.data?.data;
//       setResult(fullResponse);

//       /* wallet refresh */
//       if (res.data?.wallet?.closing_balance !== undefined) {
//         setWallet(res.data.wallet.closing_balance);
//       }

//       const code = fullResponse?.data?.code;

//       if (code !== "1000") {
//         swal.fire(
//           "Failed",
//           fullResponse?.data?.message || "MRZ generation failed",
//           "error",
//         );
//       } else {
//         swal.fire("Success", "MRZ generated successfully", "success");
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

//   const code = result?.data?.code;
//   const badgeVariant = code === "1000" ? "success" : "secondary";

//   /* ================= PDF EXPORT ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const requestId = result?.request_id || "-";
//     const transactionId = result?.transaction_id || "-";
//     const mrz = result?.data?.mrz_data;

//     const docDefinition = {
//       content: [
//         { text: "Passport MRZ Generation Report", style: "header" },
//         { text: `Request ID: ${requestId}` },
//         { text: `Transaction ID: ${transactionId}` },
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               ["File Number", fileNo],
//               ["Passport Number", form.passport_number],
//               ["MRZ Line 1", mrz?.first_line],
//               ["MRZ Line 2", mrz?.second_line],
//             ],
//           },
//           layout: "lightHorizontalLines",
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//     };

//     pdfMake.createPdf(docDefinition).download(`MRZ_${fileNo}.pdf`);
//   };

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name || "Generate Passport MRZ"}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mt-3">
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

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Generate MRZ"}
//           </Button>
//         </Card>

//         {result && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>
//                 Result <Badge bg={badgeVariant}>{code}</Badge>
//               </h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <p className="mt-2">
//               <b>Request ID:</b> {result?.request_id} <br />
//               <b>Transaction ID:</b> {result?.transaction_id}
//             </p>

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

export default function FetchGenerateMrz() {
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

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    const {
      country_code,
      passport_number,
      surname,
      given_name,
      gender,
      date_of_birth,
      date_of_expiry,
    } = form;

    if (
      !fileNo ||
      !country_code ||
      !passport_number ||
      !surname ||
      !given_name ||
      !gender ||
      !date_of_birth ||
      !date_of_expiry ||
      !consent
    ) {
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
      const checkRes = await api.post("api/checkGenerateMrzCache", {
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

      /* ===== EXECUTE API ===== */
      const res = await api.post("api/executeGenerateMrz", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        ...form,
        use_cache: useCache,
      });

      const fullResponse = res.data?.data;
      setResult(fullResponse);

      /* wallet refresh */
      if (res.data?.wallet?.closing_balance !== undefined) {
        setWallet(res.data.wallet.closing_balance);
      }

      const code = fullResponse?.data?.code;

      if (code !== "1000") {
        swal.fire(
          "Failed",
          fullResponse?.data?.message || "MRZ generation failed",
          "error",
        );
      } else {
        swal.fire("Success", "MRZ generated successfully", "success");
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

  const code = result?.data?.code;
  const badgeVariant = code === "1000" ? "success" : "secondary";

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!result) return;

    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";
    const mrz = result?.data?.mrz_data;

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: "Passport MRZ Generation Report", style: "header" },

        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },

        {
          qr: requestId !== "-" ? requestId : "MRZ_GENERATE",
          fit: 90,
          alignment: "right",
          margin: [0, 10],
        },

        { text: "Passport Input Details", style: "sub", margin: [0, 10, 0, 5] },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["File Number", fileNo],
              ["Passport Number", form.passport_number],
              ["Surname", form.surname],
              ["Given Name", form.given_name],
              ["Gender", form.gender],
              ["Date of Birth", form.date_of_birth],
              ["Date of Expiry", form.date_of_expiry],
              ["Country Code", form.country_code],
            ],
          },
          layout: "lightHorizontalLines",
        },

        { text: "Generated MRZ", style: "sub", margin: [0, 10, 0, 5] },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["MRZ Line 1", mrz?.first_line || "-"],
              ["MRZ Line 2", mrz?.second_line || "-"],
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
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(docDefinition).download(`MRZ_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Generate Passport MRZ"}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mt-3">
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

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Generate MRZ"}
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

            <p className="mt-2">
              <b>Request ID:</b> {result?.request_id} <br />
              <b>Transaction ID:</b> {result?.transaction_id}
            </p>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
