import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchPanName() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [pan, setPan] = useState('');
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
  if (!pan || !fileNo || !consent) {
    swal.fire('Validation Error', 'All fields are required', 'warning');
    return;
  }

  if (wallet < credits) {
    swal.fire('Insufficient Credits', 'Not enough credits', 'error');
    return;
  }

  const confirm = await swal.fire({
    title: 'Confirm PAN Fetch',
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
    const res = await api.post('api/fetchName', {
      usr_ser_id,
      pan_number: pan,
      file_no: fileNo,
      consent: 'Y',
    });

    const apiData = res.data?.data;
    console.log('api', apiData);

    /* 🔴 GOVT / UPSTREAM SERVER ERROR HANDLING */
    if (apiData?.error?.code === 'UPSTREAM_INTERNAL_SERVER_ERROR') {
      swal.fire(
        'Service Unavailable',
        'Government PAN server is temporarily down. Please try again after some time.',
        'warning'
      );
      return;
    }

    const code = apiData?.data?.code;

    if (code === '1004') {
      swal.fire('Not Found', 'PAN does not exist', 'info');
      return;
    }

    if (code !== '1018') {
      swal.fire(
        'Failed',
        apiData?.data?.message || 'Fetch failed',
        'error'
      );
      return;
    }

    /* ✅ SUCCESS */
    setResult(apiData);

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
  } finally {
    setLoading(false);
  }
};


  const exportPdf = () => {
    const d = result?.data?.pan_data;
    if (!d) return;

    const safe = (v) => (v && v !== '-' ? v : '-');

    const doc = {
      content: [
        { text: 'PAN NAME FETCH REPORT', style: 'header' },

        {
          columns: [
            { text: `PAN Number: ${safe(d.document_id)}` },
            { text: `File Number: ${fileNo}`, alignment: 'right' },
          ],
          marginBottom: 8,
        },

        {
          columns: [
            { text: `Generated On: ${new Date().toLocaleString()}` },
            {
              text: 'Source: Income Tax Department (PAN)',
              alignment: 'right',
            },
          ],
          marginBottom: 15,
          fontSize: 9,
          color: 'gray',
        },

        {
          table: {
            widths: ['35%', '65%'],
            body: [
              ['PAN Number', safe(d.pan_number)],
              ['Name on PAN', safe(d.name)],
            ],
          },
        },

        {
          text:
            '\nDisclaimer:\n' +
            '1. This PAN name fetch report is generated electronically.\n' +
            '2. The data is sourced from Income Tax Department records.\n' +
            '3. This document is valid for informational purposes only.',
          fontSize: 9,
          italics: true,
          color: 'gray',
          marginTop: 15,
        },
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          marginBottom: 15,
        },
      },
    };

    pdfMake.createPdf(doc).download(`PAN_NAME_${fileNo}.pdf`);
  };

  const panData = result?.data?.pan_data;
  /* ================= UI ================= */
  return (
    <Row>
      <Col md={12}>
        <Card body className="mb-3">
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mb-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  PAN Number <Required />
                </Form.Label>
                <Form.Control
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
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
            {loading ? <Spinner size="sm" /> : 'Fetch PAN'}
          </Button>
        </Card>

        {panData && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>PAN Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>PAN Number</th>
                  <td>{panData.pan_number}</td>
                </tr>
                <tr>
                  <th>Name on PAN</th>
                  <td>{panData.name}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
