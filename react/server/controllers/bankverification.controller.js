import axios from "axios";
import db from "../database/db.js";
import FormData from "form-data";
import fs from "fs";

export const fetchUploadBankStatementController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 Upload Bank Statement API HIT");

    const userId = req.user.userId;
    console.log("👤 User ID:", userId);

    console.log("📦 req.body:", req.body);
    console.log("📄 req.file:", req.file);

    const { usr_ser_id, file_no, bank_name, password, consent } = req.body;
    const file = req.file;

    /* ============ VALIDATION ============ */
    if (!usr_ser_id || !file_no || !file || consent !== "Y") {
      console.log("❌ VALIDATION FAILED");
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
        debug: {
          usr_ser_id,
          file_no,
          consent,
          file_present: !!file,
        },
      });
    }

    await connection.beginTransaction();

    /* ============ SERVICE CHECK ============ */
    const [[service]] = await connection.query(
      `SELECT actual_credits FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    console.log("🧾 Service:", service);

    if (!service) {
      console.log("❌ SERVICE NOT ALLOWED");
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    const creditsUsed = Number(service.actual_credits);
    console.log("💳 Credits Used:", creditsUsed);

    /* ============ WALLET CHECK ============ */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId],
    );

    console.log("💰 Wallet:", user.wallet_amount);

    if (user.wallet_amount < creditsUsed) {
      console.log("❌ INSUFFICIENT WALLET");
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ============ GRIDLINES UPLOAD ============ */
    const formData = new FormData();
    formData.append("file", fs.createReadStream(file.path));
    if (bank_name) formData.append("bank_name", bank_name);
    if (password) formData.append("password", password);
    formData.append("consent", "Y");

    console.log("🚀 Sending file to Gridlines...");
    console.log("📄 File path:", file.path);

    const apiRes = await axios.post(
      "https://api.gridlines.io/bank-api/bank-statement-analyzer/upload",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    console.log("✅ Gridlines Response:", apiRes.data);

    const code = apiRes.data?.data?.code;

    if (code !== "1019") {
      console.log("❌ GRIDLINES FAILED:", apiRes.data);
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ============ WALLET DEDUCT ============ */
    const closingBalance = user.wallet_amount - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount=? WHERE users_id=?`,
      [closingBalance, userId],
    );

    const [txn] = await connection.query(
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, user.wallet_amount, closingBalance, userId],
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
        "BANK_STATEMENT_UPLOAD",
        "success",
        txn.insertId,
        userId,
      ],
    );

    await connection.commit();

    console.log("🎉 Upload SUCCESS");

    res.json({
      success: true,
      data: apiRes.data,
      wallet: {
        opening_balance: user.wallet_amount,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.log("🔥 EXCEPTION:", err?.response?.data || err.message);
    res.json({
      success: true,
      data: err?.response?.data,
    });
  } finally {
    connection.release();
  }
};

export const fetchBankStatementReportController = async (req, res) => {
  try {
    const { transaction_id } = req.query;

    if (!transaction_id) {
      return res
        .status(400)
        .json({ success: false, message: "Transaction ID required" });
    }

    const apiRes = await axios.get(
      "https://api.gridlines.io/bank-api/bank-statement-analyzer/fetch-report",

      // "https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154719/bank-api/bank-statement-analyzer/fetch-report",
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Transaction-ID": transaction_id,
        },
      },
    );

    res.json({ success: true, data: apiRes.data });
  } catch (err) {
    res.json({ success: true, data: err.response?.data });
  }
};

export const fetchBankStatementOCRController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    console.log("📥 Bank Statement OCR API HIT");

    const userId = req.user.userId;
    console.log("👤 User ID:", userId);

    console.log("📦 req.body:", req.body);
    console.log("📄 req.file:", req.file);

    const { usr_ser_id, file_no, consent } = req.body;
    const file = req.file;

    /* ================= VALIDATION ================= */
    if (!file || consent !== "Y") {
      console.log("❌ VALIDATION FAILED");
      return res.status(400).json({
        success: false,
        message: "File and consent are required",
      });
    }

    await connection.beginTransaction();

    /* ================= OPTIONAL SERVICE CHECK ================= */
    if (usr_ser_id) {
      const [[service]] = await connection.query(
        `SELECT actual_credits 
         FROM user_services 
         WHERE usr_ser_id=? AND users_id=? AND status='active'`,
        [usr_ser_id, userId],
      );

      console.log("🧾 OCR Service:", service);

      if (!service) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Service not allowed",
        });
      }
    }

    /* ================= WALLET (LOG ONLY) ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=?`,
      [userId],
    );

    console.log("💰 Wallet Balance:", user.wallet_amount);
    console.log("ℹ️ OCR does NOT deduct wallet");

    /* ================= GRIDLINES OCR CALL ================= */
    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(file.path));
    formData.append("consent", "Y");

    console.log("🚀 Sending file to Gridlines OCR...");
    console.log("📄 File path:", file.path);

    const apiRes = await axios.post(
      "https://api.gridlines.io/bank-api/statement/ocr",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    console.log("✅ Gridlines OCR Response:", apiRes.data);

    const code = apiRes.data?.data?.code;
    const message = apiRes.data?.data?.message;

    console.log("📌 OCR Code:", code);
    console.log("📌 OCR Message:", message);

    /* ================= SERVICE LOG ================= */
    if (usr_ser_id) {
      await connection.query(
        `INSERT INTO user_service_logs
         (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          usr_ser_id,
          file_no || null,
          0,
          "BANK_STATEMENT_OCR",
          code === "1007" ? "success" : "failed",
          userId,
        ],
      );

      console.log("📝 OCR service log inserted");
    }

    await connection.commit();

    console.log("🎉 OCR SUCCESS");

    return res.json({
      success: true,
      data: apiRes.data,
      wallet: {
        opening_balance: user.wallet_amount,
        credits_used: 0,
        closing_balance: user.wallet_amount,
      },
    });
  } catch (err) {
    await connection.rollback();

    console.error("🔥 OCR EXCEPTION:", err?.response?.data || err.message);

    return res.json({
      success: true,
      data: err?.response?.data,
    });
  } finally {
    connection.release();
  }
};

export const fetchChequeOcrController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 Cheque OCR API HIT");

    const userId = req.user.userId;
    const { usr_ser_id, file_no, consent } = req.body;
    const file = req.file;

    console.log("👤 User ID:", userId);
    console.log("📦 Body:", req.body);
    console.log("📄 File:", file?.path);

    /* ================= VALIDATION ================= */
    if (!file || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "File and consent required",
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    let creditsUsed = 0;

    if (usr_ser_id) {
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

      creditsUsed = Number(service.actual_credits || 0);
    }

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

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES OCR ================= */
    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(file.path));
    formData.append("consent", "Y");

    console.log("🚀 Sending cheque to Gridlines OCR");

    const apiRes = await axios.post(
      "https://api.gridlines.io/bank-api/cheque/ocr",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    console.log("✅ Gridlines Response:", apiRes.data);

    const code = apiRes.data?.data?.code;

    /* ================= FAILURE → NO DEDUCTION ================= */
    if (code !== "1030") {
      await connection.commit();

      return res.json({
        success: true,
        data: apiRes.data,
        wallet: {
          opening_balance: openingBalance,
          credits_used: 0,
          closing_balance: openingBalance,
        },
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
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
    if (usr_ser_id) {
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
          file_no || null,
          creditsUsed,
          "CHEQUE_OCR",
          "success",
          walletTransactionId,
          userId,
        ],
      );
    }

    await connection.commit();

    console.log("🎉 Cheque OCR SUCCESS");

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
    console.error("🔥 CHEQUE OCR ERROR:", err?.response?.data || err);

    if (err.response?.data) {
      return res.json({
        success: true,
        data: err.response.data,
      });
    }

    res.status(500).json({
      success: false,
      message: "Cheque OCR failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchSalarySlipOcrController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 Salary Slip OCR API HIT");

    const userId = req.user.userId;
    const { usr_ser_id, file_no, consent } = req.body;
    const file = req.file;

    console.log("👤 User ID:", userId);
    console.log("📦 Body:", req.body);
    console.log("📄 File:", file?.path);

    /* ================= VALIDATION ================= */
    if (!file || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Salary slip file & consent required",
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    let creditsUsed = 0;

    if (usr_ser_id) {
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

      creditsUsed = Number(service.actual_credits || 0);
    }

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

    console.log("🔄 Salary slip converted to base64");

    /* ================= GRIDLINES OCR ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/bank-api/salary-slip/ocr",
      {
        base64_data: base64Data,
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

    console.log("✅ Gridlines Salary Slip OCR Response:", apiRes.data);

    const code = apiRes.data?.data?.code;

    /* ================= FAILURE → NO WALLET DEDUCTION ================= */
    if (code !== "1030") {
      await connection.commit();

      return res.json({
        success: true,
        data: apiRes.data,
        wallet: {
          opening_balance: openingBalance,
          credits_used: 0,
          closing_balance: openingBalance,
        },
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
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
    if (usr_ser_id) {
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
          file_no || null,
          creditsUsed,
          "SALARY_SLIP_OCR",
          "success",
          walletTransactionId,
          userId,
        ],
      );
    }

    await connection.commit();

    console.log("🎉 Salary Slip OCR SUCCESS");

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
    console.error("🔥 SALARY SLIP OCR ERROR:", err?.response?.data || err);

    if (err.response?.data) {
      return res.json({
        success: true,
        data: err.response.data,
      });
    }

    res.status(500).json({
      success: false,
      message: "Salary Slip OCR failed",
    });
  } finally {
    connection.release();
  }
};

//  new controller to handle both bank account verify and ifsc verify with same code, just by passing different mas_ser_id and mas_cat_id from frontend. This will help us to maintain cache in better way and also reduce code redundancy.

export const checkBankAccountVerifyCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, account_number, ifsc } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND account_number = ?
         AND ifsc_code = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, account_number, ifsc],
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

export const executeBankAccountVerifyHybridController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
      file_no,
      account_number,
      ifsc,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* SERVICE CHECK */
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

    /* WALLET CHECK */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = user.wallet_amount;
    const closingBalance = openingBalance - creditsUsed;

    /* DEDUCT */
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

    const walletTransactionId = walletTxn.insertId;

    let fullResponse;
    let responseStatus = "SUCCESS";
    let requestId = null;
    let transactionId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND account_number = ?
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, account_number, ifsc],
      );

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;
    } else {
      /* ================= FRESH FLOW ================= */
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify/hybrid",
        {
          account_number,
          ifsc,
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
      requestId = fullResponse?.request_id;
      transactionId = fullResponse?.transaction_id;

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, account_number, ifsc_code,
          api_response, response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          account_number,
          ifsc,
          JSON.stringify(fullResponse),
          "SUCCESS",
          apiRes.status,
          userId,
        ],
      );
    }

    /* INSERT USER LOG */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "BANK_ACCOUNT_VERIFY_HYBRID",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: fullResponse,
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};
export const executeBankAccountVerifyHybridController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
      file_no,
      account_number,
      ifsc,
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

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
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

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      account_number,
      ifsc,
    });

    let fullResponse;
    let responseStatus = "failed";
    let requestId = null;
    let transactionId = null;
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
           AND account_number = ?
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, account_number, ifsc]
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
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify/hybrid",
        {
          account_number,
          ifsc,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        }
      );

      fullResponse = apiRes.data;

      const responseCode = fullResponse?.data?.code || null;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= STATUS MAP ================= */
      if (responseCode === "1000") {
        responseStatus = "success";
      } else if (
        ["1003", "1004", "1009", "1012", "1026", "1027", "1029"].includes(
          responseCode
        )
      ) {
        responseStatus = "failed";
      } else if (responseCode === "1028") {
        responseStatus = "failed";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */
      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          account_number, ifsc_code,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          account_number,
          ifsc,
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
        request_id,
        transaction_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "BANK_ACCOUNT_VERIFY_HYBRID",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ]
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
export const checkBankAccountVerifyPennilessCacheController = async (
  req,
  res,
) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, account_number, ifsc } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND account_number = ?
         AND ifsc_code = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, account_number, ifsc],
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

export const executeBankAccountVerifyPennilessController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
      file_no,
      account_number,
      ifsc,
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
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= DEDUCT WALLET ================= */
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

    const walletTransactionId = walletTxn.insertId;

    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;
    let transactionId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND account_number = ?
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, account_number, ifsc],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
    } else {
      /* ================= FRESH API CALL ================= */
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify/penniless",
        {
          account_number,
          ifsc,
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

      const responseCode = fullResponse?.data?.code || null;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= STATUS MAP ================= */
      if (responseCode === "1000") {
        responseStatus = "SUCCESS";
      } else if (
        ["1003", "1004", "1009", "1012", "1026", "1027", "1029"].includes(
          responseCode,
        )
      ) {
        responseStatus = "BUSINESS_FAIL";
      } else if (responseCode === "1028") {
        responseStatus = "VALIDATION_FAIL";
      } else {
        responseStatus = "UNKNOWN";
      }

      /* ================= INSERT CACHE ================= */
      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, account_number,
          ifsc_code, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          account_number,
          ifsc,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );
    }

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "BANK_ACCOUNT_VERIFY_PENNILESS",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
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
export const executeBankAccountVerifyPennilessController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
      file_no,
      account_number,
      ifsc,
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

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
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

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      account_number,
      ifsc,
    });

    let fullResponse;
    let responseStatus = "failed";
    let requestId = null;
    let transactionId = null;
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
           AND account_number = ?
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, account_number, ifsc]
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
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify/penniless",
        {
          account_number,
          ifsc,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        }
      );

      fullResponse = apiRes.data;

      const responseCode = fullResponse?.data?.code || null;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      /* ================= STATUS MAP ================= */
      if (responseCode === "1000") {
        responseStatus = "success";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */
      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          account_number, ifsc_code,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          account_number,
          ifsc,
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
        request_id,
        transaction_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "BANK_ACCOUNT_VERIFY_PENNILESS",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ]
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


export const checkVerifyIfscCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, ifsc } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND ifsc_code = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, ifsc],
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

export const executeVerifyIfscController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const { usr_ser_id, mas_cat_id, mas_ser_id, file_no, ifsc, use_cache } =
      req.body;

    await connection.beginTransaction();

    /* SERVICE CHECK */
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

    /* WALLET CHECK */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* DEDUCT WALLET */
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

    const walletTransactionId = walletTxn.insertId;

    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;

    /* CACHE FLOW */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, ifsc],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify-ifsc",
        { ifsc, consent: "Y" },
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

      const code = fullResponse?.data?.code;

      if (code === "1041") responseStatus = "SUCCESS";
      else if (code) responseStatus = "BUSINESS_FAIL";

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          ifsc_code, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          ifsc,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );
    }

    /* USER SERVICE LOG */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status, wallet_transaction_id,
        request_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "BANK_VERIFY_IFSC",
        responseStatus,
        walletTransactionId,
        requestId,
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
export const executeVerifyIfscController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const { usr_ser_id, mas_cat_id, mas_ser_id, file_no, ifsc, use_cache } =
      req.body;

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

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
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

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      ifsc,
    });

    let fullResponse;
    let responseStatus = "failed";
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
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, ifsc]
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify-ifsc",
        { ifsc, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;

      responseStatus = code === "1041" ? "success" : "failed";

      /* ===== INSERT FETCH LOG FIRST ===== */
      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          ifsc_code, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          ifsc,
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
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "BANK_VERIFY_IFSC",
        responseStatus,
        walletTransactionId,
        requestId,
        serFetLogId,
        userId,
      ]
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

export const checkBankAccountVerify = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, account_number, ifsc } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND account_number = ?
         AND ifsc_code = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, account_number, ifsc],
    );

    if (existing) {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.created_at || existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeBankAccountVerifyController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
      file_no,
      account_number,
      ifsc,
      use_cache,
    } = req.body;

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

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ===== WALLET CHECK ===== */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ===== DEDUCT WALLET ===== */
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

    const walletTransactionId = walletTxn.insertId;

    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;
    let transactionId = null;

    /* ===== CACHE FLOW ===== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND account_number = ?
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, account_number, ifsc],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
    } else {
      /* ===== FRESH API ===== */
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify",
        {
          account_number,
          ifsc,
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

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1000") responseStatus = "SUCCESS";
      else responseStatus = "BUSINESS_FAIL";

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, account_number,
          ifsc_code, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          account_number,
          ifsc,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );
    }

    /* ===== USER SERVICE LOG ===== */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "BANK_ACCOUNT_VERIFY",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
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
export const executeBankAccountVerifyController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
      file_no,
      account_number,
      ifsc,
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

    if (user.wallet_amount < creditsUsed)
      throw new Error("Insufficient balance");

    const openingBalance = Number(user.wallet_amount);
    const closingBalance = openingBalance - creditsUsed;

    /* ================= WALLET DEDUCTION ================= */
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

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      account_number,
      ifsc,
    });

    let fullResponse;
    let responseStatus = "failed";
    let requestId = null;
    let transactionId = null;
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
           AND account_number = ?
           AND ifsc_code = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, account_number, ifsc]
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
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/bank-api/verify",
        {
          account_number,
          ifsc,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      responseStatus = code === "1000" ? "success" : "failed";

      /* ===== INSERT FETCH LOG FIRST ===== */
      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          account_number, ifsc_code,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          account_number,
          ifsc,
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
        request_id,
        transaction_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "BANK_ACCOUNT_VERIFY",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
        serFetLogId,
        userId,
      ]
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
