import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function PullPanDigilocker() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [pan, setPan] = useState('');
  const [fullName, setFullName] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= GUARD ================= */
  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
  }, [usr_ser_id, navigate]);

  /* ================= WALLET ================= */
  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get('api/getLoggedInUserWallet');
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= FETCH ================= */
  const handleFetch = async () => {
    if (!pan || !fullName || !fileNo || !consent) {
      swal.fire('Validation Error', 'All fields are required', 'warning');
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    const confirm = await swal.fire({
      title: 'Confirm PAN Pull',
      html: `
        <p><b>Credits Required:</b> ${credits}</p>
        <p><b>Available Credits:</b> ${wallet}</p>
        <p><b>File Number:</b> ${fileNo}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Proceed',
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('api/pan/digilocker/pull', {
        usr_ser_id,
        panno: pan,
        PANFullName: fullName,
        file_no: fileNo,
        consent: 'Y',
      });

      const apiData = res.data;

      if (!apiData.success) {
        swal.fire(
          'Failed',
          apiData?.data?.message || 'PAN pull failed',
          'error',
        );
        return;
      }

      setResult(apiData.data);

      swal.fire(
        'Success',
        `Credits Deducted: <b>${credits}</b><br/>
         Remaining Credits: <b>${wallet - credits}</b>`,
        'success',
      );

      fetchWallet();
    } catch (err) {
      swal.fire(
        'Error',
        err.response?.data?.message || 'Server error',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        {/* HEADER */}
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        {/* WALLET */}
        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        {/* FORM */}
        <Card body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  PAN Number <Required />
                </Form.Label>
                <Form.Control
                  value={pan}
                  onChange={(e) =>
                    setPan(e.target.value.toUpperCase())
                  }
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  Full Name (as per PAN) <Required />
                </Form.Label>
                <Form.Control
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  File Number <Required />
                </Form.Label>
                <Form.Control
                  value={fileNo}
                  onChange={(e) => setFileNo(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : 'Pull PAN'}
          </Button>
        </Card>

        {/* RESULT */}
        {result && (
          <Card body className="mt-4">
            <h5>Digilocker PAN Status</h5>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Status Code</th>
                  <td>{result.code}</td>
                </tr>
                <tr>
                  <th>Message</th>
                  <td>{result.message}</td>
                </tr>
                <tr>
                  <th>Document URI</th>
                  <td>{result.issued_file?.uri || '-'}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
