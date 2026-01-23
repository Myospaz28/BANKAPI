import React, { useEffect, useState } from "react";
import { Row, Col, Card, Table, Button, Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

export default function UserWalletStatement() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [statement, setStatement] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= FETCH USER ================= */
  useEffect(() => {
    // fetchUser();
    fetchStatement();
  }, [userId]);

//   const fetchUser = async () => {
//     const res = await api.get(`api/getUserById/${userId}`);
//     setUser(res.data.data);
//   };

  /* ================= FETCH STATEMENT ================= */
  const fetchStatement = async () => {
    try {
      setLoading(true);

      let url = `api/getUserWalletStatement/${userId}`;
      if (fromDate || toDate) {
        url += `?from_date=${fromDate}&to_date=${toDate}`;
      }

      const res = await api.get(url);
      setStatement(res.data.data || []);
      console.log("res.data.data" , res.data.data)
    } catch (err) {
      console.error("❌ Failed to load statement", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row>
      <Col md={12}>
        <Card body>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                ← Back
              </Button>
              {/* <h5 className="mt-2 mb-0">Wallet Statement</h5>
              {user && (
                <small className="text-muted">
                  {user.name} | {user.email} | {user.contact_number}
                </small>
              )} */}
            </div>
          </div>

          {/* ================= FILTER ================= */}
          <Row className="mb-3">
            <Col md={3}>
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Control
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Button variant="primary" onClick={fetchStatement}>
                Apply Filter
              </Button>
            </Col>
          </Row>

          {/* ================= STATEMENT TABLE ================= */}
          <Table striped bordered hover responsive>
            <thead className="text-center">
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Service</th>
                <th>Type</th>
                <th>Credits</th>
                <th>Opening</th>
                <th>Closing</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : statement.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center">
                    No transactions found
                  </td>
                </tr>
              ) : (
                statement.map((row, index) => (
                  <tr key={row.wt_id} className="text-center">
                    <td>{index + 1}</td>
                    <td>
                      {new Date(row.transaction_date).toLocaleString("en-IN")}
                    </td>
                    <td>{row.service_name || "-"}</td>
                    <td
                      className={
                        row.transaction_type === "credit"
                          ? "text-success fw-bold"
                          : "text-danger fw-bold"
                      }
                    >
                      {row.transaction_type.toUpperCase()}
                    </td>
                    <td>{row.amount}</td>
                    <td>{row.opening_balance}</td>
                    <td>{row.closing_balance}</td>
                    <td>{row.file_no || "-"}</td>
                    <td>{row.api_status || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      </Col>
    </Row>
  );
}
