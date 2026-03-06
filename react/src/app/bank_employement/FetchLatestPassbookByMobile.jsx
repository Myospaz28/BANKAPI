import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "../components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

export default function FetchLatestPassbookByMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const Required = () => <span style={{ color: "red" }}>*</span>;

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const handleFetch = async () => {
    if (!fileNo || !mobile || mobile.length !== 10 || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Latest Passbook Fetch",
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
      const checkRes = await api.post("api/checkLatestPassbookCache", {
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

      const res = await api.post("api/executeLatestPassbook", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        mobile_number: mobile,
        use_cache: useCache,
      });

      setResult(res.data?.data);
      fetchWallet();
      swal.fire("Completed", "Request processed", "success");
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF EXPORT ================= */
  const exportPdf = () => {
    if (!result) return;

    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";

    const passbook = result?.data?.passbook_data || {};
    const employers = passbook?.employers || [];

    const content = [
      { text: "Latest EPFO Passbook Report", style: "header" },
      { text: `Request ID: ${requestId}` },
      { text: `Transaction ID: ${transactionId}` },
      {
        qr: requestId !== "-" ? requestId : "LATEST_PASSBOOK",
        fit: 80,
        alignment: "right",
        margin: [0, 10],
      },

      { text: "Personal Details", style: "sub" },
      {
        table: {
          widths: ["*", "*"],
          body: [
            ["UAN", passbook.uan || "-"],
            ["Name", passbook.name || "-"],
            ["DOB", passbook.date_of_birth || "-"],
            ["Mobile", passbook.mobile || "-"],
            ["Gender", passbook.gender || "-"],
            ["Guardian", passbook.guardian_name || "-"],
          ],
        },
        margin: [0, 5],
      },
    ];

    employers.forEach((emp, index) => {
      content.push(
        { text: `Employer ${index + 1}`, style: "sub", margin: [0, 10] },
        {
          table: {
            widths: ["*", "*"],
            body: [
              ["Establishment", emp.establishment_name || "-"],
              ["Member ID", emp.member_id || "-"],
              ["Org Type", emp.organization_type || "-"],
              ["Employer Share", emp.total_employer_share || "-"],
              ["Employee Share", emp.total_employee_share || "-"],
              ["Pension Share", emp.total_pension_share || "-"],
              ["Date of Joining", emp.date_of_joining || "-"],
              ["Service Period", emp.service_period || "-"],
            ],
          },
        },
        { text: "Passbook Entries", style: "sub", margin: [0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*", "*", "*"],
            body: [
              [
                { text: "Month", bold: true },
                { text: "Year", bold: true },
                { text: "Status", bold: true },
                { text: "Employee", bold: true },
                { text: "Employer", bold: true },
                { text: "Approval Date", bold: true },
              ],
              ...(emp.passbook_entries || []).map((entry) => [
                entry.month,
                entry.year,
                entry.status,
                entry.employee_share,
                entry.employer_share,
                entry.date_of_approval,
              ]),
            ],
          },
        },
      );
    });



    const doc = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content,
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`LatestPassbook_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  const badgeVariant =
    code === "1022" ? "success" : code === "1023" ? "warning" : "secondary";

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
            {loading ? <Spinner size="sm" /> : "Fetch Latest Passbook"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              {code === "1022" && (
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
