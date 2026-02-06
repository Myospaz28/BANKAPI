import axios from "axios";
import db from "../database/db.js";


export const ccrvRapidSearchController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, file_no, name, father_name, address, date_of_birth, consent } = req.body;

    if (!usr_ser_id || !file_no || !name || consent !== "Y") {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    await connection.beginTransaction();

    const [[service]] = await connection.query(
      `SELECT actual_credits FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active' FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Service not allowed" });
    }

    const creditsUsed = Number(service.actual_credits);

    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId]
    );

    if (user.wallet_amount < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Insufficient credits" });
    }

    const apiRes = await axios.post(
      "https://api.gridlines.io/ccrv-api/rapid/search",
      { name, father_name, address, date_of_birth, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    if (apiRes.data?.data?.code !== "1016") {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
    }

    const txnId = apiRes.data.data.transaction_id;

    const openingBalance = user.wallet_amount;
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount=? WHERE users_id=?`,
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

    const walletTransactionId = walletTxn.insertId;

    await connection.query(
      `INSERT INTO user_service_logs (
        users_id, usr_ser_id, file_no,
        credits_used, api_name,
        api_status, wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "CCRV_RAPID",
        "requested",
        walletTransactionId,
        userId,
      ]
    );

    await connection.query(
      `INSERT INTO ccrv_requests (
        users_id, usr_ser_id, file_no,
        transaction_id, ccrv_status,
        search_payload
      ) VALUES (?, ?, ?, ?, 'REQUESTED', ?)`,
      [userId, usr_ser_id, file_no, txnId, JSON.stringify(req.body)]
    );

    await connection.commit();

    res.json({ success: true, data: apiRes.data });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "CCRV search failed" });
  } finally {
    connection.release();
  }
};



export const ccrvRapidSearchController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      file_no,
      name,
      father_name,
      address,
      date_of_birth,
      consent,
    } = req.body;

    /* ================= BASIC VALIDATION ================= */
    if (!usr_ser_id || !file_no || !name || consent !== "Y") {
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
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
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

    /* ================= PREPARE GRIDLINES PAYLOAD =================
       IMPORTANT:
       Do NOT send empty date_of_birth
    */
    const payload = {
      name,
      father_name,
      address,
      consent,
    };

    if (date_of_birth) {
      payload.date_of_birth = date_of_birth;
    }

    /* ================= GRIDLINES SEARCH API ================= */
    let apiRes;
    try {
      apiRes = await axios.post(
        "https://api.gridlines.io/ccrv-api/rapid/search",
        payload,
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      // Gridlines validation / config error → NOT server error
      await connection.rollback();
      console.error("❌ GRIDLINES CCRV SEARCH ERROR:", err.response?.data || err);

      return res.status(400).json({
        success: false,
        message:
          err.response?.data?.error?.message ||
          "CCRV search validation failed",
        data: err.response?.data,
      });
    }

    const code = apiRes.data?.data?.code;

    /* ================= NON-SUCCESS ================= */
    if (code !== "1016") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    const transactionId = apiRes.data.data.transaction_id;

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
    );

    /* ================= WALLET TRANSACTION ================= */
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
      [userId, creditsUsed, openingBalance, closingBalance, userId]
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= USER SERVICE LOG =================
       api_status = requested (NOT completed yet)
    */
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
        "CCRV_RAPID",
        "requested",
        walletTransactionId,
        userId,
      ]
    );

    /* ================= STORE CCRV REQUEST ================= */
    await connection.query(
      `INSERT INTO ccrv_requests (
        users_id,
        usr_ser_id,
        file_no,
        transaction_id,
        ccrv_status,
        search_payload
      ) VALUES (?, ?, ?, ?, 'REQUESTED', ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        transactionId,
        JSON.stringify(payload),
      ]
    );

    await connection.commit();

    /* ================= SUCCESS ================= */
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
    console.error("❌ CCRV SEARCH INTERNAL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "CCRV search failed",
    });
  } finally {
    connection.release();
  }
};

export const ccrvRapidResultController1 = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const apiRes = await axios.get(
      "https://api.gridlines.io/ccrv-api/rapid/result",
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Transaction-ID": transactionId,
        },
      }
    );

    res.json({ success: true, data: apiRes.data });
  } catch (e) {
    res.status(500).json({ success: false, message: "Unable to fetch CCRV result" });
  }
};



export const ccrvRapidResultController = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    /* ================= GRIDLINES RESULT API ================= */
    const apiRes = await axios.get(
      "https://api.gridlines.io/ccrv-api/rapid/result",
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Transaction-ID": transactionId, // ⚠️ MUST be header
        },
      }
    );

    /* ================= SUCCESS ================= */
    res.json({
      success: true,
      data: apiRes.data,
    });
  } catch (error) {
    console.error("❌ CCRV RESULT ERROR:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch CCRV result",
    });
  }
};
