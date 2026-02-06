// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchCinByPan() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};
//   const [consent, setConsent] = useState(false);
//   const [wallet, setWallet] = useState(0);
//   const [pan, setPan] = useState('');
//   const [fileNo, setFileNo] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     if (!usr_ser_id) navigate(-1);
//     fetchWallet();
//   }, []);

//   const fetchWallet = async () => {
//     const res = await api.get('api/getLoggedInUserWallet');
//     setWallet(Number(res.data?.data?.wallet_amount || 0));
//   };

//   const handleFetch = async () => {
//     if (!pan || !fileNo || !consent) {
//       swal.fire(
//         'Validation Error',
//         'PAN, File No and Consent are required',
//         'warning',
//       );
//       return;
//     }

//     if (wallet < credits) {
//       swal.fire('Insufficient Credits', 'Not enough credits', 'error');
//       return;
//     }

//     setLoading(true);
//     setResult(null);

//     try {
//       const res = await api.post('api/fetchCinByPan', {
//         usr_ser_id,
//         pan_number: pan,
//         file_no: fileNo,
//         consent: consent ? 'Y' : 'N',
//       });

//       const code = res.data?.data?.data?.code;

//       if (code !== '1014') {
//         swal.fire('Failed', res.data?.data?.data?.message, 'warning');
//         return;
//       }

//       setResult(res.data.data.data.cin_data);
//       fetchWallet();

//       swal.fire('Success', 'CIN details fetched successfully', 'success');
//     } catch (err) {
//       swal.fire(
//         'Error',
//         err.response?.data?.message || 'Server error',
//         'error',
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= PDF ================= */
//   const exportPdf = () => {
//     if (!result) return;

//     const doc = {
//       content: [
//         { text: 'CIN by PAN Report', style: 'header' },
//         { text: `PAN: ${pan}`, marginBottom: 10 },

//         {
//           table: {
//             widths: ['40%', '60%'],
//             body: [
//               ['Total CINs Found', result.cin_list.length],
//               ...result.cin_details.map((c, i) => [
//                 `CIN ${i + 1}`,
//                 `${c.cin} - ${c.entity_name}`,
//               ]),
//             ],
//           },
//           layout: 'lightHorizontalLines',
//         },
//       ],
//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 15 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`CIN_BY_PAN_${fileNo}.pdf`);
//   };

//   return (
//     <Row>
//       <Col md={12}>
//         <Card body>
//           <Button onClick={() => navigate(-1)}>← Back</Button>
//           <h4 className="mt-3">{service_name}</h4>
//           <p>
//             Credits Required: <b>{credits}</b>
//           </p>
//         </Card>

//         <Card body className="mt-3 text-center">
//           <h6>💰 Wallet Balance</h6>
//           <h2 className="text-success">{wallet}</h2>
//         </Card>

//         <Card body className="mt-3">
//           <Row className="g-3">
//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   PAN Number <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={pan}
//                   onChange={(e) => setPan(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>

//             <Col md={6}>
//               <Form.Group>
//                 <Form.Label>
//                   File Number <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={fileNo}
//                   onChange={(e) => setFileNo(e.target.value.toUpperCase())}
//                 />
//               </Form.Group>
//             </Col>
//           </Row>

//           <Form.Check
//             className="mt-3"
//             type="checkbox"
//             label={
//               <>
//                 I give consent <Required />
//               </>
//             }
//             checked={consent}
//             onChange={(e) => setConsent(e.target.checked)}
//           />

//           <Button className="mt-3" disabled={loading} onClick={handleFetch}>
//             {loading ? <Spinner size="sm" /> : 'Fetch CIN by PAN'}
//           </Button>
//         </Card>

//         {result && (
//           <>
//             <Card body className="mt-3 d-flex justify-content-between">
//               <h5>CIN Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </Card>

//             <Card body className="mt-2">
//               <Table bordered size="sm">
//                 <thead>
//                   <tr>
//                     <th>CIN</th>
//                     <th>Company Name</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {result.cin_details.map((c, i) => (
//                     <tr key={i}>
//                       <td>{c.cin}</td>
//                       <td>{c.entity_name}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </Table>
//             </Card>
//           </>
//         )}
//       </Col>
//     </Row>
//   );
// }
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import swal from 'sweetalert2';
import api from '../services/api';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

const Required = () => <span style={{ color: 'red' }}> *</span>;

export default function FetchCinByPan() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState(0);
  const [pan, setPan] = useState('');
  const [fileNo, setFileNo] = useState('');
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

  const handleFetch = async () => {
    if (!pan || !fileNo || !consent) {
      swal.fire(
        'Validation Error',
        'PAN, File No and Consent are required',
        'warning',
      );
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    const confirm = await swal.fire({
      title: 'Confirm CIN Fetch',
      html: `<p><b>Credits Required:</b> ${credits}</p>
           <p><b>Available Credits:</b> ${wallet}</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Proceed',
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('api/fetchCinByPan', {
        usr_ser_id,
        pan_number: pan.toUpperCase(),
        file_no: fileNo.toUpperCase(),
        consent: 'Y',
      });

      const data = res.data?.data;
      const code = data?.code;

      if (code !== '1014') {
        swal.fire('Info', data?.message || 'No CIN found', 'info');
        return;
      }

      setResult(data.cin_data);
      fetchWallet();

      swal.fire('Success', 'CIN details fetched successfully', 'success');
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

  /* ================= PDF ================= */
  const exportPdf = () => {
    if (!result) return;

    const doc = {
      content: [
        { text: 'CIN by PAN Report', style: 'header' },
        { text: `PAN: ${pan}`, marginBottom: 10 },

        {
          table: {
            widths: ['40%', '60%'],
            body: [
              ['Total CINs Found', result.cin_list.length],
              ...result.cin_details.map((c, i) => [
                `CIN ${i + 1}`,
                `${c.cin} - ${c.entity_name}`,
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 15 },
      },
    };

    pdfMake.createPdf(doc).download(`CIN_BY_PAN_${fileNo}.pdf`);
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
          <Row className="g-3">
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
                  onChange={(e) => setFileNo(e.target.value.toUpperCase())}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Check
            className="mt-3"
            type="checkbox"
            label={
              <>
                I give consent <Required />
              </>
            }
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button className="mt-3" disabled={loading} onClick={handleFetch}>
            {loading ? <Spinner size="sm" /> : 'Fetch CIN by PAN'}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h5>CIN Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            <Table bordered className="mt-3" size="sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CIN</th>
                  <th>Company Name</th>
                </tr>
              </thead>
              <tbody>
                {result.cin_details.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{c.cin}</td>
                    <td>{c.entity_name}</td>
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