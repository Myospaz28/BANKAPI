import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "../components/JsonTableViewer";

/* ================= PDF ================= */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchUdyamByMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, mas_ser_id, mas_cat_id } = state || {};

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
    if (!mobile || mobile.length !== 10 || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Udyam Fetch",
      html: `
        <p><b>Mobile:</b> ${mobile}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post("api/checkUdyamMobileCache", {
        mas_ser_id,
        mas_cat_id,
        mobile_number: mobile,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt,
        ).toLocaleString("en-IN");

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          showConfirmButton: true,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Use Old Data",
          denyButtonText: "Fetch Fresh",
               customClass: {
            confirmButton: "btn-use-old",
            denyButton: "btn-fetch-fresh",
          },
            allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (cacheConfirm.isConfirmed) useCache = true;
        else if (!cacheConfirm.isDenied) {
          setLoading(false);
          return;
        }
      }

      const res = await api.post("api/executeUdyamMobile", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        mobile_number: mobile,
        use_cache: useCache,
      });

      /* IMPORTANT FIX */
      const fullResponse = res.data?.data; // 👈 NOT res.data.data.data

      setResult(fullResponse);

      const code = fullResponse?.data?.code;

      if (code !== "1010") {
        swal.fire(
          "Info",
          fullResponse?.data?.message || "No record found",
          "info",
        );
      } else {
        swal.fire("Success", "Udyam details fetched", "success");
      }
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const udyamList = result?.data?.udyam_details;
  const code = result?.data?.code;
  const badgeVariant = code === "1010" ? "success" : "secondary";

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!Array.isArray(udyamList) || udyamList.length === 0) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const requestId = result?.request_id || "UDYAM_REQUEST";
    const transactionId = result?.transaction_id || "-";

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
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],

      content: [
        { text: "Udyam Fetch Report", style: "header" },

        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },

        {
          qr: requestId,
          fit: 90,
          alignment: "right",
          margin: [0, 10],
        },

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
          margin: [0, 5],
        },

        { text: "Udyam Details", style: "subHeader" },
        {
          table: {
            widths: ["10%", "45%", "45%"],
            body: tableBody,
          },
          layout: "lightHorizontalLines",
          margin: [0, 5],
        },

        { text: "Full API Response", style: "subHeader", margin: [0, 15] },
        {
          text: JSON.stringify(result, null, 2),
          fontSize: 7,
        },

        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          alignment: "right",
          fontSize: 9,
          italics: true,
          margin: [0, 10],
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
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Fetch Udyam By Mobile"}</h4>
        </Card>

        {/* FORM */}
        <Card body className="mt-3">
          <Row>
            <Col md={6}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>

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
          </Row>

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
        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              {Array.isArray(udyamList) && (
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              )}
            </div>

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
