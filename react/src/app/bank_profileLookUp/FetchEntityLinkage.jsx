// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table, Badge } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;


// export default function FetchEntityLinkage() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [mobile, setMobile] = useState("");
//   const [pan, setPan] = useState("");
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
//     if (!fileNo || !mobile || !pan || !consent) {
//       swal.fire("Validation Error", "All required fields missing", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm Entity Linkage Check",
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
//       const res = await api.post("api/checkEntityLinkageController", {
//         usr_ser_id,
//         file_no: fileNo,
//         mobile,
//         pan,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       setResult(apiData);

//       if (code === "1009") {
//         swal.fire(
//           "Success",
//           `Entity linkage fetched successfully<br/>
//            Credits Deducted: <b>${credits}</b><br/>
//            Remaining Credits: <b>${wallet - credits}</b>`,
//           "success"
//         );
//         fetchWallet();
//       } else {
//         swal.fire("Info", apiData?.data?.message || "No linkage found", "info");
//       }
//     } catch (err) {
//       swal.fire("Error", "Service unavailable", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exportPdf = () => {
//     const d = result?.data?.entity_linkage_data;
//     if (!d) return;

//     const row = (k, v) => [k, v ? "Yes" : "No"];

//     const doc = {
//       content: [
//         { text: "Entity Linkage Report", style: "header" },

//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: [
//               ["File Number", fileNo],
//               ["Mobile", d.input.mobile],
//               ["PAN", d.input.pan],
//             ],
//           },
//           marginBottom: 10,
//         },

//         {
//           table: {
//             widths: ["50%", "50%"],
//             body: [
//               ["UAN Linked", row("", d.profile_indicators.uan_linked)[1]],
//               ["GST Linked", row("", d.profile_indicators.gst_linked)[1]],
//               ["Udyam Linked", row("", d.profile_indicators.udyam_linked)[1]],
//             ],
//           },
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`ENTITY_LINKAGE_${fileNo}.pdf`);
//   };

//   const d = result?.data?.entity_linkage_data;

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
//             <Form.Label>Mobile <Required /></Form.Label>
//             <Form.Control value={mobile} onChange={(e) => setMobile(e.target.value)} />
//           </Form.Group>

//           <Form.Group className="mt-2">
//             <Form.Label>PAN <Required /></Form.Label>
//             <Form.Control value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} />
//           </Form.Group>

//           <Form.Check
//             className="mt-2"
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : "Check Entity Linkage"}
//           </Button>
//         </Card>

//         {d && (
//           <Card body className="mt-4">
//             <div className="d-flex justify-content-between">
//               <h5>📄 Entity Linkage Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr><th>UAN Linked</th><td>{d.profile_indicators.uan_linked ? "Yes" : "No"}</td></tr>
//                 <tr><th>GST Linked</th><td>{d.profile_indicators.gst_linked ? "Yes" : "No"}</td></tr>
//                 <tr><th>Udyam Linked</th><td>{d.profile_indicators.udyam_linked ? "Yes" : "No"}</td></tr>
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

export default function FetchEntityLinkage() {
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
  const [pan, setPan] = useState("");
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
    if (code === "1009") return "success";
    if (code === "1010") return "warning";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

if (!fileNo || (!mobile && !pan) || !consent) {
  swal.fire({
    title: "Validation Error",
    html: `
      <ul style="text-align:left">
        ${!fileNo ? "<li>File Number is required</li>" : ""}
        ${!mobile && !pan ? "<li>Either Mobile or PAN is required</li>" : ""}
        ${!consent ? "<li>Consent is required</li>" : ""}
      </ul>
    `,
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
      title: "Confirm Entity Linkage Check",
    html: `
  <p><b>File Number:</b> ${fileNo}</p>
  ${mobile ? `<p><b>Mobile:</b> ${mobile}</p>` : ""}
  ${pan ? `<p><b>PAN:</b> ${pan}</p>` : ""}
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
        "api/checkEntityLinkageCache",
        { mas_ser_id, mas_cat_id, mobile, pan }
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
        "api/executeEntityLinkage",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          mobile,
          pan,
          use_cache: useCache,
        }
      );

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1009") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1010") {
        swal.fire("No Linkage Found", apiData?.data?.message, "warning");
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "info");
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
  const code = result?.data?.code;
  const message = result?.data?.message || "-";

  const linkage = result?.data?.entity_linkage_data || {};
  const input = linkage?.input || {};
  const indicators = linkage?.profile_indicators || {};
  const indicatorSource = linkage?.profile_indicators_source || {};

  const safe = (v) =>
    v === undefined || v === null || v === "" ? "-" : v;

  const yesNo = (v) => (v ? "Yes" : "No");

  const doc = {
    content: [
      { text: "Entity Linkage Detailed Report", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Transaction ID: ${transactionId}` },
      { text: `Request ID: ${requestId}` },

      {
        qr: transactionId,
        fit: 80,
        alignment: "right",
        margin: [0, 10],
      },

      { text: "Response Summary", style: "section", margin: [0, 15, 0, 5] },

      {
        table: {
          widths: ["40%", "60%"],
          body: [
            [{ text: "Response Code", bold: true }, safe(code)],
            [{ text: "Message", bold: true }, safe(message)],
          ],
        },
        layout: "lightHorizontalLines",
      },

      ...(code === "1009"
        ? [
            {
              text: "Input Details",
              style: "section",
              margin: [0, 15, 0, 5],
            },
            {
              table: {
                widths: ["40%", "60%"],
                body: [
                  [{ text: "Mobile", bold: true }, safe(input.mobile)],
                  [{ text: "PAN", bold: true }, safe(input.pan)],
                ],
              },
              layout: "lightHorizontalLines",
            },

            {
              text: "Profile Indicators",
              style: "section",
              margin: [0, 15, 0, 5],
            },
            {
              table: {
                widths: ["50%", "50%"],
                body: [
                  [
                    { text: "UAN Linked", bold: true },
                    yesNo(indicators.uan_linked),
                  ],
                  [
                    { text: "GST Linked", bold: true },
                    yesNo(indicators.gst_linked),
                  ],
                  [
                    { text: "Udyam Linked", bold: true },
                    yesNo(indicators.udyam_linked),
                  ],
                ],
              },
              layout: "lightHorizontalLines",
            },

            {
              text: "Indicator Source Details",
              style: "section",
              margin: [0, 15, 0, 5],
            },
            {
              table: {
                widths: ["40%", "60%"],
                body: Object.entries(indicatorSource).map(
                  ([key, value]) => [
                    { text: key.replace("_", " ").toUpperCase(), bold: true },
                    value?.source
                      ? value.source.join(", ")
                      : yesNo(value?.status),
                  ]
                ),
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 20, 0, 0],
        fontSize: 9,
        italics: true,
      },
    ],

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
    },

    defaultStyle: {
      fontSize: 10,
    },
  };

  pdfMake.createPdf(doc).download(
    `ENTITY_LINKAGE_${fileNo}.pdf`
  );
};


  const code = result?.data?.code;

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
            <Col md={4}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

        <Col md={4}>
  <Form.Label>Mobile</Form.Label>
  <Form.Control
    value={mobile}
    onChange={(e) => setMobile(e.target.value)}
  />
</Col>

<Col md={4}>
  <Form.Label>PAN</Form.Label>
  <Form.Control
    value={pan}
    onChange={(e) => setPan(e.target.value.toUpperCase())}
  />
</Col>

<Col md={12}>
  <small className="text-muted">
    Either Mobile or PAN is required <span style={{ color: "red" }}>*</span>
  </small>
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
            {loading ? <Spinner size="sm" /> : "Check Entity Linkage"}
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

            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
