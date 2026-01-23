import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchLatestEmploymentByMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [mobile, setMobile] = useState("");
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
    api.get("api/getLoggedInUserWallet").then((res) => {
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    });
  }, []);

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!mobile || mobile.length !== 10 || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "Valid mobile number, File Number and consent are required",
        "warning",
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Latest Employment Fetch",
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>File No:</b> ${fileNo}</p>
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
        "api/fetchLatestEmploymentByMobileController",
        {
          usr_ser_id,
          mobile_number: mobile,
          file_no: fileNo,
          consent: "Y",
        },
      );

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === "1015") {
        swal.fire("No Records", "No employment found", "info");
        return;
      }

      if (code !== "1014") {
        swal.fire("Failed", "Unable to fetch latest employment", "error");
        return;
      }

      setResult(apiData);

      swal.fire("Success", "Latest employment fetched", "success");
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

  /* ================= EXTRACT LATEST EMPLOYMENT ================= */
  const latestEmployment =
    result?.data?.uan_data?.find((u) => u.is_latest_employment)
      ?.latest_employment_data || null;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
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
            {loading ? <Spinner size="sm" /> : "Fetch Latest Employment"}
          </Button>
        </Card>

        {/* RESULT */}
        {latestEmployment && (
          <Card body>
            <h5>Latest Employment</h5>
            <Table bordered>
              <tbody>
                <tr>
                  <th>Name</th>
                  <td>{latestEmployment.name}</td>
                </tr>
                <tr>
                  <th>Establishment</th>
                  <td>{latestEmployment.establishment_name}</td>
                </tr>
                <tr>
                  <th>Member ID</th>
                  <td>{latestEmployment.member_id}</td>
                </tr>
                <tr>
                  <th>Date of Joining</th>
                  <td>{latestEmployment.date_of_joining}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
