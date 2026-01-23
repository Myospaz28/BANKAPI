import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchDrivingLicenseOCR() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileFront, setFileFront] = useState(null);
  const [fileBack, setFileBack] = useState(null);
  const [fileNo, setFileNo] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get('api/getLoggedInUserWallet');
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  const ocr = result?.data?.ocr_data || {};

  const normalizedOcr = {
    document_id: ocr.document_id || '-',
    name: ocr.name || '-',
    date_of_birth: ocr.date_of_birth || '-',
    issued_date: ocr.issued_date || '-',
    valid_till: ocr.valid_till || '-',
    dependent_name: ocr.dependent_name || '-',
    place_of_issue: ocr.place_of_issue || '-',
    address: ocr.address || '-',
  };

  const handleFetch = async () => {
    if (!fileFront || !fileNo || !consent) {
      swal.fire('Validation Error', 'Required fields missing', 'warning');
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('usr_ser_id', usr_ser_id);
    formData.append('file_no', fileNo);
    formData.append('file_front', fileFront);
    if (fileBack) formData.append('file_back', fileBack);
    formData.append('consent', 'Y');

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('api/drivingLicenseOcr', formData);

      const code = res.data?.data?.data?.code;

      if (code !== '1002') {
        swal.fire('Failed', res.data?.data?.data?.message, 'error');
        return;
      }

      setResult(res.data.data);
      fetchWallet();

      swal.fire('Success', 'OCR data extracted', 'success');
    } catch (err) {
      swal.fire('Error', err.response?.data?.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const safe = (v) =>
    v === undefined || v === null || v === '' ? '-' : String(v);

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const o = normalizedOcr;

    const doc = {
      content: [
        { text: 'Driving License OCR Report', style: 'header' },

        { text: `Request ID: ${safe(result.request_id)}` },
        { text: `Transaction ID: ${safe(result.transaction_id)}` },
        { text: `Status: ${safe(result.status)}` },
        { text: `Message: ${safe(result.data?.message)}` },
        { text: `File Number: ${safe(fileNo)}`, marginBottom: 10 },

        {
          table: {
            widths: ['35%', '65%'],
            body: [
              ['DL Number', safe(o.document_id)],
              ['Name', safe(o.name)],
              ['Date of Birth', safe(o.date_of_birth)],
              ['Issued Date', safe(o.issued_date)],
              ['Valid Till', safe(o.valid_till)],
              ['Father / Guardian', safe(o.dependent_name)],
              ['Place of Issue', safe(o.place_of_issue)],
              ['Address', safe(o.address)],
              ['API Path', safe(result.path)],
              ['Timestamp', safe(result.timestamp)],
            ],
          },
          layout: 'lightHorizontalLines',
        },

        {
          text: '\nDisclaimer: This document is generated based on OCR extraction and may contain inaccuracies.',
          fontSize: 9,
          italics: true,
          color: 'gray',
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 10 },
      },
      defaultStyle: { fontSize: 11 },
    };

    pdfMake.createPdf(doc).download(`DL_OCR_${fileNo}.pdf`);
  };

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
        <Card body className="mt-3">
          <Form.Group>
            <Form.Label>
              Front Image <Required />
            </Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => setFileFront(e.target.files[0])}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Back Image</Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => setFileBack(e.target.files[0])}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>
              File Number <Required />
            </Form.Label>
            <Form.Control
              value={fileNo}
              onChange={(e) => setFileNo(e.target.value)}
            />
          </Form.Group>

          <Form.Check
            className="mt-2"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : 'Upload & Extract'}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <Button variant="outline-primary" onClick={exportPdf}>
              Export PDF
            </Button>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Request ID</th>
                  <td>{safe(result?.request_id)}</td>
                </tr>

                <tr>
                  <th>Transaction ID</th>
                  <td>{safe(result?.transaction_id)}</td>
                </tr>

                <tr>
                  <th>Status</th>
                  <td>{safe(result?.status)}</td>
                </tr>

                <tr>
                  <th>Message</th>
                  <td>{safe(result?.data?.message)}</td>
                </tr>

                <tr>
                  <th>DL Number</th>
                  <td>{safe(normalizedOcr?.document_id)}</td>
                </tr>

                <tr>
                  <th>Name</th>
                  <td>{safe(normalizedOcr?.name)}</td>
                </tr>

                <tr>
                  <th>DOB</th>
                  <td>{safe(normalizedOcr?.date_of_birth)}</td>
                </tr>

                <tr>
                  <th>Issue Date</th>
                  <td>{safe(normalizedOcr?.issued_date)}</td>
                </tr>

                <tr>
                  <th>Valid Till</th>
                  <td>{safe(normalizedOcr?.valid_till)}</td>
                </tr>

                <tr>
                  <th>Father / Guardian</th>
                  <td>{safe(normalizedOcr?.dependent_name)}</td>
                </tr>

                <tr>
                  <th>Place of Issue</th>
                  <td>{safe(normalizedOcr?.place_of_issue)}</td>
                </tr>

                <tr>
                  <th>Address</th>
                  <td>{safe(normalizedOcr?.address)}</td>
                </tr>

                <tr>
                  <th>Timestamp</th>
                  <td>{safe(result?.timestamp)}</td>
                </tr>

                <tr>
                  <th>API Path</th>
                  <td>{safe(result?.path)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
