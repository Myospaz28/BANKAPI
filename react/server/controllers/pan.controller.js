import axios from 'axios';
import db from '../database/db.js';

export const fetchPanDetailedController = async (req, res) => {
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

    /* ================= GRIDLINES PAN API ================= */
    const apiRes = await axios.post(
      'https://api.gridlines.io/pan-api/fetch-detailed',
      { pan_number, consent },
      {
        headers: {
          'X-API-Key': process.env.GRIDLINES_API_KEY,
          'X-Auth-Type': 'API-Key',
          'Content-Type': 'application/json',
        },
      },
    );

    const code = apiRes.data?.data?.code;

    if (code !== '1000') {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }


const panData = apiRes.data?.data?.pan_data || {};

const normalizedPanData = {
  document_type: panData.document_type || "PAN",
  document_id: panData.document_id || pan_number,

  name: panData.name || "-",
  last_name: panData.last_name || "-",
  category: panData.category || "-",
  date_of_birth: panData.date_of_birth || "-",

  masked_aadhaar_number: panData.masked_aadhaar_number || "-",
  gender: panData.gender || "-",
  email: panData.email || "-",
  phone: panData.phone || "-",

  aadhaar_linked:
    typeof panData.aadhaar_linked === "boolean"
      ? panData.aadhaar_linked
      : false,

  address_data: {
    line_1: panData.address_data?.line_1 || "-",
    line_2: panData.address_data?.line_2 || "-",
    street: panData.address_data?.street || "-",
    city: panData.address_data?.city || "-",
    line_5: panData.address_data?.line_5 || "-",
    state: panData.address_data?.state || "-",
    pincode: panData.address_data?.pincode || "-",
  },
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
        'PAN_FETCH',
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
          pan_data: normalizedPanData,
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
    console.error('❌ PAN Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'PAN fetch failed',
    });
  } finally {
    connection.release();
  }
};


export const fetchPanLiteController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, pan_number, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !pan_number || !file_no || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
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

    /* ================= WALLET CHECK ================= */
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

    /* ================= GRIDLINES PAN LITE API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/pan-api/fetch",
      { pan_number, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= NON-SUCCESS CASE ================= */
    if (code !== "1000") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= NORMALIZE PAN LITE DATA ================= */
    const panData = apiRes.data?.data?.pan_data || {};

    const normalizedPanData = {
      document_type: panData.document_type || "PAN",
      name: panData.name || "-",
    };

    /* ================= WALLET DEDUCTION ================= */
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
        "PAN_LITE_FETCH",
        "success",
        walletTxn.insertId,
        userId,
      ]
    );

    await connection.commit();

    /* ================= FINAL RESPONSE ================= */
    res.json({
      success: true,
      data: {
        ...apiRes.data,
        data: {
          ...apiRes.data.data,
          pan_data: normalizedPanData,
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
    console.error("❌ PAN LITE Error:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "PAN Lite fetch failed",
    });
  } finally {
    connection.release();
  }
};

