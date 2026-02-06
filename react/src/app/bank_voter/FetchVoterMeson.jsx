import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';

import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchVoterMeson() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};

  const [wallet, setWallet] = useState(0);
  const [fileNo, setFileNo] = useState('');
  const [voterId, setVoterId] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaImg, setCaptchaImg] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!usr_ser_id) navigate(-1);
    fetchWallet();
    initCaptcha();
  }, []);

  const fetchWallet = async () => {
    const res = await api.get('api/getLoggedInUserWallet');
    setWallet(Number(res.data?.data?.wallet_amount || 0));
  };

  /* ================= INIT CAPTCHA ================= */
  const initCaptcha = async () => {
    const res = await api.get('api/voterMesonInit');
    const data = res.data?.data;

    setCaptchaImg(data?.data?.captcha_base64);
    setTransactionId(data?.data?.transaction_id);
  };

  /* ================= FETCH DETAILS ================= */
  const handleFetch = async () => {
    if (!voterId || !captcha || !fileNo) {
      swal.fire('Validation Error', 'Required fields missing', 'warning');
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('api/voterMesonFetch', {
        usr_ser_id,
        file_no: fileNo,
        voter_id: voterId,
        captcha,
        consent: 'Y',
        transaction_id: transactionId,
      });

      const code = res.data?.data?.data?.code;

      if (code !== '1000') {
        swal.fire('Failed', res.data?.data?.data?.message, 'error');
        initCaptcha();
        return;
      }

      setResult(res.data.data);
      fetchWallet();
      swal.fire('Success', 'Voter details fetched', 'success');
    } catch (err) {
      swal.fire('Error', err.response?.data?.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const v = result?.data?.voter_data || {};
  const safe = (x) => (x ? x : '-');

  const exportPdf = () => {
    if (!result) return;

    const voter = result?.data?.voter_data || {};
    const meta = result || {};

    const safe = (v) => (v && v !== '-' ? v : '-');

    const formatDate = (ts) => (ts ? new Date(ts).toLocaleString() : '-');

    const docDefinition = {
      content: [
        { text: 'Voter Details Report', style: 'header' },

        {
          columns: [
            { text: `Voter ID: ${safe(voterId)}` },
            { text: `File Number: ${safe(fileNo)}`, alignment: 'right' },
          ],
          margin: [0, 0, 0, 10],
        },

        /* ================= VOTER DATA ================= */
        {
          text: 'Voter Information',
          style: 'subHeader',
          margin: [0, 0, 0, 8],
        },

        {
          table: {
            widths: ['40%', '60%'],
            body: [
              ['Document Type', safe(voter.document_type)],
              ['Name', safe(voter.name)],
              ['Father Name', safe(voter.father_name)],
              ['Gender', safe(voter.gender)],
              ['Age', safe(voter.age)],
              ['District', safe(voter.district)],
              ['State', safe(voter.state)],
              [
                'Assembly Constituency No',
                safe(voter.assembly_constituency_number),
              ],
              [
                'Assembly Constituency Name',
                safe(voter.assembly_constituency_name),
              ],
              [
                'Parliamentary Constituency',
                safe(voter.parliamentary_constituency_name),
              ],
              ['Part Number', safe(voter.part_number)],
              ['Part Name', safe(voter.part_name)],
              ['Serial Number', safe(voter.serial_number)],
              ['Polling Station', safe(voter.polling_station)],
            ],
          },
          layout: 'lightHorizontalLines',
        },

        {
          text:
            '\nDisclaimer: Voter information is fetched from government sources. ' +
            'Availability of fields depends on electoral records.',
          fontSize: 9,
          italics: true,
          color: 'gray',
          margin: [0, 10, 0, 0],
        },
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          marginBottom: 10,
        },
        subHeader: {
          fontSize: 14,
          bold: true,
        },
      },

      footer: function (currentPage, pageCount) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 5, 0, 0],
        };
      },
    };

    pdfMake.createPdf(docDefinition).download(`VOTER_${fileNo}.pdf`);
  };

  return (
    <Row>
      <Col md={12}>
        <Card body>
          <Button onClick={() => navigate(-1)}>← Back</Button>
          <h4 className="mt-3">{service_name}</h4>
          <p>
            Credits Required: <b>{credits}</b>
          </p>
        </Card>

        <Card body className="mt-3 text-center">
          <h6>💰 Wallet Balance</h6>
          <h2 className="text-success">{wallet}</h2>
        </Card>

        <Card body className="mt-3">
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

          {captchaImg && (
            <div className="mt-3 text-center">
              <img
                src={`data:image/jpeg;base64,${captchaImg}`}
                alt="captcha"
                style={{ maxHeight: 80 }}
              />
            </div>
          )}

          <Form.Group className="mt-2">
            <Form.Label>
              Captcha <Required />
            </Form.Label>
            <Form.Control
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
            />
          </Form.Group>

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : 'Fetch Voter Details'}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Voter Details</h5>

              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered>
              <tbody>
                <tr>
                  <th>Document Type</th>
                  <td>{safe(v.document_type)}</td>
                </tr>

                <tr>
                  <th>Name</th>
                  <td>{safe(v.name)}</td>
                </tr>

                <tr>
                  <th>Father Name</th>
                  <td>{safe(v.father_name)}</td>
                </tr>

                <tr>
                  <th>Gender</th>
                  <td>{safe(v.gender)}</td>
                </tr>

                <tr>
                  <th>Age</th>
                  <td>{safe(v.age)}</td>
                </tr>

                <tr>
                  <th>District</th>
                  <td>{safe(v.district)}</td>
                </tr>

                <tr>
                  <th>State</th>
                  <td>{safe(v.state)}</td>
                </tr>

                <tr>
                  <th>Assembly Constituency Number</th>
                  <td>{safe(v.assembly_constituency_number)}</td>
                </tr>

                <tr>
                  <th>Assembly Constituency Name</th>
                  <td>{safe(v.assembly_constituency_name)}</td>
                </tr>

                <tr>
                  <th>Parliamentary Constituency</th>
                  <td>{safe(v.parliamentary_constituency_name)}</td>
                </tr>

                <tr>
                  <th>Part Number</th>
                  <td>{safe(v.part_number)}</td>
                </tr>

                <tr>
                  <th>Part Name</th>
                  <td>{safe(v.part_name)}</td>
                </tr>

                <tr>
                  <th>Serial Number</th>
                  <td>{safe(v.serial_number)}</td>
                </tr>

                <tr>
                  <th>Polling Station</th>
                  <td>{safe(v.polling_station)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        )}
      </Col>
    </Row>
  );
}
