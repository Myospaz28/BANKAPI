import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

/* ================= PDF ================= */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchMSMEByPAN() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [pan, setPan] = useState("");
  const [detailed, setDetailed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);

    api.get("api/getLoggedInUserWallet").then((res) => {
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    });
  }, [usr_ser_id, navigate]);

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!fileNo || !pan || !consent) {
      swal.fire("Validation Error", "All required fields missing", "warning");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Fetch",
      html: `
        <b>PAN:</b> ${pan}<br/>
        <b>File No:</b> ${fileNo}<br/>
        <b>Detailed Response:</b> ${detailed ? "YES" : "NO"}
      `,
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchMSMEByPanController", {
        usr_ser_id,
        file_no: fileNo,
        pan_number: pan,
        detailed_response: detailed,
        consent: "Y",
      });

      const apiData = res.data?.data?.data;
      const code = apiData?.code;

      if (!["1014", "1016"].includes(code)) {
        swal.fire("Info", apiData?.message || "No record found", "info");
        setResult(apiData);
        return;
      }

      setResult(apiData);
      swal.fire("Success", apiData?.message, "success");
    } catch (err) {
      swal.fire("Error", "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!result) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const rows = [];

    if (result.udyam_number) rows.push(["Udyam Number", result.udyam_number]);

    if (result.enterprise_data) {
      Object.entries(result.enterprise_data).forEach(([k, v]) => {
        if (typeof v === "object") {
          rows.push([k, JSON.stringify(v)]);
        } else {
          rows.push([k, String(v)]);
        }
      });
    }

    const doc = {
      content: [
        { text: "MSME Fetch by PAN Report", style: "header" },

        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["File Number", fileNo],
              ["PAN Number", pan],
              ["Detailed Response", detailed ? "YES" : "NO"],
            ],
          },
          layout: "lightHorizontalLines",
          marginBottom: 15,
        },

        {
          table: {
            widths: ["40%", "60%"],
            body: rows,
          },
          layout: "lightHorizontalLines",
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          marginTop: 15,
          fontSize: 9,
          italics: true,
          alignment: "right",
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

    pdfMake.createPdf(doc).download(`MSME_By_PAN_${fileNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Fetch MSME by PAN"}</h4>
        </Card>

        {/* WALLET */}
        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        {/* FORM */}
        <Card body className="mb-4">
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
              PAN Number <Required />
            </Form.Label>
            <Form.Control
              value={pan}
              maxLength={10}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
            />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label="Detailed Response (Certificate + NIC + Units)"
            checked={detailed}
            onChange={(e) => setDetailed(e.target.checked)}
          />

          <Form.Check
            className="mt-2"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch MSME"}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>MSME Result</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                📄 Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                {Object.entries(result).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>
                      {typeof v === "object"
                        ? JSON.stringify(v, null, 2)
                        : String(v)}
                    </td>
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
