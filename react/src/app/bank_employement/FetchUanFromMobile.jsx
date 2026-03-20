import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JsonTableViewer from "../components/JsonTableViewer";

pdfMake.vfs = pdfFonts.vfs;

export default function FetchUanFromMobile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
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
    if (!fileNo || !mobileNumber || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      swal.fire(
        "Validation Error",
        "Please enter a valid 10-digit mobile number",
        "warning",
      );
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough balance", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm UAN Fetch",
      html: `
        <p><b>Mobile Number:</b> ${mobileNumber}</p>
        <p><b>File Number:</b> ${fileNo}</p>
       
      `,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const checkRes = await api.post("api/checkUanMobileCache", {
        mas_ser_id,
        mas_cat_id,
        mobile_number: mobileNumber,
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

      const res = await api.post("api/executeUanMobile", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        mobile_number: mobileNumber,
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

  /* ================= EXPORT PDF ================= */
  const exportPdf = () => {
    if (!result) {
      swal.fire("No Data", "Nothing to export", "warning");
      return;
    }

    const requestId = result?.request_id || "-";
    const transactionId = result?.transaction_id || "-";
    const uanList = result?.data?.uan_list || [];
    const code = result?.data?.code;
    const message = result?.data?.message || "-";

    const tableRows = uanList.map((uan, index) => [
      { text: `${index + 1}`, bold: true, alignment: "center" },
      uan,
    ]);

    const doc = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: "UAN Fetch from Mobile Report", style: "header" },
        { text: `Request ID: ${requestId}` },
        { text: `Transaction ID: ${transactionId}` },
        { text: `Mobile Number: ${mobileNumber}` },
        { text: `Status: ${code} — ${message}` },
        {
          qr: requestId !== "-" ? requestId : "UAN_MOBILE",
          fit: 80,
          alignment: "right",
          margin: [0, 10],
        },
        { text: "UAN List", style: "sub", margin: [0, 10, 0, 4] },
        uanList.length > 0
          ? {
              table: {
                widths: ["10%", "90%"],
                body: [
                  [
                    { text: "#", bold: true },
                    { text: "UAN", bold: true },
                  ],
                  ...tableRows,
                ],
              },
              layout: "lightHorizontalLines",
              margin: [0, 0, 0, 15],
            }
          : { text: "No UAN found for this mobile number.", italics: true },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        sub: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`UAN_Mobile_${mobileNumber}.pdf`);
  };

  const code = result?.data?.code;
  const badgeVariant =
    code === "1016" ? "success" : code === "1007" ? "warning" : "secondary";

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
                placeholder="Enter file number"
              />
            </Col>

            <Col md={6}>
              <Form.Label>
                Mobile Number <Required />
              </Form.Label>
              <Form.Control
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent to fetch UAN details linked to this mobile number"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch UAN from Mobile"}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              {code === "1016" && (
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              )}
            </div>

            {/* UAN List quick view */}
            {code === "1016" && result?.data?.uan_list?.length > 0 && (
              <div className="mt-3">
                <h6>UAN List</h6>
                <ul className="list-group">
                  {result.data.uan_list.map((uan, i) => (
                    <li key={i} className="list-group-item">
                      <b>{i + 1}.</b> {uan}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {code === "1007" && (
              <div className="mt-3 text-warning">
                <p>
                  {result?.data?.message ||
                    "No UAN found for this mobile number."}
                </p>
              </div>
            )}

            <h6 className="mt-3">Full API Response</h6>
            <JsonTableViewer data={result} />
          </Card>
        )}
      </Col>
    </Row>
  );
}
