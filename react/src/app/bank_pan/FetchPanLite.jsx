import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchPanLite() {
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
      title: 'Confirm PAN Lite Fetch',
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
      const res = await api.post('api/fetchLite', {
        usr_ser_id,
        pan_number: pan,
        file_no: fileNo,
        consent: 'Y',
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === '1004') {
        swal.fire('Not Found', 'PAN does not exist', 'info');
        return;
      }

      if (code !== '1000') {
        swal.fire('Failed', apiData?.data?.message || 'Fetch failed', 'error');
        return;
      }

      setResult(apiData);

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

  /* ================= EXPORT PDF ================= */
 const exportPdf = () => {
  if (!result) return;

  const safe = (v) => (v !== undefined && v !== null && v !== '' ? v : '-');

  const api = result;
  const d = api?.data?.pan_data || {};

  const doc = {
    content: [
      { text: 'PAN Lite Verification Report', style: 'header' },

      {
        table: {
          widths: ['35%', '65%'],
          body: [
            ['Request ID', safe(api.request_id)],
            ['API Status', safe(api.status)],
            ['Response Code', safe(api.data?.code)],
            ['Response Message', safe(api.data?.message)],
            ['API Path', safe(api.path)],
            [
              'Timestamp',
              api.timestamp
                ? new Date(api.timestamp).toLocaleString()
                : '-',
            ],
          ],
        },
        marginBottom: 15,
      },

      { text: 'Input Details', style: 'subHeader' },

      {
        table: {
          widths: ['35%', '65%'],
          body: [
            ['PAN Number', safe(pan)],
            ['File Number', safe(fileNo)],
          ],
        },
        marginBottom: 15,
      },

      { text: 'PAN Details', style: 'subHeader' },

      {
        table: {
          widths: ['35%', '65%'],
          body: [
            ['Document Type', safe(d.document_type)],
            ['Full Name', safe(d.name)],
          ],
        },
        marginBottom: 15,
      },

      {
        text:
          'Disclaimer:\nPAN Lite fetch returns basic PAN validation data as per government records. This document is system generated.',
        fontSize: 9,
        italics: true,
        color: 'gray',
      },
    ],

    styles: {
      header: {
        fontSize: 18,
        bold: true,
        marginBottom: 12,
      },
      subHeader: {
        fontSize: 14,
        bold: true,
        marginBottom: 6,
      },
    },
  };

  pdfMake.createPdf(doc).download(`PAN_LITE_${fileNo}.pdf`);
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
                  onChange={(e) => setPan(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : 'Fetch PAN Lite'}
          </Button>
        </Card>

        {panData && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>PAN Lite Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Document Type</th>
                  <td>{panData.document_type}</td>
                </tr>
                <tr>
                  <th>Full Name</th>
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
