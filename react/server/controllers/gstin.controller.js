import axios from "axios";
import db from "../database/db.js";



export const fetchGstinLiteController = async (req, res) => {
  const connection = await db.getConnection();
  console.log("🔵 [GSTIN LITE] Controller hit");

  try {
    const userId = req.user.userId;
    const {
      usr_ser_id,
      file_no,
      gstin,
      include_hsn_data = false,
      include_filing_data = false,
      include_filing_frequency = false,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !gstin || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/gstin-api/fetch-lite",
      {
        gstin,
        include_hsn_data,
        include_filing_data,
        include_filing_frequency,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= NON-SUCCESS ================= */
    if (code !== "1000") {
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
        credits_used, api_name,
        api_status, wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "GSTIN_LITE",
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
    console.error("❌ GSTIN Lite Error:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "GSTIN fetch failed",
    });
  } finally {
    connection.release();
  }
};




export const fetchGstinDetailed = async (req, res) => {
  const connection = await db.getConnection();
  console.log("🔵 [GSTIN DETAILED] Controller hit");

  try {
    const userId = req.user.userId;
    const {
      usr_ser_id,
      file_no,
      gstin,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !gstin || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    console.log("🌐 Calling Gridlines GSTIN Detailed API...");

    const apiRes = await axios.post(
      "https://api.gridlines.io/gstin-api/fetch-detailed",
      {
        gstin,
        include_hsn_data: true,
        include_filing_data: true,
        include_filing_frequency: true,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= NON-SUCCESS ================= */
    if (code !== "1000") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
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

    /* ================= SERVICE LOG ================= */
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
        "GSTIN_DETAILED",
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
    console.error("❌ GSTIN Detailed Error:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "GSTIN detailed fetch failed",
    });
  } finally {
    connection.release();
  }
};




export const fetchGstinByMobileController = async (req, res) => {
  const connection = await db.getConnection();
  console.log("🔵 [GSTIN BY MOBILE] Controller hit");

  try {
    const userId = req.user.userId;
    const { usr_ser_id, file_no, mobile_number, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !mobile_number || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    console.log("🌐 Calling Gridlines GSTIN By Mobile API...");

    const apiRes = await axios.post(
      "https://api.gridlines.io/gstin-api/fetch-by-mobile",
      {
        mobile_number,
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

    const code = apiRes.data?.data?.code;

    /* ================= NON-SUCCESS ================= */
    if (code !== "1017") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
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

    /* ================= SERVICE LOG ================= */
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
        "GSTIN_BY_MOBILE",
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
    console.error("❌ GSTIN BY MOBILE Error:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "GSTIN by mobile fetch failed",
    });
  } finally {
    connection.release();
    console.log("🔚 DB connection released");
  }
};


export const fetchGstinContactDetailsController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, gstin, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !gstin || !file_no || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/gstin-api/fetch-contact-details",
      { gstin, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= NO DEDUCTION ON FAILURE ================= */
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
        credits_used, api_name,
        api_status, wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "GSTIN_CONTACT_DETAILS",
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
    console.error("❌ GSTIN Contact error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "GSTIN Contact fetch failed",
    });
  } finally {
    connection.release();
  }
};


export const fetchGstinByPanController = async (req, res) => {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/gstin-api/fetch-by-pan",
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
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= NO DEDUCTION ON FAILURE ================= */
    if (code !== "1002") {
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
        credits_used, api_name,
        api_status, wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "GSTIN_BY_PAN",
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
    console.error("❌ GSTIN by PAN error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "GSTIN by PAN fetch failed",
    });
  } finally {
    connection.release();
  }
};


export const fetchGstinMccCodesController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 Incoming MCC request body:", req.body);

    const userId = req.user.userId;
    let { usr_ser_id, gstin, file_no } = req.body;

    /* ================= NORMALIZE INPUT ================= */
    gstin = gstin?.trim().toUpperCase();
    const consent = "Y"; // forced as per Gridlines spec

    console.log("🧾 Normalized payload:", {
      usr_ser_id,
      gstin,
      file_no,
      consent,
    });

    if (!usr_ser_id || !gstin || gstin.length !== 15 || !file_no) {
      console.log("❌ Validation failed");
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN or payload",
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

    console.log("🔍 Service check result:", service);

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

    console.log("💰 Wallet before:", user.wallet_amount);

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    let apiRes;
    try {
      console.log("🌐 Calling Gridlines MCC API...");
      apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-mcc-codes",
        { gstin, consent },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Gridlines SUCCESS response:", apiRes.data);
    } catch (err) {
      console.log("❌ Gridlines ERROR response:", err.response?.data);

      await connection.rollback();
      return res.json({
        success: true,
        data: err.response?.data,
      });
    }

    const code = apiRes.data?.data?.code;
    console.log("📌 Gridlines response code:", code);

    /* ================= NO DEDUCTION ON FAILURE ================= */
    if (code !== "1015") {
      console.log("⚠️ No wallet deduction. Returning Gridlines response.");
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    console.log("💸 Deducting credits:", {
      openingBalance,
      creditsUsed,
      closingBalance,
    });

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
        credits_used, api_name,
        api_status, wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "GSTIN_MCC_CODES",
        "success",
        walletTxn.insertId,
        userId,
      ]
    );

    await connection.commit();

    console.log("✅ Transaction committed successfully");

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
    console.error("🔥 GSTIN MCC controller crash:", error);
    res.status(500).json({
      success: false,
      message: "GSTIN MCC fetch failed",
    });
  } finally {
    connection.release();
  }
};




// now controllers for new flow
export const checkGstinByMobileCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND mobile_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, mobile_number]
    );

    if (!existing) {
      return res.json({ hasCache: false });
    }

    /* ✅ Allow cache ONLY if status = success */
    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    /* ❌ Otherwise do not allow old data */
    return res.json({ hasCache: false });

  } catch (err) {
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeGstinByMobileController1 = async (req, res) => {
  const connection = await db.getConnection();
  // console.log("🔵 executeGstinByMobileController HIT");

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      mobile_number,
      use_cache,
    } = req.body;

    await connection.beginTransaction();
    // console.log("Transaction started");

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
    let shouldDeduct = false;
    let responseStatus = "failed";
    let walletTransactionId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      // console.log("Using cache");

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND mobile_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, mobile_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */
    else {
      // console.log("Calling Gridlines API...");

      const apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-by-mobile",
        { mobile_number, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true, // 🔥 prevents axios auto-throw
        }
      );

      // console.log("Gridlines HTTP Status:", apiRes.status);

      /* ===== HANDLE GRIDLINES SERVER ERROR ===== */
      if (apiRes.status !== 200) {
        // console.log("Gridlines error response:", apiRes.data);

        await connection.rollback();

        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      if (code === "1017") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1018") {
        responseStatus = "no_data"; // since enum only supports success/failed
      } else {
        responseStatus = "failed";
      }

      /* ===== STORE IN CACHE ===== */
      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, mobile_number,
          api_response, response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          mobile_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      // console.log("Inserted into service_data_fetch_log");
    }

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      // console.log("Deducting wallet...");

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
      // console.log("Wallet deducted. Txn ID:", walletTransactionId);
    }

    /* ================= USER SERVICE LOG ================= */
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
        "GSTIN_BY_MOBILE",
        responseStatus,
        walletTransactionId,
        userId,
      ]
    );

    // console.log("Inserted into user_service_logs");

    await connection.commit();
    // console.log("Transaction committed");

    return res.json({
      success: true,
      data: fullResponse,
    });

  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE GSTIN ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
    console.log("🔚 Connection released");
  }
};
export const executeGstinByMobileController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      mobile_number,
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
      mobile_number,
    });

    let fullResponse;
    let shouldDeduct = false;
    let responseStatus = "failed";
    let walletTransactionId = null;
    let serFetLogId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND mobile_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, mobile_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */
    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-by-mobile",
        { mobile_number, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      if (apiRes.status !== 200) {

        await connection.rollback();

        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      if (code === "1017") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1018") {
        responseStatus = "no_data";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, mobile_number,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          mobile_number,
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
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "GSTIN_BY_MOBILE",
        responseStatus,
        walletTransactionId,
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

    console.error("❌ EXECUTE GSTIN ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {

    connection.release();
    console.log("🔚 Connection released");
  }
};



export const checkGstinByPanCacheController = async (req, res) => {
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
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeGstinByPanController1 = async (req, res) => {
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
    let closingBalance = openingBalance - creditsUsed;

    let fullResponse;
    let responseStatus = "failed";
    let requestId = null;
    let transactionId = null;
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
        [mas_ser_id, mas_cat_id, pan_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;
    }

    /* ================= FRESH FLOW ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-by-pan",
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

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1002") responseStatus = "success";
      else responseStatus = "failed";

      /* STORE CACHE */
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
    if (openingBalance < creditsUsed)
      throw new Error("Insufficient balance");

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
        "GSTIN_BY_PAN",
        responseStatus,
        walletTransactionId,
        requestId,
        transactionId,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeGstinByPanController = async (req, res) => {
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
    const closingBalance = openingBalance - creditsUsed;

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      pan_number,
    });

    let fullResponse;
    let responseStatus = "failed";
    let requestId = null;
    let transactionId = null;
    let walletTransactionId = null;
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
        [mas_ser_id, mas_cat_id, pan_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;
    }

    /* ================= FRESH FLOW ================= */
    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-by-pan",
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

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1002") responseStatus = "success";
      else responseStatus = "failed";

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, pan_number,
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
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */

    if (openingBalance < creditsUsed)
      throw new Error("Insufficient balance");

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
        "GSTIN_BY_PAN",
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


export const checkGstinContactCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, gstin } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND gstin = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, gstin]
    );

    if (!existing) {
      return res.json({ hasCache: false });
    }

    // Allow cache only if last response was success
    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });

  } catch (err) {
    console.error("❌ checkGstinContactCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeGstinContactController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }

      // Cache → keep transaction_id & request_id null
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-contact-details",
        { gstin, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      if (apiRes.status !== 200) {
        await connection.rollback();

        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      /* 🔥 EXTRACT IDS FROM GRIDLINES RESPONSE */
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1013") {
        shouldDeduct = true;
        responseStatus = "success";
      } 
      else if (code === "1014") {
        responseStatus = "no_data";
      } 
      else {
        responseStatus = "failed";
      }

      /* ===== STORE IN CACHE ===== */
      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, gstin,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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

    /* =====================================================
       ================= USER SERVICE LOG ==================
       ===================================================== */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status,
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
        "GSTIN_CONTACT_DETAILS",
        responseStatus,
        walletTransactionId,
        transactionId,   // 🔥 only for fresh
        requestId,       // 🔥 only for fresh
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
    console.error("❌ EXECUTE GSTIN CONTACT ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
    console.log("🔚 Contact connection released");
  }
};
export const executeGstinContactController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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
      gstin,
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
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }

      // cache → keep transaction_id & request_id null
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-contact-details",
        { gstin, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      if (apiRes.status !== 200) {
        await connection.rollback();

        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1013") {
        shouldDeduct = true;
        responseStatus = "success";
      } 
      else if (code === "1014") {
        responseStatus = "no_data";
      } 
      else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, gstin,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)` ,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
    }

    /* =====================================================
       ================= USER SERVICE LOG ==================
       ===================================================== */
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "GSTIN_CONTACT_DETAILS",
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

    console.error("❌ EXECUTE GSTIN CONTACT ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {

    connection.release();
    console.log("🔚 Contact connection released");
  }
};



export const checkGstinDetailedCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, gstin } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND gstin = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, gstin]
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
    console.error("❌ GSTIN Detailed Cache Error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeGstinDetailedController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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

    let transactionId = null;
    let requestId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
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
        "https://api.gridlines.io/gstin-api/fetch-detailed",
        {
          gstin,
          include_hsn_data: true,
          include_filing_data: true,
          include_filing_frequency: true,
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

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          message: "Gridlines unavailable",
        });
      }

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, gstin,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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

    /* ================= USER LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status,
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
        "GSTIN_DETAILED",
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
    console.error("❌ GSTIN Detailed Error:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};
export const executeGstinDetailedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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
      gstin,

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
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
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
        "https://api.gridlines.io/gstin-api/fetch-detailed",
        {
          gstin,
          include_hsn_data: true,
          include_filing_data: true,
          include_filing_frequency: true,
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

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          message: "Gridlines unavailable",
        });
      }

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, gstin,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)` ,
        [userId, creditsUsed, openingBalance, closingBalance, userId]
      );

      walletTransactionId = walletTxn.insertId;
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "GSTIN_DETAILED",
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

    console.error("❌ GSTIN Detailed Error:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};



export const checkGstinLiteCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, gstin } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND gstin = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, gstin]
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
    console.error("❌ GSTIN Lite Cache Error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeGstinLiteController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
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
        "https://api.gridlines.io/gstin-api/fetch-lite",
        {
          gstin,
          include_hsn_data: true,
          include_filing_data: true,
          include_filing_frequency: true,
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

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1005") {
        responseStatus = "no_data";
      } else {
        responseStatus = "failed";
      }

      /* ===== STORE IN FETCH LOG ===== */
      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, gstin,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status,
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
        "GSTIN_LITE",
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
    console.error("❌ EXECUTE GSTIN LITE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};
export const executeGstinLiteController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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
      gstin,
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
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
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
        "https://api.gridlines.io/gstin-api/fetch-lite",
        {
          gstin,
          include_hsn_data: true,
          include_filing_data: true,
          include_filing_frequency: true,
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

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1005") {
        responseStatus = "no_data";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, gstin,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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
        "GSTIN_LITE",
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

    console.error("❌ EXECUTE GSTIN LITE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};



export const checkGstinMccCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, gstin } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND gstin = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, gstin]
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
    console.error("❌ MCC Cache Error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeGstinMccController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    let transactionId = null;
    let requestId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
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
        "https://api.gridlines.io/gstin-api/fetch-mcc-codes",
        { gstin, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1015") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1016") {
        responseStatus = "no_data";
      } else if (code === "1005") {
        responseStatus = "invalid";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, gstin,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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

    /* ================= USER LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used,
        api_name, api_status,
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
        "GSTIN_MCC_CODES",
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeGstinMccController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      gstin,
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
      gstin,
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
           AND gstin = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, gstin]
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

    /* ================= FRESH FLOW ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/gstin-api/fetch-mcc-codes",
        { gstin, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        }
      );

      if (apiRes.status !== 200) {
        await connection.rollback();
        return res.json({
          success: false,
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1015") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1016") {
        responseStatus = "no_data";
      } else if (code === "1005") {
        responseStatus = "invalid";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id,
          mas_cat_id,
          file_number,
          gstin,
          api_response,
          response_status,
          http_status_code,
          created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          gstin,
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
        "GSTIN_MCC_CODES",
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

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};

