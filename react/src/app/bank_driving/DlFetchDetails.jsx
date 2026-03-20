

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
  Image,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "../components/JsonTableViewer";

/* ================= PDF ================= */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchDrivingLicense() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits, mas_ser_id, mas_cat_id } =
    state || {};

  const [wallet, setWallet] = useState(0);
  const [dlNumber, setDlNumber] = useState("");
  const [dob, setDob] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [source, setSource] = useState(2);
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
    if (!dlNumber || !dob || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Driving License Fetch",
      html: `
        
        <p><b>Driving License:</b> ${dlNumber}</p>
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
      /* ===== CACHE CHECK ===== */
      const checkRes = await api.post("api/checkDrivingLicenseCache", {
        mas_ser_id,
        mas_cat_id,
        driving_license_number: dlNumber,
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

      const res = await api.post("api/executeDrivingLicense", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        file_no: fileNo,
        driving_license_number: dlNumber,
        date_of_birth: dob,
        source,
        use_cache: useCache,
      });
console.log("api response " , res.data?.data)
      setResult(res.data?.data);

      if (res.data?.wallet?.closing_balance !== undefined) {
        setWallet(res.data.wallet.closing_balance);
      }
    } catch (err) {
      swal.fire(
        "Error",
        err?.response?.data?.message || "Server error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */
  const exportPdf = () => {
    const d = result?.data?.driving_license_data;
    if (!d) return;

    const safe = (v) => (v && v !== "" ? v : "-");

    const vehicleClasses =
      d.vehicle_class_details
        ?.map((v) => `${v.category} (${v.authority})`)
        .join(", ") || "-";

    const docDefinition = {
      pageSize: "A4",
      content: [
        { text: "Driving License Detailed Report", style: "header" },

        { text: `Request ID: ${result?.request_id || "-"}` },
        { text: `Transaction ID: ${result?.transaction_id || "-"}` },

        {
          qr: result?.request_id || fileNo,
          fit: 90,
          alignment: "right",
          margin: [0, 10],
        },

        {
          table: {
            widths: ["35%", "65%"],
            body: [
              ["DL Number", safe(d.document_id)],
              ["Name", safe(d.name)],
              ["Date of Birth", safe(d.date_of_birth)],
              ["Father / Guardian", safe(d.dependent_name)],
              ["Address", safe(d.address)],
              ["Pincode", safe(d.pincode)],
              ["Blood Group", safe(d.blood_group)],
              ["RTO", safe(d.rto_details?.authority)],
              ["State", safe(d.rto_details?.state)],
              [
                "Non-Transport Validity",
                `${safe(
                  d.validity?.non_transport?.issue_date,
                )} → ${safe(d.validity?.non_transport?.expiry_date)}`,
              ],
              [
                "Transport Validity",
                `${safe(
                  d.validity?.transport?.issue_date,
                )} → ${safe(d.validity?.transport?.expiry_date)}`,
              ],
              ["Vehicle Classes", vehicleClasses],
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
    };

    pdfMake.createPdf(docDefinition).download(`Driving_License_${fileNo}.pdf`);
  };

  const dl = result?.data?.driving_license_data;
  const code = result?.data?.code;
  const badgeVariant = code === "1000" ? "success" : "secondary";

  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name || "Fetch Driving License"}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
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
                Driving License Number <Required />
              </Form.Label>
              <Form.Control
                value={dlNumber}
                onChange={(e) => setDlNumber(e.target.value.toUpperCase())}
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={6}>
              <Form.Label>
                Date of Birth <Required />
              </Form.Label>
              <Form.Control
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Source</Form.Label>
              <Form.Select
                value={source}
                onChange={(e) => setSource(Number(e.target.value))}
              >
                <option value={2}>Secondary (Masked)</option>
                <option value={1}>Primary (Unmasked)</option>
              </Form.Select>
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch Driving License"}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                Result <Badge bg={badgeVariant}>{code}</Badge>
              </h5>

              {dl && (
                <Button variant="outline-primary" onClick={exportPdf}>
                  Export PDF
                </Button>
              )}
            </div>

            <h6 className="mt-4">Full API Response</h6>
            <JsonTableViewer data={result} />

            {dl && (
              <>
                {dl.photo_base64 && (
                  <div className="text-center mt-3">
                    <Image
                      src={`data:image/jpeg;base64,${dl.photo_base64}`}
                      thumbnail
                      style={{ maxWidth: 200 }}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </Col>
    </Row>
  );
}
