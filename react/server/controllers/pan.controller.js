import axios from "axios";
import db from "../database/db.js";
import { v4 as uuidv4 } from "uuid";

export const fetchPanDetailedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const { usr_ser_id, pan_number, file_no, consent } = req.body;

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
      [usr_ser_id, userId],
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
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES PAN API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/pan-api/fetch-detailed",
      { pan_number, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    if (code !== "1000") {
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
        "PAN_FETCH",
        "success",
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
    console.error("❌ PAN Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "PAN fetch failed",
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
      [usr_ser_id, userId],
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
      [userId],
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
      },
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
        "PAN_LITE_FETCH",
        "success",
        walletTxn.insertId,
        userId,
      ],
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

export const fetchPanNameController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, pan_number, file_no, consent } = req.body;

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
      [usr_ser_id, userId],
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
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/pan-api/fetch-card-name",
      {
        pan_number,
        consent,
        consent_text: "I provide consent to process my pan information.",
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    /* ================= FAIL CASE (NO CREDIT CUT) ================= */
    if (code !== "1018") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= NORMALIZE PAN DATA ✅ ================= */
    const rawPanData = apiRes.data?.data?.pan_data || {};
    console.log("rawPanData", rawPanData);
    const normalizedPanData = {
      pan_number: rawPanData.document_id || pan_number,
      name: rawPanData.card_name || "-",
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
        "PAN_NAME_FETCH",
        "success",
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();

    /* ================= FINAL RESPONSE ================= */
    res.json({
      success: true,
      data: {
        ...apiRes.data,
        data: {
          ...apiRes.data.data,
          pan_data: normalizedPanData, // ✅ UI-friendly
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

    // 🔴 Handle Gridlines upstream / govt server error gracefully
    if (error.response?.data) {
      return res.status(200).json({
        success: false,
        data: error.response.data, // pass exact Gridlines error
        message: "PAN service temporarily unavailable. Please retry.",
      });
    }

    console.error("❌ PAN NAME Error:", error);
    res.status(500).json({
      success: false,
      message: "PAN name fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const verifyBusinessPanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, pan_number, file_no, consent } = req.body;

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
      [usr_ser_id, userId],
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
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/pan-api/business-verify",
      {
        pan_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    // ❌ PAN NOT FOUND / INVALID → NO DEDUCTION
    if (code !== "1013") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

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
        "BUSINESS_PAN_VERIFY",
        "success",
        walletTxn.insertId,
        userId,
      ],
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
    console.error("❌ Business PAN Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Business PAN verification failed",
    });
  } finally {
    connection.release();
  }
};

export const validatePanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, pan_number, date_of_birth, file_no, consent } =
      req.body;

    if (
      !usr_ser_id ||
      !pan_number ||
      !date_of_birth ||
      !file_no ||
      consent !== "Y"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    await connection.beginTransaction();

    /* ===== SERVICE CHECK ===== */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ? AND users_id = ? AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) {
      await connection.rollback();
      return res
        .status(403)
        .json({ success: false, message: "Service not allowed" });
    }

    const creditsUsed = Number(service.actual_credits);

    /* ===== WALLET CHECK ===== */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Insufficient credits" });
    }

    /* ===== GRIDLINES PAN VALIDATE API ===== */
    const apiRes = await axios.post(
      "https://api.gridlines.io/pan-api/validate-details",
      {
        pan_number,
        date_of_birth,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const apiCode = apiRes.data?.data?.code;

    /* ===== FAILURE CASE (NO CREDIT CUT) ===== */
    if (!["1000", "1018"].includes(apiCode)) {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ===== WALLET DEDUCTION ===== */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "PAN_VALIDATE_DOB",
        "success",
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
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

    // Gridlines error response
    if (error.response?.data) {
      return res.status(200).json({
        success: false,
        data: error.response.data,
        message: "PAN service temporarily unavailable. Please retry.",
      });
    }

    console.error("❌ PAN VALIDATE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "PAN validation failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchPanEssentialsController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, pan_number, file_no, consent } = req.body;

    /* ===== VALIDATION ===== */
    if (!usr_ser_id || !pan_number || !file_no || consent !== "Y") {
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
        message: "Service not allowed",
      });
    }

    const creditsUsed = Number(service.actual_credits);

    /* ===== WALLET CHECK ===== */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ===== GRIDLINES PAN ESSENTIALS API ===== */
    const apiRes = await axios.post(
      "https://api.gridlines.io/pan-api/fetch-essentials",
      { pan_number, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    /* ❌ FAILURE → NO CREDIT DEDUCTION */
    if (code !== "1000") {
      await connection.rollback();

      return res.status(200).json({
        success: false,
        message: apiRes.data?.data?.message || "PAN validation failed",
        data: {
          code,
          pan_data: {
            document_type: "PAN",
            pan_number,
            name: "-",
            date_of_birth: "-",
          },
        },
      });
    }

    /* ===== SUCCESS CASE ===== */
    const panData = apiRes.data?.data?.pan_data || {};

    const normalizedPanData = {
      document_type: panData.document_type || "PAN",
      pan_number,
      name: panData.name || "-",
      date_of_birth: panData.date_of_birth || "-",
    };

    const closingBalance = openingBalance - creditsUsed;

    /* ===== WALLET UPDATE ===== */
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "PAN_FETCH_ESSENTIALS",
        "success",
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();

    /* ===== FINAL RESPONSE ===== */
    res.json({
      success: true,
      data: {
        code,
        message: apiRes.data?.data?.message,
        pan_data: normalizedPanData,
      },
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ PAN ESSENTIALS ERROR:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "PAN essentials fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const pullPanDigilockerController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, panno, PANFullName, file_no, consent } = req.body;

    if (!usr_ser_id || !panno || !PANFullName || !file_no || consent !== "Y") {
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
        message: "Service not allowed",
      });
    }

    const creditsUsed = Number(service.actual_credits);

    /* ===== WALLET CHECK ===== */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ===== GRIDLINES DIGILOCKER PAN PULL ===== */
    const apiRes = await axios.post(
      "https://api.gridlines.io/digilocker/pan/pull-document",
      {
        parameters: {
          panno: panno.trim().toUpperCase(),
          PANFullName: PANFullName.trim().toUpperCase(),
        },
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "", // ✅ THIS IS THE KEY FIX
          "X-Transaction-ID": uuidv4(),
          "X-Reference-ID": uuidv4(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    /* ❌ FAILURE — NO CREDIT CUT */
    if (!["1016", "1015"].includes(code)) {
      await connection.rollback();
      return res.status(200).json({
        success: false,
        data: {
          code,
          message: apiRes.data?.data?.message,
        },
      });
    }

    /* ===== CREDIT DEDUCTION ===== */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "PAN_DIGILOCKER_PULL",
        "success",
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: {
        code,
        message: apiRes.data?.data?.message,
        issued_file: apiRes.data?.data?.issued_file || null,
      },
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ DIGILOCKER PAN ERROR:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "PAN Digilocker pull failed",
    });
  } finally {
    connection.release();
  }
};

// new controllers to be added here and exported

export const checkPanNameCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, pan_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan_number],
    );

    if (existing) {
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

// export const executePanNameController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       pan_number,
//       use_cache,
//     } = req.body;

//     await connection.beginTransaction();

//     /* ================= SERVICE CHECK ================= */
//     const [[service]] = await connection.query(
//       `SELECT actual_credits
//        FROM user_services
//        WHERE usr_ser_id = ?
//          AND users_id = ?
//          AND status = 'active'
//        FOR UPDATE`,
//       [usr_ser_id, userId],
//     );

//     if (!service) throw new Error("Service not allowed");

//     const creditsUsed = Number(service.actual_credits);

//     /* ================= WALLET CHECK ================= */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
//       [userId],
//     );

//     if (user.wallet_amount < creditsUsed)
//       throw new Error("Insufficient balance");

//     const openingBalance = Number(user.wallet_amount);
//     const closingBalance = openingBalance - creditsUsed;

//     let fullResponse;
//     let responseStatus = "UNKNOWN";
//     let requestId = null;
//     let transactionId = null;

//     /* ================= CACHE FLOW ================= */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id = ?
//            AND mas_cat_id = ?
//            AND pan_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, pan_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;
//     } else {
//       /* ================= FRESH API CALL ================= */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/pan-api/fetch-card-name",
//         {
//           pan_number,
//           consent: "Y",
//           consent_text: "I provide consent to process my pan information.",
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       const code = fullResponse?.data?.code;
//       responseStatus = code === "1018" ? "SUCCESS" : "FAILED";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           pan_number, api_response,
//           response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           pan_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ================= WALLET DEDUCTION ================= */
//     let walletTransactionId = null;

//     if (responseStatus === "SUCCESS") {
//       await connection.query(
//         `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//         [closingBalance, userId],
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount,
//           opening_balance, closing_balance,
//           reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [userId, creditsUsed, openingBalance, closingBalance, userId],
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ================= SERVICE LOG ================= */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status,
//         wallet_transaction_id,
//         request_id, transaction_id,
//         created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "PAN_NAME_FETCH",
//         responseStatus,
//         walletTransactionId,
//         requestId,
//         transactionId,
//         userId,
//       ],
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: fullResponse,
//       wallet: {
//         opening_balance: openingBalance,
//         credits_used: responseStatus === "SUCCESS" ? creditsUsed : 0,
//         closing_balance:
//           responseStatus === "SUCCESS" ? closingBalance : openingBalance,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executePanNameController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      pan_number,
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
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ pan_number });

    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;
    let transactionId = null;
    let serFetLogId = null;

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
        [mas_ser_id, mas_cat_id, pan_number],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/pan-api/fetch-card-name",
        {
          pan_number,
          consent: "Y",
          consent_text: "I provide consent to process my pan information.",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus = code === "1018" ? "SUCCESS" : "FAILED";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          pan_number, api_response,
          response_status, http_status_code, created_by)
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
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status,
        wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "PAN_NAME_FETCH",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkPanDetailedCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, pan_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan_number],
    );

    if (existing) {
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

// export const executePanDetailedController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       pan_number,
//       use_cache,
//     } = req.body;

//     await connection.beginTransaction();

//     /* ===== SERVICE CHECK ===== */
//     const [[service]] = await connection.query(
//       `SELECT actual_credits
//        FROM user_services
//        WHERE usr_ser_id = ?
//          AND users_id = ?
//          AND status = 'active'
//        FOR UPDATE`,
//       [usr_ser_id, userId],
//     );

//     if (!service) throw new Error("Service not allowed");

//     const creditsUsed = Number(service.actual_credits);

//     /* ===== WALLET CHECK ===== */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
//       [userId],
//     );

//     if (user.wallet_amount < creditsUsed)
//       throw new Error("Insufficient balance");

//     const openingBalance = Number(user.wallet_amount);
//     const closingBalance = openingBalance - creditsUsed;

//     let fullResponse;
//     let responseStatus = "UNKNOWN";
//     let requestId = null;
//     let transactionId = null;

//     /* ===== CACHE FLOW ===== */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id = ?
//            AND mas_cat_id = ?
//            AND pan_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, pan_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;
//     } else {
//       /* ===== FRESH API CALL ===== */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/pan-api/fetch-detailed",
//         {
//           pan_number,
//           consent: "Y",
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       const code = fullResponse?.data?.code;
//       responseStatus = code === "1000" ? "SUCCESS" : "FAILED";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           pan_number, api_response,
//           response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           pan_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== WALLET DEDUCTION ===== */
//     let walletTransactionId = null;

//     if (responseStatus === "SUCCESS") {
//       await connection.query(
//         `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//         [closingBalance, userId],
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount,
//           opening_balance, closing_balance,
//           reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [userId, creditsUsed, openingBalance, closingBalance, userId],
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ===== SERVICE LOG ===== */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status,
//         wallet_transaction_id,
//         request_id, transaction_id,
//         created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "PAN_DETAILED_FETCH",
//         responseStatus,
//         walletTransactionId,
//         requestId,
//         transactionId,
//         userId,
//       ],
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: fullResponse,
//       wallet: {
//         opening_balance: openingBalance,
//         credits_used: responseStatus === "SUCCESS" ? creditsUsed : 0,
//         closing_balance:
//           responseStatus === "SUCCESS" ? closingBalance : openingBalance,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executePanDetailedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      pan_number,
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
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ pan_number });

    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;
    let transactionId = null;
    let serFetLogId = null;

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
        [mas_ser_id, mas_cat_id, pan_number],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/pan-api/fetch-detailed",
        {
          pan_number,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus = code === "1000" ? "SUCCESS" : "FAILED";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          pan_number, api_response,
          response_status, http_status_code, created_by)
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
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status,
        wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "PAN_DETAILED_FETCH",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkPanEssentialsCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, pan_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan_number],
    );

    if (existing) {
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

// export const executePanEssentialsController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       pan_number,
//       use_cache,
//     } = req.body;

//     await connection.beginTransaction();

//     /* ===== SERVICE CHECK ===== */
//     const [[service]] = await connection.query(
//       `SELECT actual_credits
//        FROM user_services
//        WHERE usr_ser_id = ?
//          AND users_id = ?
//          AND status = 'active'
//        FOR UPDATE`,
//       [usr_ser_id, userId],
//     );

//     if (!service) throw new Error("Service not allowed");

//     const creditsUsed = Number(service.actual_credits);

//     /* ===== WALLET CHECK ===== */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
//       [userId],
//     );

//     if (user.wallet_amount < creditsUsed)
//       throw new Error("Insufficient balance");

//     const openingBalance = Number(user.wallet_amount);
//     const closingBalance = openingBalance - creditsUsed;

//     let fullResponse;
//     let responseStatus = "UNKNOWN";
//     let requestId = null;
//     let transactionId = null;

//     /* ===== CACHE FLOW ===== */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id = ?
//            AND mas_cat_id = ?
//            AND pan_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, pan_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;
//     } else {
//       /* ===== FRESH API CALL ===== */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/pan-api/fetch-essentials",
//         { pan_number, consent: "Y" },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       const code = fullResponse?.data?.code;
//       responseStatus = code === "1000" ? "SUCCESS" : "FAILED";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           pan_number, api_response,
//           response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           pan_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== WALLET DEDUCTION ===== */
//     let walletTransactionId = null;

//     if (responseStatus === "SUCCESS") {
//       await connection.query(
//         `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//         [closingBalance, userId],
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount,
//           opening_balance, closing_balance,
//           reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [userId, creditsUsed, openingBalance, closingBalance, userId],
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ===== SERVICE LOG ===== */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status,
//         wallet_transaction_id,
//         request_id, transaction_id,
//         created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "PAN_FETCH_ESSENTIALS",
//         responseStatus,
//         walletTransactionId,
//         requestId,
//         transactionId,
//         userId,
//       ],
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: fullResponse,
//       wallet: {
//         opening_balance: openingBalance,
//         credits_used: responseStatus === "SUCCESS" ? creditsUsed : 0,
//         closing_balance:
//           responseStatus === "SUCCESS" ? closingBalance : openingBalance,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executePanEssentialsController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      pan_number,
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
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ pan_number });

    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;
    let transactionId = null;
    let serFetLogId = null;

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
        [mas_ser_id, mas_cat_id, pan_number],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/pan-api/fetch-essentials",
        { pan_number, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus = code === "1000" ? "SUCCESS" : "FAILED";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          pan_number, api_response,
          response_status, http_status_code, created_by)
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
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status,
        wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "PAN_FETCH_ESSENTIALS",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkPanLiteCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, pan_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan_number],
    );

    if (existing) {
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

// export const executePanLiteController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       pan_number,
//       use_cache,
//     } = req.body;

//     await connection.beginTransaction();

//     /* ===== SERVICE CHECK ===== */
//     const [[service]] = await connection.query(
//       `SELECT actual_credits
//        FROM user_services
//        WHERE usr_ser_id = ?
//          AND users_id = ?
//          AND status = 'active'
//        FOR UPDATE`,
//       [usr_ser_id, userId],
//     );

//     if (!service) throw new Error("Service not allowed");

//     const creditsUsed = Number(service.actual_credits);

//     /* ===== WALLET CHECK ===== */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
//       [userId],
//     );

//     if (user.wallet_amount < creditsUsed)
//       throw new Error("Insufficient balance");

//     const openingBalance = Number(user.wallet_amount);
//     const closingBalance = openingBalance - creditsUsed;

//     let fullResponse;
//     let responseStatus = "FAILED";
//     let requestId = null;
//     let transactionId = null;

//     /* ===== CACHE FLOW ===== */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id = ?
//            AND mas_cat_id = ?
//            AND pan_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, pan_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;
//     } else {
//       /* ===== FRESH API CALL ===== */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/pan-api/fetch",
//         { pan_number, consent: "Y" },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       const code = fullResponse?.data?.code;
//       responseStatus = code === "1000" ? "SUCCESS" : "FAILED";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           pan_number, api_response,
//           response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           pan_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== WALLET DEDUCTION ===== */
//     let walletTransactionId = null;

//     if (responseStatus === "SUCCESS") {
//       await connection.query(
//         `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//         [closingBalance, userId],
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount,
//           opening_balance, closing_balance,
//           reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [userId, creditsUsed, openingBalance, closingBalance, userId],
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ===== SERVICE LOG (FIXED) ===== */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status,
//         wallet_transaction_id,
//         request_id, transaction_id,
//         created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "PAN_LITE_FETCH",
//         responseStatus,
//         walletTransactionId,
//         requestId,
//         transactionId,
//         userId,
//       ],
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: fullResponse,
//       wallet: {
//         opening_balance: openingBalance,
//         credits_used: responseStatus === "SUCCESS" ? creditsUsed : 0,
//         closing_balance:
//           responseStatus === "SUCCESS" ? closingBalance : openingBalance,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executePanLiteController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      pan_number,
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
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ pan_number });

    let fullResponse;
    let responseStatus = "FAILED";
    let requestId = null;
    let transactionId = null;
    let serFetLogId = null;

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
        [mas_ser_id, mas_cat_id, pan_number],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/pan-api/fetch",
        { pan_number, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus = code === "1000" ? "SUCCESS" : "FAILED";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          pan_number, api_response,
          response_status, http_status_code, created_by)
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
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status,
        wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "PAN_LITE_FETCH",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkPanValidateCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, pan_number, date_of_birth } = req.body;

    if (!mas_ser_id || !mas_cat_id || !pan_number || !date_of_birth) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    const [[existing]] = await connection.query(
      `SELECT ser_fet_log_id, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
         AND dob = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan_number, date_of_birth],
    );

    if (existing) {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at, // ✅ correct column
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ PAN VALIDATE CACHE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Cache check failed",
    });
  } finally {
    connection.release();
  }
};

// export const executePanValidateController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       pan_number,
//       date_of_birth,
//       use_cache,
//     } = req.body;

//     await connection.beginTransaction();

//     /* ================= SERVICE CHECK ================= */
//     const [[service]] = await connection.query(
//       `SELECT actual_credits
//        FROM user_services
//        WHERE usr_ser_id = ?
//          AND users_id = ?
//          AND status = 'active'
//        FOR UPDATE`,
//       [usr_ser_id, userId],
//     );

//     if (!service) throw new Error("Service not allowed");

//     const creditsUsed = Number(service.actual_credits);

//     /* ================= WALLET CHECK ================= */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
//       [userId],
//     );

//     if (!user) throw new Error("User not found");

//     if (Number(user.wallet_amount) < creditsUsed)
//       throw new Error("Insufficient balance");

//     const openingBalance = Number(user.wallet_amount);
//     const closingBalance = openingBalance - creditsUsed;

//     let fullResponse;
//     let responseStatus = "FAILED";
//     let requestId = null;
//     let transactionId = null;

//     /* ================= CACHE FLOW ================= */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id = ?
//            AND mas_cat_id = ?
//            AND pan_number = ?
//            AND dob = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, pan_number, date_of_birth],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;
//     } else {
//       /* ================= FRESH API CALL ================= */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/pan-api/validate-details",
//         {
//           pan_number,
//           date_of_birth,
//           consent: "Y",
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       const code = fullResponse?.data?.code;

//       responseStatus = ["1000", "1018"].includes(code) ? "SUCCESS" : "FAILED";

//       /* ===== INSERT INTO CACHE TABLE ===== */
//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           pan_number, dob,
//           api_response, response_status,
//           http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           pan_number,
//           date_of_birth,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ================= WALLET DEDUCTION ================= */
//     let walletTransactionId = null;

//     if (responseStatus === "SUCCESS") {
//       await connection.query(
//         `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//         [closingBalance, userId],
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount,
//           opening_balance, closing_balance,
//           reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [userId, creditsUsed, openingBalance, closingBalance, userId],
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ================= SERVICE LOG ================= */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status,
//         wallet_transaction_id,
//         request_id, transaction_id,
//         created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "PAN_VALIDATE_DOB",
//         responseStatus,
//         walletTransactionId,
//         requestId,
//         transactionId,
//         userId,
//       ],
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: fullResponse,
//       wallet: {
//         opening_balance: openingBalance,
//         credits_used: responseStatus === "SUCCESS" ? creditsUsed : 0,
//         closing_balance:
//           responseStatus === "SUCCESS" ? closingBalance : openingBalance,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error("❌ PAN VALIDATE ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executePanValidateController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      pan_number,
      date_of_birth,
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
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    if (Number(user.wallet_amount) < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ pan_number, date_of_birth });

    let fullResponse;
    let responseStatus = "FAILED";
    let requestId = null;
    let transactionId = null;
    let serFetLogId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND pan_number = ?
           AND dob = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, pan_number, date_of_birth],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/pan-api/validate-details",
        {
          pan_number,
          date_of_birth,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus = ["1000", "1018"].includes(code) ? "SUCCESS" : "FAILED";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          pan_number, dob,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          pan_number,
          date_of_birth,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status,
        wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "PAN_VALIDATE_DOB",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ PAN VALIDATE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkBusinessPanCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, pan_number } = req.body;

    if (!mas_ser_id || !mas_cat_id || !pan_number) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    const [[existing]] = await connection.query(
      `SELECT ser_fet_log_id, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND pan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, pan_number],
    );

    if (existing) {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ BUSINESS PAN CACHE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Cache check failed",
    });
  } finally {
    connection.release();
  }
};

// export const executeBusinessPanController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       pan_number,
//       use_cache,
//     } = req.body;

//     if (!usr_ser_id || !pan_number || !file_no) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payload",
//       });
//     }

//     await connection.beginTransaction();

//     /* ================= SERVICE CHECK ================= */
//     const [[service]] = await connection.query(
//       `SELECT actual_credits
//        FROM user_services
//        WHERE usr_ser_id = ?
//          AND users_id = ?
//          AND status = 'active'
//        FOR UPDATE`,
//       [usr_ser_id, userId],
//     );

//     if (!service) throw new Error("Service not allowed");

//     const creditsUsed = Number(service.actual_credits);

//     /* ================= WALLET CHECK ================= */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
//       [userId],
//     );

//     if (!user) throw new Error("User not found");

//     const openingBalance = Number(user.wallet_amount);

//     if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

//     const closingBalance = openingBalance - creditsUsed;

//     let fullResponse;
//     let responseStatus = "FAILED";
//     let requestId = null;
//     let transactionId = null;

//     /* ================= CACHE FLOW ================= */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id = ?
//            AND mas_cat_id = ?
//            AND pan_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, pan_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;
//     } else {
//       /* ================= FRESH API CALL ================= */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/pan-api/business-verify",
//         {
//           pan_number,
//           consent: "Y",
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       const code = fullResponse?.data?.code;

//       responseStatus = code === "1013" ? "SUCCESS" : "FAILED";

//       /* ===== INSERT CACHE ===== */
//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           pan_number,
//           api_response, response_status,
//           http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           pan_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ================= WALLET DEDUCTION ================= */
//     let walletTransactionId = null;

//     if (responseStatus === "SUCCESS") {
//       await connection.query(
//         `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//         [closingBalance, userId],
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount,
//           opening_balance, closing_balance,
//           reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [userId, creditsUsed, openingBalance, closingBalance, userId],
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ================= SERVICE LOG ================= */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status,
//         wallet_transaction_id,
//         request_id, transaction_id,
//         created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "BUSINESS_PAN_VERIFY",
//         responseStatus,
//         walletTransactionId,
//         requestId,
//         transactionId,
//         userId,
//       ],
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: fullResponse,
//       wallet: {
//         opening_balance: openingBalance,
//         credits_used: responseStatus === "SUCCESS" ? creditsUsed : 0,
//         closing_balance:
//           responseStatus === "SUCCESS" ? closingBalance : openingBalance,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error("❌ BUSINESS PAN ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executeBusinessPanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      pan_number,
      use_cache,
    } = req.body;

    if (!usr_ser_id || !pan_number || !file_no) {
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
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ pan_number });

    let fullResponse;
    let responseStatus = "FAILED";
    let requestId = null;
    let transactionId = null;
    let serFetLogId = null;

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
        [mas_ser_id, mas_cat_id, pan_number],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/pan-api/business-verify",
        {
          pan_number,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus = code === "1013" ? "SUCCESS" : "FAILED";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          pan_number,
          api_response, response_status,
          http_status_code, created_by)
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
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status,
        wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "BUSINESS_PAN_VERIFY",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ BUSINESS PAN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
