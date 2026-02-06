import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));

export default function FetchMobileNumberAge() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobile, setMobile] = useState("");
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

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!fileNo || !mobile || mobile.length !== 10 || !consent) {
      swal.fire(
        "Validation Error",
        "File Number, Mobile Number and Consent are required",
        "warning"
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Mobile Number Age Fetch",
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
      const res = await api.post("api/mobileNumberAgeController", {
        usr_ser_id,
        file_no: fileNo,
        mobile_number: mobile,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);

      if (code === "1008") {
        swal.fire(
          "Success",
          `
          Mobile Number Age fetched successfully<br/>
          Credits Deducted: <b>${credits}</b><br/>
          Remaining Credits: <b>${wallet - credits}</b>
          `,
          "success"
        );
        fetchWallet();
      } else {
        swal.fire("Info", apiData?.data?.message || "No records found", "info");
      }
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

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result?.data?.mobile_number_age_data) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const d = result.data.mobile_number_age_data;
    const section = (t) => ({ text: t, style: "section" });
    const row = (k, v) => [k, safe(v)];

    const doc = {
      content: [
        { text: "Mobile Number Age Report", style: "header" },

        section("Request Details"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("File Number", fileNo),
              row("Mobile Number", mobile),
              row("Request ID", result.request_id),
              row("Transaction ID", result.transaction_id),
              row("Status", result.status),
              row("Message", result.data.message),
            ],
          },
        },

        section("Mobile Number Age Details"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Mobile Age", d.mobile_age),
              row("Is Number Active", d.is_number_active),
              row("Is Number Valid", d.is_number_valid),
              row("Has Porting History", d.has_porting_history),
              row("Roaming", d.roaming),
              row("Ported Region", d.ported_region),
              row("Current Telecom Provider", d.current_ported_telecom_provider),
              row("Original Region", d.original_region),
              row("Original Telecom Provider", d.original_telecom_provider),
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
        section: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      },
      defaultStyle: { fontSize: 11 },
    };

    pdfMake.createPdf(doc).download(`MOBILE_NUMBER_AGE_${fileNo}.pdf`);
  };

  const d = result?.data?.mobile_number_age_data;

  /* ================= UI ================= */
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

        <Card body className="text-center mt-2">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mt-3">
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
              Mobile Number <Required />
            </Form.Label>
            <Form.Control
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : "Fetch Mobile Number Age"}
          </Button>
        </Card>

        {d && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>📄 Mobile Number Age Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr><th>Mobile Age</th><td>{d.mobile_age}</td></tr>
                <tr><th>Number Active</th><td>{d.is_number_active}</td></tr>
                <tr><th>Number Valid</th><td>{d.is_number_valid}</td></tr>
                <tr><th>Porting History</th><td>{d.has_porting_history}</td></tr>
                <tr><th>Roaming</th><td>{d.roaming}</td></tr>
                <tr>
                  <th>Current Operator</th>
                  <td>
                    {d.current_ported_telecom_provider}{" "}
                    <Badge bg="info">{d.ported_region}</Badge>
                  </td>
                </tr>
                <tr><th>Original Operator</th><td>{d.original_telecom_provider}</td></tr>
                <tr><th>Original Region</th><td>{d.original_region}</td></tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}