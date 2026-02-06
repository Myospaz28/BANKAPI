import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Table,
  Badge,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;
const safe = (v) =>
  v === undefined || v === null || v === "" ? "-" : String(v);

export default function FetchMobileLookup() {
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
      title: "Confirm Mobile Lookup",
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
      const res = await api.post("api/mobileLookupController", {
        usr_ser_id,
        file_no: fileNo,
        mobile_number: mobile,
        consent: "Y",
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      setResult(apiData);

      if (code === "1007") {
        swal.fire(
          "Success",
          `
          Mobile Lookup fetched successfully<br/>
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
    if (!result?.data?.mobile_lookup_data) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const d = result.data.mobile_lookup_data;

    const section = (t) => ({ text: t, style: "section" });
    const row = (k, v) => [k, safe(v)];

    const doc = {
      content: [
        { text: "Mobile Lookup Report", style: "header" },

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

        section("Basic Status"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Is Valid", d.is_valid),
              row("Subscriber Status", d.subscriber_status),
              row("Connection Type", d.network_connection_type),
            ],
          },
        },

        section("MSISDN Details"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Country Code", d.msisdn_data.msisdn_country_code),
              row("MSISDN", d.msisdn_data.msisdn),
              row("Type", d.msisdn_data.type),
              row("MCC", d.msisdn_data.mcc),
              row("MNC", d.msisdn_data.mnc),
              row("IMSI", d.msisdn_data.imsi),
              row("MCC-MNC", d.msisdn_data.mcc_mnc),
            ],
          },
        },

        section("Current Network Provider"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row(
                "Network Name",
                d.current_network_service_provider.network_name
              ),
              row(
                "Region",
                d.current_network_service_provider.network_region
              ),
              row(
                "Country",
                d.current_network_service_provider.country_name
              ),
            ],
          },
        },

        section("Original Network Provider"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row(
                "Network Name",
                d.original_network_service_provider.network_name
              ),
              row(
                "Region",
                d.original_network_service_provider.network_region
              ),
            ],
          },
        },

        section("Roaming & Porting"),
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              row("Is Roaming", d.is_roaming),
              row(
                "Roaming Operator",
                d.roaming_network_service_provider.network_name
              ),
              row("Is Ported", d.is_ported),
              row("Last Ported Date", d.last_ported_date),
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

    pdfMake.createPdf(doc).download(`MOBILE_LOOKUP_${fileNo}.pdf`);
  };

  const d = result?.data?.mobile_lookup_data;

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
              onChange={(e) =>
                setMobile(e.target.value.replace(/\D/g, ""))
              }
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

          <Button
            className="mt-3"
            disabled={loading}
            onClick={handleFetch}
          >
            {loading ? <Spinner size="sm" /> : "Fetch Mobile Lookup"}
          </Button>
        </Card>

        {d && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>📄 Mobile Lookup Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Subscriber Status</th>
                  <td>{d.subscriber_status}</td>
                </tr>
                <tr>
                  <th>Connection Type</th>
                  <td>{d.network_connection_type}</td>
                </tr>
                <tr>
                  <th>Current Operator</th>
                  <td>
                    {d.current_network_service_provider.network_name}{" "}
                    <Badge bg="info">
                      {d.current_network_service_provider.network_region}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th>Original Operator</th>
                  <td>{d.original_network_service_provider.network_name}</td>
                </tr>
                <tr>
                  <th>Roaming</th>
                  <td>{d.is_roaming ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <th>Ported</th>
                  <td>{d.is_ported ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <th>Last Ported Date</th>
                  <td>{safe(d.last_ported_date)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}