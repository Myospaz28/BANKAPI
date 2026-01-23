// import React, { useState } from 'react';
// import axios from 'axios';

// export default function FetchPanByMobile() {
//   const [phone, setPhone] = useState('');
//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [response, setResponse] = useState(null);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setResponse(null);

//     if (!phone || !firstName) {
//       setError('Mobile number and First Name are required');
//       return;
//     }

//     setLoading(true);

//     try {
//       const { data } = await axios.post(
//         'https://stoplight.io/mocks/gridlines/gridlines-api-docs/11729114/profile-api/individual/fetch-pan',
//         {
//           phone: phone,
//           first_name: firstName,
//           last_name: lastName || undefined,
//           consent_text: 'I provide consent to process my information.',
//           consent: 'Y',
//         },
//         {
//           headers: {
//             'X-Auth-Type': 'API-Key',
//             'X-Reference-ID': `PAN-${Date.now()}`,
//             'X-API-Key': 'AuccMxDhx8YJEowcosBg8FEM73OIb6N1',
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//         }
//       );

//       setResponse(data);
//     } catch (err) {
//       console.error(err);
//       setError('Failed to fetch PAN details');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mt-4">
//       <h4 className="mb-3">PAN Verification (Fetch by Mobile)</h4>

//       {/* FORM */}
//       <form onSubmit={handleSubmit} className="card p-3 mb-4">
//         <div className="mb-3">
//           <label className="form-label">Mobile Number</label>
//           <input
//             type="text"
//             className="form-control"
//             placeholder="9898898999"
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">First Name</label>
//           <input
//             type="text"
//             className="form-control"
//             placeholder="JOHN"
//             value={firstName}
//             onChange={(e) => setFirstName(e.target.value.toUpperCase())}
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">Last Name (Optional)</label>
//           <input
//             type="text"
//             className="form-control"
//             placeholder="SMITH"
//             value={lastName}
//             onChange={(e) => setLastName(e.target.value.toUpperCase())}
//           />
//         </div>

//         <button className="btn btn-primary" disabled={loading}>
//           {loading ? 'Fetching PAN...' : 'Fetch PAN'}
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

//           {/* PAN DATA */}
//           {response.data?.pan_data?.length > 0 && (
//             <div className="mt-4">
//               <h6>PAN Details</h6>

//               <table className="table table-bordered mt-2">
//                 <thead className="table-light">
//                   <tr>
//                     <th>#</th>
//                     <th>PAN Number</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {response.data.pan_data.map((item, index) => (
//                     <tr key={index}>
//                       <td>{item.serial_number || index + 1}</td>
//                       <td>{item.value}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {/* NO DATA */}
//           {response.data?.code === '1004' && (
//             <div className="alert alert-warning mt-3">
//               No PAN record found for the provided details.
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
const PAN_CREDITS = 5;

export default function PanByMobile() {
  const navigate = useNavigate();

  /* -------------------------
     WALLET (DUMMY)
  ------------------------- */
  const [walletBalance, setWalletBalance] = useState(3200);

  /* -------------------------
     FORM STATE
  ------------------------- */
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

    if (!phone || !firstName) {
      setError('Mobile number and First Name are required');
      return;
    }

    if (walletBalance < PAN_CREDITS) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(
        'https://stoplight.io/mocks/gridlines/gridlines-api-docs/11729114/profile-api/individual/fetch-pan',
        {
          phone,
          first_name: firstName,
          last_name: lastName || undefined,
          consent_text: 'I provide consent to fetch information',
          consent: 'Y',
        },
        {
          headers: {
            'X-Auth-Type': 'API-Key',
            'X-Reference-ID': `PAN-${Date.now()}`,
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
      setWalletBalance((prev) => prev - PAN_CREDITS);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch PAN details');
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

      <h4 className="mb-2">PAN Verification (Fetch by Mobile)</h4>

      <p className="text-muted mb-3">
        Credits Required: <strong>{PAN_CREDITS}</strong>
      </p>

      {/* -------------------------
          FORM
      ------------------------- */}
      <form onSubmit={handleSubmit} className="card p-3 mb-4">
        <div className="mb-3">
          <label className="form-label">Mobile Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="9898898999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">First Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="JOHN"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value.toUpperCase())}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Last Name (Optional)</label>
          <input
            type="text"
            className="form-control"
            placeholder="SMITH"
            value={lastName}
            onChange={(e) => setLastName(e.target.value.toUpperCase())}
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={loading || walletBalance < PAN_CREDITS}
        >
          {loading ? 'Fetching PAN...' : 'Fetch PAN'}
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

          {/* PAN DATA */}
          {response.data?.pan_data?.length > 0 && (
            <div className="mt-4">
              <h6>PAN Details</h6>

              <table className="table table-bordered mt-2">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>PAN Number</th>
                  </tr>
                </thead>
                <tbody>
                  {response.data.pan_data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.serial_number || index + 1}</td>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* NO DATA */}
          {response.data?.code === '1004' && (
            <div className="alert alert-warning mt-3">
              No PAN record found for the provided details.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
