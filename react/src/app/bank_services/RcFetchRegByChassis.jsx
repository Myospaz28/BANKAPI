
import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Badge,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";
import JsonTableViewer from "app/components/JsonTableViewer";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

export default function RcFetchRegByChassis() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    usr_ser_id,
    mas_ser_id,
    mas_cat_id,
    service_name,
    credits,
  } = state || {};

  const [wallet, setWallet] = useState(0);
  const [chassisNo, setChassisNo] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch {
      setWallet(0);
    }
  };

  const getBadgeVariant = (code) => {
    if (code === "1007") return "success";
    if (code === "1008") return "danger";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    if (!chassisNo || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!chassisNo ? "<li>Chassis Number is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "Not enough wallet balance",
        "error"
      );
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm RC Fetch By Chassis",
      html: `
        <p><b>Chassis No:</b> ${chassisNo}</p>
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
      /* ================= CACHE CHECK ================= */
      const checkRes = await api.post(
        "api/checkVehicleRegByChassisCache",
        {
          mas_ser_id,
          mas_cat_id,
          chassis_no: chassisNo,
        }
      );

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on: <b>${fetchedDate}</b>`,
          icon: "question",
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: "Use Old Data",
          denyButtonText: "Fetch Fresh",
          cancelButtonText: "Cancel",
            customClass: {
            confirmButton: "btn-use-old",
            denyButton: "btn-fetch-fresh",
          },
            allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (cacheConfirm.isConfirmed) useCache = true;
        else if (cacheConfirm.isDenied) useCache = false;
        else {
          setLoading(false);
          return;
        }
      }

      /* ================= EXECUTE ================= */
      const executeRes = await api.post(
        "api/executeVehicleRegByChassis",
        {
          usr_ser_id,
          mas_ser_id,
          mas_cat_id,
          file_no: fileNo,
          chassis_no: chassisNo,
          use_cache: useCache,
        }
      );

      const apiData = executeRes.data?.data;
      const code = apiData?.data?.code;
      setResult(apiData);
      fetchWallet();

      if (code === "1007") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else if (code === "1008") {
        swal.fire("Not Found", apiData?.data?.message, "warning");
      } else {
        swal.fire(
          "Completed",
          apiData?.data?.message || "Processed",
          "info"
        );
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
  if (!result) return;

  const vehicles = result?.data?.vehicle_details;
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    swal.fire("No Data", "Nothing to export", "warning");
    return;
  }

  const transactionId = result?.transaction_id || "-";
  const requestId = result?.request_id || "-";

  const rows = vehicles.map((v, i) => [
    i + 1,
    v.rc_registration_number || "-",
    v.chassis_number || "-",
  ]);

  const doc = {
    content: [
      { text: "Vehicle Registration Lookup by Chassis", style: "header" },

      { text: `File Number: ${fileNo}` },
      { text: `Transaction ID: ${transactionId}` },
      { text: `Request ID: ${requestId}` },

      {
        qr: transactionId,
        fit: 80,
        alignment: "right",
        margin: [0, 10],
      },

      { text: "Vehicle Details", style: "section", margin: [0, 12, 0, 6] },

      {
        table: {
          headerRows: 1,
          widths: ["10%", "45%", "45%"],
          body: [
            [
              { text: "#", bold: true },
              { text: "Registration Number", bold: true },
              { text: "Chassis Number", bold: true },
            ],
            ...rows,
          ],
        },
        layout: "lightHorizontalLines",
      },

      {
        text: `Generated On: ${new Date().toLocaleString()}`,
        margin: [0, 15, 0, 0],
        fontSize: 9,
        italics: true,
      },
    ],

    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      section: { fontSize: 14, bold: true },
    },

    defaultStyle: {
      fontSize: 10,
    },
  };

  pdfMake
    .createPdf(doc)
    .download(`RC_BY_CHASSIS_${fileNo}.pdf`);
};


  const code = result?.data?.code;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="mb-4">
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
                Chassis Number <Required />
              </Form.Label>
              <Form.Control
                value={chassisNo}
                onChange={(e) =>
                  setChassisNo(e.target.value.toUpperCase())
                }
              />
            </Col>

         
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            className="mt-3"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Fetch RC"}
          </Button>
        </Card>

        {result && (
          <Card body>
            <div className="d-flex justify-content-between">
              <h5>
                Result{" "}
                <Badge bg={getBadgeVariant(code)}>
                  {code}
                </Badge>
              </h5>
              <Button onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <JsonTableViewer data={result} />
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
