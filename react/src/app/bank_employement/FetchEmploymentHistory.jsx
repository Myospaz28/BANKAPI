import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchEmploymentHistory() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [uan, setUan] = useState("");
  const [fileNo, setFileNo] = useState(""); // ✅ FILE NUMBER
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= GUARD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  /* ================= WALLET ================= */
  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH HISTORY ================= */
  const handleFetch = async () => {
    if (!uan || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "UAN number, File Number and consent are required",
        "warning",
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Employment History Fetch",
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Available Credits:</b> ${wallet}</p>
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
      const res = await api.post("api/fetchEmploymentHistoryByUanController", {
        usr_ser_id,
        uan_number: uan,
        file_no: fileNo, // ✅ SEND FILE NUMBER
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      /* ---------- HANDLE RESPONSES ---------- */
      if (code === "1011") {
        swal.fire("Invalid UAN", "Provided UAN doesn't exist", "warning");
        return;
      }

      if (code === "1015") {
        swal.fire("No Records", "No employment records found", "info");
        return;
      }

      if (code !== "1013") {
        swal.fire("Failed", "Unable to fetch employment history", "error");
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        Employment history fetched successfully<br/>
        Credits Deducted: <b>${credits}</b><br/>
        Remaining Credits: <b>${wallet - credits}</b>
        `,
        "success",
      );

      fetchWallet();
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

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    const data = result?.data?.employment_data;

    if (!Array.isArray(data) || data.length === 0) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const rows = data.map((e, i) => [
      i + 1,
      e.establishment_name || "-",
      e.date_of_joining || "-",
      e.date_of_exit || "-",
      e.member_id || "-",
    ]);

    const doc = {
      content: [
        { text: "Employment History Report", style: "header" },
        { text: `UAN Number: ${uan}` },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        {
          table: {
            headerRows: 1,
            widths: ["5%", "35%", "20%", "20%", "20%"],
            body: [
              ["#", "Entity Name", "Joining Date", "Exit Date", "Member ID"],
              ...rows,
            ],
          },
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

    pdfMake.createPdf(doc).download(`Employment_History_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button variant="primary" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h4 className="mt-3">{service_name}</h4>
          <p className="text-muted">
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
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  UAN Number <Required />
                </Form.Label>
                <Form.Control
                  value={uan}
                  onChange={(e) => setUan(e.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  File Number <Required />
                </Form.Label>
                <Form.Control
                  value={fileNo}
                  onChange={(e) => setFileNo(e.target.value)}
                  placeholder="Enter File Number"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={6}>
              <Form.Check
                type="checkbox"
                label={
                  <>
                    I give consent <Required />
                  </>
                }
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
            </Col>
          </Row>

          <Button
            className="mt-3"
            variant="primary"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch Employment History"}
          </Button>
        </Card>

        {/* RESULT */}
        {Array.isArray(result?.data?.employment_data) && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>Employment History</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entity Name</th>
                  <th>Joining Date</th>
                  <th>Exit Date</th>
                  <th>Member ID</th>
                </tr>
              </thead>
              <tbody>
                {result.data.employment_data.map((e, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{e.establishment_name}</td>
                    <td>{e.date_of_joining}</td>
                    <td>{e.date_of_exit || "-"}</td>
                    <td>{e.member_id}</td>
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
