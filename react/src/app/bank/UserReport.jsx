import React, { useEffect, useState } from "react";
import { Row, Col, Card, Table, Modal, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Formik } from "formik";
import * as yup from "yup";

import swal from "sweetalert2";
import api from "./../services/api.js";

export default function UserReport() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [userRole, setUserRole] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    fetchUsers();
    fetchLoggedInUser();
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

  const fetchLoggedInUser = async () => {
    try {
      setLoading(true);
      const res = await api.get("api/getLoggedInUserController");
      setUserRole(res.data?.data || null);
    } catch (error) {
      swal.fire("Error", "Failed to load user profile", "error");
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
            Userwise Report
          </Card.Subtitle>

          <Table responsive striped hover className="text-center w-100">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
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
                    <td>{user.email}</td>
                    <td>{user.role_name}</td>
                    <td>
                      <span
                        className={`badge ${
                          user.status === "active" ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td>
                      <span
                        className="cursor-pointer text-info me-3"
                        title="View Wallet Statement"
                        onClick={() =>
                          navigate(`/users/${user.users_id}/wallet-statement`)
                        }
                      >
                        <i className="nav-icon i-Receipt font-weight-bold" />
                      </span>
                      {userRole?.role?.toLowerCase() === "admin" && (
                        <span
                          className="cursor-pointer text-info me-3"
                          title="User Login Logs"
                          onClick={() =>
                            navigate(`/users/${user.users_id}/logs`)
                          }
                        >
                          <i className="nav-icon i-File-Clipboard-Text--Image font-weight-bold" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
        {userRole?.role?.toLowerCase() === "admin" && (
          <Row className="mt-4">
            <Col md={12}>
              <Card body className="text-center shadow-sm">
                <div className="d-flex flex-column align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: "70px",
                      height: "70px",
                      background: "#0d6efd",
                      color: "#fff",
                      fontSize: "28px",
                    }}
                  >
                    <i className="nav-icon i-Bar-Chart"></i>
                  </div>

                  <h5 className="fw-bold mb-1">Overall Report</h5>

                  <p className="text-muted mb-3">
                    View combined wallet statement of all users
                  </p>

                  <Button
                    variant="primary"
                    onClick={() => navigate(`/users/all/wallet-statement`)}
                  >
                    View Report
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Col>
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
