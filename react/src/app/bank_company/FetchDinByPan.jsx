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

export default function FetchDinByPan() {
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
  const [pan, setPan] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INITIAL LOAD ================= */
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

  const normalize = (data) => {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  };

  /* ================= BADGE ================= */
  const getBadgeVariant = (code) => {
    if (code === "1006") return "success";
    if (code === "1007") return "warning";
    if (code === "1008") return "danger";
    return "secondary";
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (loading) return;

    /* ===== VALIDATION ===== */
    if (!pan || !fileNo || !consent) {
      swal.fire({
        title: "Validation Error",
        html: `
          <ul style="text-align:left">
            ${!pan ? "<li>PAN Number is required</li>" : ""}
            ${!fileNo ? "<li>File Number is required</li>" : ""}
            ${!consent ? "<li>Consent is required</li>" : ""}
          </ul>
        `,
        icon: "warning",
      });
      return;
    }

    /* ===== WALLET CHECK ===== */
    if (wallet < credits) {
      swal.fire(
        "Insufficient Credits",
        "Not enough wallet balance",
        "error"
      );
      return;
    }

    /* ===== CONFIRM ===== */
    const confirm = await swal.fire({
      title: "Confirm DIN by PAN Fetch",
      html: `
        <p><b>PAN:</b> ${pan}</p>
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
      const checkRes = await api.post("api/checkDinByPanCache", {
        mas_ser_id,
        mas_cat_id,
        pan,
      });

      let useCache = false;

      if (checkRes.data.hasCache) {
        const fetchedDate = new Date(
          checkRes.data.lastFetchedAt
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const cacheConfirm = await swal.fire({
          title: "Previous Data Found",
          html: `Last fetched on <b>${fetchedDate}</b>`,
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
      const execRes = await api.post("api/executeDinByPan", {
        usr_ser_id,
        mas_ser_id,
        mas_cat_id,
        pan,
        file_no: fileNo,
        use_cache: useCache,
      });

      const apiData = normalize(execRes.data?.data);
      const code = apiData?.data?.code;

      setResult(apiData);
      fetchWallet();

      if (code === "1006") {
        swal.fire("Success", apiData?.data?.message, "success");
      } else {
        swal.fire("Info", apiData?.data?.message, "info");
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

    const safe = (v) =>
      v === undefined || v === null || v === "" ? "-" : v;

    const dinDetails = result?.data?.din_details || [];

    const doc = {
      content: [
        { text: "DIN by PAN Report", style: "header" },
        { text: `File Number: ${fileNo}` },
        { text: `Transaction ID: ${safe(result.transaction_id)}` },
        { text: `Request ID: ${safe(result.request_id)}` },
        {
          qr: safe(result.transaction_id),
          fit: 80,
          alignment: "right",
          margin: [0, 10],
        },
        {
          text: "DIN DETAILS",
          style: "section",
          margin: [0, 15, 0, 6],
        },
        {
          table: {
            widths: ["35%", "65%"],
            body: Object.entries(dinDetails).map(([key, val]) => [
              { text: key.toUpperCase(), bold: true },
              safe(val),
            ]),
          },
          layout: "lightHorizontalLines",
        },
        {
          text: `Generated On: ${new Date().toLocaleString()}`,
          margin: [0, 20, 0, 0],
          fontSize: 9,
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        section: { fontSize: 14, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`DIN_BY_PAN_${fileNo}.pdf`);
  };

  const code = result?.data?.code;

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-4">
          <Row>
            <Col md={6}>
              <Form.Label>
                File Number <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) =>
                  setFileNo(e.target.value.toUpperCase())
                }
              />
            </Col>

            <Col md={6}>
              <Form.Label>
                PAN Number <Required />
              </Form.Label>
              <Form.Control
                value={pan}
                onChange={(e) =>
                  setPan(e.target.value.toUpperCase())
                }
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
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
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Fetch DIN by PAN"}
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
              <Button onClick={exportPdf}>Export PDF</Button>
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