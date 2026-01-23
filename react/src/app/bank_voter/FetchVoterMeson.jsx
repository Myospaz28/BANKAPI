import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchMesonVoterDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [voterId, setVoterId] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaImg, setCaptchaImg] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= INIT ================= */

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
    loadCaptcha();
  }, [usr_ser_id, navigate]);

  const fetchWallet = async () => {
    const res = await api.get('api/getLoggedInUserWallet');
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= CAPTCHA ================= */

  const loadCaptcha = async () => {
    try {
      const res = await api.post('api/meson/captcha');
      setCaptchaImg(`data:image/png;base64,${res.data.captcha_base64}`);
      setTransactionId(res.data.transaction_id);
      setCaptchaInput('');
    } catch {
      swal.fire('Error', 'Failed to load captcha', 'error');
    }
  };

  /* ================= FETCH ================= */

  const handleFetch = async () => {
    if (!voterId || !fileNo || !captchaInput || !consent) {
      swal.fire('Validation Error', 'All fields are required', 'warning');
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    const confirm = await swal.fire({
      title: 'Confirm Voter Fetch',
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
      const res = await api.post('api/fetchMeson', {
        usr_ser_id,
        voter_id: voterId,
        file_no: fileNo,
        captcha: captchaInput,
        transaction_id: transactionId,
        consent: 'Y',
      });

      const code = res.data?.data?.data?.code;

      // ❌ INVALID CAPTCHA → AUTO REFRESH
      if (code === '1003') {
        swal.fire('Invalid Captcha', 'Please try again', 'warning');
        loadCaptcha();
        return;
      }

      // ❌ NOT FOUND
      if (code === '1007') {
        swal.fire('Not Found', 'Voter ID does not exist', 'info');
        return;
      }

      // ❌ OTHER ERRORS
      if (code !== '1000') {
        swal.fire(
          'Failed',
          res.data?.data?.data?.message || 'Fetch failed',
          'error'
        );
        loadCaptcha();
        return;
      }

      // ✅ SUCCESS
      setResult(res.data.data.data.voter_data);

      swal.fire(
        'Success',
        `Credits Deducted: <b>${credits}</b><br/>
         Remaining Credits: <b>${wallet - credits}</b>`,
        'success'
      );

      fetchWallet();
    } catch (err) {
      swal.fire(
        'Error',
        err.response?.data?.message || 'Server error',
        'error'
      );
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF ================= */

  const exportPdf = () => {
    if (!result) return;

    const doc = {
      content: [
        { text: 'Meson Voter Details Report', style: 'header' },
        { text: `Voter ID: ${voterId}` },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },
        {
          table: {
            widths: ['40%', '60%'],
            body: Object.entries(result).map(([k, v]) => [
              k.replaceAll('_', ' ').toUpperCase(),
              v || '-',
            ]),
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
    };

    pdfMake.createPdf(doc).download(`MESON_VOTER_${fileNo}.pdf`);
  };

  /* ================= UI ================= */

  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>Credits Required: <b>{credits}</b></p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Voter ID <Required /></Form.Label>
                <Form.Control value={voterId} onChange={e => setVoterId(e.target.value)} />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>File Number <Required /></Form.Label>
                <Form.Control value={fileNo} onChange={e => setFileNo(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>

          {/* CAPTCHA */}
          <Row className="mt-3 align-items-center">
            <Col md={4}>
              <img src={captchaImg} alt="captcha" />
            </Col>
            <Col md={4}>
              <Form.Control
                placeholder="Enter Captcha"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Button variant="outline-secondary" onClick={loadCaptcha}>
                Refresh Captcha
              </Button>
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            label={<>I give consent <Required /></>}
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : 'Fetch Voter Details'}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>Voter Details</h5>
              <Button onClick={exportPdf}>Export PDF</Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                {Object.entries(result).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k.replaceAll('_', ' ').toUpperCase()}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
