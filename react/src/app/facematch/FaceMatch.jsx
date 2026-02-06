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
const val = (v) => (v !== undefined && v !== null ? v : "-");

export default function FaceMatch() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
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
  const handleFetch = async () => {
    if (!fileNo || !img1 || !img2 || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    /* ===== CONFIRM (AADHAAR STYLE) ===== */
    const confirm = await swal.fire({
      title: "Confirm Face Match",
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
    formData.append("file_1", img1);
    formData.append("file_2", img2);
    formData.append("consent", "Y");

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchFaceMatchController", formData);

      const grid = res.data?.data;
      const apiData = grid?.data;

      if (!apiData || !["1000", "1001"].includes(apiData.code)) {
        swal.fire(
          "Failed",
          apiData?.message || "Face verification failed",
          "error",
        );
        return;
      }

      setResult(apiData);

      /* ===== SUCCESS (AADHAAR STYLE) ===== */
      swal.fire(
        "Success",
        `
        Face verification completed successfully<br/>
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

    const doc = {
      content: [
        { text: "Face Match Report", style: "header" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              [
                { text: "Field", bold: true },
                { text: "Value", bold: true },
              ],
              ["Result", val(result.message)],
              ["Confidence Score", val(result.confidence)],
              [
                "Decision",
                result.code === "1000" ? "Same Person" : "Different Person",
              ],
              ["Threshold Used", "0.25"],
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

    pdfMake.createPdf(doc).download(`FACE_MATCH_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Face Match"}</h4>
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
              Image 1 <Required />
            </Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => setImg1(e.target.files[0])}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>
              Image 2 <Required />
            </Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => setImg2(e.target.files[0])}
            />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent for face verification"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Verify Face"}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>Face Match Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Status</th>
                  <td>{val(result.message)}</td>
                </tr>
                <tr>
                  <th>Confidence Score</th>
                  <td>{val(result.confidence)}</td>
                </tr>
                <tr>
                  <th>Decision</th>
                  <td>
                    {result.code === "1000"
                      ? "Same Person"
                      : "Different Person"}
                  </td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
