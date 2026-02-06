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

export default function FetchUdyamByMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobile, setMobile] = useState("");
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
    if (!mobile || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Fetch",
      html: `<b>Mobile:</b> ${mobile}<br/><b>File No:</b> ${fileNo}`,
      showCancelButton: true,
      confirmButtonText: "Proceed",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchUdyamByMobileController", {
        usr_ser_id,
        file_no: fileNo,
        mobile_number: mobile,
        consent: "Y",
      });

      const apiData = res.data?.data?.data;
      const code = apiData?.code;

      if (code !== "1010") {
        swal.fire("Info", apiData?.message || "No record found", "info");
        setResult(apiData);
        return;
      }

      setResult(apiData);
      swal.fire("Success", "Udyam details fetched", "success");
    } catch (err) {
      swal.fire("Error", "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const udyamList = result?.udyam_details;

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!Array.isArray(udyamList) || udyamList.length === 0) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const tableBody = [
      [
        { text: "#", bold: true },
        { text: "Udyam Number", bold: true },
        { text: "Enterprise Name", bold: true },
      ],
      ...udyamList.map((u, i) => [
        i + 1,
        u.udyam_number || "-",
        u.enterprise_name || "-",
      ]),
    ];

    const docDefinition = {
      content: [
        { text: "Udyam Fetch Report", style: "header" },

        { text: "Request Details", style: "subHeader" },
        {
          table: {
            widths: ["40%", "60%"],
            body: [
              ["File Number", fileNo],
              ["Mobile Number", mobile],
              ["Service Name", service_name || "Fetch Udyam By Mobile"],
            ],
          },
          layout: "lightHorizontalLines",
          marginBottom: 15,
        },

        { text: "Udyam Details", style: "subHeader" },
        {
          table: {
            widths: ["10%", "45%", "45%"],
            body: tableBody,
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
        subHeader: {
          fontSize: 14,
          bold: true,
          marginTop: 10,
          marginBottom: 5,
        },
      },
    };

    pdfMake.createPdf(docDefinition).download(`Udyam_Report_${fileNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Fetch Udyam By Mobile"}</h4>
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
              Mobile Number <Required />
            </Form.Label>
            <Form.Control
              value={mobile}
              maxLength={10}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            />
          </Form.Group>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch Udyam"}
          </Button>
        </Card>

        {/* RESULT */}
        {Array.isArray(udyamList) && (
          <Card body>
            <div className="d-flex justify-content-between align-items-center">
              <h5>Udyam Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                📄 Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Udyam Number</th>
                  <th>Enterprise Name</th>
                </tr>
              </thead>
              <tbody>
                {udyamList.map((u, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{u.udyam_number}</td>
                    <td>{u.enterprise_name}</td>
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
