// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchUanProfileDetails() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
//     state || {};

//   const [wallet, setWallet] = useState(0);
//   const [uan, setUan] = useState("");
//   const [fileNo, setFileNo] = useState("");
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//   }, [usr_ser_id, navigate]);

//   useEffect(() => {
//     api
//       .get("api/getLoggedInUserWallet")
//       .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
//   }, []);

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     if (!uan || !fileNo || !consent) {
//       swal.fire(
//         "Validation Error",
//         "UAN, File Number and consent are required",
//         "warning",
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm UAN Profile Fetch",
//       html: `
//         <p><b>Credits Required:</b> ${credits}</p>
//         <p><b>File No:</b> ${fileNo}</p>
//       `,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchUanProfileDetailsController", {
//         mas_ser_id,
//         mas_cat_id,
//         usr_ser_id,
//         uan,
//         file_no: fileNo,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code === "1036") {
//         swal.fire("No Records", "No profile found for this UAN", "info");
//         return;
//       }

//       if (code !== "1035") {
//         swal.fire("Failed", "Unable to fetch profile details", "error");
//         return;
//       }

//       setResult(apiData);
//       swal.fire("Success", "UAN profile details fetched", "success");
//     } catch (err) {
//       swal.fire("Error", "Server error", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const profile = result?.data?.uan_profile_data;

//   /* ================= EXPORT PDF ================= */
//   const exportPdf = () => {
//     if (!profile) {
//       swal.fire("No Data", "Nothing to export", "warning");
//       return;
//     }

//     const tableRows = [
//       ["UAN", profile.uan],
//       ["Name", profile.name],
//       ["Mobile", profile.mobile_number],
//       ["DOB", profile.dob],
//       ["Gender", profile.gender],
//       ["Guardian", `${profile.guardian_name} (${profile.guardian_relation})`],
//       ["Bank Account", profile.bank_account_number],
//       ["IFSC", profile.ifsc],
//     ];

//     const doc = {
//       content: [
//         { text: "UAN Profile Details Report", style: "header" },
//         { text: `File No: ${fileNo}`, marginBottom: 5 },
//         {
//           text: `Generated On: ${new Date().toLocaleString()}`,
//           marginBottom: 10,
//         },

//         {
//           table: {
//             widths: ["35%", "65%"],
//             body: tableRows.map(([k, v]) => [
//               { text: k, bold: true },
//               v || "-",
//             ]),
//           },
//           layout: "lightHorizontalLines",
//         },
//       ],
//       styles: {
//         header: {
//           fontSize: 18,
//           bold: true,
//           marginBottom: 10,
//         },
//       },
//     };

//     pdfMake.createPdf(doc).download(`UAN_Profile_${profile.uan}.pdf`);
//   };

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
//                 UAN <Required />
//               </Form.Label>
//               <Form.Control
//                 value={uan}
//                 onChange={(e) => setUan(e.target.value)}
//               />
//             </Col>

//             <Col md={6}>
//               <Form.Label>
//                 File Number <Required />
//               </Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             type="checkbox"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleFetch} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Fetch UAN Profile"}
//           </Button>
//         </Card>

//         {/* RESULT */}
//         {profile && (
//           <Card body>
//             <div className="d-flex justify-content-between align-items-center">
//               <h5>UAN Profile Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 <tr>
//                   <th>Name</th>
//                   <td>{profile.name}</td>
//                 </tr>
//                 <tr>
//                   <th>UAN</th>
//                   <td>{profile.uan}</td>
//                 </tr>
//                 <tr>
//                   <th>Mobile</th>
//                   <td>{profile.mobile_number}</td>
//                 </tr>
//                 <tr>
//                   <th>DOB</th>
//                   <td>{profile.dob}</td>
//                 </tr>
//                 <tr>
//                   <th>Gender</th>
//                   <td>{profile.gender}</td>
//                 </tr>
//                 <tr>
//                   <th>Guardian</th>
//                   <td>
//                     {profile.guardian_name} ({profile.guardian_relation})
//                   </td>
//                 </tr>
//                 <tr>
//                   <th>Bank Account</th>
//                   <td>{profile.bank_account_number}</td>
//                 </tr>
//                 <tr>
//                   <th>IFSC</th>
//                   <td>{profile.ifsc}</td>
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
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "../components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

export default function FetchUanProfileDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [uan, setUan] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const Required = () => <span style={{ color: "red" }}>*</span>;

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const handleFetch = async () => {
    if (!fileNo || !uan || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm UAN Profile Fetch",
      html: `
        <p><b>UAN:</b> ${uan}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const checkRes = await api.post("api/checkUanProfileCache", {
        mas_ser_id,
        mas_cat_id,
        uan,
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

      const res = await api.post("api/executeUanProfile", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        uan,
        use_cache: useCache,
      });

      setResult(res.data?.data);
      fetchWallet();
      swal.fire("Completed", "Request processed", "success");
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!result) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const profile = result?.data?.uan_profile_data || {};
    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";

    const tableRows = [
      ["UAN", profile.uan],
      ["Name", profile.name],
      ["Mobile", profile.mobile_number],
      ["DOB", profile.dob],
      ["Gender", profile.gender],
      ["Guardian", `${profile.guardian_name} (${profile.guardian_relation})`],
      ["Bank Account", profile.bank_account_number],
      ["IFSC", profile.ifsc],
    ];

    const doc = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: "UAN Profile Details Report", style: "header" },
        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },
        {
          qr: requestId !== "-" ? requestId : "UAN_PROFILE",
          fit: 80,
          alignment: "right",
          margin: [0, 10],
        },
        {
          table: {
            widths: ["35%", "65%"],
            body: tableRows.map(([k, v]) => [
              { text: k, bold: true },
              v || "-",
            ]),
          },
          layout: "lightHorizontalLines",
          margin: [0, 15],
        },

      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`UAN_Profile_${profile.uan}.pdf`);
  };

  const code = result?.data?.code;
  const badgeVariant =
    code === "1035" ? "success" : code === "1036" ? "warning" : "secondary";

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
                UAN <Required />
              </Form.Label>
              <Form.Control
                value={uan}
                onChange={(e) => setUan(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : "Fetch UAN Profile"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              {code === "1035" && (
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              )}
            </div>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
