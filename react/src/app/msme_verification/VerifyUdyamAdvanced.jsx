// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
// import { useNavigate, useLocation } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";
// import JsonTableViewer from "../components/JsonTableViewer";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function VerifyUdyamAdvanced() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
//     state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [udyamNo, setUdyamNo] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     api
//       .get("api/getLoggedInUserWallet")
//       .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
//   }, [usr_ser_id, navigate]);

//   const handleFetch = async () => {
//     if (!fileNo || !udyamNo || !consent) {
//       swal.fire("Validation Error", "All fields required", "warning");
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     setLoading(true);
//     setResult(null);

//     try {
//       const checkRes = await api.post("api/checkVerifyUdyamAdvancedCache", {
//         mas_ser_id,
//         mas_cat_id,
//         udyam_reference_number: udyamNo,
//       });

//       let useCache = false;

//       if (checkRes.data.hasCache) {
//         const confirm = await swal.fire({
//           title: "Use Cached Data?",
//           showCancelButton: true,
//         });

//         if (confirm.isConfirmed) useCache = true;
//       }

//       const res = await api.post("api/executeVerifyUdyamAdvanced", {
//         usr_ser_id,
//         mas_ser_id,
//         mas_cat_id,
//         file_no: fileNo,
//         udyam_reference_number: udyamNo,
//         use_cache: useCache,
//       });

//       const fullResponse = res.data?.data;
//       console.log("res.data?.data" , res.data?.data)
//       setResult(fullResponse);

//       swal.fire("Completed", "Verification processed", "success");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exportPdf1 = () => {
//     if (!result) return;

//     const requestId = result?.request_id;
//     const transactionId = result?.transaction_id;

//     const rows = Object.entries(result?.data || {}).map(([k, v]) => [
//       k,
//       typeof v === "object" ? JSON.stringify(v) : v,
//     ]);

//     const doc = {
//       content: [
//         { text: "Udyam Advanced Verification", style: "header" },
//         { text: `Request ID: ${requestId}` },
//         { text: `Transaction ID: ${transactionId}` },
//         { qr: requestId, fit: 80, alignment: "right" },
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: rows,
//           },
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`UDYAM_${udyamNo}.pdf`);
//   };
// const exportPdf = () => {
//   if (!result) return;

//   const safe = (v) =>
//     v === undefined || v === null || v === "" ? "-" : v;

//   const section = (t) => ({
//     text: t,
//     style: "section",
//     margin: [0, 14, 0, 6],
//   });

//   const twoCol = (rows) => ({
//     table: {
//       widths: ["40%", "60%"],
//       body: rows.map((r) => [
//         { text: r[0], bold: true },
//         safe(r[1]),
//       ]),
//     },
//     layout: "lightHorizontalLines",
//     margin: [0, 0, 0, 10],
//   });

//   const headerInfo = {
//     table: {
//       widths: ["40%", "60%"],
//       body: [
//         [{ text: "File Number", bold: true }, safe(fileNo)],
//         [{ text: "Udyam Number", bold: true }, safe(udyamNo)],
//         [{ text: "Transaction ID", bold: true }, safe(result?.transaction_id)],
//         [{ text: "Request ID", bold: true }, safe(result?.request_id)],
//       ],
//     },
//     layout: "noBorders",
//     margin: [0, 0, 0, 10],
//   };

//   /* ⭐⭐⭐ ONLY CHANGE IS HERE ⭐⭐⭐ */
//   const root = result?.data || {};

//   const d = root?.enterprise_data || {};
//   const address = d?.address || {};
//   const nic = root?.nic_data || {};

//   const doc = {
//     content: [
//       { text: "Udyam Advanced Verification Report", style: "header" },

//       headerInfo,

//       { qr: result?.transaction_id, fit: 80, alignment: "right", margin: [0, 5, 0, 10] },

//       section("ENTERPRISE DATA"),
//       twoCol([
//         ["Enterprise Name", d.name],
//         ["Enterprise Type", d.enterprise_type],
//         ["Organization Type", d.organization_type],
//         ["Major Activity", d.major_activity],
//         ["Social Category", d.social_category],
//         ["Gender", d.gender],
//         ["Mobile", d.mobile],
//         ["Email", d.email],
//         ["DIC", d.dic],
//         ["MSME DI", d.msme_di],
//         ["Classification Year", d.classification_year],
//         ["Classification Date", d.classification_date],
//         ["Date of Incorporation", d.date_of_incorporation],
//         ["Date of Commencement", d.date_of_commencement],
//         ["Date of Udyam Registration", d.date_of_udyam_registration],
//       ]),

//       section("ENTERPRISE ADDRESS"),
//       twoCol([
//         ["Building", address.building],
//         ["Door No", address.door_no],
//         ["Street", address.street],
//         ["Area", address.area],
//         ["Block", address.block],
//         ["City", address.city],
//         ["District", address.district],
//         ["State", address.state],
//         ["Pincode", address.pincode],
//       ]),

//       section("NIC DATA"),
//       twoCol([
//         ["NIC 2 DIGIT", nic.nic_2_digit],
//         ["NIC 4 DIGIT", nic.nic_4_digit],
//         ["NIC 5 DIGIT", nic.nic_5_digit],
//       ]),

//       ...(root?.enterprise_type_data?.length
//         ? [
//             section("ENTERPRISE TYPE DATA"),
//             {
//               table: {
//                 headerRows: 1,
//                 widths: ["33%", "33%", "34%"],
//                 body: [
//                   [
//                     { text: "CLASSIFICATION YEAR", bold: true },
//                     { text: "CLASSIFICATION DATE", bold: true },
//                     { text: "ENTERPRISE TYPE", bold: true },
//                   ],
//                   ...root.enterprise_type_data.map((e) => [
//                     safe(e.classification_year),
//                     safe(e.classification_date),
//                     safe(e.enterprise_type),
//                   ]),
//                 ],
//               },
//               layout: "lightHorizontalLines",
//             },
//           ]
//         : []),

//      ...(root?.nic_data_list?.length
//   ? [
//       section("NIC DATA LIST"),
//       {
//         table: {
//           headerRows: 1,
//           widths: ["14%", "16%", "23%", "23%", "24%"],
//           body: [
//             [
//               { text: "DATE", bold: true },
//               { text: "ACTIVITY TYPE", bold: true },
//               { text: "NIC 2 DIGIT", bold: true },
//               { text: "NIC 4 DIGIT", bold: true },
//               { text: "NIC 5 DIGIT", bold: true },
//             ],
//             ...root.nic_data_list.map((n) => [
//               safe(n.date),
//               safe(n.activity_type),
//               safe(n.nic_2_digit),
//               safe(n.nic_4_digit),
//               safe(n.nic_5_digit),
//             ]),
//           ],
//         },
//         layout: "lightHorizontalLines",
//       },
//     ]
//   : []),
//     ],

//     styles: {
//       header: { fontSize: 18, bold: true, margin: [0, 0, 0, 15] },
//       section: { fontSize: 14, bold: true },
//     },

//     defaultStyle: { fontSize: 9 },
//   };

//   pdfMake.createPdf(doc).download(`UDYAM_${udyamNo}.pdf`);
// };
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>Credits Required: {credits}</p>
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
//               Udyam Reference Number <Required />
//             </Form.Label>
//             <Form.Control
//               value={udyamNo}
//               onChange={(e) => setUdyamNo(e.target.value)}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Verify Udyam"}
//           </Button>
//         </Card>

//         {result && (
//           <Card body className="mt-3">
//             <div className="d-flex justify-content-between">
//               <h5>Result</h5>
//               <Button onClick={exportPdf}>Export PDF</Button>
//             </div>

//             <JsonTableViewer data={result} />
//           </Card>
//         )}
//       </Col>
//     </Row>
//   );
// }
import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "../components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function VerifyUdyamAdvanced() {
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
  const [udyamNo, setUdyamNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);

    api
      .get("api/getLoggedInUserWallet")
      .then((res) =>
        setWallet(Number(res.data?.data?.wallet_amount || 0))
      );
  }, [usr_ser_id, navigate]);

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!fileNo || !udyamNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!udyamNo ? "<li>Udyam Number is required</li>" : ""}
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
      title: "Confirm Udyam Verification",
      html: `
        <p><b>Udyam Number:</b> ${udyamNo}</p>
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
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post(
        "api/checkVerifyUdyamAdvancedCache",
        {
          mas_ser_id,
          mas_cat_id,
          udyam_reference_number: udyamNo,
        }
      );

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

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
        else if (!cacheConfirm.isDenied) {
          setLoading(false);
          return;
        }
      }

      /* ===== EXECUTE ===== */
      const executeRes = await api.post(
        "api/executeVerifyUdyamAdvanced",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          udyam_reference_number: udyamNo,
          use_cache: useCache,
        }
      );

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);

      if (code === "1000") {
        swal.fire(
          "Success",
          apiData?.data?.message || "Verification successful",
          "success"
        );
      } else {
        swal.fire(
          "Completed",
          apiData?.data?.message || "Request processed",
          "info"
        );
      }
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Service unavailable",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const safe = (v) =>
      v === undefined || v === null || v === "" ? "-" : v;

    const section = (t) => ({
      text: t,
      style: "section",
      margin: [0, 14, 0, 6],
    });

    const twoCol = (rows) => ({
      table: {
        widths: ["40%", "60%"],
        body: rows.map((r) => [
          { text: r[0], bold: true },
          safe(r[1]),
        ]),
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 10],
    });

    const root = result?.data || {};
    const d = root?.enterprise_data || {};
    const address = d?.address || {};
    const nic = root?.nic_data || {};

    const headerInfo = {
      table: {
        widths: ["40%", "60%"],
        body: [
          [{ text: "File Number", bold: true }, safe(fileNo)],
          [{ text: "Udyam Number", bold: true }, safe(udyamNo)],
          [
            { text: "Transaction ID", bold: true },
            safe(result?.transaction_id),
          ],
          [
            { text: "Request ID", bold: true },
            safe(result?.request_id),
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 10],
    };

    const doc = {
      content: [
        {
          text: "Udyam Advanced Verification Report",
          style: "header",
        },

        headerInfo,

        {
          qr: result?.transaction_id,
          fit: 80,
          alignment: "right",
          margin: [0, 5, 0, 10],
        },

        section("ENTERPRISE DATA"),
        twoCol([
          ["Enterprise Name", d.name],
          ["Enterprise Type", d.enterprise_type],
          ["Organization Type", d.organization_type],
          ["Major Activity", d.major_activity],
          ["Social Category", d.social_category],
          ["Gender", d.gender],
          ["Mobile", d.mobile],
          ["Email", d.email],
          ["DIC", d.dic],
          ["MSME DI", d.msme_di],
          ["Classification Year", d.classification_year],
          ["Classification Date", d.classification_date],
          ["Date of Incorporation", d.date_of_incorporation],
          ["Date of Commencement", d.date_of_commencement],
          [
            "Date of Udyam Registration",
            d.date_of_udyam_registration,
          ],
        ]),

        section("ENTERPRISE ADDRESS"),
        twoCol([
          ["Building", address.building],
          ["Door No", address.door_no],
          ["Street", address.street],
          ["Area", address.area],
          ["Block", address.block],
          ["City", address.city],
          ["District", address.district],
          ["State", address.state],
          ["Pincode", address.pincode],
        ]),

        section("NIC DATA"),
        twoCol([
          ["NIC 2 DIGIT", nic.nic_2_digit],
          ["NIC 4 DIGIT", nic.nic_4_digit],
          ["NIC 5 DIGIT", nic.nic_5_digit],
        ]),

        ...(root?.enterprise_type_data?.length
          ? [
              section("ENTERPRISE TYPE DATA"),
              {
                table: {
                  headerRows: 1,
                  widths: ["33%", "33%", "34%"],
                  body: [
                    [
                      { text: "CLASSIFICATION YEAR", bold: true },
                      { text: "CLASSIFICATION DATE", bold: true },
                      { text: "ENTERPRISE TYPE", bold: true },
                    ],
                    ...root.enterprise_type_data.map((e) => [
                      safe(e.classification_year),
                      safe(e.classification_date),
                      safe(e.enterprise_type),
                    ]),
                  ],
                },
                layout: "lightHorizontalLines",
              },
            ]
          : []),

        ...(root?.nic_data_list?.length
          ? [
              section("NIC DATA LIST"),
              {
                table: {
                  headerRows: 1,
                  widths: [
                    "14%",
                    "16%",
                    "23%",
                    "23%",
                    "24%",
                  ],
                  body: [
                    [
                      { text: "DATE", bold: true },
                      { text: "ACTIVITY TYPE", bold: true },
                      { text: "NIC 2 DIGIT", bold: true },
                      { text: "NIC 4 DIGIT", bold: true },
                      { text: "NIC 5 DIGIT", bold: true },
                    ],
                    ...root.nic_data_list.map((n) => [
                      safe(n.date),
                      safe(n.activity_type),
                      safe(n.nic_2_digit),
                      safe(n.nic_4_digit),
                      safe(n.nic_5_digit),
                    ]),
                  ],
                },
                layout: "lightHorizontalLines",
              },
            ]
          : []),
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 15],
        },
        section: {
          fontSize: 14,
          bold: true,
        },
      },

      defaultStyle: { fontSize: 9 },
    };

    pdfMake.createPdf(doc).download(
      `UDYAM_ADVANCED_${fileNo}.pdf`
    );
  };

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
            <Col md={4}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>
                Udyam Number <Required />
              </Form.Label>
              <Form.Control
                value={udyamNo}
                onChange={(e) =>
                  setUdyamNo(e.target.value.toUpperCase())
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
            {loading ? <Spinner size="sm" /> : "Verify Udyam"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>Result</h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <div style={{ maxHeight: 400, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}