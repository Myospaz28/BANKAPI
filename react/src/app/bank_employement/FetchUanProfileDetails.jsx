import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchUanProfileDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [uan, setUan] = useState("");
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

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!uan || !fileNo || !consent) {
      swal.fire(
        "Validation Error",
        "UAN, File Number and consent are required",
        "warning",
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm UAN Profile Fetch",
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
      const res = await api.post("api/fetchUanProfileDetailsController", {
        usr_ser_id,
        uan,
        file_no: fileNo,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === "1036") {
        swal.fire("No Records", "No profile found for this UAN", "info");
        return;
      }

      if (code !== "1035") {
        swal.fire("Failed", "Unable to fetch profile details", "error");
        return;
      }

      setResult(apiData);
      swal.fire("Success", "UAN profile details fetched", "success");
    } catch (err) {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const profile = result?.data?.uan_profile_data;

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!profile) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const tableRows = [
      ["UAN", profile.uan],
      ["Name", profile.name],
      ["Mobile", profile.mobile_number],
      ["DOB", profile.dob],
      ["Gender", profile.gender],
      ["Guardian", `${profile.guardian_name} (${profile.guardian_relation})`],
      ["Bank Account", profile.bank_account_number],
      ["IFSC", profile.ifsc],
    ];

    const doc = {
      content: [
        { text: "UAN Profile Details Report", style: "header" },
        { text: `File No: ${fileNo}`, marginBottom: 5 },
        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginBottom: 10,
        },

        {
          table: {
            widths: ["35%", "65%"],
            body: tableRows.map(([k, v]) => [
              { text: k, bold: true },
              v || "-",
            ]),
          },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          marginBottom: 10,
        },
      },
    };

    pdfMake.createPdf(doc).download(`UAN_Profile_${profile.uan}.pdf`);
  };

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
                UAN <Required />
              </Form.Label>
              <Form.Control
                value={uan}
                onChange={(e) => setUan(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : "Fetch UAN Profile"}
          </Button>
        </Card>

        {/* RESULT */}
        {profile && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>UAN Profile Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Name</th>
                  <td>{profile.name}</td>
                </tr>
                <tr>
                  <th>UAN</th>
                  <td>{profile.uan}</td>
                </tr>
                <tr>
                  <th>Mobile</th>
                  <td>{profile.mobile_number}</td>
                </tr>
                <tr>
                  <th>DOB</th>
                  <td>{profile.dob}</td>
                </tr>
                <tr>
                  <th>Gender</th>
                  <td>{profile.gender}</td>
                </tr>
                <tr>
                  <th>Guardian</th>
                  <td>
                    {profile.guardian_name} ({profile.guardian_relation})
                  </td>
                </tr>
                <tr>
                  <th>Bank Account</th>
                  <td>{profile.bank_account_number}</td>
                </tr>
                <tr>
                  <th>IFSC</th>
                  <td>{profile.ifsc}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
