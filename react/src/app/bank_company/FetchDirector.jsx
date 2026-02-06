// import React, { useEffect, useState } from 'react';
// import { Card, Row, Col, Form, Button, Spinner, Table } from 'react-bootstrap';
// import { useLocation, useNavigate } from 'react-router-dom';
// import swal from 'sweetalert2';
// import api from '../services/api';

// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.vfs;

// const Required = () => <span style={{ color: 'red' }}> *</span>;

// export default function FetchDirector() {
//   const navigate = useNavigate();
//   const { state } = useLocation();
//   const { usr_ser_id, service_name, credits } = state || {};
//   const [consent, setConsent] = useState(false);
//   const [wallet, setWallet] = useState(0);
//   const [din, setDin] = useState('');
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
//     if (!din || !fileNo || !consent) {
//       swal.fire(
//         'Validation Error',
//         'DIN, File No and Consent are required',
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
//       const res = await api.post('api/fetchDirector', {
//         usr_ser_id,
//         din,
//         file_no: fileNo,
//         consent: consent ? 'Y' : 'N',
//       });

//       const code = res.data?.data?.data?.code;

//       if (code !== '1002') {
//         swal.fire('Failed', res.data?.data?.data?.message, 'warning');
//         return;
//       }

//       setResult(res.data.data.data.director_data);
//       fetchWallet();

//       swal.fire('Success', 'Director details fetched', 'success');
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
//         { text: 'Director Details Report', style: 'header' },
//         { text: `DIN: ${result.din}` },
//         { text: `Name: ${result.name}`, marginBottom: 10 },

//         result.company_details?.length > 0 && {
//           text: 'Company Associations',
//           style: 'section',
//         },

//         result.company_details?.length > 0 && {
//           table: {
//             widths: ['25%', '35%', '20%', '20%'],
//             body: [
//               ['CIN', 'Company Name', 'Begin Date', 'Status'],
//               ...result.company_details.map((c) => [
//                 c.cin,
//                 c.company_name,
//                 c.begin_date,
//                 c.active_compliance,
//               ]),
//             ],
//           },
//           layout: 'lightHorizontalLines',
//         },

//         result.llp_details?.length > 0 && {
//           text: 'LLP Associations',
//           style: 'section',
//         },

//         result.llp_details?.length > 0 && {
//           table: {
//             widths: ['30%', '40%', '30%'],
//             body: [
//               ['LLPIN', 'LLP Name', 'Begin Date'],
//               ...result.llp_details.map((l) => [
//                 l.llpin,
//                 l.llp_name,
//                 l.begin_date,
//               ]),
//             ],
//           },
//           layout: 'lightHorizontalLines',
//         },
//       ].filter(Boolean),

//       styles: {
//         header: { fontSize: 18, bold: true, marginBottom: 15 },
//         section: { fontSize: 14, bold: true, marginTop: 15 },
//       },
//     };

//     pdfMake.createPdf(doc).download(`DIRECTOR_${fileNo}.pdf`);
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
//                   DIN <Required />
//                 </Form.Label>
//                 <Form.Control
//                   value={din}
//                   onChange={(e) => setDin(e.target.value.toUpperCase())}
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
//             {loading ? <Spinner size="sm" /> : 'Fetch Director'}
//           </Button>
//         </Card>

//         {result && (
//           <>
//             <Card body className="mt-3 d-flex justify-content-between">
//               <h5>Director Details</h5>
//               <Button variant="outline-primary" onClick={exportPdf}>
//                 Export PDF
//               </Button>
//             </Card>

//             <Card body className="mt-2">
//               <p>
//                 <b>DIN:</b> {result.din}
//               </p>
//               <p>
//                 <b>Name:</b> {result.name}
//               </p>

//               {result.company_details?.length > 0 && (
//                 <>
//                   <h6 className="mt-3">Company Associations</h6>
//                   <Table bordered size="sm">
//                     <thead>
//                       <tr>
//                         <th>CIN</th>
//                         <th>Company Name</th>
//                         <th>Begin Date</th>
//                         <th>Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {result.company_details.map((c, i) => (
//                         <tr key={i}>
//                           <td>{c.cin}</td>
//                           <td>{c.company_name}</td>
//                           <td>{c.begin_date}</td>
//                           <td>{c.active_compliance}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </Table>
//                 </>
//               )}

//               {result.llp_details?.length > 0 && (
//                 <>
//                   <h6 className="mt-3">LLP Associations</h6>
//                   <Table bordered size="sm">
//                     <thead>
//                       <tr>
//                         <th>LLPIN</th>
//                         <th>LLP Name</th>
//                         <th>Begin Date</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {result.llp_details.map((l, i) => (
//                         <tr key={i}>
//                           <td>{l.llpin}</td>
//                           <td>{l.llp_name}</td>
//                           <td>{l.begin_date}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </Table>
//                 </>
//               )}
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

export default function FetchDirector() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { usr_ser_id, service_name, credits } = state || {};
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState(0);
  const [din, setDin] = useState('');
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
    // ===== Validation =====
    if (!din || !fileNo || !consent) {
      swal.fire(
        'Validation Error',
        'DIN, File No and Consent are required',
        'warning',
      );
      return;
    }

    if (wallet < credits) {
      swal.fire('Insufficient Credits', 'Not enough credits', 'error');
      return;
    }

    // ✅ SAME CONFIRMATION UI (EXACT MATCH)
    const confirm = await swal.fire({
      title: 'Confirm Director Fetch',
      html: `
      <p><b>Credits Required:</b> ${credits}</p>
      <p><b>Available Credits:</b> ${wallet}</p>
    `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Proceed',
    });

    if (!confirm.isConfirmed) return;

    // ===== Proceed after confirmation =====
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('api/fetchDirector', {
        usr_ser_id,
        din,
        file_no: fileNo,
        consent: 'Y',
      });

      const data = res.data?.data?.data;
      const code = data?.code;

      if (code !== '1002') {
        swal.fire(
          'Failed',
          data?.message || 'Unable to fetch director',
          'warning',
        );
        return;
      }

      setResult(data.director_data);
      fetchWallet();

      // ✅ SAME SUCCESS UI PATTERN
      swal.fire(
        'Success',
        `Director details fetched successfully<br/>
       Credits Deducted: <b>${credits}</b><br/>
       Remaining Credits: <b>${wallet - credits}</b>`,
        'success',
      );
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
    if (!result) {
      swal.fire('No Data', 'Nothing to export', 'warning');
      return;
    }

    const safe = (val) =>
      val !== undefined && val !== null && val !== '' ? val : '-';

    const doc = {
      content: [
        { text: 'Director Details Report', style: 'header' },
        { text: `DIN: ${safe(result.din)}` },
        { text: `Name: ${safe(result.name)}`, marginBottom: 10 },

        // ===== COMPANY ASSOCIATIONS =====
        ...(result.company_details?.length
          ? [
              { text: 'Company Associations', style: 'section' },
              {
                table: {
                  headerRows: 1,
                  widths: ['25%', '35%', '20%', '20%'],
                  body: [
                    ['CIN', 'Company Name', 'Begin Date', 'Status'],
                    ...result.company_details.map((c) => [
                      safe(c.cin),
                      safe(c.company_name),
                      safe(c.begin_date),
                      safe(c.active_compliance),
                    ]),
                  ],
                },
                layout: 'lightHorizontalLines',
              },
            ]
          : []),

        // ===== LLP ASSOCIATIONS =====
        ...(result.llp_details?.length
          ? [
              { text: 'LLP Associations', style: 'section' },
              {
                table: {
                  headerRows: 1,
                  widths: ['30%', '40%', '30%'],
                  body: [
                    ['LLPIN', 'LLP Name', 'Begin Date'],
                    ...result.llp_details.map((l) => [
                      safe(l.llpin),
                      safe(l.llp_name),
                      safe(l.begin_date),
                    ]),
                  ],
                },
                layout: 'lightHorizontalLines',
              },
            ]
          : []),
      ],

      styles: {
        header: { fontSize: 18, bold: true, marginBottom: 15 },
        section: { fontSize: 14, bold: true, marginTop: 15 },
      },
      defaultStyle: {
        fontSize: 10,
      },
    };

    pdfMake.createPdf(doc).download(`DIRECTOR_${fileNo || 'REPORT'}.pdf`);
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
                  DIN <Required />
                </Form.Label>
                <Form.Control
                  value={din}
                  onChange={(e) => setDin(e.target.value.toUpperCase())}
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
            {loading ? <Spinner size="sm" /> : 'Fetch Director'}
          </Button>
        </Card>

        {result && (
          <Card body className="mt-4">
            {/* HEADER ROW (SAME AS COMPANY UI) */}
            <div className="d-flex justify-content-between">
              <h5>Director Details</h5>
              <Button variant="outline-primary" onClick={exportPdf}>
                Export PDF
              </Button>
            </div>

            {/* DIRECTOR BASIC INFO */}
            <p className="mt-3">
              <b>DIN:</b> {result.din}
            </p>
            <p>
              <b>Name:</b> {result.name}
            </p>

            {/* COMPANY ASSOCIATIONS */}
            {result.company_details?.length > 0 && (
              <>
                <h6 className="mt-3">Company Associations</h6>
                <Table bordered className="mt-2" size="sm">
                  <thead>
                    <tr>
                      <th>CIN</th>
                      <th>Company Name</th>
                      <th>Begin Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.company_details.map((c, i) => (
                      <tr key={i}>
                        <td>{c.cin}</td>
                        <td>{c.company_name}</td>
                        <td>{c.begin_date}</td>
                        <td>{c.active_compliance}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}

            {/* LLP ASSOCIATIONS */}
            {result.llp_details?.length > 0 && (
              <>
                <h6 className="mt-3">LLP Associations</h6>
                <Table bordered className="mt-2" size="sm">
                  <thead>
                    <tr>
                      <th>LLPIN</th>
                      <th>LLP Name</th>
                      <th>Begin Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.llp_details.map((l, i) => (
                      <tr key={i}>
                        <td>{l.llpin}</td>
                        <td>{l.llp_name}</td>
                        <td>{l.begin_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card>
        )}
      </Col>
    </Row>
  );
}