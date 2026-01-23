import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/* -------------------------
   CONFIG
------------------------- */
const GSTIN_CREDITS = 20;

export default function GSTINVerification() {
  const navigate = useNavigate();

  /* -------------------------
     WALLET (DUMMY)
  ------------------------- */
  const [walletBalance, setWalletBalance] = useState(3200);

  /* -------------------------
     FORM STATE
  ------------------------- */
  const [gstin, setGstin] = useState('');
  const [includeFilingData, setIncludeFilingData] = useState(false);
  const [includeHsnData, setIncludeHsnData] = useState(false);
  const [includeFilingFrequency, setIncludeFilingFrequency] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  /* -------------------------
     SUBMIT
  ------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResponse(null);

    if (!gstin) {
      setError('GSTIN is required');
      return;
    }

    if (walletBalance < GSTIN_CREDITS) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(
        'https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154717/gstin-api/fetch-detailed',
        {
          gstin,
          include_filing_data: includeFilingData,
          include_hsn_data: includeHsnData,
          include_filing_frequency: includeFilingFrequency,
          consent: 'Y',
        },
        {
          headers: {
            'X-Auth-Type': 'API-Key',
            'X-Reference-ID': `GSTIN-${Date.now()}`,
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
      setWalletBalance((prev) => prev - GSTIN_CREDITS);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch GSTIN details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className="text-end">
          <div className="fw-bold">Wallet Balance</div>
          <div className="text-success">{walletBalance} Credits</div>
        </div>
      </div>

      <h4 className="mb-2">GSTIN Detailed Verification</h4>

      <p className="text-muted mb-3">
        Credits Required: <strong>{GSTIN_CREDITS}</strong>
      </p>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="card p-3 mb-4">
        <div className="mb-3">
          <label className="form-label">GSTIN</label>
          <input
            type="text"
            className="form-control"
            placeholder="21AAXXXXXXXXXXX"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
          />
        </div>

        <div className="form-check mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            checked={includeFilingData}
            onChange={() => setIncludeFilingData(!includeFilingData)}
          />
          <label className="form-check-label">
            Include Filing Data
          </label>
        </div>

        <div className="form-check mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            checked={includeHsnData}
            onChange={() => setIncludeHsnData(!includeHsnData)}
          />
          <label className="form-check-label">
            Include HSN Data
          </label>
        </div>

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            checked={includeFilingFrequency}
            onChange={() =>
              setIncludeFilingFrequency(!includeFilingFrequency)
            }
          />
          <label className="form-check-label">
            Include Filing Frequency
          </label>
        </div>

        <button
          className="btn btn-primary"
          disabled={loading || walletBalance < GSTIN_CREDITS}
        >
          {loading ? 'Fetching GSTIN...' : 'Fetch GSTIN Details'}
        </button>
      </form>

      {/* ERROR */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* RESPONSE */}
      {response && (
        <div className="card p-3">
          <h5>GSTIN Details</h5>

          <p><strong>Status:</strong> {response.data?.gstin_data?.status}</p>
          <p><strong>Legal Name:</strong> {response.data?.gstin_data?.legal_name}</p>
          <p><strong>Trade Name:</strong> {response.data?.gstin_data?.trade_name}</p>
          <p><strong>PAN:</strong> {response.data?.gstin_data?.pan}</p>
          <p><strong>Taxpayer Type:</strong> {response.data?.gstin_data?.taxpayer_type}</p>

          <hr />

          <h6>Principal Address</h6>
          <p>{response.data?.gstin_data?.principal_address?.address}</p>
          <p>Email: {response.data?.gstin_data?.principal_address?.email}</p>
          <p>Mobile: {response.data?.gstin_data?.principal_address?.mobile}</p>

          <hr />

          <h6>Directors</h6>
          <ul>
            {response.data?.gstin_data?.directors?.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>

          {/* FILING DATA */}
          {response.data?.gstin_data?.filing_data && (
            <>
              <hr />
              <h6>Filing History</h6>
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Return</th>
                    <th>FY</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {response.data.gstin_data.filing_data.map((f, i) => (
                    <tr key={i}>
                      <td>{f.return_type}</td>
                      <td>{f.financial_year}</td>
                      <td>{f.tax_period}</td>
                      <td>{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
