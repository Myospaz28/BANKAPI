import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import db from "../database/db.js";

export const fetchFaceMatchController1 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 FACE MATCH API HIT");

    const userId = req.user.userId;
    const { usr_ser_id, file_no, consent } = req.body;

    const file1 = req.files?.file_1?.[0];
    const file2 = req.files?.file_2?.[0];

    if (!usr_ser_id || !file_no || !file1 || !file2 || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Both images, File No & consent required",
      });
    }

    await connection.beginTransaction();

    /* ========= SERVICE CHECK ========= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active'
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

    /* ========= WALLET CHECK ========= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
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

    /* ========= FILE → BASE64 ========= */
    const base64_1 = fs.readFileSync(file1.path).toString("base64");
    const base64_2 = fs.readFileSync(file2.path).toString("base64");

    /* ========= GRIDLINES API ========= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/face-api/verify",
      {
        file_1_base64: base64_1,
        file_2_base64: base64_2,
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

    const code = apiRes.data?.data?.code;

    if (!["1000", "1001"].includes(code)) {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
    }

    /* ========= WALLET DEDUCT ========= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount=? WHERE users_id=?`,
      [closingBalance, userId],
    );

    const [txn] = await connection.query(
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
        "FACE_MATCH",
        "success",
        txn.insertId,
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
  } catch (err) {
    await connection.rollback();
    console.error("🔥 FACE MATCH ERROR:", err?.response?.data || err);
    res.json({
      success: true,
      data: err?.response?.data,
    });
  } finally {
    connection.release();
  }
};
export const fetchFaceMatchController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    // const { usr_ser_id, file_no, consent } = req.body;
    const {
  usr_ser_id,
  mas_ser_id,
  mas_cat_id,
  file_no,
  consent
} = req.body;

    const file1 = req.files?.file_1?.[0];
    const file2 = req.files?.file_2?.[0];

    if (!usr_ser_id || !file_no || !file1 || !file2 || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Both images, File No & consent required",
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
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= FILE → BASE64 ================= */
    const base64_1 = fs.readFileSync(file1.path).toString("base64");
    const base64_2 = fs.readFileSync(file2.path).toString("base64");

    const inputPayload = JSON.stringify({ file_no });

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/face-api/verify",
      {
        file_1_base64: base64_1,
        file_2_base64: base64_2,
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

    if (["1000", "1001"].includes(code)) {
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

      const [txn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id, transaction_type, amount,
          opening_balance, closing_balance,
          reference_type, created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = txn.insertId;
    }

    /* ================= USER LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status,
        wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "FACE_MATCH",
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
    console.error("❌ FACE MATCH ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};