// import React, { useEffect, useState } from "react";
// import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
// import { useNavigate, useLocation } from "react-router-dom";
// import swal from "sweetalert2";
// import api from "../services/api";

// /* ===== PDF ===== */
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: "red" }}> *</span>;

// export default function SalarySlipOCR() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name } = state || {};

//   const [wallet, setWallet] = useState(0);
//   const [fileNo, setFileNo] = useState("");
//   const [file, setFile] = useState(null);
//   const [consent, setConsent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);

//     api.get("api/getLoggedInUserWallet").then((res) => {
//       setWallet(Number(res.data?.data?.wallet_amount || 0));
//     });
//   }, [usr_ser_id, navigate]);

//   const handleOCR = async () => {
//     if (!file || !fileNo || !consent) {
//       swal.fire("Validation Error", "All required fields missing", "warning");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("usr_ser_id", usr_ser_id);
//     formData.append("file_no", fileNo);
//     formData.append("file_front", file);
//     formData.append("consent", "Y");

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post("api/fetchSalarySlipOcrController", formData);

//       const apiData = res.data?.data?.data;
//       const code = apiData?.code;

//       if (code !== "1030") {
//         swal.fire("OCR Failed", apiData?.message, "error");
//         return;
//       }

//       setResult(apiData);
//       swal.fire("Success", "Salary Slip OCR completed", "success");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const ocr = result?.data;

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!ocr) return;

//     const rows = Object.entries(ocr).map(([k, v]) => [
//       k.replaceAll("_", " ").toUpperCase(),
//       v?.toString() || "-",
//     ]);

//     const doc = {
//       content: [
//         { text: "Salary Slip OCR Report", style: "header" },
//         {
//           table: {
//             widths: ["40%", "60%"],
//             body: rows,
//           },
//           layout: "lightHorizontalLines",
//         },
//         {
//           text: `Generated On: ${new Date().toLocaleString()}`,
//           marginTop: 15,
//           fontSize: 9,
//           italics: true,
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 10 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`Salary_Slip_OCR_${fileNo}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-3">
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name || "Salary Slip OCR"}</h4>
//         </Card>

//         <Card body className="mb-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mb-4">
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
//               Salary Slip (PDF / Image) <Required />
//             </Form.Label>
//             <Form.Control
//               type="file"
//               accept=".pdf,.jpg,.jpeg,.png"
//               onChange={(e) => setFile(e.target.files[0])}
//             />
//           </Form.Group>

//           <Form.Check
//             className="mt-3"
//             label="I give consent"
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" onClick={handleOCR} disabled={loading}>
//             {loading ? <Spinner size="sm" /> : "Run Salary Slip OCR"}
//           </Button>
//         </Card>

//         {ocr && (
//           <Card body>
//             <div className="d-flex justify-content-between">
//               <h5>OCR Result</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </div>

//             <Table bordered className="mt-3">
//               <tbody>
//                 {Object.entries(ocr).map(([k, v]) => (
//                   <tr key={k}>
//                     <th>{k.replaceAll("_", " ")}</th>
//                     <td>{v}</td>
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
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

/* ===== PDF ===== */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const val = (v) => (v !== undefined && v !== null && v !== "" ? v : "-");

export default function SalarySlipOCR() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= SUBMIT ================= */
  const handleOCR = async () => {
    if (!file || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "All required fields are mandatory",
        "warning",
      );
      return;
    }

    if (credits && wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Salary Slip OCR",
      html: `
        <p><b>File No:</b> ${fileNo}</p>
        <p><b>Credits Required:</b> ${credits ?? 0}</p>
        <p><b>Wallet Balance:</b> ${wallet}</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    const formData = new FormData();
    formData.append("usr_ser_id", usr_ser_id);
    formData.append("file_no", fileNo);
    formData.append("file_front", file);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchSalarySlipOcrController", formData);

      const grid = res.data?.data;
      const apiData = grid?.data;
      const code = apiData?.code;

      if (code !== "1030") {
        swal.fire(
          "OCR Failed",
          apiData?.message || "Salary slip OCR failed",
          "error",
        );
        return;
      }

      setResult(apiData.data);

      swal.fire(
        "Success",
        `
        Salary Slip OCR completed successfully<br/>
        Credits Deducted: <b>${credits ?? 0}</b><br/>
        Remaining Wallet: <b>${wallet - (credits ?? 0)}</b>
        `,
        "success",
      );

      fetchWallet();
    } finally {
      setLoading(false);
    }
  };

  const ocr = result;

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!ocr) return;

    const rows = Object.entries(ocr).map(([k, v]) => [
      k.replaceAll("_", " ").toUpperCase(),
      val(v),
    ]);

    const doc = {
      content: [
        { text: "Salary Slip OCR Report", style: "header" },
        {
          table: {
            widths: ["40%", "60%"],
            body: rows,
          },
          layout: "lightHorizontalLines",
        },
        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginTop: 15,
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`SALARY_SLIP_OCR_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Salary Slip OCR"}</h4>
          <p>
            Credits Required: <b>{credits ?? 0}</b>
          </p>
        </Card>

        {/* WALLET */}
        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        {/* FORM */}
        <Card body className="mb-4">
          <Form.Group>
            <Form.Label>
              File Number <Required />
            </Form.Label>
            <Form.Control
              value={fileNo}
              onChange={(e) => setFileNo(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>
              Salary Slip (PDF / Image) <Required />
            </Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent to process Salary Slip OCR"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleOCR} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Run Salary Slip OCR"}
          </Button>
        </Card>

        {/* RESULT */}
        {ocr && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>OCR Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                {Object.entries(ocr).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k.replaceAll("_", " ")}</th>
                    <td>{val(v)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
