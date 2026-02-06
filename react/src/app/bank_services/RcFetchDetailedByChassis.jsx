import React, { useEffect, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import swal from "sweetalert2";
import api from "../services/api";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: "red" }}> *</span>;

/* ================= SCHEMA ================= */
const RC_SECTIONS = [
  {
    title: "Owner Details",
    fields: {
      rc_owner_name: "Owner Name",
      rc_owner_serial_number: "Owner Serial No",
      owner_category_description: "Owner Category",
      owner_code_description: "Owner Code",
      present_address: "Present Address",
      permanent_address: "Permanent Address",
    },
  },
  {
    title: "Registration Details",
    fields: {
      rc_registration_number: "Registration Number",
      rc_registration_date: "Registration Date",
      rc_registration_upto: "Registration Valid Upto",
      rc_purchase_date: "Purchase Date",
      registration_at: "Registered At",
      rc_status: "RC Status",
      rc_status_as_on: "RC Status As On",
    },
  },
  {
    title: "Vehicle Details",
    fields: {
      maker_description: "Manufacturer",
      maker_model: "Model",
      body_type_description: "Body Type",
      vehicle_category_description: "Vehicle Category",
      vehicle_class_description: "Vehicle Class",
      fuel_description: "Fuel Type",
      colour: "Color",
      chassis_number: "Chassis Number",
      engine_number: "Engine Number",
    },
  },
  {
    title: "Technical Specifications",
    fields: {
      unladen_weight: "Unladen Weight",
      gross_weight: "Gross Weight",
      numberOf_cylinders: "Cylinders",
      cubic_capacity: "Cubic Capacity",
      horse_power: "Horse Power",
      wheel_base: "Wheel Base",
      number_of_axle: "No. of Axles",
      seat_capacity: "Seat Capacity",
      sleeper_capacity: "Sleeper Capacity",
      standing_capacity: "Standing Capacity",
    },
  },
  {
    title: "Insurance & Tax",
    fields: {
      insurance_company: "Insurance Company",
      insurance_policy_number: "Policy Number",
      insurance_upto: "Insurance Valid Upto",
      tax_upto: "Tax Paid Upto",
      tax_mode: "Tax Mode",
      passenger_tax: "Passenger Tax",
      goods_tax: "Goods Tax",
    },
  },
  {
    title: "Permit Details",
    fields: {
      "temp_permit_data.permit_type": "Permit Type",
      "temp_permit_data.permit_number": "Permit Number",
      "temp_permit_data.permit_valid_from": "Permit Valid From",
      "temp_permit_data.permit_valid_upto": "Permit Valid Upto",
      "temp_permit_data.permit_issue_date": "Permit Issue Date",
    },
  },
  {
    title: "NOC & Finance",
    fields: {
      financer: "Financer",
      noc_details: "NOC Details",
      noc_date: "NOC Date",
    },
  },
];

const getValue = (obj, path) =>
  path.split(".").reduce((acc, k) => acc?.[k], obj) ?? "-";

export default function RcFetchDetailedByChassis() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [chassisNumber, setChassisNumber] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= GUARD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  /* ================= WALLET ================= */
  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get("api/getLoggedInUserWallet");
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!chassisNumber || !fileNo || !consent) {
      swal.fire("Validation Error", "All fields are required", "warning");
      return;
    }

    if (wallet < credits) {
      swal.fire("Insufficient Credits", "Not enough credits", "error");
      return;
    }

    const confirm = await swal.fire({
      title: "Confirm RC Detailed Fetch",
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
      const res = await api.post("api/fetchRcDetailedByChassisController", {
        usr_ser_id,
        chassis_number: chassisNumber,
        file_no: fileNo,
        consent: "Y",
      });

      const code = res.data?.data?.data?.code;

      if (code !== "1007") {
        swal.fire("Failed", res.data?.data?.data?.message, "warning");
        return;
      }

      setResult(res.data.data);
      swal.fire("Success", "RC Details fetched successfully", "success");
      fetchWallet();
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
    const vehicle = result?.data?.vehicle_details?.[0];
    if (!vehicle) return;

    const sectionTable = (section) => ({
      table: {
        widths: ["35%", "65%"],
        body: [
          [{ text: section.title, colSpan: 2, bold: true }, {}],
          ...Object.entries(section.fields).map(([k, v]) => [
            { text: v, bold: true },
            getValue(vehicle, k),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      marginBottom: 10,
    });

    pdfMake.createPdf({
      content: [
        { text: "RC Detailed Report (By Chassis)", fontSize: 18, bold: true },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },
        ...RC_SECTIONS.map(sectionTable),
        vehicle.owner_history?.length && {
          text: "Owner History",
          bold: true,
          marginTop: 10,
        },
        vehicle.owner_history?.length && {
          table: {
            widths: ["*", "*", "*", "*"],
            body: [
              ["Owner", "Serial", "RTO", "State"],
              ...vehicle.owner_history.map((o) => [
                o.owner_name,
                o.owner_serial_number,
                o.off_name,
                o.state_code,
              ]),
            ],
          },
        },
      ],
    }).download(`RC_DETAILED_${fileNo}.pdf`);
  };

  const vehicle = result?.data?.vehicle_details?.[0];

  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="text-center mt-2">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mt-3">
          <Row>
            <Col md={6}>
              <Form.Label>Chassis Number <Required /></Form.Label>
              <Form.Control
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
              />
            </Col>
            <Col md={6}>
              <Form.Label>File Number <Required /></Form.Label>
              <Form.Control
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            type="checkbox"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" onClick={handleFetch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Fetch RC Detailed"}
          </Button>
        </Card>

        {vehicle && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>RC Detailed Information</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            {RC_SECTIONS.map((section) => (
              <div key={section.title} className="mt-4">
                <h6 className="fw-bold">{section.title}</h6>
                <Table bordered size="sm">
                  <tbody>
                    {Object.entries(section.fields).map(([k, v]) => (
                      <tr key={k}>
                        <th>{v}</th>
                        <td>{getValue(vehicle, k)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ))}

            {vehicle.owner_history?.length > 0 && (
              <>
                <h6 className="fw-bold mt-4">Owner History</h6>
                <Table bordered size="sm">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Serial</th>
                      <th>RTO</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicle.owner_history.map((o, i) => (
                      <tr key={i}>
                        <td>{o.owner_name}</td>
                        <td>{o.owner_serial_number}</td>
                        <td>{o.off_name}</td>
                        <td>{o.state_code}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card>
        )}
      </Col>
    </Row>
  );
}