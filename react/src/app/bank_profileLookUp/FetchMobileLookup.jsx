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

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;
// const safe = (v) =>
//   v === undefined || v === null || v === "" ? "-" : String(v);

// export default function FetchMobileLookup() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [mobile, setMobile] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   /* ================= GUARD ================= */
//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get("api/getLoggedInUserWallet");
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     if (!fileNo || !mobile || mobile.length !== 10 || !consent) {
//       swal.fire(
//         "Validation Error",
//         "File Number, Mobile Number and Consent are required",
//         "warning"
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm Mobile Lookup",
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>Available Credits:</b> ${wallet}</p>
//         <p><b>File Number:</b> ${fileNo}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/mobileLookupController", {
//         usr_ser_id,
//         file_no: fileNo,
//         mobile_number: mobile,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       setResult(apiData);

//       if (code === "1007") {
//         swal.fire(
//           "Success",
//           `
//           Mobile Lookup fetched successfully<br/>
//           Credits Deducted: <b>${credits}</b><br/>
//           Remaining Credits: <b>${wallet - credits}</b>
//           `,
//           "success"
//         );
//         fetchWallet();
//       } else {
//         swal.fire("Info", apiData?.data?.message || "No records found", "info");
//       }
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

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!result?.data?.mobile_lookup_data) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const d = result.data.mobile_lookup_data;

//     const section = (t) => ({ text: t, style: "section" });
//     const row = (k, v) => [k, safe(v)];

//     const doc = {
//       content: [
//         { text: "Mobile Lookup Report", style: "header" },

//         section("Request Details"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("File Number", fileNo),
//               row("Mobile Number", mobile),
//               row("Request ID", result.request_id),
//               row("Transaction ID", result.transaction_id),
//               row("Status", result.status),
//               row("Message", result.data.message),
//             ],
//           },
//         },

//         section("Basic Status"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("Is Valid", d.is_valid),
//               row("Subscriber Status", d.subscriber_status),
//               row("Connection Type", d.network_connection_type),
//             ],
//           },
//         },

//         section("MSISDN Details"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("Country Code", d.msisdn_data.msisdn_country_code),
//               row("MSISDN", d.msisdn_data.msisdn),
//               row("Type", d.msisdn_data.type),
//               row("MCC", d.msisdn_data.mcc),
//               row("MNC", d.msisdn_data.mnc),
//               row("IMSI", d.msisdn_data.imsi),
//               row("MCC-MNC", d.msisdn_data.mcc_mnc),
//             ],
//           },
//         },

//         section("Current Network Provider"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row(
//                 "Network Name",
//                 d.current_network_service_provider.network_name
//               ),
//               row(
//                 "Region",
//                 d.current_network_service_provider.network_region
//               ),
//               row(
//                 "Country",
//                 d.current_network_service_provider.country_name
//               ),
//             ],
//           },
//         },

//         section("Original Network Provider"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row(
//                 "Network Name",
//                 d.original_network_service_provider.network_name
//               ),
//               row(
//                 "Region",
//                 d.original_network_service_provider.network_region
//               ),
//             ],
//           },
//         },

//         section("Roaming & Porting"),
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               row("Is Roaming", d.is_roaming),
//               row(
//                 "Roaming Operator",
//                 d.roaming_network_service_provider.network_name
//               ),
//               row("Is Ported", d.is_ported),
//               row("Last Ported Date", d.last_ported_date),
//             ],
//           },
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//         section: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
//       },
//       defaultStyle: { fontSize: 11 },
//     };

//     pdfMake.createPdf(doc).download(`MOBILE_LOOKUP_${fileNo}.pdf`);
//   };

//   const d = result?.data?.mobile_lookup_data;

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="text-center mt-2">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mt-3">
//           <Form.Group>
//             <Form.Label>
//               File Number <Required />
//             </Form.Label>
//             <Form.Control
//               value={fileNo}
//               onChange={(e) => setFileNo(e.target.value)}
//             />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>
//               Mobile Number <Required />
//             </Form.Label>
//             <Form.Control
//               maxLength={10}
//               value={mobile}
//               onChange={(e) =>
//                 setMobile(e.target.value.replace(/\D/g, ""))
//               }
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-2"
//             label={
//               <>
//                 I give consent <Required />
//               </>
//             }
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             disabled={loading}
//             onClick={handleFetch}
//           >
//             {loading ? <Spinner size="sm" /> : "Fetch Mobile Lookup"}
//           </Button>
//         </Card>

//         {d && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between">
//               <h5>📄 Mobile Lookup Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr>
//                   <th>Subscriber Status</th>
//                   <td>{d.subscriber_status}</td>
//                 </tr>
//                 <tr>
//                   <th>Connection Type</th>
//                   <td>{d.network_connection_type}</td>
//                 </tr>
//                 <tr>
//                   <th>Current Operator</th>
//                   <td>
//                     {d.current_network_service_provider.network_name}{" "}
//                     <Badge bg="info">
//                       {d.current_network_service_provider.network_region}
//                     </Badge>
//                   </td>
//                 </tr>
//                 <tr>
//                   <th>Original Operator</th>
//                   <td>{d.original_network_service_provider.network_name}</td>
//                 </tr>
//                 <tr>
//                   <th>Roaming</th>
//                   <td>{d.is_roaming ? "Yes" : "No"}</td>
//                 </tr>
//                 <tr>
//                   <th>Ported</th>
//                   <td>{d.is_ported ? "Yes" : "No"}</td>
//                 </tr>
//                 <tr>
//                   <th>Last Ported Date</th>
//                   <td>{safe(d.last_ported_date)}</td>
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

export default function FetchMobileLookup() {
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
  const [mobile, setMobile] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
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
    if (code === "1007") return "success";
    if (code === "1004") return "warning";
    return "danger";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    if (!fileNo || !mobile || mobile.length !== 10 || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!mobile ? "<li>Mobile Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough wallet balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Mobile Lookup",
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
    setResult(null);

    try {
      /* ================= CACHE CHECK ================= */
      const checkRes = await api.post(
        "api/checkMobileLookupCache",
        { mas_ser_id, mas_cat_id, mobile_number: mobile }
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
        "api/executeMobileLookup",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          mobile_number: mobile,
          use_cache: useCache,
        }
      );

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1007") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1004") {
        swal.fire("No Records", apiData?.data?.message, "info");
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "warning");
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

  /* ================= PDF EXPORT ================= */
 const exportPdf = () => {
  if (!result) return;

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";
  const d = result?.data?.mobile_lookup_data || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : String(v);

  const section = (title, rows) => [
    { text: title, style: "section", margin: [0, 12, 0, 6] },
    {
      table: {
        widths: ["40%", "60%"],
        body: rows,
      },
      layout: "lightHorizontalLines",
    },
  ];

  const doc = {
    content: [
      { text: "Mobile Lookup Detailed Report", style: "header" },
      { text: `File Number: ${fileNo}` },
      { text: `Mobile Number: ${mobile}` },
      { text: `Transaction ID: ${transactionId}` },
      { text: `Request ID: ${requestId}` },
      { qr: transactionId, fit: 80, alignment: "right", margin: [0, 10] },

      /* ================= BASIC DATA ================= */
      ...section("Mobile Lookup Data", [
        [{ text: "Is Valid", bold: true }, safe(d.is_valid)],
        [{ text: "Subscriber Status", bold: true }, safe(d.subscriber_status)],
        [{ text: "Network Connection Type", bold: true }, safe(d.network_connection_type)],
      ]),

      /* ================= NETWORK CONNECTION STATUS ================= */
      ...(d.network_connection_status
        ? section("Network Connection Status", [
            [{ text: "Status Code", bold: true }, safe(d.network_connection_status.status_code)],
            [{ text: "Error Code", bold: true }, safe(d.network_connection_status.error_code_id)],
          ])
        : []),

      /* ================= MSISDN DATA ================= */
      ...(d.msisdn_data
        ? section("MSISDN Data", [
            [{ text: "MSISDN Country Code", bold: true }, safe(d.msisdn_data.msisdn_country_code)],
            [{ text: "MSISDN", bold: true }, safe(d.msisdn_data.msisdn)],
            [{ text: "Type", bold: true }, safe(d.msisdn_data.type)],
            [{ text: "MCC", bold: true }, safe(d.msisdn_data.mcc)],
            [{ text: "MNC", bold: true }, safe(d.msisdn_data.mnc)],
            [{ text: "IMSI", bold: true }, safe(d.msisdn_data.imsi)],
            [{ text: "MCC MNC", bold: true }, safe(d.msisdn_data.mcc_mnc)],
          ])
        : []),

      /* ================= CURRENT NETWORK ================= */
      ...(d.current_network_service_provider
        ? section("Current Network Service Provider", [
            [{ text: "Network Prefix", bold: true }, safe(d.current_network_service_provider.network_prefix)],
            [{ text: "Network Name", bold: true }, safe(d.current_network_service_provider.network_name)],
            [{ text: "Network Region", bold: true }, safe(d.current_network_service_provider.network_region)],
            [{ text: "MCC", bold: true }, safe(d.current_network_service_provider.mcc)],
            [{ text: "MNC", bold: true }, safe(d.current_network_service_provider.mnc)],
            [{ text: "Country Prefix", bold: true }, safe(d.current_network_service_provider.country_prefix)],
            [{ text: "Country Code", bold: true }, safe(d.current_network_service_provider.country_code)],
            [{ text: "Country Name", bold: true }, safe(d.current_network_service_provider.country_name)],
          ])
        : []),

      /* ================= ORIGINAL NETWORK ================= */
      ...(d.original_network_service_provider
        ? section("Original Network Service Provider", [
            [{ text: "Network Prefix", bold: true }, safe(d.original_network_service_provider.network_prefix)],
            [{ text: "Network Name", bold: true }, safe(d.original_network_service_provider.network_name)],
            [{ text: "Network Region", bold: true }, safe(d.original_network_service_provider.network_region)],
            [{ text: "MCC", bold: true }, safe(d.original_network_service_provider.mcc)],
            [{ text: "MNC", bold: true }, safe(d.original_network_service_provider.mnc)],
            [{ text: "Country Prefix", bold: true }, safe(d.original_network_service_provider.country_prefix)],
            [{ text: "Country Code", bold: true }, safe(d.original_network_service_provider.country_code)],
            [{ text: "Country Name", bold: true }, safe(d.original_network_service_provider.country_name)],
          ])
        : []),

      /* ================= ROAMING ================= */
      ...section("Roaming & Porting", [
        [{ text: "Is Roaming", bold: true }, d.is_roaming ? "Yes" : "No"],
        [{ text: "Is Ported", bold: true }, d.is_ported ? "Yes" : "No"],
        [{ text: "Last Ported Date", bold: true }, safe(d.last_ported_date)],
      ]),

      /* ================= ROAMING NETWORK PROVIDER ================= */
      ...(d.roaming_network_service_provider
        ? section("Roaming Network Service Provider", [
            [{ text: "Network Prefix", bold: true }, safe(d.roaming_network_service_provider.network_prefix)],
            [{ text: "Network Name", bold: true }, safe(d.roaming_network_service_provider.network_name)],
            [{ text: "Network Region", bold: true }, safe(d.roaming_network_service_provider.network_region)],
            [{ text: "Country Name", bold: true }, safe(d.roaming_network_service_provider.country_name)],
          ])
        : []),

      /* ================= PORTING HISTORY ================= */
      ...(Array.isArray(d.porting_history) && d.porting_history.length > 0
        ? [
            { text: "Porting History", style: "section", margin: [0, 12, 0, 6] },
            {
              table: {
                widths: ["100%"],
                body: d.porting_history.map((p, i) => [
                  `Record ${i + 1}: ${JSON.stringify(p)}`,
                ]),
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),

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

  pdfMake.createPdf(doc).download(`MOBILE_LOOKUP_${fileNo}.pdf`);
};

  const code = result?.data?.code;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

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
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, ""))
                }
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            className="mt-3"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Fetch Mobile Lookup"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
              </h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <div style={{ maxHeight: 350, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}