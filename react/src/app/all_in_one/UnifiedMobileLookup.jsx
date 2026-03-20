




// import React, { useEffect, useState } from "react";
// import {
//   Card,
//   Row,
//   Col,
//   Form,
//   Button,
//   Spinner,
//   Badge,
// } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";
// import JsonTableViewer from "app/components/JsonTableViewer";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => (
//   <span style={{ color: "red", marginLeft: 4 }}>*</span>
// );

// const normalize = (data) => {
//   if (!data) return null;
//   if (typeof data === "string") {
//     try { return JSON.parse(data); } catch { return data; }
//   }
//   return data;
// };

// const safe = (v) =>
//   v === undefined || v === null || v === "" ? "-" : String(v);

// const getPanBadge       = (code) => code === "1003" ? "success" : code === "1004" ? "danger"  : "secondary";
// const getPrefillBadge   = (code) => code === "1015" ? "success" : code === "1004" ? "warning" : "secondary";
// const getFootprintBadge = (code) => code === "1030" ? "success" : "secondary";
// const getAgeBadge       = (code) => code === "1008" ? "success" : code === "1004" ? "warning" : "secondary";

// export default function UnifiedMobileLookup() {
//   const navigate = useNavigate();
//   const { state } = useLocation();

//   const {
//     usr_ser_id,
//     mas_ser_id,
//     mas_cat_id,
//     service_name,
//     credits,
//   } = state || {};

//   const [wallet,    setWallet]    = useState(0);
//   const [mobile,    setMobile]    = useState("");
//   const [fileNo,    setFileNo]    = useState("");
//   const [firstName, setFirstName] = useState("");
//   const [lastName,  setLastName]  = useState("");
//   const [email,     setEmail]     = useState("");
//   const [name,      setName]      = useState("");
//   const [consent,   setConsent]   = useState(false);
//   const [loading,   setLoading]   = useState(false);

//   const [panResult,       setPanResult]       = useState(null);
//   const [prefillResult,   setPrefillResult]   = useState(null);
//   const [footprintResult, setFootprintResult] = useState(null);
//   const [mobileAgeResult, setMobileAgeResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     try {
//       const res = await api.get("api/getLoggedInUserWallet");
//       setWallet(Number(res.data?.data?.wallet_amount || 0));
//     } catch { setWallet(0); }
//   };

//   /* ── cache dialog ── */
//   const askCache = async (fetchedAt) => {
//     const fetchedDate = new Date(fetchedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
//     const res = await swal.fire({
//       title: "Previous Data Found",
//       html: `Last fetched on: <b>${fetchedDate}</b>`,
//       icon: "question",
//       showCancelButton: true,
//       showDenyButton: true,
//       confirmButtonText: "Use Old Data",
//       denyButtonText: "Fetch Fresh",
//       cancelButtonText: "Cancel",
//       customClass: { confirmButton: "btn-use-old", denyButton: "btn-fetch-fresh" },
//       allowOutsideClick: false,
//       allowEscapeKey: false,
//     });
//     if (res.isConfirmed) return "cache";
//     if (res.isDenied)    return "fresh";
//     return "cancel";
//   };

//   /* ══════════════════ MAIN FETCH ══════════════════ */
//   const handleFetch = async () => {
//     if (loading) return;

//     if (!mobile || mobile.length !== 10 || !fileNo || !consent) {
//       swal.fire({
//         title: "Validation Error",
//         html: `<ul style="text-align:left">
//           ${!mobile ? "<li>Mobile Number is required</li>" : ""}
//           ${mobile && mobile.length !== 10 ? "<li>Mobile must be 10 digits</li>" : ""}
//           ${!fileNo ? "<li>File Number is required</li>" : ""}
//           ${!consent ? "<li>Consent is required</li>" : ""}
//         </ul>`,
//         icon: "warning",
//       });
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm Unified Lookup",
//       html: `
//         <p><b>Mobile Number:</b> ${mobile}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });
//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setPanResult(null);
//     setPrefillResult(null);
//     setFootprintResult(null);
//     setMobileAgeResult(null);

//     try {
//       /* ── cache check ── */
//       const checkRes = await api.post("api/checkUnifiedMobileLookupCache", {
//         mas_ser_id,
//         mas_cat_id,
//         mobile_number: mobile,
//       });

//       let useCache = false;

//       if (checkRes.data.hasCache) {
//         const d = await askCache(checkRes.data.lastFetchedAt);
//         if (d === "cancel") { setLoading(false); return; }
//         useCache = d === "cache";
//       }

//       /* ── execute ── */
//       const execRes = await api.post("api/executeUnifiedMobileLookup", {
//         usr_ser_id,
//         mas_ser_id,
//         mas_cat_id,
//         file_no: fileNo,
//         mobile_number: mobile,
//         first_name: firstName,
//         last_name: lastName,
//         email,
//         name,
//         use_cache: useCache,
//       });

//       const { pan, prefill, footprint, mobile_age } = execRes.data?.data || {};

//       setPanResult(normalize(pan));
//       setPrefillResult(normalize(prefill));
//       setFootprintResult(footprint);
//       setMobileAgeResult(normalize(mobile_age));

//       fetchWallet();

//       const anySuccess =
//         pan?.data?.code       === "1003" ||
//         prefill?.data?.code   === "1015" ||
//         footprint?.data?.code === "1030" ||
//         mobile_age?.data?.code === "1008";

//       if (anySuccess) {
//         swal.fire({ title: "Success", icon: "success", timer: 1500, showConfirmButton: false });
//       } else {
//         swal.fire("Completed", "Data fetched.", "info");
//       }

//     } catch (err) {
//       swal.fire("Error", err.response?.data?.message || "Server error", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ══════════════════ PDF EXPORT ══════════════════ */
//   const exportPdf = () => {
//     if (!panResult && !prefillResult && !footprintResult && !mobileAgeResult) {
//       swal.fire("No Data", "Nothing to export.", "warning");
//       return;
//     }

//     const section = (title, rows) => [
//       { text: title, style: "section", margin: [0, 12, 0, 6] },
//       { table: { widths: ["40%", "60%"], body: rows }, layout: "lightHorizontalLines" },
//     ];

//     const content = [
//       { text: "Unified Mobile Lookup Report", style: "header" },
//       { text: `File Number: ${fileNo}` },
//       { text: `Mobile Number: ${mobile}` },
//       { qr: mobile, fit: 80, alignment: "right", margin: [0, 10] },
//     ];

//     /* PAN */
//     if (panResult) {
//       const panData = panResult?.data?.pan_data || {};
//       content.push(...section("PAN Lookup", [
//         [{ text: "Response Code",  bold: true }, safe(panResult?.data?.code)],
//         [{ text: "PAN Number",     bold: true }, safe(panData.pan_number)],
//         [{ text: "Full Name",      bold: true }, safe(panData.full_name)],
//         [{ text: "Transaction ID", bold: true }, safe(panResult?.transaction_id)],
//         [{ text: "Request ID",     bold: true }, safe(panResult?.request_id)],
//       ]));
//     }

//     /* PREFILL */
//     if (prefillResult) {
//       const p  = prefillResult?.data?.personal_data || {};
//       const pi = p.personal_information || {};
//       content.push(...section("Mobile Prefill — Personal Information", [
//         [{ text: "Response Code",  bold: true }, safe(prefillResult?.data?.code)],
//         [{ text: "Full Name",      bold: true }, safe(pi.full_name)],
//         [{ text: "Gender",         bold: true }, safe(pi.gender)],
//         [{ text: "Age",            bold: true }, safe(pi.age)],
//         [{ text: "Date of Birth",  bold: true }, safe(pi.date_of_birth)],
//         [{ text: "Transaction ID", bold: true }, safe(prefillResult?.transaction_id)],
//       ]));
//       if (p.document_data?.pan?.length) {
//         content.push(...section("PAN from Prefill",
//           p.document_data.pan.map((pan, i) => [{ text: `PAN ${i + 1}`, bold: true }, safe(pan.value)])
//         ));
//       }
//       if (p.email?.length) {
//         content.push(...section("Email Addresses",
//           p.email.map((e, i) => [{ text: `Email ${i + 1}`, bold: true }, safe(e.value)])
//         ));
//       }
//       if (p.alternate_phone?.length) {
//         content.push(...section("Alternate Phones",
//           p.alternate_phone.map((a, i) => [{ text: `Phone ${i + 1}`, bold: true }, safe(a.value)])
//         ));
//       }
//       if (p.address?.length) {
//         content.push(...section("Address History",
//           p.address.map((a, i) => [
//             { text: `Address ${i + 1}`, bold: true },
//             `${safe(a.detailed_address)}, ${safe(a.state)} - ${safe(a.pincode)}`,
//           ])
//         ));
//       }
//     }

//     /* FOOTPRINT */
//     if (footprintResult) {
//       const profiles = footprintResult?.data?.digital_profile_data || [];
//       content.push({ text: "Digital Footprint", style: "section", margin: [0, 12, 0, 6] });
//       profiles.forEach((profile) => {
//         if (profile.primary_data?.account_details?.length) {
//           content.push({ text: profile.data_type, style: "subSection", margin: [0, 6, 0, 4] });
//           content.push({
//             table: {
//               widths: ["50%", "50%"],
//               body: [
//                 [{ text: "Platform", bold: true }, { text: "Status", bold: true }],
//                 ...profile.primary_data.account_details.map((a) => [
//                   a.platform,
//                   a.error ? "Error" : a.user_exist === true ? "Exists" : "Not Found",
//                 ]),
//               ],
//             },
//             layout: "lightHorizontalLines",
//           });
//         }
//       });
//     }

//     /* MOBILE AGE */
//     if (mobileAgeResult) {
//       const d = mobileAgeResult?.data?.mobile_number_age_data || {};
//       content.push(...section("Mobile Number Age", [
//         [{ text: "Response Code",      bold: true }, safe(mobileAgeResult?.data?.code)],
//         [{ text: "Mobile Age",         bold: true }, safe(d.mobile_age)],
//         [{ text: "Is Number Active",   bold: true }, safe(d.is_number_active)],
//         [{ text: "Is Number Valid",    bold: true }, safe(d.is_number_valid)],
//         [{ text: "Has Porting History",bold: true }, safe(d.has_porting_history)],
//         [{ text: "Current Provider",   bold: true }, safe(d.current_ported_telecom_provider)],
//         [{ text: "Original Provider",  bold: true }, safe(d.original_telecom_provider)],
//         [{ text: "Ported Region",      bold: true }, safe(d.ported_region)],
//         [{ text: "Original Region",    bold: true }, safe(d.original_region)],
//         [{ text: "Transaction ID",     bold: true }, safe(mobileAgeResult?.transaction_id)],
//       ]));
//     }

//     content.push({
//       text: `Generated On: ${new Date().toLocaleString()}`,
//       margin: [0, 15, 0, 0],
//       fontSize: 9,
//       italics: true,
//     });

//     pdfMake.createPdf({
//       content,
//       styles: {
//         header:     { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
//         section:    { fontSize: 14, bold: true },
//         subSection: { fontSize: 12, bold: true },
//       },
//       defaultStyle: { fontSize: 10 },
//     }).download(`UNIFIED_LOOKUP_${fileNo}_${mobile}.pdf`);
//   };

//   const panCode       = panResult?.data?.code;
//   const prefillCode   = prefillResult?.data?.code;
//   const footprintCode = footprintResult?.data?.code;
//   const ageCode       = mobileAgeResult?.data?.code;
//   const hasResult     = panResult || prefillResult || footprintResult || mobileAgeResult;

//   /* ══════════════════ UI ══════════════════ */
//   return (
//     <Row>
//       <Col md={12}>

//         {/* HEADER */}
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>Credits Required: <b>{credits}</b></p>
//         </Card>

//         {/* FORM */}
//         <Card body className="mb-4">
//           <Row>
//             <Col md={6}>
//               <Form.Label>File Number <Required /></Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>
//             <Col md={6}>
//               <Form.Label>Mobile Number <Required /></Form.Label>
//               <Form.Control
//                 maxLength={10}
//                 value={mobile}
//                 onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
//               />
//             </Col>
//           </Row>

//           <Row className="mt-3">
//             <Col md={6}>
//               <Form.Label>First Name</Form.Label>
//               <Form.Control
//                 value={firstName}
//                 onChange={(e) => setFirstName(e.target.value)}
//                 placeholder="For Mobile Prefill (optional)"
//               />
//             </Col>
//             <Col md={6}>
//               <Form.Label>Last Name</Form.Label>
//               <Form.Control
//                 value={lastName}
//                 onChange={(e) => setLastName(e.target.value)}
//                 placeholder="For Mobile Prefill (optional)"
//               />
//             </Col>
//           </Row>

//           <Row className="mt-3">
//             <Col md={6}>
//               <Form.Label>Email</Form.Label>
//               <Form.Control
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 placeholder="For Digital Footprint (optional)"
//               />
//             </Col>
//             <Col md={6}>
//               <Form.Label>Name</Form.Label>
//               <Form.Control
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 placeholder="For Digital Footprint (optional)"
//               />
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             label={<>I give consent for all services <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             onClick={handleFetch}
//             disabled={loading}
//           >
//             {loading ? <Spinner size="sm" /> : "Fetch All"}
//           </Button>
//         </Card>

//         {/* RESULTS */}
//         {hasResult && (
//           <Card body>
//             <div className="d-flex justify-content-between align-items-center mb-3">
//               <h5 className="mb-0">Results</h5>
//               <Button onClick={exportPdf}>Export PDF</Button>
//             </div>

//             {/* PAN LOOKUP */}
//             {panResult && (
//               <div className="mb-4">
//                 <h6>
//                   🪪 PAN Lookup{" "}
//                   <Badge bg={getPanBadge(panCode)}>{panCode}</Badge>
//                 </h6>
//                 <div style={{ maxHeight: 300, overflow: "auto" }}>
//                   <JsonTableViewer data={panResult} />
//                 </div>
//               </div>
//             )}

//             {/* MOBILE PREFILL */}
//             {prefillResult && (
//               <div className="mb-4">
//                 <h6>
//                   📋 Mobile Prefill{" "}
//                   <Badge bg={getPrefillBadge(prefillCode)}>{prefillCode}</Badge>
//                 </h6>
//                 <div style={{ maxHeight: 300, overflow: "auto" }}>
//                   <JsonTableViewer data={prefillResult} />
//                 </div>
//               </div>
//             )}

//             {/* DIGITAL FOOTPRINT */}
//             {footprintResult && (
//               <div className="mb-4">
//                 <h6>
//                   🌐 Digital Footprint{" "}
//                   <Badge bg={getFootprintBadge(footprintCode)}>{footprintCode}</Badge>
//                 </h6>
//                 <div style={{ maxHeight: 300, overflow: "auto" }}>
//                   <JsonTableViewer data={footprintResult} />
//                 </div>
//               </div>
//             )}

//             {/* MOBILE NUMBER AGE */}
//             {mobileAgeResult && (
//               <div className="mb-2">
//                 <h6>
//                   📱 Mobile Number Age{" "}
//                   <Badge bg={getAgeBadge(ageCode)}>{ageCode}</Badge>
//                 </h6>
//                 <div style={{ maxHeight: 300, overflow: "auto" }}>
//                   <JsonTableViewer data={mobileAgeResult} />
//                 </div>
//               </div>
//             )}
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

const normalize = (data) => {
  if (!data) return null;
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return data; }
  }
  return data;
};

const safe = (v) =>
  v === undefined || v === null || v === "" ? "-" : String(v);

const getPanBadge       = (code) => code === "1003" ? "success" : code === "1004" ? "danger"  : "secondary";
const getPrefillBadge   = (code) => code === "1015" ? "success" : code === "1004" ? "warning" : "secondary";
const getFootprintBadge = (code) => code === "1030" ? "success" : "secondary";
const getAgeBadge       = (code) => code === "1008" ? "success" : code === "1004" ? "warning" : "secondary";
const getRcBadge        = (code) => code === "1000" ? "success" : code === "1011" ? "danger"  : "secondary";

export default function UnifiedMobileLookup() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [wallet,    setWallet]    = useState(0);
  const [mobile,    setMobile]    = useState("");
  const [fileNo,    setFileNo]    = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [name,      setName]      = useState("");
  const [consent,   setConsent]   = useState(false);
  const [loading,   setLoading]   = useState(false);

  const [panResult,       setPanResult]       = useState(null);
  const [prefillResult,   setPrefillResult]   = useState(null);
  const [footprintResult, setFootprintResult] = useState(null);
  const [mobileAgeResult, setMobileAgeResult] = useState(null);
  const [rcLookupResult,  setRcLookupResult]  = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch { setWallet(0); }
  };

  /* ── cache dialog ── */
  const askCache = async (fetchedAt) => {
    const fetchedDate = new Date(fetchedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const res = await swal.fire({
      title: "Previous Data Found",
      html: `Last fetched on: <b>${fetchedDate}</b>`,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Use Old Data",
      denyButtonText: "Fetch Fresh",
      cancelButtonText: "Cancel",
      customClass: { confirmButton: "btn-use-old", denyButton: "btn-fetch-fresh" },
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    if (res.isConfirmed) return "cache";
    if (res.isDenied)    return "fresh";
    return "cancel";
  };

  /* ══════════════════ MAIN FETCH ══════════════════ */
  const handleFetch = async () => {
    if (loading) return;

    if (!mobile || mobile.length !== 10 || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `<ul style="text-align:left">
          ${!mobile ? "<li>Mobile Number is required</li>" : ""}
          ${mobile && mobile.length !== 10 ? "<li>Mobile must be 10 digits</li>" : ""}
          ${!fileNo ? "<li>File Number is required</li>" : ""}
          ${!consent ? "<li>Consent is required</li>" : ""}
        </ul>`,
        icon: "warning",
      });
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Unified Lookup",
      html: `
        <p><b>Mobile Number:</b> ${mobile}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });
    if (!confirm.isConfirmed) return;

    setLoading(true);
    setPanResult(null);
    setPrefillResult(null);
    setFootprintResult(null);
    setMobileAgeResult(null);
    setRcLookupResult(null);

    try {
      /* ── cache check ── */
      const checkRes = await api.post("api/checkUnifiedMobileLookupCache", {
        mas_ser_id,
        mas_cat_id,
        mobile_number: mobile,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const d = await askCache(checkRes.data.lastFetchedAt);
        if (d === "cancel") { setLoading(false); return; }
        useCache = d === "cache";
      }

      /* ── execute ── */
      const execRes = await api.post("api/executeUnifiedMobileLookup", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        mobile_number: mobile,
        first_name: firstName,
        last_name: lastName,
        email,
        name,
        use_cache: useCache,
      });

      const { pan, prefill, footprint, mobile_age, rc_lookup } = execRes.data?.data || {};
// console.log("first" ,execRes.data?.data)
      setPanResult(normalize(pan));
      setPrefillResult(normalize(prefill));
      setFootprintResult(footprint);
      setMobileAgeResult(normalize(mobile_age));
      setRcLookupResult(normalize(rc_lookup));

      fetchWallet();

      const anySuccess =
        pan?.data?.code        === "1003" ||
        prefill?.data?.code    === "1015" ||
        footprint?.data?.code  === "1030" ||
        mobile_age?.data?.code === "1008" ||
        rc_lookup?.data?.code  === "1000";

      if (anySuccess) {
        swal.fire({ title: "Success", icon: "success", timer: 1500, showConfirmButton: false });
      } else {
        swal.fire("Completed", "Data fetched.", "info");
      }

    } catch (err) {
      swal.fire("Error", err.response?.data?.message || "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════ PDF EXPORT ══════════════════ */
  const exportPdf1 = () => {
    if (!panResult && !prefillResult && !footprintResult && !mobileAgeResult && !rcLookupResult) {
      swal.fire("No Data", "Nothing to export.", "warning");
      return;
    }

    const section = (title, rows) => [
      { text: title, style: "section", margin: [0, 12, 0, 6] },
      { table: { widths: ["40%", "60%"], body: rows }, layout: "lightHorizontalLines" },
    ];

    const content = [
      { text: "Unified Mobile Lookup Report", style: "header" },
      { text: `File Number: ${fileNo}` },
      { text: `Mobile Number: ${mobile}` },
      { qr: mobile, fit: 80, alignment: "right", margin: [0, 10] },
    ];

    /* PAN */
    if (panResult) {
      const panData = panResult?.data?.pan_data || {};
      content.push(...section("PAN Lookup", [
        [{ text: "Response Code",  bold: true }, safe(panResult?.data?.code)],
        [{ text: "PAN Number",     bold: true }, safe(panData.pan_number)],
        [{ text: "Full Name",      bold: true }, safe(panData.full_name)],
        [{ text: "Transaction ID", bold: true }, safe(panResult?.transaction_id)],
        [{ text: "Request ID",     bold: true }, safe(panResult?.request_id)],
      ]));
    }

    /* PREFILL */
    if (prefillResult) {
      const p  = prefillResult?.data?.personal_data || {};
      const pi = p.personal_information || {};
      content.push(...section("Mobile Prefill — Personal Information", [
        [{ text: "Response Code",  bold: true }, safe(prefillResult?.data?.code)],
        [{ text: "Full Name",      bold: true }, safe(pi.full_name)],
        [{ text: "Gender",         bold: true }, safe(pi.gender)],
        [{ text: "Age",            bold: true }, safe(pi.age)],
        [{ text: "Date of Birth",  bold: true }, safe(pi.date_of_birth)],
        [{ text: "Transaction ID", bold: true }, safe(prefillResult?.transaction_id)],
      ]));
      if (p.document_data?.pan?.length) {
        content.push(...section("PAN from Prefill",
          p.document_data.pan.map((pan, i) => [{ text: `PAN ${i + 1}`, bold: true }, safe(pan.value)])
        ));
      }
      if (p.email?.length) {
        content.push(...section("Email Addresses",
          p.email.map((e, i) => [{ text: `Email ${i + 1}`, bold: true }, safe(e.value)])
        ));
      }
      if (p.alternate_phone?.length) {
        content.push(...section("Alternate Phones",
          p.alternate_phone.map((a, i) => [{ text: `Phone ${i + 1}`, bold: true }, safe(a.value)])
        ));
      }
      if (p.address?.length) {
        content.push(...section("Address History",
          p.address.map((a, i) => [
            { text: `Address ${i + 1}`, bold: true },
            `${safe(a.detailed_address)}, ${safe(a.state)} - ${safe(a.pincode)}`,
          ])
        ));
      }
    }

    /* FOOTPRINT */
    if (footprintResult) {
      const profiles = footprintResult?.data?.digital_profile_data || [];
      content.push({ text: "Digital Footprint", style: "section", margin: [0, 12, 0, 6] });
      profiles.forEach((profile) => {
        if (profile.primary_data?.account_details?.length) {
          content.push({ text: profile.data_type, style: "subSection", margin: [0, 6, 0, 4] });
          content.push({
            table: {
              widths: ["50%", "50%"],
              body: [
                [{ text: "Platform", bold: true }, { text: "Status", bold: true }],
                ...profile.primary_data.account_details.map((a) => [
                  a.platform,
                  a.error ? "Error" : a.user_exist === true ? "Exists" : "Not Found",
                ]),
              ],
            },
            layout: "lightHorizontalLines",
          });
        }
      });
    }

    /* MOBILE AGE */
    if (mobileAgeResult) {
      const d = mobileAgeResult?.data?.mobile_number_age_data || {};
      content.push(...section("Mobile Number Age", [
        [{ text: "Response Code",       bold: true }, safe(mobileAgeResult?.data?.code)],
        [{ text: "Mobile Age",          bold: true }, safe(d.mobile_age)],
        [{ text: "Is Number Active",    bold: true }, safe(d.is_number_active)],
        [{ text: "Is Number Valid",     bold: true }, safe(d.is_number_valid)],
        [{ text: "Has Porting History", bold: true }, safe(d.has_porting_history)],
        [{ text: "Current Provider",    bold: true }, safe(d.current_ported_telecom_provider)],
        [{ text: "Original Provider",   bold: true }, safe(d.original_telecom_provider)],
        [{ text: "Ported Region",       bold: true }, safe(d.ported_region)],
        [{ text: "Original Region",     bold: true }, safe(d.original_region)],
        [{ text: "Transaction ID",      bold: true }, safe(mobileAgeResult?.transaction_id)],
      ]));
    }

    /* RC LOOKUP */
    if (rcLookupResult) {
      const v = rcLookupResult?.data?.vehicle_data || {};
      content.push(...section("RC Lookup by Mobile", [
        [{ text: "Response Code",  bold: true }, safe(rcLookupResult?.data?.code)],
        [{ text: "RC Number",      bold: true }, safe(v.rc_number)],
        [{ text: "Mobile Number",  bold: true }, safe(v.mobile_number)],
        [{ text: "Message",        bold: true }, safe(rcLookupResult?.data?.message)],
        [{ text: "Transaction ID", bold: true }, safe(rcLookupResult?.transaction_id)],
        [{ text: "Request ID",     bold: true }, safe(rcLookupResult?.request_id)],
      ]));
    }

    content.push({
      text: `Generated On: ${new Date().toLocaleString()}`,
      margin: [0, 15, 0, 0],
      fontSize: 9,
      italics: true,
    });

    pdfMake.createPdf({
      content,
      styles: {
        header:     { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        section:    { fontSize: 14, bold: true },
        subSection: { fontSize: 12, bold: true },
      },
      defaultStyle: { fontSize: 10 },
    }).download(`UNIFIED_LOOKUP_${fileNo}_${mobile}.pdf`);
  };
const isApiError = (res) => {
  if (!res) return false;

  /* real http failure */
  if (res.status && res.status !== 200) return true;

  /* vendor error block */
  if (res.error) return true;

  /* no data returned */
  if (!res.data) return true;

  return false;
};
const renderApiError = (res) => ({
  table: {
    widths: ["45%", "55%"],
    body: [
      [
        { text: "Status", bold: true },
        "Service temporarily unavailable / API error",
      ],
      [
        { text: "Message", bold: true },
        res?.data?.message ||
          res?.error?.message ||
          "Unexpected server error",
      ],
      [
        { text: "Transaction ID", bold: true },
        res?.transaction_id || "-",
      ],
      [
        { text: "Request ID", bold: true },
        res?.request_id || "-",
      ],
    ],
  },
  layout: "lightHorizontalLines",
});
const exportPdf = () => {
  if (
    !panResult &&
    !prefillResult &&
    !footprintResult &&
    !mobileAgeResult &&
    !rcLookupResult
  ) {
    swal.fire("No Data", "Nothing to export.", "warning");
    return;
  }

  /* ⭐ build unified object */
  const unified = {
    PAN_LOOKUP: panResult,
    MOBILE_PREFILL: prefillResult,
    DIGITAL_FOOTPRINT: footprintResult,
    MOBILE_AGE: mobileAgeResult,
    RC_LOOKUP: rcLookupResult,
  };

  /* ⭐ safe formatter */
  const safe = (v) =>
    v === undefined || v === null || v === ""
      ? "-"
      : typeof v === "boolean"
      ? v
        ? "Yes"
        : "No"
      : String(v);

  /* ⭐ deep recursion renderer */
  const renderDeep = (node, title = null) => {
    let content = [];

    const makeSection = (t) => ({
      text: t,
      style: "subSection",
      margin: [0, 10, 0, 4],
    });

    const makeRow = (k, v) => ({
      table: {
        widths: ["45%", "55%"],
        body: [[{ text: k, bold: true }, safe(v)]],
      },
      layout: "lightHorizontalLines",
    });

    if (title) content.push(makeSection(title));

    /* ⭐ primitive */
    if (typeof node !== "object" || node === null) {
      content.push(makeRow(title || "Value", node));
      return content;
    }

    /* ⭐ array */
    if (Array.isArray(node)) {
      if (!node.length) {
        content.push(makeRow(title || "Value", "-"));
        return content;
      }

      node.forEach((item, i) => {
        content.push(
          ...renderDeep(item, `${title || "Item"} ${i + 1}`)
        );
      });

      return content;
    }

    /* ⭐ object */
    Object.entries(node).forEach(([k, v]) => {
      const label = k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      if (typeof v === "object" && v !== null) {
        content.push(...renderDeep(v, label));
      } else {
        content.push(makeRow(label, v));
      }
    });

    return content;
  };

  /* ⭐ PDF content start */
  const content = [
    { text: "Unified Mobile Lookup Report", style: "header" },
    { text: `File Number: ${fileNo}` },
    { text: `Mobile Number: ${mobile}` },

    {
      qr: mobile,
      fit: 70,
      alignment: "right",
      margin: [0, 10],
    },
  ];

  /* ⭐ render each api */
Object.entries(unified).forEach(([api, data]) => {
  if (!data) return;

  content.push({
    text: api.replace(/_/g, " "),
    style: "section",
    margin: [0, 12, 0, 6],
  });

  /* ⭐ universal error handler */
  if (isApiError(data)) {
    content.push(renderApiError(data));
    return;
  }

  /* ⭐ normal deep renderer */
  content.push(...renderDeep(data));
});

  content.push({
    text: `Generated On: ${new Date().toLocaleString()}`,
    margin: [0, 15],
    italics: true,
    fontSize: 9,
  });

  pdfMake
    .createPdf({
      pageSize: "A4",
      pageOrientation: "portrait",
      pageMargins: [40, 60, 40, 60],
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
        subSection: {
          fontSize: 12,
          bold: true,
        },
      },
      defaultStyle: {
        fontSize: 9,
      },
    })
    .download(`UNIFIED_LOOKUP_${fileNo}_${mobile}.pdf`);
};

  const panCode       = panResult?.data?.code;
  const prefillCode   = prefillResult?.data?.code;
  const footprintCode = footprintResult?.data?.code;
  const ageCode       = mobileAgeResult?.data?.code;
  const rcCode        = rcLookupResult?.data?.code;
  const hasResult     = panResult || prefillResult || footprintResult || mobileAgeResult || rcLookupResult;

  /* ══════════════════ UI ══════════════════ */
  return (
    <Row>
      <Col md={12}>

        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        {/* FORM */}
        <Card body className="mb-4">
          <Row>
            <Col md={6}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Mobile Number <Required /></Form.Label>
              <Form.Control
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={6}>
              <Form.Label>First Name</Form.Label>
              <Form.Control
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="For Mobile Prefill (optional)"
              />
            </Col>
            <Col md={6}>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="For Mobile Prefill (optional)"
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={6}>
              <Form.Label>Email</Form.Label>
              <Form.Control
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="For Digital Footprint (optional)"
              />
            </Col>
            <Col md={6}>
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="For Digital Footprint (optional)"
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent for all services <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            className="mt-3"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Fetch All"}
          </Button>
        </Card>

        {/* RESULTS */}
        {hasResult && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Results</h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            {/* PAN LOOKUP */}
            {panResult && (
              <div className="mb-4">
                <h6>🪪 PAN Lookup <Badge bg={getPanBadge(panCode)}>{panCode}</Badge></h6>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  <JsonTableViewer data={panResult} />
                </div>
              </div>
            )}

            {/* MOBILE PREFILL */}
            {prefillResult && (
              <div className="mb-4">
                <h6>📋 Mobile Prefill <Badge bg={getPrefillBadge(prefillCode)}>{prefillCode}</Badge></h6>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  <JsonTableViewer data={prefillResult} />
                </div>
              </div>
            )}

            {/* DIGITAL FOOTPRINT */}
            {footprintResult && (
              <div className="mb-4">
                <h6>🌐 Digital Footprint <Badge bg={getFootprintBadge(footprintCode)}>{footprintCode}</Badge></h6>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  <JsonTableViewer data={footprintResult} />
                </div>
              </div>
            )}

            {/* MOBILE NUMBER AGE */}
            {mobileAgeResult && (
              <div className="mb-4">
                <h6>📱 Mobile Number Age <Badge bg={getAgeBadge(ageCode)}>{ageCode}</Badge></h6>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  <JsonTableViewer data={mobileAgeResult} />
                </div>
              </div>
            )}

            {/* RC LOOKUP */}
            {rcLookupResult && (
              <div className="mb-2">
                <h6>🚗 RC Lookup <Badge bg={getRcBadge(rcCode)}>{rcCode}</Badge></h6>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  <JsonTableViewer data={rcLookupResult} />
                </div>
              </div>
            )}
          </Card>
        )}

      </Col>
    </Row>
  );
}
