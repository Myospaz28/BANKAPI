import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function RcFetchRegByChassis() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [chassisNumber, setChassisNumber] = useState("");
  const [fileNo, setFileNo] = useState("");
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

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!chassisNumber || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "Chassis Number, File Number and Consent are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Fetch Registration Number",
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
      const res = await api.post(
        "api/fetchVehicleRegByChassisController",
        {
          usr_ser_id,
          chassis_number: chassisNumber,
          file_no: fileNo,
          consent: "Y",
        }
      );

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code !== "1007") {
        swal.fire(
          "No Records",
          "Vehicle details not found for this chassis number",
          "info"
        );
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        Registration number fetched successfully<br/>
        Credits Deducted: <b>${credits}</b><br/>
        Remaining Credits: <b>${wallet - credits}</b>
        `,
        "success"
      );

      fetchWallet();
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
    const vehicles = result?.data?.vehicle_details;
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const rows = vehicles.map((v, i) => [
      i + 1,
      v.rc_registration_number,
      v.chassis_number,
    ]);

    const doc = {
      content: [
        { text: "Vehicle Registration Lookup by Chassis", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        {
          table: {
            headerRows: 1,
            widths: ["10%", "45%", "45%"],
            body: [
              ["#", "Registration Number", "Chassis Number"],
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

    pdfMake
      .createPdf(doc)
      .download(`RC_BY_CHASSIS_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button variant="primary" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h4 className="mt-3">{service_name}</h4>
          <p className="text-muted">
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Label>Chassis Number <Required /></Form.Label>
              <Form.Control
                value={chassisNumber}
                onChange={(e) =>
                  setChassisNumber(e.target.value.toUpperCase())
                }
              />
            </Col>

            <Col md={4}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

            <Col md={4} className="d-flex align-items-end">
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
            variant="success"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch Registration Number"}
          </Button>
        </Card>

        {Array.isArray(result?.data?.vehicle_details) && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>Vehicle Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Registration Number</th>
                  <th>Chassis Number</th>
                </tr>
              </thead>
              <tbody>
                {result.data.vehicle_details.map((v, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{v.rc_registration_number}</td>
                    <td>{v.chassis_number}</td>
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
