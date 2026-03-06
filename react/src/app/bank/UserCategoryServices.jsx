

import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  ListGroup,
  Spinner,
  Modal,
  Tabs,
  Tab,
  Table,
  ButtonGroup,
} from "react-bootstrap";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import swal from "sweetalert2";
import api from "./../services/api.js";


export default function UserCategoryServices() {
  const navigate = useNavigate();
  // const { mas_cat_id } = useParams();
    const { state } = useLocation();
    const { mas_cat_id, mas_ser_id, usr_ser_id, service_name, credits } =
      state || {};


  const [wallet, setWallet] = useState(0);
  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 View Toggle
  const [viewMode, setViewMode] = useState("list"); // list | card

  // 🔹 Sample Modal
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [sampleData, setSampleData] = useState(null);
  const [sampleServiceName, setSampleServiceName] = useState("");

  /* ================= UTIL ================= */

  const flattenLeafOnly = (obj, result = {}) => {
    if (!obj || typeof obj !== "object") return result;

    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        flattenLeafOnly(value, result);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  const renderValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";

    if (typeof value !== "object") return String(value);

    if (Array.isArray(value)) {
      if (value.length === 0) return "-";

      if (typeof value[0] !== "object") return value.join(", ");

      return (
        <Table bordered size="sm" className="mb-0">
          <thead>
            <tr>
              {Object.keys(value[0]).map((k) => (
                <th key={k}>{k.replaceAll("_", " ").toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((row, i) => (
              <tr key={i}>
                {Object.keys(row).map((k) => (
                  <td key={k}>{renderValue(row[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      );
    }

    return (
      <Table bordered size="sm" className="mb-0">
        <tbody>
          {Object.entries(value).map(([k, v]) => (
            <tr key={k}>
              <th style={{ width: "35%" }}>
                {k.replaceAll("_", " ").toUpperCase()}
              </th>
              <td>{renderValue(v)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  /* ================= FETCH ================= */

  useEffect(() => {
    if (mas_cat_id) {
      fetchWallet();
      fetchServices();
    }
  }, [mas_cat_id]);

  const fetchWallet = async () => {
    try {
      const res = await api.get("api/getLoggedInUserWallet");
      setWallet(Number(res.data?.data?.wallet_amount || 0));
    } catch (err) {
      console.error("Wallet fetch failed", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get(
        `api/getUserActiveServicesByCategory/${mas_cat_id}`
      );
      setCategory(res.data?.data?.category || null);
      setServices(res.data?.data?.services || []);
    } catch (err) {
      swal.fire("Error", "Failed to load services", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= HANDLERS ================= */

  const handleUseService = (service) => {
    if (!service.route_path) {
      swal.fire("Coming Soon", "This service is not yet configured", "info");
      return;
    }

    navigate(service.route_path, {
      state: {
        mas_cat_id,
        mas_ser_id : service.mas_ser_id,
        usr_ser_id: service.usr_ser_id ,
        service_name: service.service_name,
        credits: service.actual_credits,
      },
    });
  };

  const handleViewSample = (service) => {
    if (!service?.sample) {
      swal.fire("No Sample", "Sample not available", "info");
      return;
    }

    try {
      const parsed =
        typeof service.sample === "string"
          ? JSON.parse(service.sample)
          : service.sample;

      setSampleServiceName(service.service_name);
      setSampleData(parsed);
      setShowSampleModal(true);
    } catch {
      swal.fire("Invalid Sample", "Sample format invalid", "error");
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <Row>
        <Col md={12}>
          {/* HEADER */}
          <Card body className="mb-4">
            <Button variant="primary" onClick={() => navigate(-1)}>
              ← Back
            </Button>

            <h4 className="mt-3">{category?.category_name || "Services"}</h4>
            <p className="text-muted">Choose a service to continue</p>
          </Card>

          {/* WALLET */}
          {/* <Card body className="mb-4 text-center">
            <h6 className="text-muted">💰 Wallet Balance</h6>
            <h2 className="text-success">{wallet} Credits</h2>
          </Card> */}

          {/* VIEW TOGGLE */}
          <div className="d-flex justify-content-end mb-3">
            <ButtonGroup>
              <Button
                variant={viewMode === "list" ? "primary" : "outline-success"}
                onClick={() => setViewMode("list")}
              >
                List View
              </Button>
              <Button
                variant={viewMode === "card" ? "primary" : "outline-success"}
                onClick={() => setViewMode("card")}
              >
                Card View
              </Button>
            </ButtonGroup>
          </div>

          {/* SERVICES */}
          {viewMode === "list" ? (
            <Card body>
              <ListGroup variant="flush">
                {services.map((service) => {
                  const hasCredits = wallet >= service.actual_credits;
                  return (
                    <ListGroup.Item
                      key={service.usr_ser_id || service.mas_ser_id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6>{service.service_name}</h6>
                        <small className="text-muted">
                          Credits Required:{" "}
                          <b>{service.actual_credits}</b>
                        </small>
                      </div>

                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-success"
                          onClick={() => handleViewSample(service)}
                        >
                          View Sample
                        </Button>
                        <Button
                          variant={hasCredits ? "success" : "secondary"}
                          disabled={!hasCredits}
                          onClick={() => handleUseService(service)}
                        >
                          {hasCredits ? "Use Service" : "Insufficient Credits"}
                        </Button>
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card>
          ) : (
            <Row>
              {services.map((service) => {
                const hasCredits = wallet >= service.actual_credits;
                return (
                  <Col md={4} lg={3} className="mb-3" key={service.mas_ser_id}>
                <Card
  className="h-100 service-card border-0"
  style={{
    background: "linear-gradient(180deg, #f8fafc, #ffffff)",
  }}
>
  <Card.Body className="d-flex flex-column p-3">
    {/* SERVICE NAME */}
    <h6 className="fw-semibold mb-1 text-dark text-truncate">
      {service.service_name}
    </h6>

    {/* CREDITS */}
    <span className="small text-muted mb-3">
      {service.actual_credits} credits required
    </span>

    {/* ACTIONS */}
    <div className="mt-auto d-flex justify-content-between align-items-center">
      <Button
        variant="link"
        size="sm"
        className="p-0 text-primary"
        onClick={() => handleViewSample(service)}
      >
        View sample
      </Button>

      <Button
        size="sm"
        variant={hasCredits ? "success" : "secondary"}
        disabled={!hasCredits}
        onClick={() => handleUseService(service)}
      >
        Use
      </Button>
    </div>
  </Card.Body>
</Card>

                  </Col>
                );
              })}
            </Row>
          )}
        </Col>
      </Row>

      {/* SAMPLE MODAL */}
      <Modal
        show={showSampleModal}
        onHide={() => setShowSampleModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{sampleServiceName} – Sample</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Tabs defaultActiveKey="tabular">
            <Tab eventKey="tabular" title="Tabular">
              <Table bordered className="mt-3">
                <tbody>
                  {sampleData &&
                    Object.entries(sampleData).map(([k, v]) => (
                      <tr key={k}>
                        <th style={{ width: "30%" }}>
                          {k.replaceAll("_", " ").toUpperCase()}
                        </th>
                        <td>{renderValue(v)}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </Tab>

            {/* <Tab eventKey="json" title="JSON">
              <pre className="bg-light p-3 mt-3">
                {JSON.stringify(sampleData, null, 2)}
              </pre>
            </Tab> */}
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSampleModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
