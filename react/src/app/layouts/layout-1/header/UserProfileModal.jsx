// import { Modal, Button, Row, Col, Badge, Card } from "react-bootstrap";

// export default function UserProfileModal({ show, onHide, user }) {
//   if (!user) return null;

//   return (
//     <Modal show={show} onHide={onHide} centered size="lg">
//       <Modal.Header closeButton>
//         <Modal.Title>👤 User Profile</Modal.Title>
//       </Modal.Header>

//       <Modal.Body>
//         {/* HEADER */}
//         <Card className="mb-3 shadow-sm">
//           <Card.Body>
//             <Row className="align-items-center">
//               <Col md={2} className="text-center">
//                 <img
//                   src="/assets/images/faces/profileimage.png"
//                   alt="Profile"
//                   className="rounded-circle"
//                   width={80}
//                 />
//               </Col>

//               <Col md={7}>
//                 <h5 className="mb-1">{user.name}</h5>
//                 <div className="text-muted">username : {user.username}</div>
//                 <div className="text-muted">email : {user.email}</div>
//               </Col>

//               <Col md={3} className="text-end">
//                 <Badge bg={user.status === "active" ? "success" : "secondary"}>
//                   {user.status}
//                 </Badge>
//                 <div className="mt-2 text-capitalize">
//                   <Badge bg="info">{user.role}</Badge>
//                 </div>
//               </Col>
//             </Row>
//           </Card.Body>
//         </Card>

//         {/* DETAILS */}
//         <Row>
//           <Col md={6}>
//             <Card className="mb-3 shadow-sm">
//               <Card.Header className="fw-bold">Basic Information</Card.Header>
//               <Card.Body>
//                 <p><strong>User ID:</strong> {user.userId || user.users_id}</p>
//                 <p><strong>Contact:</strong> {user.contact_number || "—"}</p>
//                 <p><strong>Address:</strong> {user.address || "—"}</p>
//               </Card.Body>
//             </Card>
//           </Col>

//           <Col md={6}>
//             <Card className="mb-3 shadow-sm">
//               <Card.Header className="fw-bold">Account Details</Card.Header>
//               <Card.Body>
//                 <p>
//                   <strong>Wallet Balance:</strong>{" "}
//                   <span className="text-success fw-bold">
//                     ₹{user.wallet_amount || "0.00"}
//                   </span>
//                 </p>
//                 <p>
//                   <strong>Registered On :</strong>{" "}
//                   {user.created_at
//                     ? new Date(user.created_at).toLocaleString()
//                     : "—"}
//                 </p>
//                 {/* <p>
//                   <strong>Updated At:</strong>{" "}
//                   {user.updated_at
//                     ? new Date(user.updated_at).toLocaleString()
//                     : "—"}
//                 </p> */}
//               </Card.Body>
//             </Card>
//           </Col>
//         </Row>
//       </Modal.Body>

//       <Modal.Footer>
//         <Button variant="secondary" onClick={onHide}>
//           Close
//         </Button>
//       </Modal.Footer>
//     </Modal>
//   );
// }
import { useEffect, useState } from "react";
import { Modal, Button, Row, Col, Badge, Card, Spinner } from "react-bootstrap";
import swal from "sweetalert2";
import api from "./../../../services/api.js";

export default function UserProfileModal({ show, onHide }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH LOGGED-IN USER ================= */

  const fetchLoggedInUser = async () => {
    try {
      setLoading(true);
      const res = await api.get("api/getLoggedInUserController");
      setUser(res.data?.data || null);
    } catch (error) {
      swal.fire("Error", "Failed to load user profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      fetchLoggedInUser();
    }
  }, [show]);

  /* ================= UI STATES ================= */

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>👤 User Profile</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : !user ? (
          <div className="text-center text-muted">No user data available</div>
        ) : (
          <>
            {/* ================= HEADER ================= */}
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <Row className="align-items-center">
                  <Col md={2} className="text-center">
                    <img
                      src="/assets/images/faces/profileimage.png"
                      alt="Profile"
                      className="rounded-circle"
                      width={80}
                    />
                  </Col>

                  <Col md={7}>
                    <h5 className="mb-1">{user.name}</h5>
                    <div className="text-muted">
                      username : {user.username}
                    </div>
                    <div className="text-muted">
                      email : {user.email}
                    </div>
                  </Col>

                  <Col md={3} className="text-end">
                    <Badge
                      bg={user.status === "active" ? "success" : "secondary"}
                    >
                      {user.status}
                    </Badge>

                    <div className="mt-2 text-capitalize">
                      <Badge bg="info">
                        Role : {user.role}
                      </Badge>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* ================= DETAILS ================= */}
            <Row>
              <Col md={6}>
                <Card className="mb-3 shadow-sm">
                  <Card.Header className="fw-bold">
                    Basic Information
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>User ID:</strong> {user.users_id}
                    </p>
                    <p>
                      <strong>Contact:</strong>{" "}
                      {user.contact_number || "—"}
                    </p>
                    <p>
                      <strong>Address:</strong>{" "}
                      {user.address || "—"}
                    </p>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="mb-3 shadow-sm">
                  <Card.Header className="fw-bold">
                    Account Details
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Wallet Balance:</strong>{" "}
                      <span className="text-success fw-bold">
                        ₹{Number(user.wallet_amount || 0).toFixed(2)}
                      </span>
                    </p>

                    <p>
                      <strong>Registered On :</strong>{" "}
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString()
                        : "—"}
                    </p>

                    {/* <p>
                      <strong>Last Login :</strong>{" "}
                      {user.login_time || "—"}
                    </p>

                    <p>
                      <strong>Last Logout :</strong>{" "}
                      {user.logout_time || "—"}
                    </p> */}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
