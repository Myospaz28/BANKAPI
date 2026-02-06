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
const val = (v) => (v ? v : "-");

export default function AadhaarOcrV2() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= GUARD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= SUBMIT ================= */
  const handleFetch = async () => {
    if (!fileNo || !front || !consent) {
      swal.fire(
        "Validation Error",
        "All required fields are mandatory",
        "warning",
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Aadhaar OCR",
      html: `
        <p><b>File No:</b> ${fileNo}</p>
        <p><b>Credits Required:</b> ${credits}</p>
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
    formData.append("file_front", front);
    if (back) formData.append("file_back", back);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchAadhaarOcrV2Controller", formData);
      const grid = res.data?.data;
      const apiData = grid?.data;

      if (apiData?.code !== "1014") {
        swal.fire("Failed", apiData?.message || "OCR failed", "error");
        return;
      }

      setResult(apiData.ocr_data);

      swal.fire(
        "Success",
        `
        Aadhaar OCR completed successfully<br/>
        Credits Deducted: <b>${credits}</b><br/>
        Remaining Wallet: <b>${wallet - credits}</b>
        `,
        "success",
      );

      fetchWallet();
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!result) return;

    const rows = Object.entries({
      "Aadhaar Number": result.document_id,
      Name: result.name,
      "Guardian Name": result.guardian_name,
      Gender: result.gender,
      "Date of Birth": result.date_of_birth,
      "Contact Number": result.contact_number,
      Address: result.address,
    }).filter(([, v]) => v);

    const doc = {
      content: [
        { text: "Aadhaar OCR V2 Report", style: "header" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              [
                { text: "Field", bold: true },
                { text: "Value", bold: true },
              ],
              ...rows,
            ],
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

    pdfMake.createPdf(doc).download(`AADHAAR_OCR_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Aadhaar OCR V2"}</h4>
          <p>
            Credits Required: <b>{credits}</b>
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
              Aadhaar Front <Required />
            </Form.Label>
            <Form.Control
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFront(e.target.files[0])}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Aadhaar Back (Optional)</Form.Label>
            <Form.Control
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setBack(e.target.files[0])}
            />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent to process Aadhaar OCR"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Run Aadhaar OCR"}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>Aadhaar OCR Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Aadhaar Number</th>
                  <td>{val(result.document_id)}</td>
                </tr>
                <tr>
                  <th>Name</th>
                  <td>{val(result.name)}</td>
                </tr>
                <tr>
                  <th>Guardian</th>
                  <td>{val(result.guardian_name)}</td>
                </tr>
                <tr>
                  <th>Gender</th>
                  <td>{val(result.gender)}</td>
                </tr>
                <tr>
                  <th>DOB</th>
                  <td>{val(result.date_of_birth)}</td>
                </tr>
                <tr>
                  <th>Contact</th>
                  <td>{val(result.contact_number)}</td>
                </tr>
                <tr>
                  <th>Address</th>
                  <td>{val(result.address)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
