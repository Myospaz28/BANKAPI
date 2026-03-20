import axios from "axios";
import db from "../database/db.js";

export const ccrvRapidSearchController1 = async (req, res) => {
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

    if (!usr_ser_id || !file_no || !name || consent !== "Y") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    await connection.beginTransaction();

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

    const apiRes = await axios.post(
      "https://api.gridlines.io/ccrv-api/rapid/search",
      { name, father_name, address, date_of_birth, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
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
      ],
    );

    await connection.query(
      `INSERT INTO ccrv_requests (
        users_id, usr_ser_id, file_no,
        transaction_id, ccrv_status,
        search_payload
      ) VALUES (?, ?, ?, ?, 'REQUESTED', ?)`,
      [userId, usr_ser_id, file_no, txnId, JSON.stringify(req.body)],
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
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
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
        },
      );
    } catch (err) {
      // Gridlines validation / config error → NOT server error
      await connection.rollback();
      console.error(
        "❌ GRIDLINES CCRV SEARCH ERROR:",
        err.response?.data || err,
      );

      return res.status(400).json({
        success: false,
        message:
          err.response?.data?.error?.message || "CCRV search validation failed",
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
      [closingBalance, userId],
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
      [userId, creditsUsed, openingBalance, closingBalance, userId],
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
      ],
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
      [userId, usr_ser_id, file_no, transactionId, JSON.stringify(payload)],
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
      },
    );

    res.json({ success: true, data: apiRes.data });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Unable to fetch CCRV result" });
  }
};

export const ccrvRapidResultController2 = async (req, res) => {
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
      },
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
export const getCcrvResultController1 = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const [[data]] = await db.query(
      `SELECT response_status, api_response
       FROM service_data_fetch_log
       WHERE transaction_id = ?`,
      [transactionId],
    );

    if (!data) {
      return res.json({ status: "not_found" });
    }

    if (data.response_status === "requested") {
      return res.json({ status: "processing" });
    }

    return res.json({
      status: "completed",
      data: JSON.parse(data.api_response),
    });
  } catch (err) {
    console.error("❌ GET CCRV RESULT ERROR:", err);

    res.status(500).json({ success: false });
  }
};

export const checkCcrvRapidCacheController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, name, dob } = req.body;

    console.log("🔎 [CCRV CACHE CHECK] Input:", {
      mas_ser_id,
      mas_cat_id,
      name,
      dob,
    });

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id=?
       AND mas_cat_id=?
       AND name=?
       AND dob <=> ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, name, dob || null],
    );

    if (!existing) {
      console.log("🟡 [CCRV CACHE] No cache found");

      return res.json({ hasCache: false });
    }

    console.log("🟢 [CCRV CACHE FOUND]", existing);

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ [CCRV CACHE ERROR]", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const checkCcrvRapidCacheController2 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, name, dob } = req.body;

    const cleanName = name.trim();

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at, transaction_id
       FROM service_data_fetch_log
       WHERE mas_ser_id=?
       AND mas_cat_id=?
       AND name=?
       AND dob <=> ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, cleanName, dob || null],
    );

    if (!existing) {
      return res.json({ hasCache: false });
    }

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        status: "success",
        lastFetchedAt: existing.fetched_at,
      });
    }

    if (existing.response_status === "requested") {
      return res.json({
        hasCache: true,
        status: "processing",
        transaction_id: existing.transaction_id,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ CACHE ERROR", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeCcrvRapidController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      name,
      father_name,
      address,
      dob,
    } = req.body;

    console.log("🚀 [CCRV SEARCH START]", {
      userId,
      file_no,
      name,
    });

    await connection.beginTransaction();

    /* SERVICE CHECK */

    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id=?
       AND users_id=?
       AND status='active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) {
      console.log("⛔ [SERVICE BLOCKED]");

      throw new Error("Service not allowed");
    }

    const creditsUsed = Number(service.actual_credits);

    /* WALLET CHECK */

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id=?
       FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    console.log("💰 [WALLET BALANCE]", openingBalance);

    if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

    /* GRIDLINES SEARCH */

    const payload = {
      name,
      father_name,
      address,
      consent: "Y",
      callback_url: "https://api.risqcorporate.com/gridlines/ccrv",
    };

    if (dob) payload.date_of_birth = dob;

    console.log("📡 [GRIDLINES REQUEST]", payload);

    const apiRes = await axios.post(
      "https://api.gridlines.io/ccrv-api/rapid/search",
      payload,
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const response = apiRes.data;

    console.log("📡 [GRIDLINES RESPONSE]", response);

    const code = response?.data?.code;

    if (code !== "1016") {
      console.log("⚠️ [GRIDLINES SEARCH FAILED]", code);

      await connection.rollback();

      return res.json({
        success: true,
        data: response,
      });
    }

    const transactionId = response.data.transaction_id;

    console.log("🆔 [TRANSACTION ID]", transactionId);

    /* WALLET DEDUCTION */

    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount=? WHERE users_id=?`,
      [closingBalance, userId],
    );

    console.log("💳 [WALLET DEDUCTED]", creditsUsed);

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id,transaction_type,amount,
        opening_balance,closing_balance,
        reference_type,created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* FETCH LOG */

    const [fetchInsert] = await connection.query(
      `INSERT INTO service_data_fetch_log
      (mas_ser_id, mas_cat_id, file_number,
       name, dob, transaction_id,
       api_response, response_status,
       http_status_code, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mas_ser_id,
        mas_cat_id,
        file_no,
        name,
        dob || null,
        transactionId,
        JSON.stringify(response),
        "requested",
        apiRes.status,
        userId,
      ],
    );

    const serFetLogId = fetchInsert.insertId;

    console.log("🗂 [FETCH LOG CREATED]", serFetLogId);

    /* USER SERVICE LOG */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,usr_ser_id,file_no,
        input_payload,credits_used,
        api_name,api_status,
        wallet_transaction_id,
        transaction_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        JSON.stringify({ name, father_name, address, dob }),
        creditsUsed,
        "CCRV_RAPID",
        "requested",
        walletTransactionId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    console.log("✅ [CCRV SEARCH COMPLETED]");

    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    await connection.rollback();

    console.error("❌ [CCRV SEARCH ERROR]", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeCcrvRapidController2 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      name,
      father_name,
      address,
      dob,
    } = req.body;

    const clean = (v) => (v ? v.trim() : null);

    const cleanName = clean(name);
    const cleanFather = clean(father_name);
    const cleanAddress = clean(address);

    console.log("🚀 [CCRV SEARCH START]", cleanName);

    await connection.beginTransaction();

    /* ================= DUPLICATE SEARCH CHECK ================= */

    const [[existing]] = await connection.query(
      `SELECT transaction_id, response_status
       FROM service_data_fetch_log
       WHERE mas_ser_id=?
       AND name=?
       AND dob <=> ?
       AND response_status IN ('requested')
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, cleanName, dob || null],
    );

    if (existing) {
      console.log("⚠️ SEARCH ALREADY RUNNING");

      await connection.rollback();

      return res.json({
        success: true,
        processing: true,
        transaction_id: existing.transaction_id,
      });
    }

    /* ================= SERVICE CHECK ================= */

    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id=?
       FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

    /* ================= GRIDLINES SEARCH ================= */

    const payload = {
      name: cleanName,
      father_name: cleanFather,
      consent: "Y",
      callback_url: process.env.CCRV_CALLBACK_URL,
    };

    if (cleanAddress) payload.address = cleanAddress;
    if (dob) payload.date_of_birth = dob;

    console.log("📡 GRIDLINES SEARCH PAYLOAD", payload);

    const apiRes = await axios.post(
      "https://api.gridlines.io/ccrv-api/rapid/search",
      payload,
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const response = apiRes.data;

    console.log("📡 GRIDLINES RESPONSE", response);

    const code = response?.data?.code;

    if (code !== "1016") {
      await connection.rollback();

      return res.json({
        success: true,
        data: response,
      });
    }

    const transactionId = response.data.transaction_id;

    /* ================= WALLET DEDUCT ================= */

    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount=? WHERE users_id=?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id,transaction_type,amount,
        opening_balance,closing_balance,
        reference_type,created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= FETCH LOG ================= */

    const [fetchInsert] = await connection.query(
      `INSERT INTO service_data_fetch_log
      (mas_ser_id,mas_cat_id,file_number,
       name,dob,transaction_id,
       api_response,response_status,
       http_status_code,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        mas_ser_id,
        mas_cat_id,
        file_no,
        cleanName,
        dob || null,
        transactionId,
        JSON.stringify(response),
        "requested",
        apiRes.status,
        userId,
      ],
    );

    const serFetLogId = fetchInsert.insertId;

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,usr_ser_id,file_no,
        input_payload,credits_used,
        api_name,api_status,
        wallet_transaction_id,
        transaction_id,
        ser_fet_log_id,
        created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        JSON.stringify(payload),
        creditsUsed,
        "CCRV_RAPID",
        "requested",
        walletTransactionId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    console.log("✅ CCRV SEARCH INITIATED");

    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    await connection.rollback();

    console.error("❌ CCRV SEARCH ERROR", err.response?.data || err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const ccrvRapidResultController = async (req, res) => {
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
        validateStatus: () => true,
      },
    );

    const data = apiRes.data;

    /* HANDLE COMPLETED TRANSACTION */

    if (data?.error?.code === "TRANSACTION_ALREADY_COMPLETED") {
      return res.json({
        success: true,
        alreadyCompleted: true,
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ CCRV RESULT ERROR:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch CCRV result",
    });
  }
};

export const gridlinesCcrvCallbackController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const payload = req.body;

    console.log("📩 [GRIDLINES CALLBACK RECEIVED]", payload);

    const transactionId = payload?.transaction_id;

    if (!transactionId) {
      console.log("⚠️ [CALLBACK INVALID - NO TRANSACTION ID]");

      return res.status(400).json({ success: false });
    }

    await connection.query(
      `UPDATE service_data_fetch_log
       SET api_response=?,
           response_status='success'
       WHERE transaction_id=?`,
      [JSON.stringify(payload), transactionId],
    );

    await connection.query(
      `UPDATE user_service_logs
       SET api_status='success'
       WHERE transaction_id=?`,
      [transactionId],
    );

    console.log("✅ [CALLBACK RESULT SAVED]", transactionId);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ [CALLBACK ERROR]", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const getCcrvResultController2 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { transactionId } = req.params;

    console.log("🔎 [RESULT CHECK]", transactionId);

    const [[data]] = await connection.query(
      `SELECT response_status, api_response,
              fetched_at, result_api_checked
       FROM service_data_fetch_log
       WHERE transaction_id=?`,
      [transactionId],
    );

    if (!data) {
      console.log("⚠️ [RESULT NOT FOUND]");

      return res.json({ status: "not_found" });
    }

    if (data.response_status === "success") {
      console.log("✅ [RESULT RETURNED FROM DB]");

      return res.json({
        status: "completed",
        data: JSON.parse(data.api_response),
      });
    }

    const diff = (Date.now() - new Date(data.fetched_at)) / 1000;

    console.log("⏳ [WAITING CALLBACK]", diff, "seconds");

    if (diff < 60) {
      return res.json({ status: "processing" });
    }

    if (data.result_api_checked === 1) {
      console.log("🔁 [FALLBACK ALREADY CHECKED]");

      return res.json({ status: "processing" });
    }

    console.log("📡 [FALLBACK GRIDLINES RESULT API]");

    const apiRes = await axios.get(
      "https://api.gridlines.io/ccrv-api/rapid/result",
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Transaction-ID": transactionId,
        },
        validateStatus: () => true,
      },
    );

    const response = apiRes.data;

    console.log("📡 [GRIDLINES RESULT RESPONSE]", response);

    const code = response?.data?.code;

    await connection.query(
      `UPDATE service_data_fetch_log
       SET result_api_checked=1
       WHERE transaction_id=?`,
      [transactionId],
    );

    if (code === "1019" || code === "1020") {
      console.log("✅ [RESULT FETCHED VIA FALLBACK]");

      await connection.query(
        `UPDATE service_data_fetch_log
         SET api_response=?, response_status='success'
         WHERE transaction_id=?`,
        [JSON.stringify(response), transactionId],
      );

      return res.json({
        status: "completed",
        data: response,
      });
    }

    res.json({ status: "processing" });
  } catch (err) {
    console.error("❌ [RESULT ERROR]", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const getCcrvResultController3 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { transactionId } = req.params;

    console.log("🔎 RESULT CHECK", transactionId);

    const [[data]] = await connection.query(
      `SELECT response_status,api_response,fetched_at,result_api_checked
       FROM service_data_fetch_log
       WHERE transaction_id=?`,
      [transactionId],
    );

    if (!data) {
      return res.json({ status: "not_found" });
    }

    if (data.response_status === "success") {
      console.log("✅ RESULT FROM DB");

      return res.json({
        status: "completed",
        data: JSON.parse(data.api_response),
      });
    }

    const diff = (Date.now() - new Date(data.fetched_at)) / 1000;

    console.log("⏳ WAITING CALLBACK", diff);

    if (diff < 60) {
      return res.json({ status: "processing" });
    }

    if (data.result_api_checked === 1) {
      return res.json({ status: "processing" });
    }

    console.log("📡 FALLBACK RESULT API");

    const apiRes = await axios.get(
      "https://api.gridlines.io/ccrv-api/rapid/result",
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Transaction-ID": transactionId,
        },
        validateStatus: () => true,
      },
    );

    const response = apiRes.data;

    console.log("📡 RESULT RESPONSE", response);

    await connection.query(
      `UPDATE service_data_fetch_log
       SET result_api_checked=1
       WHERE transaction_id=?`,
      [transactionId],
    );

    const code = response?.data?.code;

    if (
      code === "1019" ||
      code === "1020" ||
      response?.error?.code === "UNABLE_TO_VERIFY"
    ) {
      await connection.query(
        `UPDATE service_data_fetch_log
         SET api_response=?,response_status='success'
         WHERE transaction_id=?`,
        [JSON.stringify(response), transactionId],
      );

      return res.json({
        status: "completed",
        data: response,
      });
    }

    res.json({ status: "processing" });
  } catch (err) {
    console.error("❌ RESULT ERROR", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const checkCcrvRapidCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, name, dob } = req.body;

    const cleanName = name.trim().toLowerCase();

    console.log("🔎 CCRV CACHE CHECK", { cleanName, dob });

    const [[existing]] = await connection.query(
      `SELECT api_response, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id=?
       AND mas_cat_id=?
       AND LOWER(TRIM(name))=?
       AND dob <=> ?
       AND response_status='success'
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, cleanName, dob || null],
    );

    if (!existing) {
      return res.json({ hasCache: false });
    }

    return res.json({
      hasCache: true,
      lastFetchedAt: existing.fetched_at,
      data: JSON.parse(existing.api_response),
    });
  } catch (err) {
    console.error("❌ CCRV CACHE ERROR", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeCcrvRapidController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      name,
      father_name,
      address,
      dob,
    } = req.body;

    const clean = (v) => (v ? v.trim() : null);

    const cleanName = clean(name);

    console.log("🚀 CCRV SEARCH START", cleanName);

    await connection.beginTransaction();

    /* SERVICE CHECK */

    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* WALLET CHECK */

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id=? FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

    /* GRIDLINES SEARCH */

    const payload = {
      name: cleanName,
      father_name: clean(father_name),
      consent: "Y",
      callback_url: process.env.CCRV_CALLBACK_URL,
    };

    if (clean(address)) payload.address = clean(address);
    if (dob) payload.date_of_birth = dob;

    console.log("📡 GRIDLINES SEARCH PAYLOAD", payload);

    const apiRes = await axios.post(
      "https://api.gridlines.io/ccrv-api/rapid/search",
      payload,
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const response = apiRes.data;

    const code = response?.data?.code;

    if (code !== "1016") {
      await connection.rollback();

      return res.json({ success: true, data: response });
    }

    const transactionId = response.data.transaction_id;

    console.log("🆔 TRANSACTION ID", transactionId);

    /* WALLET DEDUCTION */

    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount=? WHERE users_id=?`,
      [closingBalance, userId],
    );

    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id,transaction_type,amount,
        opening_balance,closing_balance,
        reference_type,created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* FETCH LOG */

    const [fetchInsert] = await connection.query(
      `INSERT INTO service_data_fetch_log
      (mas_ser_id,mas_cat_id,file_number,
       name,dob,transaction_id,
       api_response,response_status,
       http_status_code,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        mas_ser_id,
        mas_cat_id,
        file_no,
        cleanName,
        dob || null,
        transactionId,
        JSON.stringify(response),
        "requested",
        apiRes.status,
        userId,
      ],
    );

    const serFetLogId = fetchInsert.insertId;

    /* USER SERVICE LOG */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,usr_ser_id,file_no,
        input_payload,credits_used,
        api_name,api_status,
        wallet_transaction_id,
        transaction_id,
        ser_fet_log_id,
        created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        JSON.stringify(payload),
        creditsUsed,
        "CCRV_RAPID",
        "requested",
        walletTransactionId,
        transactionId,
        serFetLogId,
        userId,
      ],
    );

    await connection.commit();

    res.json({ success: true, data: response });
  } catch (err) {
    await connection.rollback();

    console.error("❌ CCRV SEARCH ERROR", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const getCcrvResultController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { transactionId } = req.params;

    console.log("🔎 CCRV RESULT CHECK", transactionId);

    const [[row]] = await connection.query(
      `SELECT api_response,response_status
       FROM service_data_fetch_log
       WHERE transaction_id=?`,
      [transactionId],
    );

    if (!row) {
      return res.json({ status: "not_found" });
    }

    /* RESULT ALREADY SAVED */

    if (row.response_status === "success") {
      return res.json({
        status: "completed",
        data: JSON.parse(row.api_response),
      });
    }

    /* CALL GRIDLINES RESULT API */

    console.log("📡 FETCHING RESULT FROM GRIDLINES");

    const apiRes = await axios.get(
      "https://api.gridlines.io/ccrv-api/rapid/result",
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Transaction-ID": transactionId,
        },
        validateStatus: () => true,
      },
    );

    const response = apiRes.data;

  const code = response?.data?.code;

console.log("📡 CCRV RESULT CODE:", code);

/* PROCESSING STATES */

if(code === "1016" || code === "1017"){

   return res.json({
      status:"processing"
   });

}

/* FINAL STATES */

await connection.query(
  `UPDATE service_data_fetch_log
   SET api_response=?,
       response_status='success'
   WHERE transaction_id=?`,
  [JSON.stringify(response), transactionId]
);

await connection.query(
  `UPDATE user_service_logs
   SET api_status='success'
   WHERE transaction_id=?`,
  [transactionId]
);

return res.json({
   status:"completed",
   data:response
});

    /* ANY OTHER RESPONSE = FINAL STATE */

    await connection.query(
      `UPDATE service_data_fetch_log
   SET api_response=?,
       response_status='success'
   WHERE transaction_id=?`,
      [JSON.stringify(response), transactionId],
    );

    await connection.query(
      `UPDATE user_service_logs
   SET api_status='success'
   WHERE transaction_id=?`,
      [transactionId],
    );

    return res.json({
      status: "completed",
      data: response,
    });

    return res.json({ status: "processing" });
  } catch (err) {
    console.error("❌ CCRV RESULT ERROR", err);

    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
