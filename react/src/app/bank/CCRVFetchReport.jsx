
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

export default function CCRVFetchReport() {
  const location = useLocation();
  const navigate = useNavigate();

  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  /* --------------------------------------------------
     STEP 1: Read transaction_id from navigation state
  -------------------------------------------------- */
  useEffect(() => {
    if (location.state?.transactionId) {
      setTransactionId(location.state.transactionId);
    }
  }, [location.state]);

  /* --------------------------------------------------
     STEP 2: Auto-fetch report once transactionId exists
  -------------------------------------------------- */
  useEffect(() => {
    if (transactionId) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  /* --------------------------------------------------
     FETCH REPORT API
  -------------------------------------------------- */
  const fetchReport = async () => {
    const cleanTxnId = transactionId.trim();

    if (!cleanTxnId) {
      setError('Invalid Transaction ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await axios.request({
        method: 'GET',
        url: 'https://stoplight.io/mocks/gridlines/gridlines-api-docs/322908232/ccrv-api/fetch-report',
        headers: {
          'X-Auth-Type': 'API-Key',
          'X-Transaction-ID': cleanTxnId,
          'X-Reference-ID': `CCRV-FETCH-${Date.now()}`,
          'X-API-Key': 'AuccMxDhx8YJEowcosBg8FEM73OIb6N1',
          Accept: 'application/json',
        },
      });

      setResponse(data);
    } catch (err) {
      console.error('FETCH ERROR:', err?.response || err);
      setError(
        err?.response?.data?.message ||
          'Unable to fetch CCRV report (Stoplight mock limitation)'
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <div className="container mt-4">

      {/* HEADER (BACK BUTTON) */}
      <div className="mb-3">
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <h4 className="mb-3">CCRV Report Status</h4>

      {/* Transaction ID */}
      <div className="card p-3 mb-3">
        <strong>Transaction ID</strong>
        <input
          className="form-control mt-2"
          value={transactionId}
          readOnly
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="alert alert-info">
          Fetching CCRV report, please wait...
        </div>
      )}

      {/* Error */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Response */}
      {response && (
        <div className="card p-3">
          <h5>Verification Result</h5>

          <p><strong>Code:</strong> {response.data?.code}</p>
          <p><strong>Message:</strong> {response.data?.message}</p>
          <p><strong>Status:</strong> {response.data?.ccrv_status}</p>

          {/* IN PROGRESS */}
          {response.data?.code === '1002' && (
            <div className="alert alert-warning">
              CCRV verification is still in progress. Please wait or refresh.
            </div>
          )}

          {/* COMPLETED WITH DATA */}
          {response.data?.ccrv_data && (
            <>
              <hr />

              {/* Report Result */}
              <div className="alert alert-secondary">
                <strong>Final Result:</strong>{' '}
                {response.data.ccrv_data.report_status?.result}
                <br />
                <strong>Reason:</strong>{' '}
                {response.data.ccrv_data.report_status?.reason}
              </div>

              {/* Criminal Cases */}
              <h6>Criminal Case Details</h6>

              {response.data.ccrv_data.cases?.length > 0 ? (
                response.data.ccrv_data.cases.map((c, i) => (
                  <div key={i} className="border rounded p-3 mb-3">
                    <p><strong>Case No:</strong> {c.filing_number}</p>
                    <p><strong>Type:</strong> {c.case_type}</p>
                    <p><strong>Status:</strong> {c.case_status}</p>
                    <p><strong>Severity:</strong> {c.criminal_act_severity}</p>
                    <p><strong>Court:</strong> {c.court_type}</p>
                    <p><strong>District:</strong> {c.district}</p>
                    <p><strong>State:</strong> {c.state}</p>
                  </div>
                ))
              ) : (
                <div className="alert alert-success">
                  No criminal records found
                </div>
              )}

              {/* Report PDF */}
              {response.data.ccrv_data.report_pdf_url && (
                <a
                  href={response.data.ccrv_data.report_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary mt-3"
                >
                  Download CCRV Report PDF
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
