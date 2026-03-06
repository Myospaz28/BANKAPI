// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table, Badge } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FastagFetchDetailed() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [rcNumber, setRcNumber] = useState("");
//   const [tagId, setTagId] = useState("");
//   const [fileNo, setFileNo] = useState("");
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

//   /* ================= FETCH ================= */
//   const handleFetch = async () => {
//     if ((!rcNumber && !tagId) || !fileNo || !consent) {
//       swal.fire(
//         "Validation Error",
//         "Either RC Number or FASTag ID, File Number and Consent are required",
//         "warning"
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm FASTag Fetch",
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
//       const res = await api.post("api/fetchFastagDetailedController", {
//         usr_ser_id,
//         rc_number: rcNumber || undefined,
//         tag_id: tagId || undefined,
//         file_no: fileNo,
//         consent: "Y",
//       });

//       const apiData = res.data?.data;
//       const code = apiData?.data?.code;

//       if (code !== "1009") {
//         swal.fire("No Records", "FASTag details not found", "info");
//         return;
//       }

//       setResult(apiData);
//       fetchWallet();

//       swal.fire("Success", "FASTag details fetched successfully", "success");
//     } catch (err) {
//       swal.fire("Error", err.response?.data?.message || "Server error", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fastag = result?.data?.vehicle_fastag_data;

//   /* ================= UI ================= */
//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button variant="primary" onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p className="text-muted">Credits Required: <b>{credits}</b></p>
//         </Card>

//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mb-4">
//           <Row>
//             <Col md={4}>
//               <Form.Label>
//                 RC Number
//                 {!tagId && <Required />}
//               </Form.Label>
//               <Form.Control
//                 value={rcNumber}
//                 onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
//               />
//             </Col>

//             <Col md={4}>
//               <Form.Label>
//                 FASTag ID
//                 {!rcNumber && <Required />}
//               </Form.Label>
//               <Form.Control
//                 value={tagId}
//                 onChange={(e) => setTagId(e.target.value)}
//               />
//             </Col>

//             <Col md={4}>
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
//             label={<>I give consent <Required /></>}
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button
//             className="mt-3"
//             variant="primary"
//             disabled={loading}
//             onClick={handleFetch}
//           >
//             {loading ? <Spinner size="sm" /> : "Fetch FASTag Details"}
//           </Button>
//         </Card>

//         {fastag && (
//           <Card body>
//             <h5>FASTag Summary</h5>
//             <Table bordered>
//               <tbody>
//                 <tr><th>RC Number</th><td>{fastag.rc_number}</td></tr>
//                 <tr><th>Active Tag Age</th><td>{fastag.active_tag_age}</td></tr>
//                 <tr><th>Total Tags</th><td>{fastag.tags_summary.total_tags}</td></tr>
//                 <tr><th>Active Tags</th><td>{fastag.tags_summary.active_tags}</td></tr>
//                 <tr><th>Inactive Tags</th><td>{fastag.tags_summary.inactive_tags}</td></tr>
//               </tbody>
//             </Table>

//             <h6>FASTag Records</h6>
//             <Table bordered size="sm">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>Tag ID</th>
//                   <th>Status</th>
//                   <th>Bank</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {fastag.fastag_records.map((t, i) => (
//                   <tr key={i}>
//                     <td>{i + 1}</td>
//                     <td>{t.tag_id}</td>
//                     <td>
//                       <Badge bg={t.tag_status === "ACTIVE" ? "success" : "secondary"}>
//                         {t.tag_status}
//                       </Badge>
//                     </td>
//                     <td>{t.issuer_bank}</td>
//                   </tr>
//                 ))}
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

const Required = () => <span style={{ color: "red", marginLeft: 4 }}>*</span>;

export default function FastagFetchDetailed() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const { usr_ser_id, mas_ser_id, mas_cat_id, service_name, credits } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [rcNumber, setRcNumber] = useState("");
  const [tagId, setTagId] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
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
    if (code === "1010") return "danger";
    return "secondary";
  };

  const handleFetch = async () => {
    if (loading) return;

    if (!rcNumber || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
      <ul style="text-align:left">
        ${!rcNumber ? "<li>RC Number is required</li>" : ""}
        ${!fileNo ? "<li>File Number is required</li>" : ""}
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
      title: "Confirm FASTag Fetch",
      html: `
        <p><b>RC Number:</b> ${rcNumber || "-"}</p>
        <p><b>FASTag ID:</b> ${tagId || "-"}</p>
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
      const checkRes = await api.post("api/checkFastagDetailedCache", {
        mas_ser_id,
        mas_cat_id,
        rc_number: rcNumber,
        tag_id: tagId,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

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
        else if (!cacheConfirm.isDenied) {
          setLoading(false);
          return;
        }
      }

      const executeRes = await api.post("api/executeFastagDetailed", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        rc_number: rcNumber,
        tag_id: tagId,
        use_cache: useCache,
      });

      const apiData = normalize(executeRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1009") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1010") {
        swal.fire("Not Found", apiData?.data?.message, "info");
      } else {
        swal.fire("Completed", apiData?.data?.message || "Processed", "info");
      }
    } catch (err) {
      swal.fire(
        "Error",
        err.response?.data?.message || "Server error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const code = result?.data?.code;

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
                RC Number <Required />
              </Form.Label>
              <Form.Control
                value={rcNumber}
                onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
              />
            </Col>
            <Col md={4}>
              <Form.Label>FASTag ID</Form.Label>
              <Form.Control
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
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

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch FASTag Details"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result <Badge bg={getBadgeVariant(code)}>{code}</Badge>
              </h5>
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
