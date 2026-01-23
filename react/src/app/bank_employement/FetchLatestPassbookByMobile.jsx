import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchLatestPassbookByMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [mobile, setMobile] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  useEffect(() => {
    api
      .get("api/getLoggedInUserWallet")
      .then((res) => setWallet(Number(res.data?.data?.wallet_amount || 0)));
  }, []);

  const handleFetch = async () => {
    if (!mobile || mobile.length !== 10 || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "Mobile number, File Number and consent are required",
        "warning",
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Latest Passbook Fetch",
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>File No:</b> ${fileNo}</p>
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchLatestPassbookByMobileController", {
        usr_ser_id,
        mobile_number: mobile,
        file_no: fileNo,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === "1015") {
        swal.fire("No Records", "No employment records found", "info");
        return;
      }

      if (code === "1023") {
        swal.fire("Unavailable", "Passbook not available", "warning");
        return;
      }

      if (code !== "1022") {
        swal.fire("Failed", "Unable to fetch passbook", "error");
        return;
      }

      setResult(apiData);
      swal.fire("Success", "Latest passbook fetched", "success");
    } catch (err) {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const passbook = result?.data?.value || result?.data;

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mb-4">
          <Row>
            <Col md={6}>
              <Form.Label>
                Mobile Number <Required />
              </Form.Label>
              <Form.Control
                value={mobile}
                maxLength={10}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              />
            </Col>

            <Col md={6}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            type="checkbox"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch Latest Passbook"}
          </Button>
        </Card>

        {passbook && (
          <Card body>
            <h5>Latest EPFO Passbook</h5>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(passbook, null, 2)}
            </pre>
          </Card>
        )}
      </Col>
    </Row>
  );
}
