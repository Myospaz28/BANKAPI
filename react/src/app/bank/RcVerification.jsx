// import React, { useState } from 'react';
// import axios from 'axios';

// export default function RcVerification() {
//   const [rcNumber, setRcNumber] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [response, setResponse] = useState(null);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setResponse(null);

//     if (!rcNumber) {
//       setError('RC Number is required');
//       return;
//     }

//     setLoading(true);

//     try {
//       const { data } = await axios.post(
//         'https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154724/rc-api/fetch-contact',
//         {
//           rc_number: rcNumber.toUpperCase(),
//           consent: 'Y',
//         },
//         {
//           headers: {
//             'X-Auth-Type': 'API-Key',
//             'X-Reference-ID': `RC-${Date.now()}`,
//             'X-API-Key': 'AuccMxDhx8YJEowcosBg8FEM73OIb6N1',
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//         }
//       );

//       setResponse(data);
//     } catch (err) {
//       console.error(err);
//       setError('Failed to fetch RC details');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mt-4">
//       <h4 className="mb-3">RC Verification (Vehicle Registration)</h4>

//       {/* FORM */}
//       <form onSubmit={handleSubmit} className="card p-3 mb-4">
//         <div className="mb-3">
//           <label className="form-label">RC Number</label>
//           <input
//             type="text"
//             className="form-control"
//             placeholder="AP09XXXXXX"
//             value={rcNumber}
//             onChange={(e) => setRcNumber(e.target.value)}
//           />
//         </div>

//         <button className="btn btn-primary" disabled={loading}>
//           {loading ? 'Verifying...' : 'Verify RC'}
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

//           {/* RC DATA */}
//           {response.data?.rc_data && (
//             <div className="card p-3 mt-4">
//               <h6 className="mb-3">RC Contact Details</h6>

//               <p>
//                 <strong>Document Type:</strong>{' '}
//                 {response.data.rc_data.document_type}
//               </p>

//               <p>
//                 <strong>RC Number:</strong>{' '}
//                 {response.data.rc_data.rc_number}
//               </p>

//               <p>
//                 <strong>Registered Mobile:</strong>{' '}
//                 {response.data.rc_data.mobile_number}
//               </p>
//             </div>
//           )}

//           {/* NO RECORD */}
//           {response.data?.code === '1011' && (
//             <div className="alert alert-warning mt-3">
//               No RC record found for the provided number.
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/* -------------------------
   WALLET CONFIG (DUMMY)
------------------------- */
const RC_CREDITS = 12;

export default function RCVerification() {
  const navigate = useNavigate();

  /* -------------------------
     WALLET (DUMMY)
  ------------------------- */
  const [walletBalance, setWalletBalance] = useState(3200);

  /* -------------------------
     FORM STATE
  ------------------------- */
  const [rcNumber, setRcNumber] = useState('');
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

    if (!rcNumber) {
      setError('RC Number is required');
      return;
    }

    if (walletBalance < RC_CREDITS) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(
        'https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154724/rc-api/fetch-contact',
        {
          rc_number: rcNumber,
          consent: 'Y',
        },
        {
          headers: {
            'X-Auth-Type': 'API-Key',
            'X-Reference-ID': `RC-${Date.now()}`,
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
      setWalletBalance((prev) => prev - RC_CREDITS);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch RC details');
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

      <h4 className="mb-2">RC Verification (Vehicle Registration)</h4>

      <p className="text-muted mb-3">
        Credits Required: <strong>{RC_CREDITS}</strong>
      </p>

      {/* -------------------------
          FORM
      ------------------------- */}
      <form onSubmit={handleSubmit} className="card p-3 mb-4">
        <div className="mb-3">
          <label className="form-label">RC Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="AP09XXXXXX"
            value={rcNumber}
            onChange={(e) => setRcNumber(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={loading || walletBalance < RC_CREDITS}
        >
          {loading ? 'Verifying...' : 'Verify RC'}
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

          {/* RC DATA */}
          {response.data?.rc_data && (
            <div className="card p-3 mt-4">
              <h6 className="mb-3">RC Contact Details</h6>

              <p>
                <strong>Document Type:</strong>{' '}
                {response.data.rc_data.document_type}
              </p>

              <p>
                <strong>RC Number:</strong>{' '}
                {response.data.rc_data.rc_number}
              </p>

              <p>
                <strong>Registered Mobile:</strong>{' '}
                {response.data.rc_data.mobile_number}
              </p>
            </div>
          )}

          {/* NO RECORD */}
          {response.data?.code === '1011' && (
            <div className="alert alert-warning mt-3">
              No RC record found for the provided number.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
