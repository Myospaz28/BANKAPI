import React, { useEffect, useState } from "react";
import { Row, Col, Card, Table, Button, Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../services/api";

export default function UserWalletStatement() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [statement, setStatement] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [userDetails, setUserDetails] = useState(null);
  const [fileNoFilter, setFileNoFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [inputFilter, setInputFilter] = useState("");

  /* ================= FETCH STATEMENT ================= */
  useEffect(() => {
    fetchUserDetails();
    fetchStatement();
  }, [userId]);

  const fetchStatement1 = async () => {
    try {
      setLoading(true);

      let url = `api/getUserWalletStatement/${userId}`;
      if (fromDate || toDate) {
        url += `?from_date=${fromDate}&to_date=${toDate}`;
      }

      const res = await api.get(url);
      setStatement(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load statement", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchStatement = async () => {
    try {
      setLoading(true);

      let url = "";

      if (userId === "all") {
        url = `api/getAllUsersWalletStatement`;
      } else {
        url = `api/getUserWalletStatement/${userId}`;
      }

      if (fromDate || toDate) {
        url += `?from_date=${fromDate}&to_date=${toDate}`;
      }

      const res = await api.get(url);
      setStatement(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to load statement", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails1 = async () => {
    try {
      const res = await api.get(`api/getUserById/${userId}`);
      setUserDetails(res.data.data);
    } catch (err) {
      console.error("❌ Failed to load user details", err);
    }
  };
  const fetchUserDetails = async () => {
    if (userId === "all") return;

    try {
      const res = await api.get(`api/getUserById/${userId}`);
      setUserDetails(res.data.data);
    } catch (err) {
      console.error("❌ Failed to load user details", err);
    }
  };
  /* ================= EXPORT TO EXCEL ================= */
const exportToExcel = () => {
  if (!filteredStatement.length) {
    alert("No data to export");
    return;
  }

  const excelData = filteredStatement.map((row, index) => {
    let payloadText = "Not Available";

    if (row.input_payload) {
      try {
        const payload =
          typeof row.input_payload === "string"
            ? JSON.parse(row.input_payload)
            : row.input_payload;

        payloadText = Object.entries(payload)
          .map(
            ([key, value]) =>
              `${key.replace(/_/g, " ").toUpperCase()}: ${value}`
          )
          .join("\n"); // newline for Excel cell
      } catch {
        payloadText = "Invalid Payload";
      }
    }

    return {
      "#": index + 1,
      FileNo: row.file_no || "-",
      Service: row.service_name || "-",

      "Input Payload": payloadText,

      Date: new Date(row.transaction_date).toLocaleString("en-IN"),
      "Performed By" : row.performed_by || "-", 
      Type: row.transaction_type.toUpperCase(),
      Credits: row.amount,
      "Opening Balance": row.opening_balance,
      "Closing Balance": row.closing_balance,
      Status: row.api_status || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Wallet Report");

  XLSX.writeFile(
    workbook,
    `Wallet_Report_${fromDate || "all"}_${toDate || "all"}.xlsx`
  );
};

  const filteredStatement = statement.filter((row) => {
    const fileMatch =
      !fileNoFilter ||
      (row.file_no || "").toLowerCase().includes(fileNoFilter.toLowerCase());

    const serviceMatch =
      !serviceFilter ||
      (row.service_name || "")
        .toLowerCase()
        .includes(serviceFilter.toLowerCase());

    let inputPayloadText = "";

    if (row.input_payload) {
      try {
        const payload =
          typeof row.input_payload === "string"
            ? JSON.parse(row.input_payload)
            : row.input_payload;

        inputPayloadText = Object.values(payload).join(" ").toLowerCase();
      } catch {
        inputPayloadText = "";
      }
    }

    const inputMatch =
      !inputFilter || inputPayloadText.includes(inputFilter.toLowerCase());

    return fileMatch && serviceMatch && inputMatch;
  });

  return (
    <Row>
      <Col md={12}>
        <Card body>
          {/* ================= HEADER ================= */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                ← Back
              </Button>
              <h4 className="mt-2 mb-0">
                {userId === "all" ? "All Users Report" : "Report"}
              </h4>

              <small className="text-muted">
                {userId === "all"
                  ? "Combined Wallet Statement"
                  : "User Wallet Statement"}
              </small>
            </div>

            <Button
              variant="success"
              onClick={exportToExcel}
              disabled={!statement.length}
            >
              Export to Excel
            </Button>
          </div>
          {userId !== "all" && userDetails && (
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
                      <h5 className="mb-1 fw-bold">{userDetails.name}</h5>

                      <div className="text-muted">@{userDetails.username}</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          )}

          {/* ================= FILTER ================= */}
          <Row className="mb-3 align-items-end">
            <Col md={3}>
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Col>

            <Col md={3}>
              <Form.Label>To Date</Form.Label>
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
          <Row className="mb-3">
            <Col md={3}>
              <Form.Control
                placeholder="Search File No"
                value={fileNoFilter}
                onChange={(e) => setFileNoFilter(e.target.value)}
              />
            </Col>

            <Col md={3}>
              <Form.Control
                placeholder="Search Service"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              />
            </Col>

            <Col md={3}>
              <Form.Control
                placeholder="Search Input Fields"
                value={inputFilter}
                onChange={(e) => setInputFilter(e.target.value)}
              />
            </Col>

            <Col md={3}>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setFileNoFilter("");
                  setServiceFilter("");
                  setInputFilter("");
                }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
          {/* ================= TABLE ================= */}
          <Table striped bordered hover responsive>
            <thead className="text-center">
              <tr>
                <th>#</th>
                <th>File No</th>
                <th>Service</th>
                <th>Input Fields</th>
                <th>Date</th>
                    {userId === "all" &&
                <th>Performed by</th>
                    }
                <th>Type</th>
                <th>Credits</th>
                <th>Opening</th>
                <th>Closing</th>

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
              ) : filteredStatement.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredStatement.map((row, index) => (
                  <tr key={row.wt_id} className="text-center">
                    <td>{index + 1}</td>
                    <td>{row.file_no || "-"}</td>
                    <td>{row.service_name || "-"}</td>

                    <td>
                      {row.input_payload ? (
                        Object.entries(
                          typeof row.input_payload === "string"
                            ? JSON.parse(row.input_payload)
                            : row.input_payload,
                        ).map(([key, value]) => (
                          <div key={key}>
                            <strong>
                              {key.replace(/_/g, " ").toUpperCase()}:
                            </strong>{" "}
                            {String(value)}
                          </div>
                        ))
                      ) : (
                        <span>Not Available</span>
                      )}
                    </td>
                    <td>
                      {new Date(row.transaction_date).toLocaleString("en-IN")}
                    </td>
                         {userId === "all" &&
                    <td>{row.performed_by}</td>
                         }
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
