import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Table,
  Image,
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchDrivingLicense() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [dlNumber, setDlNumber] = useState('');
  const [dob, setDob] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [source, setSource] = useState(2);
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
    if (!dlNumber || !dob || !fileNo || !consent) {
      swal.fire('Validation Error', 'All fields are required', 'warning');
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    const confirm = await swal.fire({
      title: 'Confirm Driving License Fetch',
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
      const res = await api.post('api/fetchDrivingLicense', {
        usr_ser_id,
        driving_license_number: dlNumber,
        date_of_birth: dob,
        file_no: fileNo,
        source,
        consent: 'Y',
      });

      const apiData = res.data?.data;
      const code = apiData?.data?.code;

      if (code === '1001') {
        swal.fire('Not Found', 'Driving license does not exist', 'info');
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
    const d = result?.data?.driving_license_data;
    if (!d) return;

    const safe = (v) => (v && v !== '' ? v : '-');

    const vehicleClasses =
      d.vehicle_class_details
        ?.map((v) => `${v.category} (${v.authority})`)
        .join(', ') || '-';

    const doc = {
      content: [
        { text: 'Driving License Detailed Report', style: 'header' },
        { text: `DL Number: ${safe(d.document_id)}` },
        { text: `File Number: ${fileNo}`, marginBottom: 10 },

        {
          table: {
            widths: ['35%', '65%'],
            body: [
              ['Document Type', safe(d.document_type)],
              ['Name', safe(d.name)],
              ['Date of Birth', safe(d.date_of_birth)],
              ['Father / Guardian', safe(d.dependent_name)],
              ['Address', safe(d.address)],
              ['Pincode', safe(d.pincode)],
              ['Blood Group', safe(d.blood_group)],
              ['RTO Authority', safe(d.rto_details?.authority)],
              ['State', safe(d.rto_details?.state)],
              [
                'Non-Transport Validity',
                `${safe(d.validity?.non_transport?.issue_date)} → ${safe(
                  d.validity?.non_transport?.expiry_date,
                )}`,
              ],
              [
                'Transport Validity',
                `${safe(d.validity?.transport?.issue_date)} → ${safe(
                  d.validity?.transport?.expiry_date,
                )}`,
              ],
              ['Vehicle Classes', vehicleClasses],
            ],
          },
        },

        {
          text: '\nDisclaimer: Driving License details are fetched from government-authorized sources.',
          fontSize: 9,
          italics: true,
          color: 'gray',
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
      },
    };

    pdfMake.createPdf(doc).download(`Driving_License_${fileNo}.pdf`);
  };

  /* ================= UI ================= */
  const dl = result?.data?.driving_license_data;

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
                  DL Number <Required />
                </Form.Label>
                <Form.Control
                  value={dlNumber}
                  onChange={(e) => setDlNumber(e.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Date of Birth <Required />
                </Form.Label>
                <Form.Control
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-3">
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

            <Col md={6}>
              <Form.Group>
                <Form.Label>Source</Form.Label>
                <Form.Select
                  value={source}
                  onChange={(e) => setSource(Number(e.target.value))}
                >
                  <option value={2}>Secondary (Masked)</option>
                  <option value={1}>Primary (Unmasked)</option>
                </Form.Select>
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
            {loading ? <Spinner size="sm" /> : 'Fetch Driving License'}
          </Button>
        </Card>

        {dl && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between">
              <h5>Driving License Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                <tr>
                  <th>Document Type</th>
                  <td>{dl.document_type}</td>
                </tr>
                <tr>
                  <th>DL Number</th>
                  <td>{dl.document_id}</td>
                </tr>
                <tr>
                  <th>Name</th>
                  <td>{dl.name}</td>
                </tr>
                <tr>
                  <th>DOB</th>
                  <td>{dl.date_of_birth}</td>
                </tr>
                <tr>
                  <th>Father / Guardian</th>
                  <td>{dl.dependent_name}</td>
                </tr>
                <tr>
                  <th>Address</th>
                  <td>{dl.address}</td>
                </tr>
                <tr>
                  <th>Pincode</th>
                  <td>{dl.pincode || '-'}</td>
                </tr>
                <tr>
                  <th>Blood Group</th>
                  <td>{dl.blood_group}</td>
                </tr>

                <tr>
                  <th>RTO</th>
                  <td>{dl.rto_details?.authority}</td>
                </tr>

                <tr>
                  <th>State</th>
                  <td>{dl.rto_details?.state}</td>
                </tr>

                <tr>
                  <th>Non-Transport Validity</th>
                  <td>
                    {dl.validity?.non_transport?.issue_date} →{' '}
                    {dl.validity?.non_transport?.expiry_date}
                  </td>
                </tr>

                <tr>
                  <th>Transport Validity</th>
                  <td>
                    {dl.validity?.transport?.issue_date} →{' '}
                    {dl.validity?.transport?.expiry_date}
                  </td>
                </tr>

                <tr>
                  <th>Vehicle Classes</th>
                  <td>
                    {dl.vehicle_class_details?.map((v, i) => (
                      <div key={i}>
                        {v.category} ({v.authority})
                      </div>
                    ))}
                  </td>
                </tr>
              </tbody>
            </Table>

            {dl.photo_base64 && (
              <div className="text-center">
                <Image
                  src={`data:image/jpeg;base64,${dl.photo_base64}`}
                  thumbnail
                  style={{ maxWidth: 200 }}
                />
              </div>
            )}
          </Card>
        )}
      </Col>
    </Row>
  );
}
