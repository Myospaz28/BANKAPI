
import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function RcFetchDetailed() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [rcNumber, setRcNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [fileNo, setFileNo] = useState(""); // ✅ FILE NUMBER
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
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch {
      setWallet(0);
    }
  };

  /* ================= FETCH RC ================= */
  const handleFetch = async () => {
    if (!rcNumber || !ownerName || !fileNo) {
      swal.fire(
        "Validation Error",
        "RC Number, Owner Name and File Number are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "You do not have enough credits",
        "error"
      );
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm RC Detailed Fetch",
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
      const res = await api.post("api/fetchRcDetailed", {
        usr_ser_id,
        rc_number: rcNumber,
        owner_name: ownerName,
        file_no: fileNo, // ✅ SEND FILE NUMBER
        consent: "Y",
      });

      const apiData = res.data?.data?.data;

      if (apiData?.code !== "1000") {
        let msg = "Unable to fetch RC details";
        if (apiData?.code === "1001") msg = "RC does not exist";
        if (apiData?.code === "1002") msg = "Vehicle found in multiple RTOs";

        swal.fire("Failed", msg, "warning");
        return;
      }

      setResult(apiData);

      swal.fire(
        "Success",
        `
        RC details fetched successfully<br/>
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

  /* ================= HELPERS ================= */
  const row = (label, value) => (
    <tr>
      <th style={{ width: "35%" }}>{label}</th>
      <td>{value || "-"}</td>
    </tr>
  );

  /* ================= PDF ================= */
  const exportPdf = () => {
    const rc = result?.rc_data;
    if (!rc) return;

    const section = (title, rows) => [
      { text: title, style: "section" },
      {
        table: {
          widths: ["35%", "65%"],
          body: rows.map(r => [{ text: r[0], bold: true }, r[1] || "-"]),
        },
        layout: "lightHorizontalLines",
        marginBottom: 10,
      },
    ];

    const doc = {
      content: [
        { text: "RC Detailed Report", style: "header" },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        ...section("Owner Details", [
          ["Owner Name", rc.owner_data?.name],
          ["Father Name", rc.owner_data?.father_name],
          ["Present Address", rc.owner_data?.present_address],
          ["Permanent Address", rc.owner_data?.permanent_address],
        ]),

        ...section("Registration Details", [
          ["Status", rc.status],
          ["Registered At", rc.registered_at],
          ["Issue Date", rc.issue_date],
          ["Expiry Date", rc.expiry_date],
          ["Blacklist Status", rc.blacklist_status],
          ["Norms Type", rc.norms_type],
        ]),

        ...section("Vehicle Details", [
          ["Manufacturer", rc.vehicle_data?.maker_description],
          ["Model", rc.vehicle_data?.maker_model],
          ["Fuel Type", rc.vehicle_data?.fuel_type],
          ["Color", rc.vehicle_data?.color],
          ["Chassis No", rc.vehicle_data?.chassis_number],
          ["Engine No", rc.vehicle_data?.engine_number],
          ["Cubic Capacity", rc.vehicle_data?.cubic_capacity],
          ["Gross Weight", rc.vehicle_data?.gross_weight],
        ]),

        ...section("Insurance Details", [
          ["Policy Number", rc.insurance_data?.policy_number],
          ["Company", rc.insurance_data?.company],
          ["Expiry Date", rc.insurance_data?.expiry_date],
        ]),

        ...section("PUCC Details", [
          ["PUCC Number", rc.pucc_data?.pucc_number],
          ["PUCC Expiry", rc.pucc_data?.expiry_date],
        ]),
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 15 },
        section: { fontSize: 14, bold: true, marginTop: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`RC_DETAILED_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  const rc = result?.rc_data || {};

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button variant="primary" onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p className="text-muted">Credits Required: <b>{credits}</b></p>
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
                onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
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

          <Button
            className="mt-3"
            variant="primary"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch RC Detailed"}
          </Button>
        </Card>

        {result && (
          <>
            <Card body className="mb-3 d-flex justify-content-between align-items-center">
              <h5>RC Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </Card>

            <Card body className="mb-3">
              <h6 className="text-primary">Owner Details</h6>
              <Table bordered size="sm">
                <tbody>
                  {row("Owner Name", rc.owner_data?.name)}
                  {row("Father Name", rc.owner_data?.father_name)}
                  {row("Present Address", rc.owner_data?.present_address)}
                  {row("Permanent Address", rc.owner_data?.permanent_address)}
                </tbody>
              </Table>

              <h6 className="text-primary mt-3">Vehicle Details</h6>
              <Table bordered size="sm">
                <tbody>
                  {row("Model", rc.vehicle_data?.maker_model)}
                  {row("Manufacturer", rc.vehicle_data?.maker_description)}
                  {row("Fuel Type", rc.vehicle_data?.fuel_type)}
                  {row("Color", rc.vehicle_data?.color)}
                  {row("Chassis No", rc.vehicle_data?.chassis_number)}
                  {row("Engine No", rc.vehicle_data?.engine_number)}
                </tbody>
              </Table>

              <h6 className="text-primary mt-3">Registration Details</h6>
              <Table bordered size="sm">
                <tbody>
                  {row("Status", rc.status)}
                  {row("Registered At", rc.registered_at)}
                  {row("Issue Date", rc.issue_date)}
                  {row("Expiry Date", rc.expiry_date)}
                </tbody>
              </Table>
            </Card>
          </>
        )}
      </Col>
    </Row>
  );
}
