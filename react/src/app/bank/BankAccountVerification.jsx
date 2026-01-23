import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/* -------------------------
   CONFIG
------------------------- */

const BANK_VERIFICATION_CREDITS = 10;

export default function BankAccountVerification() {
  const navigate = useNavigate();

  /* -------------------------
     WALLET (DUMMY)
  ------------------------- */
  const [walletBalance, setWalletBalance] = useState(3200);

  /* -------------------------
     FORM STATE
  ------------------------- */
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

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

    if (!accountNumber || !ifsc) {
      setError('Account number and IFSC are required');
      return;
    }

    if (walletBalance < BANK_VERIFICATION_CREDITS) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(
        'https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154719/bank-api/verify',
        {
          account_number: accountNumber,
          ifsc: ifsc.toUpperCase(),
          consent: 'Y',
        },
        {
          headers: {
            'X-Auth-Type': 'API-Key',
            'X-Reference-ID': `BANK-${Date.now()}`,
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
      setWalletBalance((prev) => prev - BANK_VERIFICATION_CREDITS);
    } catch (err) {
      console.error(err);
      setError('Failed to verify bank account');
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

      <h4 className="mb-2">Bank Account Verification</h4>

      <p className="text-muted mb-3">
        Credits Required: <strong>{BANK_VERIFICATION_CREDITS}</strong>
      </p>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="card p-3 mb-4">
        <div className="mb-3">
          <label className="form-label">Account Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="0262XXXXXXXXXXXXXX"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">IFSC Code</label>
          <input
            type="text"
            className="form-control"
            placeholder="YESBXXXXXXXX"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={loading || walletBalance < BANK_VERIFICATION_CREDITS}
        >
          {loading ? 'Verifying...' : 'Verify Bank Account'}
        </button>
      </form>

      {/* ERROR */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* RESPONSE */}
      {response && (
        <div className="card p-3">
          <h5>Verification Result</h5>

          <p><strong>Status:</strong> {response.status}</p>
          <p><strong>Code:</strong> {response.data?.code}</p>
          <p><strong>Message:</strong> {response.data?.message}</p>

          {/* VERIFIED DATA */}
          {response.data?.bank_account_data && (
            <div className="card p-3 mt-3">
              <h6 className="mb-3">Bank Account Details</h6>

              <p>
                <strong>Account Holder Name:</strong>{' '}
                {response.data.bank_account_data.name}
              </p>

              <p>
                <strong>Bank Name:</strong>{' '}
                {response.data.bank_account_data.bank_name}
              </p>

              <p>
                <strong>Branch:</strong>{' '}
                {response.data.bank_account_data.branch}
              </p>

              <p>
                <strong>City:</strong>{' '}
                {response.data.bank_account_data.city}
              </p>

              <p>
                <strong>MICR:</strong>{' '}
                {response.data.bank_account_data.micr}
              </p>

              <p>
                <strong>UTR:</strong>{' '}
                {response.data.bank_account_data.utr}
              </p>
            </div>
          )}

          {/* FAILURE STATES */}
          {response.data?.code !== '1000' && (
            <div className="alert alert-warning mt-3">
              {response.data?.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
  
}
