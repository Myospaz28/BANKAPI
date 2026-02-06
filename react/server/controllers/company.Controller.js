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
