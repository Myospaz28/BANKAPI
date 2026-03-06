import { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Table, Form } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import api from 'app/services/api';
import * as XLSX from 'xlsx';

export default function UserLoginLogs() {
  const { userId } = useParams(); // ✅ get userId
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* ================= FETCH LOGS ================= */
  const fetchLogs = async () => {
    try {
      setLoading(true);

      let url = `auth/session-logs/${userId}`;

      if (fromDate || toDate) {
        url += `?from_date=${fromDate}&to_date=${toDate}`;
      }

      const res = await api.get(url);
      setLogs(res.data.data || []);
      // console.log("res", res.data.data)
    } catch (err) {
      console.error('❌ Failed to load session logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  /* ================= EXPORT TO EXCEL ================= */
  const exportToExcel = () => {
    const formattedData = logs.map((row, index) => ({
      SrNo: index + 1,
      Name: row.name,
      Username: row.username,
      Role: row.role,
      LoginTime: new Date(row.login_time).toLocaleString('en-IN'),
      LogoutTime: row.logout_time
        ? new Date(row.logout_time).toLocaleString('en-IN')
        : 'Active',
      Latitude: row.latitude,
      Longitude: row.longitude,
      LoginRemark: row.login_remark || '',
      LogoutRemark: row.remark || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SessionLogs');
    XLSX.writeFile(
      workbook,
      `SessionLogs_${fromDate || 'all'}_${toDate || 'all'}.xlsx`,
    );
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
              <h4 className="mt-2 mb-0">Session Report</h4>
              <small className="text-muted">User Login / Logout History</small>
            </div>

            <Button
              variant="success"
              onClick={exportToExcel}
              disabled={!logs.length}
            >
              Export to Excel
            </Button>
          </div>

          {/* Filter */}
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
              <Button variant="primary" onClick={fetchLogs}>
                Apply Filter
              </Button>
            </Col>
          </Row>

          {/* Table */}
          <Table striped bordered hover responsive>
            <thead className="text-center">
              <tr>
                <th>#</th>
                <th>Name</th>
                {/* <th>Username</th> */}
                <th>Role</th>
                <th>Login Time</th>
                <th>Logout Time</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Login Remark</th>
                <th>Logout Remark</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center">
                    No records found
                  </td>
                </tr>
              ) : (
                logs.map((row, index) => (
                  <tr key={row.u_log_id} className="text-center">
                    <td>{index + 1}</td>
                    <td>{row.name}</td>
                    {/* <td>{row.username}</td> */}
                    <td>{row.role}</td>
                    <td>{new Date(row.login_time).toLocaleString('en-IN')}</td>
                    <td>
                      {row.logout_time ? (
                        new Date(row.logout_time).toLocaleString('en-IN')
                      ) : row.login_remark === 'Login successful' ? (
                        <span className="text-success fw-bold">Active</span>
                      ) : (
                        <span className="text-danger fw-bold">Failed</span>
                      )}
                    </td>

                    <td>{row.latitude || '-'}</td>
                    <td>{row.longitude || '-'}</td>
                    <td>{row.login_remark || '-'}</td>
                    <td>{row.remark || '-'}</td>
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