import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;


export default function FetchEntityLinkage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
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

  const handleFetch = async () => {
    if (!fileNo || !mobile || !pan || !consent) {
      swal.fire("Validation Error", "All required fields missing", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Entity Linkage Check",
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Available Credits:</b> ${wallet}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/checkEntityLinkageController", {
        usr_ser_id,
        file_no: fileNo,
        mobile,
        pan,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);

      if (code === "1009") {
        swal.fire(
          "Success",
          `Entity linkage fetched successfully<br/>
           Credits Deducted: <b>${credits}</b><br/>
           Remaining Credits: <b>${wallet - credits}</b>`,
          "success"
        );
        fetchWallet();
      } else {
        swal.fire("Info", apiData?.data?.message || "No linkage found", "info");
      }
    } catch (err) {
      swal.fire("Error", "Service unavailable", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    const d = result?.data?.entity_linkage_data;
    if (!d) return;

    const row = (k, v) => [k, v ? "Yes" : "No"];

    const doc = {
      content: [
        { text: "Entity Linkage Report", style: "header" },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["File Number", fileNo],
              ["Mobile", d.input.mobile],
              ["PAN", d.input.pan],
            ],
          },
          marginBottom: 10,
        },

        {
          table: {
            widths: ["50%", "50%"],
            body: [
              ["UAN Linked", row("", d.profile_indicators.uan_linked)[1]],
              ["GST Linked", row("", d.profile_indicators.gst_linked)[1]],
              ["Udyam Linked", row("", d.profile_indicators.udyam_linked)[1]],
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`ENTITY_LINKAGE_${fileNo}.pdf`);
  };

  const d = result?.data?.entity_linkage_data;

  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="mt-3">
          <Form.Group>
            <Form.Label>File Number <Required /></Form.Label>
            <Form.Control value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Mobile <Required /></Form.Label>
            <Form.Control value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>PAN <Required /></Form.Label>
            <Form.Control value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : "Check Entity Linkage"}
          </Button>
        </Card>

        {d && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>📄 Entity Linkage Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr><th>UAN Linked</th><td>{d.profile_indicators.uan_linked ? "Yes" : "No"}</td></tr>
                <tr><th>GST Linked</th><td>{d.profile_indicators.gst_linked ? "Yes" : "No"}</td></tr>
                <tr><th>Udyam Linked</th><td>{d.profile_indicators.udyam_linked ? "Yes" : "No"}</td></tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}