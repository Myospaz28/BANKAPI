import axios from 'axios';
import db from '../database/db.js';


export const fetchCompanyController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, company_id, consent, file_no } = req.body;

    // ===== BASIC VALIDATION =====
    if (!usr_ser_id || !company_id || !file_no || !/^[A-Za-z0-9]{6,21}$/.test(company_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid company ID (CIN, FCRN, or LLPIN) and File No are required",
      });
    }

    if (consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Consent is mandatory to proceed",
      });
    }

    await connection.beginTransaction();

    // ===== SERVICE CHECK =====
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ? AND users_id = ? AND status = 'active' FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    const creditsUsed = Number(service.actual_credits);

    // ===== WALLET CHECK =====
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId]
    );
    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // ===== GRIDLINES API CALL =====
    const apiRes = await axios.post(
      "https://api.gridlines.io/mca-api/fetch-company",
      { company_id: company_id.trim(), consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Reference-ID": `${Date.now()}-${userId}`,
          "Content-Type": "application/json",
        },
      }
    );

    const apiData = apiRes.data;
    const code = apiData?.data?.code;

    // ===== COMPANY NOT FOUND =====
    if (code === "1001") {
      await connection.commit();
      return res.json({
        success: true,
        data: {
          code,
          message: apiData.data.message,
        },
        wallet: { opening_balance: openingBalance },
      });
    }

    if (apiData.status !== 200 || !apiData.data?.company_data) {
      await connection.commit();
      return res.status(400).json({
        success: false,
        message: apiData?.data?.message || "Invalid response from API",
      });
    }

    // ===== WALLET DEDUCTION =====
    const closingBalance = openingBalance - creditsUsed;
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId]
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions (
        users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by
      ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId]
    );

    // ===== LOG THE SERVICE USAGE =====
    await connection.query(
      `INSERT INTO user_service_logs (
        users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "FETCH_COMPANY",
        "success",
        walletTxn.insertId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: {
        code: "1000",
        message: apiData.data.message,
        company_data: apiData.data.company_data,
      },
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Fetch Company Error:", error.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      message: "Fetch company failed",
    });
  } finally {
    connection.release();
  }
};


export const fetchCinByPanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, pan_number, file_no, consent } = req.body;

    if (!usr_ser_id || !pan_number || !file_no || consent !== 'Y') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
      });
    }

    await connection.beginTransaction();

    // ===== SERVICE CHECK =====
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ? AND users_id = ? AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Service not allowed',
      });
    }

    const creditsUsed = Number(service.actual_credits);

    // ===== WALLET CHECK =====
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );
    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    // ===== GRIDLINES API CALL =====
    const referenceId = `${Date.now()}-${userId}`;
    const apiRes = await axios.post(
      'https://api.gridlines.io/mca-api/cin-by-pan',
      { pan_number, consent },
      {
        headers: {
          'X-API-Key': process.env.GRIDLINES_API_KEY,
          'X-Auth-Type': 'API-Key',
          'X-Reference-ID': referenceId,
          'Content-Type': 'application/json',
        },
      },
    );

    const apiData = apiRes.data;
    const code = apiData?.data?.code;

    // ===== HANDLE NON-SUCCESS CODES (1015–1017) =====
    if (code !== '1014') {
      await connection.commit(); // nothing deducted

      return res.json({
        success: true,
        request_id: apiData.request_id,
        transaction_id: apiData.transaction_id,
        reference_id: apiData.reference_id || referenceId,
        status: apiData.status,
        data: {
          code,
          message: apiData.data.message,
        },
        timestamp: apiData.timestamp,
        path: apiData.path,
      });
    }

    // ===== SUCCESS CASE 1014 =====
    const cinData = apiData.data;
    const normalizedData = {
      pan_number,
      cin_list: cinData.cin_list || [],
      cin_details: cinData.cin_details || [],
    };

    // ===== WALLET DEDUCTION =====
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions (
        users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by
      ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    await connection.query(
      `INSERT INTO user_service_logs (
        users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        'CIN_BY_PAN',
        'success',
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      request_id: apiData.request_id,
      transaction_id: apiData.transaction_id,
      reference_id: apiData.reference_id || referenceId,
      status: apiData.status,
      data: {
        code,
        message: cinData.message,
        cin_data: normalizedData,
      },
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
      timestamp: apiData.timestamp,
      path: apiData.path,
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ CIN by PAN Error:', error.response?.data || error);

    return res.status(500).json({
      success: false,
      message: 'CIN by PAN fetch failed',
    });
  } finally {
    connection.release();
  }
};


export const fetchDirectorController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, din, file_no, consent } = req.body;

    if (!usr_ser_id || !din || !file_no || consent !== 'Y') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Service not allowed',
      });
    }

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits',
      });
    }

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      'https://api.gridlines.io/mca-api/fetch-director',
      { din, consent },
      {
        headers: {
          'X-API-Key': process.env.GRIDLINES_API_KEY,
          'X-Auth-Type': 'API-Key',
          'Content-Type': 'application/json',
        },
      },
    );

    const code = apiRes.data?.data?.code;

    // DIN not found / invalid → no credit deduction
    if (code !== '1002') {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= NORMALIZE DATA ================= */
    const d = apiRes.data?.data?.director_data || {};

    const normalizedDirectorData = {
      din: d.din || din,
      name: d.name || '-',
      company_details: d.company_details || [],
      llp_details: d.llp_details || [],
    };

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions (
        users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by
      ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    await connection.query(
      `INSERT INTO user_service_logs (
        users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        'DIRECTOR_FETCH',
        'success',
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();

    res.json({
      success: true,
      data: {
        ...apiRes.data,
        data: {
          ...apiRes.data.data,
          director_data: normalizedDirectorData,
        },
      },
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Director Fetch Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Director fetch failed',
    });
  } finally {
    connection.release();
  }
};


export const fetchCompanyByNameController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, name, file_no, consent } = req.body;

    // ===== BASIC VALIDATION =====
    if (!usr_ser_id || !file_no || !name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Company name must be at least 3 characters",
      });
    }

    if (consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Consent is mandatory to proceed",
      });
    }

    await connection.beginTransaction();

    // ===== SERVICE CHECK =====
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    const creditsUsed = Number(service.actual_credits);

    // ===== WALLET CHECK =====
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId]
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // ===== GRIDLINES API CALL =====
    const apiRes = await axios.post(
      "https://api.gridlines.io/mca-api/fetch-by-name",
      { name: name.trim(), consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const apiData = apiRes.data;
    const code = apiData?.data?.code;
    const companies = apiData.data?.companies || [];
    const normalizedData = {
      search_name: name.trim(),
      total_records: companies.length,
      companies,
    };

    // ===== NO RECORD FOUND =====
    if (code === "1005") {
      await connection.commit();
      return res.json({
        success: true,
        data: {
          code,
          message: apiData.data.message,
          company_data: normalizedData,
        },
      });
    }

    // ===== INVALID RESPONSE =====
    if (code !== "1004") {
      await connection.commit();
      return res.status(400).json({
        success: false,
        message: apiData?.data?.message || "Invalid request",
      });
    }

    // ===== WALLET DEDUCTION =====
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId]
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions (
        users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by
      ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId]
    );

    await connection.query(
      `INSERT INTO user_service_logs (
        users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "FETCH_COMPANY_BY_NAME",
        "success",
        walletTxn.insertId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: {
        code: "1004",
        message: apiData.data.message,
        company_data: normalizedData,
      },
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error(
      "❌ Fetch Company By Name Error:",
      error.response?.data || error.message || error
    );

    return res.status(500).json({
      success: false,
      message: "Fetch company by name failed",
    });
  } finally {
    connection.release();
  }
};





export const fetchDinByPanController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, pan, consent, file_no } = req.body;

    // ===== BASIC VALIDATION =====
    if (!usr_ser_id || !pan || !file_no || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return res.status(400).json({
        success: false,
        message: 'Valid PAN and File No are required',
      });
    }

    if (consent !== 'Y') {
      return res.status(400).json({
        success: false,
        message: 'Consent is mandatory to proceed',
      });
    }

    await connection.beginTransaction();

    // ===== SERVICE CHECK =====
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ? AND users_id = ? AND status = 'active' FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Service not allowed',
      });
    }

    const creditsUsed = Number(service.actual_credits);

    // ===== WALLET CHECK =====
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );
    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    // ===== GRIDLINES API CALL =====
    const referenceId = `${Date.now()}-${userId}`;
    const apiRes = await axios.post(
      'https://api.gridlines.io/mca-api/fetch-din-by-pan',
      { pan: pan.toUpperCase(), consent },
      {
        headers: {
          'X-API-Key': process.env.GRIDLINES_API_KEY,
          'X-Auth-Type': 'API-Key',
          'X-Reference-ID': referenceId,
          'Content-Type': 'application/json',
        },
      },
    );

    const apiData = apiRes.data;
    const code = apiData?.data?.code;

    // ===== NO DIN LINKED OR INVALID PAN =====
    if (code === '1007' || code === '1008') {
      await connection.commit();
      return res.json({
        success: true,
        request_id: apiData.request_id,
        transaction_id: apiData.transaction_id,
        reference_id: apiData.reference_id || referenceId,
        status: apiData.status,
        data: {
          code,
          message: apiData.data.message,
        },
        timestamp: apiData.timestamp,
        path: apiData.path,
      });
    }

    // ===== SUCCESS CASE 1006 =====
    if (code === '1006') {
      // Deduct wallet
      const closingBalance = openingBalance - creditsUsed;
      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
        [closingBalance, userId],
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions (
          users_id, transaction_type, amount,
          opening_balance, closing_balance,
          reference_type, created_by
        ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId],
      );

      // Log service usage
      await connection.query(
        `INSERT INTO user_service_logs (
          users_id, usr_ser_id, file_no,
          credits_used, api_name, api_status,
          wallet_transaction_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          usr_ser_id,
          file_no,
          creditsUsed,
          'FETCH_DIN_BY_PAN',
          'success',
          walletTxn.insertId,
          userId,
        ],
      );

      await connection.commit();

      return res.json({
        success: true,
        request_id: apiData.request_id,
        transaction_id: apiData.transaction_id,
        reference_id: apiData.reference_id || referenceId,
        status: apiData.status,
        data: {
          code,
          message: apiData.data.message,
          din_details: apiData.data.din_details,
        },
        wallet: {
          opening_balance: openingBalance,
          credits_used: creditsUsed,
          closing_balance: closingBalance,
        },
        timestamp: apiData.timestamp,
        path: apiData.path,
      });
    }

    // ===== ANY OTHER UNEXPECTED RESPONSE =====
    await connection.commit();
    return res.status(400).json({
      success: false,
      message: 'Unexpected response from API',
      data: apiData,
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Fetch DIN by PAN Error:', error.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Fetch DIN by PAN failed',
    });
  } finally {
    connection.release();
  }
};


export const fetchTanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, tan, file_no, consent } = req.body;

    if (!usr_ser_id || !tan || !file_no || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    /* ===== SERVICE CHECK ===== */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ? AND users_id = ? AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    const creditsUsed = Number(service.actual_credits);

    /* ===== WALLET CHECK ===== */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId]
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ===== GRIDLINES API ===== */
    const apiRes = await axios.post(
      "https://api.gridlines.io/mca-api/verify-tan",
      { tan, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    // Invalid TAN → no deduction
    if (code !== "1012") {
      await connection.commit();
      return res.json({
        success: true,
        data: {
          code,
          message: apiRes.data?.data?.message,
        },
      });
    }

    /* ===== WALLET DEDUCTION ===== */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId]
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions (
        users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by
      ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId]
    );

    await connection.query(
      `INSERT INTO user_service_logs (
        users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "TAN_VERIFY",
        "success",
        walletTxn.insertId,
        userId,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      data: apiRes.data,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ TAN Verification Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "TAN verification failed",
    });
  } finally {
    connection.release();
  }
};



//new routes 
export const checkCinByPanCacheController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { mas_ser_id, mas_cat_id, pan_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan_number]
    );

    if (!existing) return res.json({ hasCache: false });

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ checkCinByPanCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeCinByPanController1 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      pan_number,
      file_no,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ? AND users_id = ? AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );
    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId]
    );
    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTxnId = null;

    /* ================= CACHE ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT * FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND pan_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, pan_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;
      if (responseStatus === "success") shouldDeduct = true;
    } else {
      /* ================= GRIDLINES ================= */
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/cin-by-pan",
        { pan_number, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;
      const code = fullResponse?.data?.code;

      if (code === "1014") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (["1015", "1016", "1017"].includes(code)) {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, pan_number,
          api_response, response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          pan_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [txn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id, transaction_type, amount,
          opening_balance, closing_balance,
          reference_type, created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTxnId = txn.insertId;
    }

    /* ================= USER LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "CIN_BY_PAN",
        responseStatus,
        walletTxnId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE CIN ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeCinByPanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      pan_number,
      file_no,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      pan_number,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTxnId = null;
    let serFetLogId = null;
    let transactionId = null;
    let requestId = null;

    /* ================= CACHE ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND pan_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, pan_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (responseStatus === "success") shouldDeduct = true;
    }

    /* ================= GRIDLINES ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/cin-by-pan",
        { pan_number, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1014") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (["1015", "1016", "1017"].includes(code)) {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          pan_number,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          pan_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [txn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTxnId = txn.insertId;
    }

    /* ================= USER LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "CIN_BY_PAN",
        responseStatus,
        walletTxnId,
        transactionId,
        requestId,
        serFetLogId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();

    console.error("❌ EXECUTE CIN ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};



export const checkCompanyCacheController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { mas_ser_id, mas_cat_id, company_id } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND company_id = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, company_id]
    );

    if (!existing) return res.json({ hasCache: false });

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ checkCompanyCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeCompanyController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      company_id,
      file_no,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND company_id = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, company_id]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-company",
        {
          company_id: company_id.trim(),
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      if (code === "1000") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1001") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          company_id,
          company_name,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          company_id,
          fullResponse?.data?.company_data?.company_details?.name || null,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_COMPANY",
        responseStatus,
        walletTransactionId,
        fullResponse?.transaction_id || null,
        fullResponse?.request_id || null,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE COMPANY ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeCompanyController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      company_id,
      file_no,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      company_id,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let serFetLogId = null;
    let transactionId = null;
    let requestId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND company_id = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, company_id]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-company",
        {
          company_id: company_id.trim(),
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1001") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          company_id,
          company_name,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          company_id,
          fullResponse?.data?.company_data?.company_details?.name || null,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_COMPANY",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();

    console.error("❌ EXECUTE COMPANY ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};




export const checkCompanyByNameCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, company_name } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND company_name = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, company_name.trim()]
    );

    if (!existing) return res.json({ hasCache: false });

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ checkCompanyByNameCache:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeCompanyByNameController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      company_name,
      file_no,
      use_cache,
    } = req.body;

    const trimmedName = (company_name || "").trim();

    if (!trimmedName) throw new Error("Company name is required");

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND company_name = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, trimmedName]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-by-name",
        {
          name: trimmedName,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      if (code === "1004") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1005") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          company_name,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          trimmedName,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_COMPANY_BY_NAME",
        responseStatus,
        walletTransactionId,
        fullResponse?.transaction_id || null,
        fullResponse?.request_id || null,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE COMPANY BY NAME ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeCompanyByNameController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      company_name,
      file_no,
      use_cache,
    } = req.body;

    const trimmedName = (company_name || "").trim();

    if (!trimmedName) throw new Error("Company name is required");

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      company_name: trimmedName,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let serFetLogId = null;
    let transactionId = null;
    let requestId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND company_name = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, trimmedName]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-by-name",
        {
          name: trimmedName,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1004") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1005") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          company_name,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          trimmedName,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_COMPANY_BY_NAME",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();

    console.error("❌ EXECUTE COMPANY BY NAME ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};





export const checkDinByPanCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, pan } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan]
    );

    if (!existing) return res.json({ hasCache: false });

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeDinByPanController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      pan,
      file_no,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND pan_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, pan]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-din-by-pan",
        { pan, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      if (code === "1006") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1007") {
        responseStatus = "not_found";
      } else if (code === "1008") {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          pan_number,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          pan,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id, transaction_type, amount,
          opening_balance, closing_balance,
          reference_type, created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_DIN_BY_PAN",
        responseStatus,
        walletTransactionId,
        fullResponse?.transaction_id || null,
        fullResponse?.request_id || null,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE DIN ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeDinByPanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      pan,
      file_no,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      pan,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let serFetLogId = null;
    let transactionId = null;
    let requestId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND pan_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, pan]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-din-by-pan",
        { pan, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1006") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1007") {
        responseStatus = "not_found";
      } else if (code === "1008") {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          pan_number,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          pan,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id, transaction_type, amount,
          opening_balance, closing_balance,
          reference_type, created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_DIN_BY_PAN",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();

    console.error("❌ EXECUTE DIN ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};



export const checkDirectorCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, din } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND din = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, din.trim()]
    );

    if (!existing) return res.json({ hasCache: false });

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });

  } catch (err) {
    console.error("❌ checkDirectorCache:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeDirectorFetchController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      din,
      file_no,
      use_cache,
    } = req.body;

    const trimmedDin = (din || "").trim();
    if (!trimmedDin) throw new Error("DIN is required");

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND din = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, trimmedDin]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-director",
        {
          din: trimmedDin,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      if (code === "1002") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1003") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          din,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          trimmedDin,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_DIRECTOR",
        responseStatus,
        walletTransactionId,
        fullResponse?.transaction_id || null,
        fullResponse?.request_id || null,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE DIRECTOR ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeDirectorFetchController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      din,
      file_no,
      use_cache,
    } = req.body;

    const trimmedDin = (din || "").trim();
    if (!trimmedDin) throw new Error("DIN is required");

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      din: trimmedDin,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let serFetLogId = null;
    let transactionId = null;
    let requestId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND din = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, trimmedDin]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/fetch-director",
        {
          din: trimmedDin,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1002") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1003") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          din,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          trimmedDin,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "FETCH_DIRECTOR",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();

    console.error("❌ EXECUTE DIRECTOR ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};





export const checkTanCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, tan } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND tan = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, tan.trim()]
    );

    if (!existing) {
      return res.json({ hasCache: false });
    }

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });

  } catch (err) {
    console.error("❌ checkTanCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeTanController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      tan,
      use_cache,
    } = req.body;

    const trimmedTan = (tan || "").trim();
    if (!trimmedTan) throw new Error("TAN is required");

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */

    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */

    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND tan = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, trimmedTan]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);
      responseStatus = existing.response_status;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */

    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/verify-tan",
        {
          tan: trimmedTan,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1012") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1013") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          tan,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          trimmedTan,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET DEDUCTION ================= */

    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "TAN_VERIFY",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE TAN ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeTanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      tan,
      use_cache,
    } = req.body;

    const trimmedTan = (tan || "").trim();
    if (!trimmedTan) throw new Error("TAN is required");

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */

    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      tan: trimmedTan,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let serFetLogId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */

    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND tan = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, trimmedTan]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */

    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/mca-api/verify-tan",
        {
          tan: trimmedTan,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1012") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1013") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          tan,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          trimmedTan,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */

    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id,
          transaction_type,
          amount,
          opening_balance,
          closing_balance,
          reference_type,
          created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "TAN_VERIFY",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();

    console.error("❌ EXECUTE TAN ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};