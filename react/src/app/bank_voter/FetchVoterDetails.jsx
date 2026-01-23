import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchVoterDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [voterId, setVoterId] = useState('');
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
    if (!voterId || !fileNo || !consent) {
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
      const res = await api.post('api/fetchVoterDetails', {
        usr_ser_id,
        voter_id: voterId,
        file_no: fileNo,
        consent: 'Y',
      });

      const code = res.data?.data?.data?.code;

      if (code === '1007') {
        swal.fire('Not Found', 'Voter ID does not exist', 'info');
        return;
      }

      if (code !== '1000') {
        swal.fire(
          'Failed',
          res.data?.data?.data?.message || 'Fetch failed',
          'error',
        );
        return;
      }

      setResult(res.data.data.data.voter_data);

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

  const exportPdf = () => {
    if (!result) return;

    const safe = (v) => (v && v !== '-' ? v : '-');

    const doc = {
      content: [
        { text: 'Voter Details Report', style: 'header' },
        { text: `Voter ID: ${safe(voterId)}` },
        { text: `File Number: ${safe(fileNo)}`, marginBottom: 10 },

        {
          table: {
            widths: ['40%', '60%'],
            body: [
              ['Document Type', safe(result.document_type)],
              ['Name', safe(result.name)],
              ['Father Name', safe(result.father_name)],
              ['Gender', safe(result.gender)],
              ['Age', safe(result.age)],
              ['District', safe(result.district)],
              ['State', safe(result.state)],
              [
                'Assembly Constituency No',
                safe(result.assembly_constituency_number),
              ],
              [
                'Assembly Constituency Name',
                safe(result.assembly_constituency_name),
              ],
              [
                'Parliamentary Constituency',
                safe(result.parliamentary_constituency_name),
              ],
              ['Part Number', safe(result.part_number)],
              ['Part Name', safe(result.part_name)],
              ['Serial Number', safe(result.serial_number)],
              ['Polling Station', safe(result.polling_station)],
            ],
          },
        },

        {
          text: '\nDisclaimer: Voter information is fetched from government sources. Availability of fields depends on electoral records.',
          fontSize: 9,
          italics: true,
          color: 'gray',
          marginTop: 10,
        },
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          marginBottom: 10,
        },
      },
    };

    pdfMake.createPdf(doc).download(`VOTER_${fileNo}.pdf`);
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
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Voter ID <Required />
                </Form.Label>
                <Form.Control
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
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
            {loading ? <Spinner size="sm" /> : 'Fetch Voter Details'}
          </Button>
        </Card>

        {/* RESULT */}
        {/* RESULT */}
        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Voter Details</h5>

              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3">
              <tbody>
                {Object.entries(result).map(([key, val]) => (
                  <tr key={key}>
                    <th>{key.replaceAll('_', ' ').toUpperCase()}</th>
                    <td>{val}</td>
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
