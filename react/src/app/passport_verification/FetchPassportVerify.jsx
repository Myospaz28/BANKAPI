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

/* ===== PDF ===== */
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

export default function FetchPassportVerify() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState("");

  const [form, setForm] = useState({
    file_number: "",
    passport_number: "",
    surname: "",
    given_name: "",
    date_of_birth: "",
  });

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value.toUpperCase() });
  };

  const handleVerify = async () => {
    const { file_number, passport_number, surname, given_name, date_of_birth } =
      form;

    if (
      !fileNo ||
      !file_number ||
      !passport_number ||
      !surname ||
      !given_name ||
      !date_of_birth ||
      !consent
    ) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm Passport Verification",
      html: `<p><b>Credits:</b> ${credits}</p><p><b>File No:</b> ${fileNo}</p>`,
      icon: "question",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post("api/fetchPassportVerifyController", {
        usr_ser_id,
        file_no: fileNo,
        ...form,
        consent: "Y",
      });

      setResult(res.data?.data);

      swal.fire(
        res.data?.data?.data?.code === "1004"
          ? "Valid Passport"
          : "Verification Failed",
        res.data?.data?.data?.message || "",
        res.data?.data?.data?.code === "1004" ? "success" : "error",
      );
    } catch {
      swal.fire("Error", "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */
  const exportPdf = () => {
    const data = result?.data;
    if (!data) return;

    const doc = {
      content: [
        { text: "Passport Verification Report", style: "header" },
        {
          table: {
            widths: ["35%", "65%"],
            body: [
              ["Service", service_name],
              ["File No", fileNo],
              ["Passport No", form.passport_number],
              ["Name", `${form.given_name} ${form.surname}`],
              ["DOB", form.date_of_birth],
              ["Status", data.message],
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`Passport_Verify_${fileNo}.pdf`);
  };

  const data = result?.data;

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

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body>
          <Row>
            <Col md={4}>
              <Form.Label>
                File No <Required />
              </Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Passport File Number <Required />
              </Form.Label>
              <Form.Control
                name="file_number"
                value={form.file_number}
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Passport Number <Required />
              </Form.Label>
              <Form.Control
                name="passport_number"
                value={form.passport_number}
                onChange={handleChange}
              />
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={4}>
              <Form.Label>
                Surname <Required />
              </Form.Label>
              <Form.Control
                name="surname"
                value={form.surname}
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Given Name <Required />
              </Form.Label>
              <Form.Control
                name="given_name"
                value={form.given_name}
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label>
                Date of Birth <Required />
              </Form.Label>
              <Form.Control
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label="I give consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleVerify} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Verify Passport"}
          </Button>
        </Card>

        {data && (
          <Card body className="mt-3">
            <div className="d-flex justify-content-between">
              <h5>
                Result{" "}
                <Badge bg={data.code === "1004" ? "success" : "danger"}>
                  {data.message}
                </Badge>
              </h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-2">
              <tbody>
                <tr>
                  <th>Status Code</th>
                  <td>{data.code}</td>
                </tr>
                <tr>
                  <th>Message</th>
                  <td>{data.message}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
