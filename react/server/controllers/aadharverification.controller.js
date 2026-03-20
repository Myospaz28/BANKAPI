import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import db from "../database/db.js";

export const fetchAadhaarUidMaskingController1 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 AADHAAR UID MASKING API HIT");

    const userId = req.user.userId;
    console.log("👤 User:", userId);

    const { usr_ser_id, file_no, consent } = req.body;
    const file = req.file;

    console.log("📦 Body:", req.body);
    console.log("📄 File:", file);

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !file || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "File, File No, Service & Consent required",
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
    console.log("💳 Credits Used:", creditsUsed);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);
    console.log("💰 Opening Wallet:", openingBalance);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= FILE → BASE64 ================= */
    const fileBuffer = fs.readFileSync(file.path);
    const base64Data = fileBuffer.toString("base64");

    console.log("🔐 Base64 generated (length):", base64Data.length);

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/aadhaar-api/uid-masking",
      {
        base64_data: base64Data,
        consent: "Y",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    console.log("✅ Gridlines Response:", apiRes.data);

    const code = apiRes.data?.data?.code;

    /* ================= NOT SUCCESS ================= */
    if (code !== "1019") {
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
        users_id,
        transaction_type,
        amount,
        opening_balance,
        closing_balance,
        reference_type,
        created_by
      ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs (
        users_id,
        usr_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "AADHAAR_UID_MASKING",
        "success",
        walletTransactionId,
        userId,
      ],
    );

    await connection.commit();

    console.log("🎉 AADHAAR UID MASKING SUCCESS");

    res.json({
      success: true,
      data: apiRes.data,
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();

    console.error("🔥 AADHAAR MASKING ERROR:", err?.response?.data || err);

    if (err.response?.data) {
      return res.json({
        success: true,
        data: err.response.data,
      });
    }

    res.status(500).json({
      success: false,
      message: "Aadhaar UID masking failed",
    });
  } finally {
    connection.release();
  }
};
export const fetchAadhaarUidMaskingController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      consent,
    } = req.body;

    const file = req.file;

    if (!usr_ser_id || !mas_ser_id || !mas_cat_id || !file_no || !file || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "File, File No, Service & Consent required",
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

    /* ================= FILE → BASE64 ================= */
    const fileBuffer = fs.readFileSync(file.path);
    const base64Data = fileBuffer.toString("base64");

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/aadhaar-api/uid-masking",
      {
        base64_data: base64Data,
        consent: "Y",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
        validateStatus: () => true,
      }
    );

    const fullResponse = apiRes.data;

    const transactionId = fullResponse?.transaction_id || null;
    const requestId = fullResponse?.request_id || null;
    const code = fullResponse?.data?.code;

    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    if (code === "1019") {
      responseStatus = "success";
      shouldDeduct = true;
    }

    /* ================= INSERT FETCH LOG ================= */
    const [fetchInsert] = await connection.query(
      `INSERT INTO service_data_fetch_log
       (mas_ser_id, mas_cat_id, file_number,
        api_response, response_status,
        http_status_code, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        mas_ser_id,
        mas_cat_id,
        file_no,
        JSON.stringify(fullResponse),
        responseStatus,
        apiRes.status,
        userId,
      ]
    );

    const serFetLogId = fetchInsert.insertId;

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount=? WHERE users_id=?`,
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

    /* ================= USER LOG ================= */
    const inputPayload = JSON.stringify({
      file_name: file.originalname,
    });

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
         credits_used,
        api_name, api_status,
        wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "AADHAAR_UID_MASKING",
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

    console.error("❌ AADHAAR MASKING ERROR:", err.message);

    if (err?.response?.data) {
      return res.json({
        success: true,
        data: err.response.data,
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};
export const fetchAadhaarOcrV2Controller1 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, file_no, consent } = req.body;
    const front = req.files?.file_front?.[0];
    const back = req.files?.file_back?.[0];

    if (!usr_ser_id || !file_no || !front || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    /* ===== SERVICE CHECK ===== */
    const [[service]] = await connection.query(
      `SELECT actual_credits FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active' FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) {
      await connection.rollback();
      return res
        .status(403)
        .json({ success: false, message: "Service not allowed" });
    }

    const creditsUsed = Number(service.actual_credits);

    /* ===== WALLET ===== */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId],
    );

    if (user.wallet_amount < creditsUsed) {
      await connection.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Insufficient credits" });
    }

    /* ===== GRIDLINES OCR ===== */
    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(front.path));
    if (back) formData.append("file_back", fs.createReadStream(back.path));
    formData.append("consent", "Y");

    const apiRes = await axios.post(
      "https://api.gridlines.io/aadhaar-api/ocr/v2",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    if (code !== "1014") {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
    }

    /* ===== WALLET DEDUCTION ===== */
    const opening = Number(user.wallet_amount);
    const closing = opening - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount=? WHERE users_id=?`,
      [closing, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, opening, closing, userId],
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
        "AADHAAR_OCR_V2",
        "success",
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();

    res.json({
      success: true,
      data: apiRes.data, // 🔥 FULL RAW RESPONSE
    });
  } catch (err) {
    await connection.rollback();
    res.json({ success: true, data: err.response?.data });
  } finally {
    connection.release();
  }
};
export const fetchAadhaarOcrV2Controller = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      consent,
    } = req.body;

    const front = req.files?.file_front?.[0];
    const back = req.files?.file_back?.[0];

    if (!usr_ser_id || !mas_ser_id || !mas_cat_id || !file_no || !front || consent !== "Y") {
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
       WHERE usr_ser_id=? AND users_id=? AND status='active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id=?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= GRIDLINES OCR ================= */
    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(front.path));
    if (back) formData.append("file_back", fs.createReadStream(back.path));
    formData.append("consent", "Y");

    const apiRes = await axios.post(
      "https://api.gridlines.io/aadhaar-api/ocr/v2",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
        validateStatus: () => true,
      }
    );

    const fullResponse = apiRes.data;

    const transactionId = fullResponse?.transaction_id || null;
    const requestId = fullResponse?.request_id || null;
    const code = fullResponse?.data?.code;

    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    if (code === "1014") {
      responseStatus = "success";
      shouldDeduct = true;
    }

    /* ================= INSERT FETCH LOG ================= */
    const [fetchInsert] = await connection.query(
      `INSERT INTO service_data_fetch_log
       (mas_ser_id, mas_cat_id, file_number,
        api_response, response_status,
        http_status_code, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        mas_ser_id,
        mas_cat_id,
        file_no,
        JSON.stringify(fullResponse),
        responseStatus,
        apiRes.status,
        userId,
      ]
    );

    const serFetLogId = fetchInsert.insertId;

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount=? WHERE users_id=?`,
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

    /* ================= USER LOG ================= */
    const inputPayload = JSON.stringify({
      file_no,
      has_back: !!back,
    });

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
         credits_used,
        api_name, api_status,
        wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?,  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        
        shouldDeduct ? creditsUsed : 0,
        "AADHAAR_OCR_V2",
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
      data: fullResponse, // FULL RAW RESPONSE
    });

  } catch (err) {
    await connection.rollback();

    console.error("❌ AADHAAR OCR V2 ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};