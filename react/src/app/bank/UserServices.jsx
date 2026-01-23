// import React, { useState } from 'react';
// import {
//   Row,
//   Col,
//   Card,
//   Button,
//   DropdownButton,
//   Dropdown,
//   ListGroup,
// } from 'react-bootstrap';
// import { useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';

// const ALL_SERVICES = [
//   'Criminal and Court Record Verification',
//   'Aadhaar verification',
//   'Driving License verification',
//   'PAN verification',
//   'Profile Lookup',
//   'GSTIN verification',
//   'Bank Account Verification',
//   'Voter ID verification',
//   'Liveness',
//   'Facematch',
//   'Passport Verification',
//   'DigiLocker',
// ];

// export default function UserServicesPage() {
//   const navigate = useNavigate();

//   const [userServices, setUserServices] = useState([
//     'Criminal and Court Record Verification',
//     'Aadhaar verification',
//   ]);

//   const [selectedService, setSelectedService] = useState(null);

//   const availableServices = ALL_SERVICES.filter(
//     (service) => !userServices.includes(service)
//   );

//   const handleAddService = () => {
//     if (!selectedService) return;

//     setUserServices([...userServices, selectedService]);
//     setSelectedService(null);

//     swal.fire({
//       icon: 'success',
//       title: 'Service Added',
//       text: 'Service has been added successfully',
//     });
//   };

//   const handleRemoveService = (service) => {
//     swal
//       .fire({
//         title: 'Are you sure?',
//         text: "You won't be able to revert this!",
//         icon: 'warning',
//         showCancelButton: true,
//         confirmButtonColor: '#3085d6',
//         cancelButtonColor: '#d33',
//         confirmButtonText: 'Yes, remove it!',
//         cancelButtonText: 'No',
//       })
//       .then((result) => {
//         if (result.value) {
//           setUserServices(userServices.filter((s) => s !== service));
//           swal.fire('Removed!', 'Service has been removed.', 'success');
//         }
//       });
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body className="mb-4">
//           {/* Header */}
//           <div className="d-flex align-items-center mb-3">
//             <Button
//               variant="primary"
//               className="me-3"
//               onClick={() => navigate(-1)}
//             >
//               ← Back
//             </Button>
//             <Card.Title className="m-0">User Services</Card.Title>
//           </div>

//           <p className="text-muted">
//             Manage verification services assigned to this user
//           </p>

//           {/* ===== SIDE BY SIDE ===== */}
//           <Row>
//             {/* Assigned Services */}
//             <Col md={6}>
//               <Card body className="text-left p-1 mb-4 h-100">
//                 <Card.Title className="mb-2">
//                   Assigned Services
//                 </Card.Title>

//                 {userServices.length === 0 ? (
//                   <p className="text-muted text-center">
//                     No services assigned
//                   </p>
//                 ) : (
//                   <ListGroup as="ol">
//                     {userServices.map((service) => (
//                       <ListGroup.Item
//                         as="li"
//                         key={service}
//                         className="d-flex justify-content-between align-items-center"
//                       >
//                         {service}
//                         <span
//                           className="cursor-pointer text-danger"
//                           title="Remove Service"
//                           onClick={() => handleRemoveService(service)}
//                         >
//                           <i className="nav-icon i-Close-Window font-weight-bold" />
//                         </span>
//                       </ListGroup.Item>
//                     ))}
//                   </ListGroup>
//                 )}
//               </Card>
//             </Col>

//             {/* Add New Service */}
//             <Col md={6}>
//               <Card body className="mb-4 h-100">
//                 <Card.Title>Add New Service</Card.Title>

//                 <div className="d-flex align-items-center gap-3 flex-wrap">
//                   <DropdownButton
//                     variant="primary"
//                     title={
//                       selectedService || 'Select Service'
//                     }
//                   >
//                     {availableServices.length === 0 && (
//                       <Dropdown.Item disabled>
//                         No services available
//                       </Dropdown.Item>
//                     )}

//                     {availableServices.map((service) => (
//                       <Dropdown.Item
//                         key={service}
//                         onClick={() => setSelectedService(service)}
//                       >
//                         {service}
//                       </Dropdown.Item>
//                     ))}
//                   </DropdownButton>

//                   <Button
//                     variant="success"
//                     disabled={!selectedService}
//                     onClick={handleAddService}
//                   >
//                     Add Service
//                   </Button>
//                 </div>
//               </Card>
//             </Col>
//           </Row>
//         </Card>
//       </Col>
//     </Row>
//   );
// }

// import React, { useEffect, useState } from "react";
// import {
//   Row,
//   Col,
//   Card,
//   Button,
//   DropdownButton,
//   Dropdown,
//   ListGroup,
//   Form,
// } from "react-bootstrap";
// import { useNavigate, useParams } from "react-router-dom";
// import swal from "sweetalert2";

// import api from "./../services/api.js";

// export default function UserServicesPage() {
//   const navigate = useNavigate();
//   const { userId } = useParams();

//   const [assignedCategories, setAssignedCategories] = useState([]);
//   const [availableCategories, setAvailableCategories] = useState([]);
//   const [selectedServices, setSelectedServices] = useState([]);
//   const [pendingCreditChange, setPendingCreditChange] = useState(null);

//   /* ================= FETCH DATA ================= */

//   useEffect(() => {
//     if (userId) {
//       fetchAssignedServices();
//       fetchAvailableServices();
//     }
//   }, [userId]);

//   const fetchAssignedServices = async () => {
//     try {
//       const res = await api.get(`api/getUserServicesByUserId/${userId}`);
//       setAssignedCategories(res.data.data || []);
//     } catch (err) {
//       console.error("❌ Failed to load assigned services", err);
//     }
//   };

//   const fetchAvailableServices = async () => {
//     try {
//       const res = await api.get(
//         `api/getAvailableMasterServicesByCategoryForUser/${userId}`
//       );
//       // setAvailableServices(res.data.data || []);
//       setAvailableCategories(res.data.data || []);
//     } catch (err) {
//       console.error("❌ Failed to load available services", err);
//     }
//   };

//   /* ================= UPDATE CREDITS ================= */

//   const handleCreditChange = (usrSerId, value) => {
//     const updated = assignedCategories.map((cat) => ({
//       ...cat,
//       services: cat.services.map((s) =>
//         s.usr_ser_id === usrSerId ? { ...s, actual_credits: Number(value) } : s
//       ),
//     }));
//     setAssignedCategories(updated);
//   };

//   /* ================= SAVE CREDIT ================= */

//   const saveCredits = async (usr_ser_id, credits) => {
//     try {
//       await api.put(`api/updateUserServiceCredits`, {
//         usr_ser_id,
//         actual_credits: credits,
//       });

//       swal.fire("Updated", "Credits updated successfully", "success");
//     } catch (err) {
//       swal.fire("Error", "Failed to update credits", "error");
//     }
//   };

//   /* ================= REMOVE SERVICE ================= */

//   const handleRemoveService = async (usr_ser_id) => {
//     const confirm = await swal.fire({
//       title: "Remove Service?",
//       text: "This will deactivate the service",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes",
//     });

//     if (!confirm.isConfirmed) return;

//     try {
//       await api.put(`api/deactivateUserService/${usr_ser_id}`);
//       swal.fire("Removed", "Service removed", "success");
//       fetchAssignedServices();
//       fetchAvailableServices();
//     } catch (err) {
//       swal.fire("Error", "Failed to remove service", "error");
//     }
//   };

//   /* ================= ADD SERVICE ================= */
//   const handleAddServices = async () => {
//     const list = selectedServices
//       .map(
//         (s) =>
//           `<li>Service ID ${s.mas_ser_id} → ${s.actual_credits} credits</li>`
//       )
//       .join("");

//     const confirm = await swal.fire({
//       title: "Confirm Add Services",
//       html: `<ul style="text-align:left">${list}</ul>`,
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Add Services",
//     });

//     if (!confirm.isConfirmed) return;

//     try {
//       await api.post("/api/addUserServicesBulk", {
//         user_id: userId,
//         services: selectedServices,
//       });

//       swal.fire("Success", "Services added successfully", "success");

//       setSelectedServices([]);
//       fetchAssignedServices();
//       fetchAvailableServices();
//     } catch (err) {
//       swal.fire("Error", "Failed to add services", "error");
//     }
//   };
//   const confirmAndSaveCredits = async () => {
//     if (
//       !pendingCreditChange ||
//       pendingCreditChange.new === pendingCreditChange.old
//     )
//       return;

//     const result = await swal.fire({
//       title: "Confirm Credit Change",
//       html: `
//       <b>${pendingCreditChange.service_name}</b><br/>
//       ${pendingCreditChange.old} → ${pendingCreditChange.new}
//     `,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, Update",
//       cancelButtonText: "Cancel",
//     });

//     if (result.isConfirmed) {
//       await saveCredits(
//         pendingCreditChange.usr_ser_id,
//         pendingCreditChange.new
//       );
//     } else {
//       // revert UI
//       handleCreditChange(
//         pendingCreditChange.usr_ser_id,
//         pendingCreditChange.old
//       );
//     }

//     setPendingCreditChange(null);
//   };

//   /* ================= UI ================= */

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           {/* Header */}
//           <div className="d-flex align-items-center mb-3">
//             <Button
//               variant="primary"
//               className="me-3"
//               onClick={() => navigate(-1)}
//             >
//               ← Back
//             </Button>
//             <Card.Title className="m-0">User Services</Card.Title>
//           </div>

//           <p className="text-muted">
//             Manage verification services and credits for this user
//           </p>

//           <Row>
//             {/* ================= ASSIGNED ================= */}
//             <Col md={6}>
//               <Card body className="h-100">
//                 <Card.Title>Assigned Services</Card.Title>

//                 {assignedCategories.length === 0 ? (
//                   <p className="text-muted text-center">No services assigned</p>
//                 ) : (
//                   assignedCategories.map((cat) => (
//                     <div key={cat.mas_cat_id} className="mb-3">
//                       <h6 className="text-primary">{cat.category_name}</h6>

//                       <ListGroup>
//                         {cat.services.map((service) => (
//                           <ListGroup.Item
//                             key={service.usr_ser_id}
//                             className="d-flex justify-content-between align-items-center"
//                           >
//                             <div>
//                               <b>{service.service_name}</b>
//                             </div>

//                             <div className="d-flex align-items-center gap-2">
//                               <Form.Control
//                                 type="number"
//                                 size="sm"
//                                 min={0}
//                                 style={{ width: "90px" }}
//                                 value={service.actual_credits}
//                                 onChange={(e) => {
//                                   const value = Number(e.target.value);

//                                   // update UI immediately
//                                   handleCreditChange(service.usr_ser_id, value);

//                                   // store pending change for confirmation
//                                   setPendingCreditChange({
//                                     usr_ser_id: service.usr_ser_id,
//                                     old: service.actual_credits,
//                                     new: value,
//                                     service_name: service.service_name,
//                                   });
//                                 }}
//                                 onBlur={async () => {
//                                   if (
//                                     !pendingCreditChange ||
//                                     pendingCreditChange.new ===
//                                       pendingCreditChange.old
//                                   )
//                                     return;

//                                   const result = await swal.fire({
//                                     title: "Confirm Credit Change",
//                                     html: `
//         <b>${service.service_name}</b><br/>
//         ${pendingCreditChange.old} → ${pendingCreditChange.new}
//       `,
//                                     icon: "warning",
//                                     showCancelButton: true,
//                                     confirmButtonText: "Yes, Update",
//                                     cancelButtonText: "Cancel",
//                                   });

//                                   if (result.isConfirmed) {
//                                     handleCreditChange(
//                                       pendingCreditChange.usr_ser_id,
//                                       pendingCreditChange.new
//                                     );

//                                     saveCredits(
//                                       pendingCreditChange.usr_ser_id,
//                                       pendingCreditChange.new
//                                     );
//                                   } else {
//                                     // revert UI
//                                     handleCreditChange(
//                                       pendingCreditChange.usr_ser_id,
//                                       pendingCreditChange.old
//                                     );
//                                   }

//                                   setPendingCreditChange(null);
//                                 }}
//                               />

//                               <span
//                                 className="cursor-pointer text-danger"
//                                 title="Remove Service"
//                                 onClick={() =>
//                                   handleRemoveService(service.usr_ser_id)
//                                 }
//                               >
//                                 <i className="nav-icon i-Close-Window font-weight-bold" />
//                               </span>
//                             </div>
//                           </ListGroup.Item>
//                         ))}
//                       </ListGroup>
//                     </div>
//                   ))
//                 )}
//               </Card>
//             </Col>

//             {/* ================= ADD NEW ================= */}
//             <Col md={6}>
//               <Card body className="h-100">
//                 <Card.Title>Add New Services</Card.Title>

//                 {availableCategories.length === 0 ? (
//                   <p className="text-muted">No services available</p>
//                 ) : (
//                   availableCategories.map((cat) => (
//                     <div key={cat.mas_cat_id} className="mb-3">
//                       <h6 className="text-primary">{cat.category_name}</h6>

//                       {cat.services.map((service) => {
//                         const selected = selectedServices.find(
//                           (s) => s.mas_ser_id === service.mas_ser_id
//                         );

//                         return (
//                           <div
//                             key={service.mas_ser_id}
//                             className="d-flex align-items-center justify-content-between mb-2 border rounded p-2"
//                           >
//                             {/* Checkbox + Name */}
//                             <Form.Check
//                               type="checkbox"
//                               label={service.service_name}
//                               checked={!!selected}
//                               onChange={(e) => {
//                                 if (e.target.checked) {
//                                   setSelectedServices([
//                                     ...selectedServices,
//                                     {
//                                       mas_ser_id: service.mas_ser_id,
//                                       actual_credits: service.default_credits,
//                                     },
//                                   ]);
//                                 } else {
//                                   setSelectedServices(
//                                     selectedServices.filter(
//                                       (s) => s.mas_ser_id !== service.mas_ser_id
//                                     )
//                                   );
//                                 }
//                               }}
//                             />

//                             {/* Credits */}
//                             <Form.Control
//                               type="number"
//                               size="sm"
//                               min={0}
//                               step={1}
//                               style={{
//                                 width: "90px",
//                                 cursor: selected ? "text" : "not-allowed",
//                               }}
//                               disabled={!selected}
//                               value={
//                                 selected?.actual_credits ??
//                                 service.default_credits
//                               }
//                               onChange={(e) => {
//                                 const value = Math.max(
//                                   0,
//                                   Number(e.target.value)
//                                 );

//                                 setSelectedServices(
//                                   selectedServices.map((s) =>
//                                     s.mas_ser_id === service.mas_ser_id
//                                       ? { ...s, actual_credits: value }
//                                       : s
//                                   )
//                                 );
//                               }}
//                             />
//                           </div>
//                         );
//                       })}
//                     </div>
//                   ))
//                 )}

//                 <Button
//                   variant="success"
//                   className="mt-2"
//                   disabled={selectedServices.length === 0}
//                   onClick={handleAddServices}
//                 >
//                   Add Selected Services
//                 </Button>
//               </Card>
//             </Col>
//           </Row>
//         </Card>
//       </Col>
//     </Row>
//   );
// }




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

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (userId) {
      fetchAssignedServices();
      fetchAvailableServices();
    }
  }, [userId]);

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

          <p className="text-muted">
            Manage verification services and credits for this user
          </p>

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

                              {/* Edit */}
                              <span
                                className="cursor-pointer text-primary"
                                title="Edit Credits"
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

                              {/* Remove */}
                              <span
                                className="cursor-pointer text-danger"
                                title="Remove Service"
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
                  <p className="text-muted">No services available</p>
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
      </Col>

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
    </Row>
  );
}
