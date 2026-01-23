// import React, { useState } from 'react';
// import { Row, Col, Card, Table, Modal, Button, Form } from 'react-bootstrap';
// import { useNavigate } from 'react-router-dom';
// import { Formik } from 'formik';
// import * as yup from 'yup';

// export default function UserListPage() {
//   const navigate = useNavigate();

//   const userList = [
//     {
//       id: 1,
//       name: 'Ritesh Patil',
//       username: 'riteshp',
//       email: 'ritesh@example.com',
//       mobileNumber: '9999999999',
//       city: 'Pune',
//     },
//     {
//       id: 2,
//       name: 'Amit Kulkarni',
//       username: 'amitk',
//       email: 'amit@example.com',
//       mobileNumber: '8888888888',
//       city: 'Mumbai',
//     },
//   ];

//   const [showEdit, setShowEdit] = useState(false);
//   const [selectedUser, setSelectedUser] = useState(null);

//   const openEditModal = (user) => {
//     setSelectedUser(user);
//     setShowEdit(true);
//   };

//   return (
//     <Row className="mb-4">
//       <Col md={12}>
//         <Card body>
//           <Card.Title>User List</Card.Title>
//           <Card.Subtitle className="mb-3 text-muted">
//             Manage users, wallets and services
//           </Card.Subtitle>

//           <Table responsive striped className="text-center w-100">
//             <thead>
//               <tr>
//                 <th>#</th>
//                 <th>Name</th>
//                 <th>Username</th>
//                 <th>Email</th>
//                 <th>Action</th>
//               </tr>
//             </thead>

//             <tbody>
//               {userList.map((user, index) => (
//                 <tr key={user.id}>
//                   <th>{index + 1}</th>
//                   <td>{user.name}</td>
//                   <td>{user.username}</td>
//                   <td>{user.email}</td>

//                   <td>
//                     {/* Services */}
//                     <span
//                       className="cursor-pointer text-primary me-3"
//                       title="User Services"
//                       onClick={() => navigate(`/users/user-services`)}
//                     >
//                       <i className="nav-icon i-Management font-weight-bold" />
//                     </span>

//                     {/* Wallet */}
//                     <span
//                       className="cursor-pointer text-success me-3"
//                       title="User Wallet"
//                       onClick={() => navigate(`/users/user-wallet`)}
//                     >
//                       <i className="nav-icon i-Money-Bag font-weight-bold" />
//                     </span>

//                     {/* Edit */}
//                     <span
//                       className="cursor-pointer text-warning"
//                       title="Update User"
//                       onClick={() => openEditModal(user)}
//                     >
//                       <i className="nav-icon i-Pen-2 font-weight-bold" />
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </Table>
//         </Card>
//       </Col>

//       {/* ===== Edit User Modal ===== */}
//       <Modal
//         show={showEdit}
//         onHide={() => setShowEdit(false)}
//         centered
//         size="lg"
//       >
//         <Modal.Header closeButton>
//           <Modal.Title>Edit User</Modal.Title>
//         </Modal.Header>

//         <Formik
//           enableReinitialize
//           initialValues={selectedUser || {}}
//           validationSchema={editUserSchema}
//           onSubmit={(values) => {
//             console.log('Updated User:', values);
//             setShowEdit(false);
//           }}
//         >
//           {({
//             values,
//             errors,
//             touched,
//             handleChange,
//             handleSubmit,
//           }) => (
//             <Form onSubmit={handleSubmit}>
//               <Modal.Body>
//                 <Row>
//                   <Col md={6}>
//                     <Form.Group className="mb-3">
//                       <Form.Label>Name</Form.Label>
//                       <Form.Control
//                         name="name"
//                         value={values.name || ''}
//                         onChange={handleChange}
//                         isInvalid={touched.name && !!errors.name}
//                       />
//                     </Form.Group>
//                   </Col>

//                   <Col md={6}>
//                     <Form.Group className="mb-3">
//                       <Form.Label>Username</Form.Label>
//                       <Form.Control
//                         name="username"
//                         value={values.username || ''}
//                         onChange={handleChange}
//                         isInvalid={touched.username && !!errors.username}
//                       />
//                     </Form.Group>
//                   </Col>

//                   <Col md={6}>
//                     <Form.Group className="mb-3">
//                       <Form.Label>Email</Form.Label>
//                       <Form.Control
//                         name="email"
//                         value={values.email || ''}
//                         onChange={handleChange}
//                         isInvalid={touched.email && !!errors.email}
//                       />
//                     </Form.Group>
//                   </Col>

//                   <Col md={6}>
//                     <Form.Group className="mb-3">
//                       <Form.Label>Mobile</Form.Label>
//                       <Form.Control
//                         name="mobileNumber"
//                         value={values.mobileNumber || ''}
//                         onChange={handleChange}
//                         isInvalid={touched.mobileNumber && !!errors.mobileNumber}
//                       />
//                     </Form.Group>
//                   </Col>

//                   <Col md={12}>
//                     <Form.Group className="mb-3">
//                       <Form.Label>City</Form.Label>
//                       <Form.Control
//                         name="city"
//                         value={values.city || ''}
//                         onChange={handleChange}
//                         isInvalid={touched.city && !!errors.city}
//                       />
//                     </Form.Group>
//                   </Col>
//                 </Row>
//               </Modal.Body>

//               <Modal.Footer>
//                 <Button variant="secondary" onClick={() => setShowEdit(false)}>
//                   Cancel
//                 </Button>
//                 <Button type="submit" variant="primary">
//                   Update User
//                 </Button>
//               </Modal.Footer>
//             </Form>
//           )}
//         </Formik>
//       </Modal>
//     </Row>
//   );
// }

// const editUserSchema = yup.object().shape({
//   name: yup.string().required(),
//   username: yup.string().required(),
//   email: yup.string().required(),
//   mobileNumber: yup.string().required(),
//   city: yup.string().required(),
// });
import React, { useEffect, useState } from "react";
import { Row, Col, Card, Table, Modal, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Formik } from "formik";
import * as yup from "yup";

import api from "./../services/api.js";

export default function UserListPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("api/getUsersController"); 
      setUsers(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= EDIT MODAL ================= */
  const openEditModal = (user) => {
    setSelectedUser({
      users_id: user.users_id,
      name: user.name,
      username: user.username,
      email: user.email,
      mobileNumber: user.contact_number,
      city: user.address,
    });
    setShowEdit(true);
  };

  return (
    <Row className="mb-4">
      <Col md={12}>
        <Card body>
          <Card.Title>User List</Card.Title>
          <Card.Subtitle className="mb-3 text-muted">
            Manage users, wallets and services
          </Card.Subtitle>

          <Table responsive striped hover className="text-center w-100">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7}>No users found</td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.users_id}>
                    <td>{index + 1}</td>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role_name}</td>
                    <td>
                      <span
                        className={`badge ${
                          user.status === "active"
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td>
                      {/* User Services */}
                      <span
                        className="cursor-pointer text-primary me-3"
                        title="User Services"
                        onClick={() =>
                          navigate(`/users/${user.users_id}/services`)
                        }
                      >
                        <i className="nav-icon i-Management font-weight-bold" />
                      </span>

                      {/* User Wallet */}
                      <span
                        className="cursor-pointer text-success me-3"
                        title="User Wallet"
                        onClick={() =>
                          navigate(`/users/${user.users_id}/wallet`)
                        }
                      >
                        <i className="nav-icon i-Money-Bag font-weight-bold" />
                      </span>

                      {/* Edit User */}
                      <span
                        className="cursor-pointer text-warning"
                        title="Update User"
                        onClick={() => openEditModal(user)}
                      >
                        <i className="nav-icon i-Pen-2 font-weight-bold" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      </Col>

      {/* ================= EDIT USER MODAL ================= */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>

        <Formik
          enableReinitialize
          initialValues={selectedUser || {}}
          validationSchema={editUserSchema}
          onSubmit={(values) => {
            console.log("✏️ Update User Payload:", values);
            setShowEdit(false);
          }}
        >
          {({ values, errors, touched, handleChange, handleSubmit }) => (
            <Form onSubmit={handleSubmit}>
              <Modal.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        name="name"
                        value={values.name || ""}
                        onChange={handleChange}
                        isInvalid={touched.name && errors.name}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        name="username"
                        value={values.username || ""}
                        onChange={handleChange}
                        isInvalid={touched.username && errors.username}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        name="email"
                        value={values.email || ""}
                        onChange={handleChange}
                        isInvalid={touched.email && errors.email}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mobile</Form.Label>
                      <Form.Control
                        name="mobileNumber"
                        value={values.mobileNumber || ""}
                        onChange={handleChange}
                        isInvalid={
                          touched.mobileNumber && errors.mobileNumber
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>City / Address</Form.Label>
                      <Form.Control
                        name="city"
                        value={values.city || ""}
                        onChange={handleChange}
                        isInvalid={touched.city && errors.city}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Modal.Body>

              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEdit(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Update User
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Formik>
      </Modal>
    </Row>
  );
}

/* ================= VALIDATION ================= */
const editUserSchema = yup.object().shape({
  name: yup.string().required(),
  username: yup.string().required(),
  email: yup.string().required(),
  mobileNumber: yup.string().required(),
  city: yup.string().required(),
});
