import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  ListGroup,
  Form,
  Modal,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import swal from "sweetalert2";

import api from "./../services/api.js";

export default function UserServicesPage() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const [assignedCategories, setAssignedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  /* ===== Edit Credit Modal ===== */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editCredits, setEditCredits] = useState(0);
  const [userDetails, setUserDetails] = useState(null);


  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (userId) {
      fetchUserDetails()
      fetchAssignedServices();
      fetchAvailableServices();
    }
  }, [userId]);
const fetchUserDetails = async () => {
  try {
    const res = await api.get(`api/getUserById/${userId}`);
    setUserDetails(res.data.data);
  } catch (err) {
    console.error("❌ Failed to load user details", err);
  }
};

  const fetchAssignedServices = async () => {
    try {
      const res = await api.get(
        `api/getUserServicesByUserId/${userId}`
      );
      setAssignedCategories(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load assigned services", err);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const res = await api.get(
        `api/getAvailableMasterServicesByCategoryForUser/${userId}`
      );
      setAvailableCategories(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load available services", err);
    }
  };

  /* ================= UPDATE CREDIT ================= */

const saveCredits = async (usr_ser_id, credits) => {
  await api.put("api/updateUserServiceCredits", {
    usr_ser_id,
    actual_credits: credits,
  });
};


  /* ================= REMOVE SERVICE ================= */

  const handleRemoveService = async (usr_ser_id) => {
    const confirm = await swal.fire({
      title: "Remove Service?",
      text: "This service will be deactivated",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Remove",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.put(`api/deactivateUserService/${usr_ser_id}`);
      swal.fire("Removed", "Service removed successfully", "success");
      fetchAssignedServices();
      fetchAvailableServices();
    } catch {
      swal.fire("Error", "Failed to remove service", "error");
    }
  };

  /* ================= ADD SERVICES ================= */

  const handleAddServices = async () => {
    const list = selectedServices
      .map(
        (s) =>
          `<li>Service ID ${s.mas_ser_id} → ${s.actual_credits} credits</li>`
      )
      .join("");

    const confirm = await swal.fire({
      title: "Confirm Add Services",
      html: `<ul style="text-align:left">${list}</ul>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Add Services",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.post("api/addUserServicesBulk", {
        user_id: userId,
        services: selectedServices,
      });

      swal.fire("Success", "Services added successfully", "success");
      setSelectedServices([]);
      fetchAssignedServices();
      fetchAvailableServices();
    } catch {
      swal.fire("Error", "Failed to add services", "error");
    }
  };

  /* ================= UI ================= */

return (
  <Row>
    <Col md={12}>
      <Card body>
        
        {/* Header */}
        <div className="d-flex align-items-center mb-3">
          <Button
            variant="primary"
            className="me-3"
            onClick={() => navigate(-1)}
          >
            ← Back
          </Button>
          <Card.Title className="m-0">User Services</Card.Title>
          
        </div>
   {userDetails && (
  <div
    className="mt-4 mb-4 p-4 rounded-4 shadow-sm"
    style={{
      background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
      border: "1px solid #e9ecef",
    }}
  >
    <Row className="align-items-center">

      {/* Avatar + Name Section */}
      <Col xs={12}>
        <div className="d-flex align-items-center gap-3">

          {/* Avatar Circle */}
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: "60px",
              height: "60px",
              background: "#0d6efd",
              color: "#fff",
              fontSize: "22px",
              fontWeight: "bold",
            }}
          >
            {userDetails.name?.charAt(0).toUpperCase()}
          </div>

          {/* Name + Username */}
          <div>
            <h5 className="mb-1 fw-bold">
              {userDetails.name}
            </h5>

            <div className="text-muted">
              @{userDetails.username}
            </div>
          </div>

        </div>
      </Col>

    </Row>
  </div>
)}


        <p className="text-muted">
          Manage verification services and credits for this user
        </p>

        {/* ================= NEW USER DETAILS DESIGN ================= */}
  

        {/* ================= SERVICES SECTION ================= */}
        <Row>
          {/* ================= ASSIGNED SERVICES ================= */}
          <Col md={6}>
            <Card body className="h-100">
              <Card.Title>Assigned Services</Card.Title>

              {assignedCategories.length === 0 ? (
                <p className="text-muted text-center">
                  No services assigned
                </p>
              ) : (
                assignedCategories.map((cat) => (
                  <div key={cat.mas_cat_id} className="mb-3">
                    <h6 className="text-primary">
                      {cat.category_name}
                    </h6>

                    <ListGroup>
                      {cat.services.map((service) => (
                        <ListGroup.Item
                          key={service.usr_ser_id}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <b>{service.service_name}</b>
                          </div>

                          <div className="d-flex align-items-center gap-3">
                            <span className="fw-bold">
                              {service.actual_credits}
                            </span>

                            <span
                              className="cursor-pointer text-primary"
                              onClick={() => {
                                setEditingService(service);
                                setEditCredits(
                                  service.actual_credits
                                );
                                setShowEditModal(true);
                              }}
                            >
                              <i className="nav-icon i-Pen-2 font-weight-bold" />
                            </span>

                            <span
                              className="cursor-pointer text-danger"
                              onClick={() =>
                                handleRemoveService(
                                  service.usr_ser_id
                                )
                              }
                            >
                              <i className="nav-icon i-Close-Window font-weight-bold" />
                            </span>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                ))
              )}
            </Card>
          </Col>

          {/* ================= ADD NEW SERVICES ================= */}
          <Col md={6}>
            <Card body className="h-100">
              <Card.Title>Add New Services</Card.Title>

              {availableCategories.length === 0 ? (
                <p className="text-muted">
                  No services available
                </p>
              ) : (
                availableCategories.map((cat) => (
                  <div key={cat.mas_cat_id} className="mb-3">
                    <h6 className="text-primary">
                      {cat.category_name}
                    </h6>

                    {cat.services.map((service) => {
                      const selected = selectedServices.find(
                        (s) =>
                          s.mas_ser_id === service.mas_ser_id
                      );

                      return (
                        <div
                          key={service.mas_ser_id}
                          className="d-flex align-items-center justify-content-between mb-2 border rounded p-2"
                        >
                          <Form.Check
                            type="checkbox"
                            label={service.service_name}
                            checked={!!selected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServices([
                                  ...selectedServices,
                                  {
                                    mas_ser_id:
                                      service.mas_ser_id,
                                    actual_credits:
                                      service.default_credits,
                                  },
                                ]);
                              } else {
                                setSelectedServices(
                                  selectedServices.filter(
                                    (s) =>
                                      s.mas_ser_id !==
                                      service.mas_ser_id
                                  )
                                );
                              }
                            }}
                          />

                          <Form.Control
                            type="number"
                            size="sm"
                            min={0}
                            disabled={!selected}
                            style={{ width: "90px" }}
                            value={
                              selected?.actual_credits ??
                              service.default_credits
                            }
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                Number(e.target.value)
                              );

                              setSelectedServices(
                                selectedServices.map((s) =>
                                  s.mas_ser_id ===
                                  service.mas_ser_id
                                    ? {
                                        ...s,
                                        actual_credits: value,
                                      }
                                    : s
                                )
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              <Button
                variant="success"
                className="mt-2"
                disabled={selectedServices.length === 0}
                onClick={handleAddServices}
              >
                Add Selected Services
              </Button>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ================= EDIT CREDIT MODAL ================= */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Credits</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {editingService && (
            <>
              <p>
                <b>Service:</b>{" "}
                {editingService.service_name}
              </p>

              <Form.Group>
                <Form.Label>Credits</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={editCredits}
                  onChange={(e) =>
                    setEditCredits(
                      Math.max(0, Number(e.target.value))
                    )
                  }
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={async () => {
              const confirm = await swal.fire({
                title: "Confirm Update",
                text: `Update credits to ${editCredits}?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, Update",
              });

              if (!confirm.isConfirmed) return;

              try {
                await saveCredits(
                  editingService.usr_ser_id,
                  editCredits
                );
                swal.fire(
                  "Updated",
                  "Credits updated successfully",
                  "success"
                );
                setShowEditModal(false);
                fetchAssignedServices();
              } catch {
                swal.fire(
                  "Error",
                  "Failed to update credits",
                  "error"
                );
              }
            }}
          >
            Update
          </Button>
        </Modal.Footer>
      </Modal>
    </Col>
  </Row>
);

}
