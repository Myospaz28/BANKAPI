// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useLocation, useNavigate } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function FetchEmployerVerify() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [employerName, setEmployerName] = useState("");
//   const [establishmentId, setEstablishmentId] = useState("");
//   const [estCode, setEstCode] = useState("");
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

//   const handleFetch = async () => {
//     if (
//       !fileNo ||
//       !consent ||
//       (!employerName && !establishmentId && !estCode)
//     ) {
//       swal.fire(
//         "Validation Error",
//         "File No, consent and at least one employer detail is required",
//         "warning",
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire("Insufficient Credits", "Not enough credits", "error");
//       return;
//     }

//     const confirm = await swal.fire({
//       title: "Confirm Employer Verification",
//       html: `<p><b>Credits:</b> ${credits}</p><p><b>File No:</b> ${fileNo}</p>`,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Proceed",
//     });

//     if (!confirm.isConfirmed) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchEmployerVerifyController", {
//         usr_ser_id,
//         file_no: fileNo,
//         employer_name: employerName || undefined,
//         establishment_id: establishmentId || undefined,
//         establishment_code_number: estCode || undefined,
//         consent: "Y",
//       });

//       const code = res.data?.data?.data?.code;

//       if (code !== "1031") {
//         swal.fire("Not Found", "Establishment not found", "info");
//         return;
//       }

//       setResult(res.data.data);
//       swal.fire("Success", "Establishment verified", "success");
//     } catch {
//       swal.fire("Error", "Server error", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const est = result?.data?.establishment_data;

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mb-4">
//           <Row>
//             <Col md={6}>
//               <Form.Label>
//                 File Number <Required />
//               </Form.Label>
//               <Form.Control
//                 value={fileNo}
//                 onChange={(e) => setFileNo(e.target.value)}
//               />
//             </Col>

//             <Col md={6}>
//               <Form.Label>Employer Name</Form.Label>
//               <Form.Control
//                 value={employerName}
//                 onChange={(e) => setEmployerName(e.target.value)}
//               />
//             </Col>
//           </Row>

//           <Row className="mt-2">
//             <Col md={6}>
//               <Form.Label>Establishment ID</Form.Label>
//               <Form.Control
//                 value={establishmentId}
//                 onChange={(e) => setEstablishmentId(e.target.value)}
//               />
//             </Col>

//             <Col md={6}>
//               <Form.Label>Establishment Code</Form.Label>
//               <Form.Control
//                 value={estCode}
//                 onChange={(e) => setEstCode(e.target.value)}
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
//             {loading ? <Spinner size="sm" /> : "Verify Employer"}
//           </Button>
//         </Card>

//         {est && (
//           <Card body>
//             <h5>Establishment Details</h5>
//             <Table bordered>
//               <tbody>
//                 <tr>
//                   <th>Name</th>
//                   <td>{est.establishment_name}</td>
//                 </tr>
//                 <tr>
//                   <th>ID</th>
//                   <td>{est.establishment_id}</td>
//                 </tr>
//                 <tr>
//                   <th>Status</th>
//                   <td>{est.status}</td>
//                 </tr>
//                 <tr>
//                   <th>Ownership</th>
//                   <td>{est.ownership_type}</td>
//                 </tr>
//                 <tr>
//                   <th>PAN Status</th>
//                   <td>{est.pan_status}</td>
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

export default function FetchEmployerVerify() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [estCode, setEstCode] = useState("");
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
    if (
      !fileNo ||
      !consent ||
      (!employerName && !establishmentId && !estCode)
    ) {
      swal.fire("Validation Error", "All required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Employer Verification",
      html: `
        <p><b>File Number:</b> ${fileNo}</p>

      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const employerKey = employerName || establishmentId || estCode;

      const checkRes = await api.post("api/checkEmployerVerifyCache", {
        mas_ser_id,
        mas_cat_id,
        employer_key: employerKey,
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

      const res = await api.post("api/executeEmployerVerify", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        employer_name: employerName,
        establishment_id: establishmentId,
        establishment_code_number: estCode,
        use_cache: useCache,
      });

      setResult(res.data?.data);
      fetchWallet();
      swal.fire("Completed", "Verification processed", "success");
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const code = result?.data?.code;
  const badgeVariant = code === "1031" ? "success" : "warning";

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
              <Form.Label>Employer Name</Form.Label>
              <Form.Control
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={6}>
              <Form.Label>Establishment ID</Form.Label>
              <Form.Control
                value={establishmentId}
                onChange={(e) => setEstablishmentId(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Establishment Code</Form.Label>
              <Form.Control
                value={estCode}
                onChange={(e) => setEstCode(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : "Verify Employer"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>
            </div>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
