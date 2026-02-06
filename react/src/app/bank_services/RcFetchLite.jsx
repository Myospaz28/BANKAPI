

import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function RcFetchLite() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [rcNumber, setRcNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
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

  /* ================= FETCH RC LITE ================= */
  const handleFetch = async () => {
    if (!rcNumber || !ownerName || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "RC Number, Owner Name, File Number and Consent are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm RC Lite Fetch",
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
      const res = await api.post("api/fetchRcLiteController", {
        usr_ser_id,
        rc_number: rcNumber,
        owner_name: ownerName,
        file_no: fileNo, // ✅ SEND FILE NUMBER
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code !== "1000") {
        let msg = "Unable to fetch RC Lite details";
        if (code === "1001") msg = "RC does not exist";
        if (code === "1002") msg = "Vehicle found in multiple offices";

        swal.fire("Failed", msg, "warning");
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        RC Lite fetched successfully<br/>
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
    if (!result?.data?.rc_data) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const rc = result.data.rc_data;
    const owner = rc.owner_data || {};
    const vehicle = rc.vehicle_data || {};

    const tableBlock = (rows) => ({
      table: {
        widths: ["35%", "65%"],
        body: rows.map((r) => [
          { text: r[0], bold: true },
          r[1] || "-",
        ]),
      },
      layout: "lightHorizontalLines",
      marginBottom: 10,
    });

    const doc = {
      content: [
        { text: "RC Lite Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        { text: "Owner Details", style: "sub" },
        tableBlock([
          ["Owner Name", owner.name],
          ["Address", owner.present_address],
        ]),

        { text: "Vehicle Details", style: "sub" },
        tableBlock([
          ["Model", vehicle.maker_model],
          ["Fuel Type", vehicle.fuel_type],
          ["Color", vehicle.color],
          ["Engine No", vehicle.engine_number],
          ["Chassis No", vehicle.chassis_number],
          ["Category", vehicle.category_description],
        ]),

        { text: "Registration Info", style: "sub" },
        tableBlock([
          ["Issue Date", rc.issue_date],
          ["Expiry Date", rc.expiry_date],
          ["Status", rc.status],
          ["PUCC Expiry", rc.pucc_data?.expiry_date],
          ["Insurance Expiry", rc.insurance_data?.expiry_date],
        ]),

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginTop: 15,
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
        sub: { fontSize: 14, bold: true, marginTop: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`RC_LITE_${fileNo}.pdf`);
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
              <Form.Label>RC Number <Required /></Form.Label>
              <Form.Control
                value={rcNumber}
                onChange={(e) =>
                  setRcNumber(e.target.value.toUpperCase())
                }
              />
            </Col>

            <Col md={4}>
              <Form.Label>Owner Name <Required /></Form.Label>
              <Form.Control
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </Col>

            <Col md={4}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
                placeholder="Enter File Number"
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            type="checkbox"
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
            variant="primary"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch RC Lite"}
          </Button>
        </Card>

        {result?.data?.rc_data && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>RC Lite Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr><th>Owner</th><td>{result.data.rc_data.owner_data?.name}</td></tr>
                <tr><th>Vehicle</th><td>{result.data.rc_data.vehicle_data?.maker_model}</td></tr>
                <tr><th>Fuel</th><td>{result.data.rc_data.vehicle_data?.fuel_type}</td></tr>
                <tr><th>Status</th><td>{result.data.rc_data.status}</td></tr>
                <tr><th>Expiry</th><td>{result.data.rc_data.expiry_date}</td></tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
