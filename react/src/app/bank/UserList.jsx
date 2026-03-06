

import EditUserModal from './EditUserModal';
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Modal, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Formik } from 'formik';
import * as yup from 'yup';
import api from './../services/api.js';
import swal from "sweetalert2";
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
      const res = await api.get('api/getUsersController');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('❌ Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= EDIT MODAL ================= */
const timeToMinutes = (time) => {
  if (!time) return '';
  const [hh, mm] = time.split(':').map(Number);
  return hh * 60 + mm;
};

const openEditModal = (user) => {
  setSelectedUser({
    users_id: user.users_id,
    name: user.name ?? '',
    username: user.username ?? '',
    email: user.email ?? '',
    mobile: user.contact_number ?? '',
    address: user.address ?? '',
    login_time: user.login_time ?? '',
    logout_time: user.logout_time ?? '',
    log_session_time: timeToMinutes(user.log_session_time),
    latitude: user.latitude ?? '',
    longitude: user.longitude ?? '',
  });

  setShowEdit(true);
};
const handleToggleStatus = async (user) => {
  const newStatus = user.status === "active" ? "inactive" : "active";

  const confirm = await swal.fire({
    title: `Change Status?`,
    text: `User will be marked as ${newStatus}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Update",
  });

  if (!confirm.isConfirmed) return;

  try {
    await api.put("api/toggleUserStatus", {
      user_id: user.users_id,
      status: newStatus,
    });

    swal.fire("Updated!", "User status updated successfully", "success");

    fetchUsers(); // refresh table
  } catch (error) {
    swal.fire("Error", "Failed to update status", "error");
  }
};
const handleToggleGeoStatus = async (user) => {
  const newStatus =
    user.geo_fencing_status === "active" ? "inactive" : "active";

  const confirm = await swal.fire({
    title: `Change Geo Fencing?`,
    text: `Geo fencing will be ${newStatus}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Update",
  });

  if (!confirm.isConfirmed) return;

  try {
    await api.put("api/toggleGeoFencingStatus", {
      user_id: user.users_id,
      geo_fencing_status: newStatus,
    });

    swal.fire(
      "Updated!",
      "Geo fencing status updated successfully",
      "success"
    );

    fetchUsers();
  } catch (error) {
    swal.fire("Error", "Failed to update geo fencing", "error");
  }
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
                <th>User Status</th>
                <th>Geo Fencing</th>
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
  <Form.Check
    type="switch"
    id={`status-switch-${user.users_id}`}
    checked={user.status === "active"}
    onChange={() => handleToggleStatus(user)}
    className="d-flex justify-content-center"
  />
</td>
<td>
  <Form.Check
    type="switch"
    id={`geo-switch-${user.users_id}`}
    checked={user.geo_fencing_status === "active"}
    onChange={() => handleToggleGeoStatus(user)}
    className="d-flex justify-content-center"
  />
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
    <EditUserModal
  show={showEdit}
  onHide={() => setShowEdit(false)}
  selectedUser={selectedUser}
  onSuccess={fetchUsers}
/>

    </Row>
  );
}

/* ================= VALIDATION ================= */
const editUserSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  username: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  mobileNumber: yup.string().required('Mobile number is required'),
  city: yup.string().required('City is required'),
  new_password: yup.string().min(6, 'Minimum 6 characters').notRequired(),
});