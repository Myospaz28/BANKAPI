// import React, { useState } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';

// export default function CCRVGenerateReport() {
//   const [name, setName] = useState('');
//   const [address, setAddress] = useState('');
//   const [fatherName, setFatherName] = useState('');
//   const [additionalAddress, setAdditionalAddress] = useState('');
//   const [dob, setDob] = useState('');
//   // const [loading, setLoading] = useState(false);
//   // const [error, setError] = useState('');
//   // const [response, setResponse] = useState(null);
//    const [loading, setLoading] = useState(false);   // ✅ FIX
//   const [error, setError] = useState('');           // ✅ FIX
//   const [response, setResponse] = useState(null);  
// const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setResponse(null);

//     if (!name || !address) {
//       setError('Name and Address are mandatory');
//       return;
//     }

//     setLoading(true);

//     try {
//       const { data } = await axios.post(
//         'https://stoplight.io/mocks/gridlines/gridlines-api-docs/322908232/ccrv-api/generate-report',
//         {
//           name,
//           address,
//           father_name: fatherName || undefined,
//           additional_address: additionalAddress || undefined,
//           date_of_birth: dob || undefined,
//           consent: 'Y',
//         },
//         {
//           headers: {
//             'X-Auth-Type': 'API-Key',
//             'X-Reference-ID': `CCRV-${Date.now()}`,
//             'X-API-Key': 'AuccMxDhx8YJEowcosBg8FEM73OIb6N1',
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//         }
//       );

//      setResponse(data);

// if (data?.data?.transaction_id) {
//   const cleanTransactionId = data.data.transaction_id.replace(/"/g, '');
//   navigate('/services/CCRVFetchReport', {
//     state: {
//        transactionId: cleanTransactionId,
//     },
//   });
// }

//     } catch (err) {
//       console.error(err);
//       setError('Failed to generate CCRV report');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mt-4">
//       <h4 className="mb-3">CCRV Report Generation</h4>

//       {/* FORM */}
//       <form onSubmit={handleSubmit} className="card p-3 mb-4">
//         <div className="mb-3">
//           <label className="form-label">Full Name *</label>
//           <input
//             type="text"
//             className="form-control"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="Aditya Kapoor"
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">Address *</label>
//           <textarea
//             className="form-control"
//             rows={2}
//             value={address}
//             onChange={(e) => setAddress(e.target.value)}
//             placeholder="A-123, Sector-45, Gurgaon"
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">Father Name (Optional)</label>
//           <input
//             type="text"
//             className="form-control"
//             value={fatherName}
//             onChange={(e) => setFatherName(e.target.value)}
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">Additional Address (Optional)</label>
//           <textarea
//             className="form-control"
//             rows={2}
//             value={additionalAddress}
//             onChange={(e) => setAdditionalAddress(e.target.value)}
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">Date of Birth (Optional)</label>
//           <input
//             type="date"
//             className="form-control"
//             value={dob}
//             onChange={(e) => setDob(e.target.value)}
//           />
//         </div>

//         <button className="btn btn-primary" disabled={loading}>
//           {loading ? 'Generating Report...' : 'Generate Report'}
//         </button>
//       </form>

//       {/* ERROR */}
//       {error && <div className="alert alert-danger">{error}</div>}

//       {/* RESPONSE */}
//       {response && (
//         <div className="card p-3">
//           <h5>API Response</h5>

//           <p><strong>Status:</strong> {response.status}</p>
//           <p><strong>Code:</strong> {response.data?.code}</p>
//           <p><strong>Message:</strong> {response.data?.message}</p>
//           <p><strong>Transaction ID:</strong> {response.data?.transaction_id}</p>

//           <div className="alert alert-info mt-3">
//             <strong>CCRV Status:</strong>{' '}
//             {response.data?.ccrv_status}
//           </div>

//           <small className="text-muted">
//             This is an asynchronous process. Final report will be delivered via callback URL.
//           </small>
//         </div>
//       )}
//     </div>
//   );
// }
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/* -------------------------
   DUMMY WALLET CONFIG
------------------------- */
const CCRV_CREDITS = 30;

export default function CCRVGenerateReport() {
  const navigate = useNavigate();

  /* -------------------------
     WALLET (DUMMY)
  ------------------------- */
  const [walletBalance, setWalletBalance] = useState(3200);

  /* -------------------------
     FORM STATE
  ------------------------- */
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [additionalAddress, setAdditionalAddress] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  /* -------------------------
     SUBMIT HANDLER
  ------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResponse(null);

    if (!name || !address) {
      setError('Name and Address are mandatory');
      return;
    }

    if (walletBalance < CCRV_CREDITS) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(
        'https://stoplight.io/mocks/gridlines/gridlines-api-docs/322908232/ccrv-api/generate-report',
        {
          name,
          address,
          father_name: fatherName || undefined,
          additional_address: additionalAddress || undefined,
          date_of_birth: dob || undefined,
          consent: 'Y',
        },
        {
          headers: {
            'X-Auth-Type': 'API-Key',
            'X-Reference-ID': `CCRV-${Date.now()}`,
            'X-API-Key': 'AuccMxDhx8YJEowcosBg8FEM73OIb6N1',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      setResponse(data);

      /* -------------------------
         DEDUCT CREDITS (UI ONLY)
      ------------------------- */
      setWalletBalance((prev) => prev - CCRV_CREDITS);

      /* -------------------------
         NAVIGATE TO STAGE 2
      ------------------------- */
      if (data?.data?.transaction_id) {
        const cleanTransactionId = data.data.transaction_id.replace(/"/g, '');
        navigate('/services/CCRVFetchReport', {
          state: { transactionId: cleanTransactionId },
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate CCRV report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">

      {/* -------------------------
          HEADER (BACK + WALLET)
      ------------------------- */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className="text-end">
          <div className="fw-bold">Wallet Balance</div>
          <div className="text-success">
            {walletBalance} Credits
          </div>
        </div>
      </div>

      <h4 className="mb-2">CCRV Report Generation</h4>

      <p className="text-muted mb-3">
        Credits Required: <strong>{CCRV_CREDITS}</strong>
      </p>

      {/* -------------------------
          FORM
      ------------------------- */}
      <form onSubmit={handleSubmit} className="card p-3 mb-4">
        <div className="mb-3">
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aditya Kapoor"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Address *</label>
          <textarea
            className="form-control"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="A-123, Sector-45, Gurgaon"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Father Name (Optional)</label>
          <input
            type="text"
            className="form-control"
            value={fatherName}
            onChange={(e) => setFatherName(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Additional Address (Optional)</label>
          <textarea
            className="form-control"
            rows={2}
            value={additionalAddress}
            onChange={(e) => setAdditionalAddress(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Date of Birth (Optional)</label>
          <input
            type="date"
            className="form-control"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={loading || walletBalance < CCRV_CREDITS}
        >
          {loading ? 'Generating Report...' : 'Generate Report'}
        </button>
      </form>

      {/* -------------------------
          ERROR
      ------------------------- */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* -------------------------
          RESPONSE
      ------------------------- */}
      {response && (
        <div className="card p-3">
          <h5>API Response</h5>

          <p><strong>Status:</strong> {response.status}</p>
          <p><strong>Code:</strong> {response.data?.code}</p>
          <p><strong>Message:</strong> {response.data?.message}</p>
          <p><strong>Transaction ID:</strong> {response.data?.transaction_id}</p>

          <div className="alert alert-info mt-3">
            <strong>CCRV Status:</strong> {response.data?.ccrv_status}
          </div>

          <small className="text-muted">
            This is an asynchronous process. Final report will be delivered via callback URL.
          </small>
        </div>
      )}
    </div>
  );
}
