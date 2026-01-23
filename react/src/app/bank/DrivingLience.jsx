// import React, { useState } from 'react';
// import axios from 'axios';

// export default function DrivingLicense() {
//   const [drivingLicense, setDrivingLicense] = useState('');
//   const [dob, setDob] = useState('');
//   const [source, setSource] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [response, setResponse] = useState(null);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setResponse(null);

//     if (!drivingLicense || !dob) {
//       setError('Driving License number and DOB are required');
//       return;
//     }

//     setLoading(true);

//     try {
//       const { data } = await axios.post(
//         'https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154728/dl-api/fetch',
//         {
//           driving_license_number: drivingLicense,
//           date_of_birth: dob,
//           source: source,
//           consent: 'Y',
//         },
//         {
//           headers: {
//             'X-Auth-Type': 'API-Key',
//             'X-Reference-ID': `DL-${Date.now()}`,
//             'X-API-Key': 'AuccMxDhx8YJEowcosBg8FEM73OIb6N1',
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//         }
//       );

//       setResponse(data);
//     } catch (err) {
//       console.error(err);
//       setError('Failed to fetch driving license details');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mt-4">
//       <h4 className="mb-3">Driving License Verification</h4>

//       <form onSubmit={handleSubmit} className="card p-3 mb-4">
//         <div className="mb-3">
//           <label className="form-label">Driving License Number</label>
//           <input
//             type="text"
//             className="form-control"
//             placeholder="TS12XXXXXXXXXXX"
//             value={drivingLicense}
//             onChange={(e) => setDrivingLicense(e.target.value)}
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">Date of Birth</label>
//           <input
//             type="date"
//             className="form-control"
//             value={dob}
//             onChange={(e) => setDob(e.target.value)}
//           />
//         </div>

//         <div className="mb-3">
//           <label className="form-label">Source</label>
//           <select
//             className="form-select"
//             value={source}
//             onChange={(e) => setSource(Number(e.target.value))}
//           >
//             <option value={1}>Primary (Unmasked Address)</option>
//             <option value={2}>Secondary (Masked Address)</option>
//           </select>
//         </div>

//         <button className="btn btn-primary" disabled={loading}>
//           {loading ? 'Verifying...' : 'Verify License'}
//         </button>
//       </form>

//       {error && <div className="alert alert-danger">{error}</div>}

//       {response && (
//         <div className="card p-3">
//           <h5>API Response</h5>

//           <p>
//             <strong>Status:</strong> {response.status}
//           </p>
//           <p>
//             <strong>Code:</strong> {response.code}
//           </p>
//           <p>
//             <strong>Message:</strong> {response.message}
//           </p>

//        {response?.data?.driving_license_data && (
//   <div className="card p-3 mt-4">
//     <h5 className="mb-3">Driving License Details</h5>

//     {/* Basic Info */}
//     <div className="row">
//       <div className="col-md-6">
//         <p><strong>Name:</strong> {response.data.driving_license_data.name}</p>
//         <p><strong>Document ID:</strong> {response.data.driving_license_data.document_id}</p>
//         <p><strong>Date of Birth:</strong> {response.data.driving_license_data.date_of_birth}</p>
//         <p><strong>Dependent Name:</strong> {response.data.driving_license_data.dependent_name}</p>
//         <p><strong>Blood Group:</strong> {response.data.driving_license_data.blood_group}</p>
//       </div>

//       <div className="col-md-6">
//         {response.data.driving_license_data.photo_base64 && (
//           <>
//             <strong>Photo:</strong>
//             <br />
//             <img
//               src={`data:image/jpeg;base64,${response.data.driving_license_data.photo_base64}`}
//               alt="DL Holder"
//               style={{
//                 width: '150px',
//                 border: '1px solid #ccc',
//                 borderRadius: '6px',
//                 marginTop: '10px',
//               }}
//             />
//           </>
//         )}
//       </div>
//     </div>

//     <hr />

//     {/* Address */}
//     <p>
//       <strong>Address:</strong>{' '}
//       {response.data.driving_license_data.address || 'N/A'}
//     </p>
//     <p>
//       <strong>Pincode:</strong>{' '}
//       {response.data.driving_license_data.pincode || 'N/A'}
//     </p>

//     <hr />

//     {/* Validity */}
//     <h6>License Validity</h6>
//     <div className="row">
//       <div className="col-md-6">
//         <strong>Non-Transport</strong>
//         <p>Issue Date: {response.data.driving_license_data.validity?.non_transport?.issue_date}</p>
//         <p>Expiry Date: {response.data.driving_license_data.validity?.non_transport?.expiry_date}</p>
//       </div>

//       <div className="col-md-6">
//         <strong>Transport</strong>
//         <p>Issue Date: {response.data.driving_license_data.validity?.transport?.issue_date}</p>
//         <p>Expiry Date: {response.data.driving_license_data.validity?.transport?.expiry_date}</p>
//       </div>
//     </div>

//     <hr />

//     {/* RTO Details */}
//     <h6>RTO Details</h6>
//     <p>
//       <strong>State:</strong> {response.data.driving_license_data.rto_details?.state}
//     </p>
//     <p>
//       <strong>Authority:</strong> {response.data.driving_license_data.rto_details?.authority}
//     </p>

//     <hr />

//     {/* Vehicle Classes */}
//     <h6>Vehicle Class Details</h6>
//     <table className="table table-bordered mt-2">
//       <thead className="table-light">
//         <tr>
//           <th>#</th>
//           <th>Category</th>
//           <th>Authority</th>
//         </tr>
//       </thead>
//       <tbody>
//         {response.data.driving_license_data.vehicle_class_details?.map(
//           (item, index) => (
//             <tr key={index}>
//               <td>{index + 1}</td>
//               <td>{item.category}</td>
//               <td>{item.authority}</td>
//             </tr>
//           )
//         )}
//       </tbody>
//     </table>
//   </div>
// )}

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
const DL_CREDITS = 15;

export default function DrivingLicense() {
  const navigate = useNavigate();

  /* -------------------------
     WALLET (DUMMY)
  ------------------------- */
  const [walletBalance, setWalletBalance] = useState(3200);

  /* -------------------------
     FORM STATE
  ------------------------- */
  const [drivingLicense, setDrivingLicense] = useState('');
  const [dob, setDob] = useState('');
  const [source, setSource] = useState(1);
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

    if (!drivingLicense || !dob) {
      setError('Driving License number and DOB are required');
      return;
    }

    if (walletBalance < DL_CREDITS) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(
        'https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154728/dl-api/fetch',
        {
          driving_license_number: drivingLicense,
          date_of_birth: dob,
          source,
          consent: 'Y',
        },
        {
          headers: {
            'X-Auth-Type': 'API-Key',
            'X-Reference-ID': `DL-${Date.now()}`,
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
      setWalletBalance((prev) => prev - DL_CREDITS);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch driving license details');
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

      <h4 className="mb-2">Driving License Verification</h4>

      <p className="text-muted mb-3">
        Credits Required: <strong>{DL_CREDITS}</strong>
      </p>

      {/* -------------------------
          FORM
      ------------------------- */}
      <form onSubmit={handleSubmit} className="card p-3 mb-4">
        <div className="mb-3">
          <label className="form-label">Driving License Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="TS12XXXXXXXXXXX"
            value={drivingLicense}
            onChange={(e) => setDrivingLicense(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Date of Birth</label>
          <input
            type="date"
            className="form-control"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Source</label>
          <select
            className="form-select"
            value={source}
            onChange={(e) => setSource(Number(e.target.value))}
          >
            <option value={1}>Primary (Unmasked Address)</option>
            <option value={2}>Secondary (Masked Address)</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          disabled={loading || walletBalance < DL_CREDITS}
        >
          {loading ? 'Verifying...' : 'Verify License'}
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
          <p><strong>Code:</strong> {response.code}</p>
          <p><strong>Message:</strong> {response.message}</p>

          {response?.data?.driving_license_data && (
            <div className="card p-3 mt-4">
              <h5 className="mb-3">Driving License Details</h5>

              <div className="row">
                <div className="col-md-6">
                  <p><strong>Name:</strong> {response.data.driving_license_data.name}</p>
                  <p><strong>Document ID:</strong> {response.data.driving_license_data.document_id}</p>
                  <p><strong>DOB:</strong> {response.data.driving_license_data.date_of_birth}</p>
                  <p><strong>Dependent Name:</strong> {response.data.driving_license_data.dependent_name}</p>
                  <p><strong>Blood Group:</strong> {response.data.driving_license_data.blood_group}</p>
                </div>

                <div className="col-md-6">
                  {response.data.driving_license_data.photo_base64 && (
                    <>
                      <strong>Photo:</strong><br />
                      <img
                        src={`data:image/jpeg;base64,${response.data.driving_license_data.photo_base64}`}
                        alt="DL Holder"
                        style={{
                          width: '150px',
                          border: '1px solid #ccc',
                          borderRadius: '6px',
                          marginTop: '10px',
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              <hr />

              <p><strong>Address:</strong> {response.data.driving_license_data.address || 'N/A'}</p>
              <p><strong>Pincode:</strong> {response.data.driving_license_data.pincode || 'N/A'}</p>

              <hr />

              <h6>License Validity</h6>
              <div className="row">
                <div className="col-md-6">
                  <strong>Non-Transport</strong>
                  <p>Issue: {response.data.driving_license_data.validity?.non_transport?.issue_date}</p>
                  <p>Expiry: {response.data.driving_license_data.validity?.non_transport?.expiry_date}</p>
                </div>
                <div className="col-md-6">
                  <strong>Transport</strong>
                  <p>Issue: {response.data.driving_license_data.validity?.transport?.issue_date}</p>
                  <p>Expiry: {response.data.driving_license_data.validity?.transport?.expiry_date}</p>
                </div>
              </div>

              <hr />

              <h6>RTO Details</h6>
              <p><strong>State:</strong> {response.data.driving_license_data.rto_details?.state}</p>
              <p><strong>Authority:</strong> {response.data.driving_license_data.rto_details?.authority}</p>

              <hr />

              <h6>Vehicle Class Details</h6>
              <table className="table table-bordered mt-2">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Category</th>
                    <th>Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {response.data.driving_license_data.vehicle_class_details?.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.category}</td>
                      <td>{item.authority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
