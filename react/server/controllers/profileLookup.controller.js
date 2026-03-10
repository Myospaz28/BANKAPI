import axios from "axios";
import db from "../database/db.js";

export const fetchPersonalProfileController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      phone,
      first_name,
      last_name,
      pan,
      consent_text,
      file_no,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !phone || !first_name || !file_no || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT usr_ser_id, actual_credits
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/individual/fetch-personal-profile",
      {
        phone,
        first_name,
        last_name,
        pan,
        consent_text,
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

    /* ================= HANDLE FAILURE ================= */
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

    /* ================= USER SERVICE LOG ================= */
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
        "PERSONAL_PROFILE",
        "success",
        walletTransactionId,
        userId,
      ],
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
    console.error("❌ Personal Profile Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Personal profile fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchNationalIdsByPhoneController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      phone,
      first_name,
      last_name,
      pan,
      consent_text,
      file_no,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !phone || !first_name || !file_no || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT usr_ser_id, actual_credits
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/individual/fetch-national-ids",
      {
        phone,
        first_name,
        last_name,
        pan,
        consent_text,
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

    /* ================= HANDLE FAILURE ================= */
    if (code !== "1001") {
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

    /* ================= USER SERVICE LOG ================= */
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
        "NATIONAL_IDS_BY_PHONE",
        "success",
        walletTransactionId,
        userId,
      ],
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
    console.error("❌ National IDs Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "National IDs fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchAddressByPhoneController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      phone,
      first_name,
      last_name,
      pan,
      consent_text,
      file_no,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !phone || !first_name || !file_no || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT usr_ser_id, actual_credits
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/individual/fetch-address",
      {
        phone,
        first_name,
        last_name,
        pan,
        consent_text,
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

    /* ================= HANDLE FAILURE ================= */
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

    /* ================= USER SERVICE LOG ================= */
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
        "ADDRESS_BY_PHONE",
        "success",
        walletTransactionId,
        userId,
      ],
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
    console.error("❌ Address By Phone Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Address fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchPanByPhoneController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      phone,
      first_name,
      last_name,
      consent_text,
      file_no,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !phone || !first_name || !file_no || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT usr_ser_id, actual_credits
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/individual/fetch-pan",
      {
        phone,
        first_name,
        last_name,
        consent_text,
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

    /* ================= HANDLE FAILURE ================= */
    if (code !== "1003") {
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

    /* ================= USER SERVICE LOG ================= */
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
        "PAN_BY_PHONE",
        "success",
        walletTransactionId,
        userId,
      ],
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
    console.error("❌ PAN By Phone Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "PAN fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const mobileLookupController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, mobile_number, consent } = req.body;

    if (
      !usr_ser_id ||
      !mobile_number ||
      mobile_number.length !== 10 ||
      consent !== "Y"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    await connection.beginTransaction();

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

    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/telco/mobile-lookup",
      { mobile_number, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    if (code !== "1007") {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
    }

    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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
       VALUES (?, ?, ?, ?, 'MOBILE_LOOKUP', 'success', ?, ?)`,
      [userId, usr_ser_id, mobile_number, creditsUsed, txn.insertId, userId],
    );

    await connection.commit();

    res.json({
      success: true,
      data: apiRes.data,
      wallet: { openingBalance, creditsUsed, closingBalance },
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Mobile lookup failed" });
  } finally {
    connection.release();
  }
};

export const mobileNumberAgeController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, file_no, mobile_number, consent } = req.body;

    if (
      !usr_ser_id ||
      !file_no ||
      !mobile_number ||
      mobile_number.length !== 10 ||
      consent !== "Y"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    await connection.beginTransaction();

    const [[service]] = await connection.query(
      `SELECT actual_credits FROM user_services
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

    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/mobile/number-age",
      { mobile_number, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    if (code !== "1008") {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
    }

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
       VALUES (?, ?, ?, ?, 'MOBILE_NUMBER_AGE', 'success', ?, ?)`,
      [userId, usr_ser_id, file_no, creditsUsed, walletTxn.insertId, userId],
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
    res
      .status(500)
      .json({ success: false, message: "Mobile number age failed" });
  } finally {
    connection.release();
  }
};
export const mobileNumberAgeController = async (req, res) => {
  const connection = await db.getConnection();
  console.log("🔵 [MOBILE AGE] Controller hit");

  try {
    const userId = req.user.userId;
    console.log("👤 User ID:", userId);

    const { usr_ser_id, file_no, mobile_number, consent } = req.body;
    console.log("📥 Request Body:", req.body);

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !mobile_number ||
      mobile_number.length !== 10 ||
      consent !== "Y"
    ) {
      console.log("❌ Validation failed");
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();
    console.log("🟢 Transaction started");

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT usr_ser_id, actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    console.log("📦 Service:", service);

    if (!service) {
      console.log("❌ Service not allowed");
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

    console.log("💰 Wallet Row:", user);

    const openingBalance = Number(user.wallet_amount);
    console.log("💰 Opening Balance:", openingBalance);

    if (openingBalance < creditsUsed) {
      console.log("❌ Insufficient credits");
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    console.log("🌐 Calling Gridlines API...");

    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/mobile/number-age",
      {
        mobile_number,
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

    console.log(
      "🌐 Gridlines Raw Response:",
      JSON.stringify(apiRes.data, null, 2),
    );

    const code = apiRes?.data?.data?.code;
    console.log("📟 Gridlines Code:", code);

    /* ================= NON-SUCCESS ================= */
    if (code !== "1008") {
      console.log("⚠️ Non-success code, rolling back");
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;
    console.log("💰 Closing Balance:", closingBalance);

    await connection.query(
      `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
      [closingBalance, userId],
    );
    console.log("✅ Wallet updated");

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

    console.log("🧾 Wallet Transaction ID:", walletTxn.insertId);

    /* ================= USER SERVICE LOG ================= */
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
        "MOBILE_NUMBER_AGE",
        "success",
        walletTxn.insertId,
        userId,
      ],
    );

    console.log("📝 Service log inserted");

    await connection.commit();
    console.log("🟢 Transaction committed");

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
    console.log("🔥 ERROR OCCURRED");
    console.error("❌ Mobile Number Age Error:", error.response?.data || error);

    try {
      await connection.rollback();
      console.log("↩️ Rolled back transaction");
    } catch (_) {}

    res.status(500).json({
      success: false,
      message: "Mobile number age failed",
    });
  } finally {
    connection.release();
    console.log("🔚 DB connection released");
  }
};

export const digitalFootprintController = async (req, res) => {
  const connection = await db.getConnection();
  console.log("🔵 [DIGITAL FOOTPRINT] Controller hit");

  try {
    const userId = req.user.userId;
    console.log("👤 User ID:", userId);

    const {
      usr_ser_id,
      file_no,
      phone,
      email = "",
      name = "",
      consent,
    } = req.body;
    console.log("📥 Request Body:", req.body);

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !phone ||
      phone.length !== 10 ||
      consent !== "Y"
    ) {
      console.log("❌ Validation failed");
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();
    console.log("🟢 Transaction started");

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT usr_ser_id, actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId],
    );

    console.log("📦 Service:", service);

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
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);
    console.log("💰 Opening Balance:", openingBalance);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    console.log("🌐 Calling Gridlines Digital Footprint API...");

    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/mobile/digital-footprint",
      {
        phone,
        email,
        name,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    console.log("🌐 Raw API Response:", JSON.stringify(apiRes.data, null, 2));

    const code = apiRes?.data?.data?.code;
    console.log("📟 Gridlines Code:", code);

    /* ================= NON-SUCCESS ================= */
    if (code !== "1030") {
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

    /* ================= WALLET TRANSACTION ================= */
    const [walletTxn] = await connection.query(
      `INSERT INTO wallet_transactions (
        users_id, transaction_type, amount,
        opening_balance, closing_balance,
        reference_type, created_by
      ) VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
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
        "DIGITAL_FOOTPRINT",
        "success",
        walletTxn.insertId,
        userId,
      ],
    );

    await connection.commit();
    console.log("🟢 Transaction committed");

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
    console.error("❌ Digital Footprint Error:", error.response?.data || error);

    await connection.rollback();

    if (error.response?.status === 504) {
      return res.json({
        success: false,
        message:
          "Digital Footprint service is temporarily unavailable. Please try again later.",
        error_code: "GRIDLINES_TIMEOUT",
      });
    }

    res.status(500).json({
      success: false,
      message: "Digital footprint fetch failed",
    });
  } finally {
    connection.release();
    console.log("🔚 DB connection released");
  }
};

export const checkEntityLinkageController = async (req, res) => {
  const connection = await db.getConnection();
  console.log("🔵 [ENTITY LINKAGE] Controller hit");

  try {
    const userId = req.user.userId;
    console.log("👤 User ID:", userId);

    const { usr_ser_id, file_no, mobile, pan, consent } = req.body;
    console.log("📥 Request Body:", req.body);

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !mobile || !pan || consent !== "Y") {
      console.log("❌ Validation failed");
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();
    console.log("🟢 Transaction started");

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

    console.log("📦 Service:", service);

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
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId],
    );

    const openingBalance = Number(user.wallet_amount);
    console.log("💰 Opening Balance:", openingBalance);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    console.log("🌐 Calling Gridlines Entity Linkage API...");

    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/check-entity-linkage",
      { mobile, pan, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    console.log("🌐 Gridlines Response:", JSON.stringify(apiRes.data, null, 2));

    const code = apiRes?.data?.data?.code;
    console.log("📟 Response Code:", code);

    /* ================= NON-SUCCESS ================= */
    if (code !== "1009") {
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
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, 'ENTITY_LINKAGE', 'success', ?, ?)`,
      [userId, usr_ser_id, file_no, creditsUsed, walletTxn.insertId, userId],
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
    console.error("❌ Entity Linkage Error:", error.response?.data || error);
    await connection.rollback();

    res.status(500).json({
      success: false,
      message: "Entity linkage failed",
    });
  } finally {
    connection.release();
    console.log("🔚 DB connection released");
  }
};

export const fetchElectricityBillController = async (req, res) => {
  const connection = await db.getConnection();
  console.log("🔵 [ELECTRICITY BILL] Controller hit");

  try {
    const userId = req.user.userId;
    console.log("👤 User ID:", userId);

    const {
      usr_ser_id,
      file_no,
      electricity_provider,
      consumer_number,
      mobile_number,
      installation_number,
      operator_code,
      consent,
    } = req.body;

    console.log("📥 Request Body:", req.body);

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !electricity_provider ||
      !consumer_number ||
      consent !== "Y"
    ) {
      console.log("❌ Validation failed");
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();
    console.log("🟢 Transaction started");

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

    console.log("📦 Service:", service);

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
    console.log("💰 Opening Balance:", openingBalance);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    console.log("🌐 Calling Gridlines Electricity Bill API...");

    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/utility/fetch-electricity-bill",
      {
        electricity_provider,
        consumer_number,
        mobile_number,
        installation_number,
        operator_code,
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

    console.log("🌐 Gridlines Response:", JSON.stringify(apiRes.data, null, 2));

    const code = apiRes?.data?.data?.code;
    console.log("📟 Response Code:", code);

    /* ================= NO DATA ================= */
    if (code !== "1006") {
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
      `INSERT INTO wallet_transactions
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, 'ELECTRICITY_BILL', 'success', ?, ?)`,
      [userId, usr_ser_id, file_no, creditsUsed, walletTxn.insertId, userId],
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
    console.error("❌ Electricity Bill Error:", error.response?.data || error);
    await connection.rollback();

    res.status(500).json({
      success: false,
      message: "Electricity bill fetch failed",
    });
  } finally {
    connection.release();
    console.log("🔚 DB connection released");
  }
};

export const fetchMobilePrefillController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 Incoming Mobile Prefill request:", req.body);

    const userId = req.user.userId;
    let { usr_ser_id, mobile_number, first_name, last_name, file_no } =
      req.body;

    mobile_number = mobile_number?.trim();
    const consent = "Y";

    if (
      !usr_ser_id ||
      !mobile_number ||
      mobile_number.length !== 10 ||
      !file_no
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number or payload",
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

    /* ================= GRIDLINES API ================= */
    let apiRes;
    try {
      apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/mobile/prefill",
        {
          mobile_number,
          first_name,
          lastName: last_name,
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
    } catch (err) {
      console.log("❌ Gridlines error:", err.response?.data);
      await connection.rollback();
      return res.json({
        success: true,
        data: err.response?.data,
      });
    }

    const code = apiRes.data?.data?.code;

    /* ================= NO DEDUCTION ON FAILURE ================= */
    if (code !== "1015") {
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
        credits_used, api_name,
        api_status, wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "MOBILE_PREFILL",
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
    console.error("🔥 Mobile Prefill crash:", error);
    res.status(500).json({
      success: false,
      message: "Mobile Prefill failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchMobileNameLookupController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, mobile_number, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !mobile_number ||
      mobile_number.length !== 10 ||
      !file_no ||
      consent !== "Y"
    ) {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/profile-api/mobile/name-lookup",
      {
        mobile_number,
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

    /* ================= NO DEDUCTION ON FAILURE ================= */
    if (code !== "1014") {
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
        credits_used, api_name,
        api_status, wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "MOBILE_NAME_LOOKUP",
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
    console.error(
      "❌ Mobile Name Lookup error:",
      error.response?.data || error,
    );
    res.status(500).json({
      success: false,
      message: "Mobile Name Lookup failed",
    });
  } finally {
    connection.release();
  }
};

export const panLookupByMobileController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, mobile_number, file_no, consent } = req.body;

    if (!usr_ser_id || !mobile_number || !file_no || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    let apiRes;
    try {
      apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/mobile/pan-lookup",
        { mobile_number, consent },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      if (err.response?.status === 403) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "PAN Lookup service not enabled for this account",
          error: err.response.data,
        });
      }
      throw err;
    }

    const code = apiRes.data?.data?.code;

    if (code !== "1003") {
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
        credits_used, api_name,
        api_status, wallet_transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "PAN_LOOKUP_BY_MOBILE",
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
    console.error("❌ PAN Lookup error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "PAN Lookup failed",
    });
  } finally {
    connection.release();
  }
};

//new controllers
export const checkEntityLinkageCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile, pan } = req.body;

    let query = `
      SELECT response_status, fetched_at
      FROM service_data_fetch_log
      WHERE mas_ser_id = ?
      AND mas_cat_id = ?
    `;

    const params = [mas_ser_id, mas_cat_id];

    if (mobile) {
      query += ` AND mobile_number = ?`;
      params.push(mobile);
    }

    if (pan) {
      query += ` AND pan_number = ?`;
      params.push(pan);
    }

    query += ` ORDER BY ser_fet_log_id DESC LIMIT 1`;

    const [[existing]] = await connection.query(query, params);

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
// export const executeEntityLinkageController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       mobile,
//       pan,
//       use_cache,
//     } = req.body;

//     /* ================= VALIDATION ================= */
//     if (!usr_ser_id || !mas_ser_id || !mas_cat_id || !file_no) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payload",
//       });
//     }

//     if (!mobile && !pan) {
//       return res.status(400).json({
//         success: false,
//         message: "Either Mobile or PAN is required",
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
//       [usr_ser_id, userId]
//     );

//     if (!service) throw new Error("Service not allowed");

//     const creditsUsed = Number(service.actual_credits);

//     /* ================= WALLET CHECK ================= */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount
//        FROM users
//        WHERE users_id = ?
//        FOR UPDATE`,
//       [userId]
//     );

//     if (!user) throw new Error("User not found");

//     const openingBalance = Number(user.wallet_amount);

//     let fullResponse;
//     let responseStatus = "failed";
//     let shouldDeduct = false;
//     let walletTransactionId = null;
//     let transactionId = null;
//     let requestId = null;
//     let httpStatusCode = null;

//     /* =====================================================
//        ================= CACHE FLOW ========================
//     ===================================================== */
//     if (use_cache) {
//       let cacheQuery = `
//         SELECT *
//         FROM service_data_fetch_log
//         WHERE mas_ser_id = ?
//         AND mas_cat_id = ?
//       `;

//       const cacheParams = [mas_ser_id, mas_cat_id];

//       if (mobile) {
//         cacheQuery += ` AND mobile_number = ?`;
//         cacheParams.push(mobile);
//       }

//       if (pan) {
//         cacheQuery += ` AND pan_number = ?`;
//         cacheParams.push(pan);
//       }

//       cacheQuery += ` ORDER BY ser_fet_log_id DESC LIMIT 1`;

//       const [[existing]] = await connection.query(cacheQuery, cacheParams);

//       if (!existing) throw new Error("Cache not found");

//       fullResponse = existing.api_response;
//       responseStatus = existing.response_status;

//       if (responseStatus === "success") {
//         shouldDeduct = true;
//       }
//     }

//     /* =====================================================
//        ================= FRESH FLOW ========================
//     ===================================================== */
//     else {
//       /* ===== GRIDLINES PAYLOAD (DYNAMIC) ===== */
//       const payload = { consent: "Y" };
//       if (mobile) payload.mobile = mobile;
//       if (pan) payload.pan = pan;

//       const apiRes = await axios.post(
//         "https://api.gridlines.io/profile-api/check-entity-linkage",
//         payload,
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "Content-Type": "application/json",
//           },
//           validateStatus: () => true,
//         }
//       );

//       fullResponse = apiRes.data;
//       httpStatusCode = apiRes.status;

//       const code = fullResponse?.data?.code;

//       transactionId = fullResponse?.transaction_id || null;
//       requestId = fullResponse?.request_id || null;

//    if (code === "1009") {
//   shouldDeduct = true;
//   responseStatus = "success";
// }
// else if (code === "1010") {
//   responseStatus = "no_data";
// }
// else {
//   responseStatus = "failed";
// }

//       /* ===== INSERT FETCH LOG ===== */
//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           mobile_number, pan_number,
//           api_response, response_status,
//           http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           mobile || null,
//           pan || null,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           httpStatusCode,
//           userId,
//         ]
//       );
//     }

//     /* ================= WALLET DEDUCTION ================= */
//     if (shouldDeduct) {
//       if (openingBalance < creditsUsed)
//         throw new Error("Insufficient balance");

//       const closingBalance = openingBalance - creditsUsed;

//       await connection.query(
//         `UPDATE users
//          SET wallet_amount = ?
//          WHERE users_id = ?`,
//         [closingBalance, userId]
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount,
//           opening_balance, closing_balance,
//           reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [
//           userId,
//           creditsUsed,
//           openingBalance,
//           closingBalance,
//           userId,
//         ]
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ================= USER SERVICE LOG ================= */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no,
//         credits_used, api_name, api_status,
//         wallet_transaction_id,
//         transaction_id, request_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         shouldDeduct ? creditsUsed : 0,
//         "ENTITY_LINKAGE",
//         responseStatus,
//         walletTransactionId,
//         transactionId,
//         requestId,
//         userId,
//       ]
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: fullResponse,
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error("❌ EXECUTE ENTITY LINKAGE ERROR:", err.message);

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executeEntityLinkageController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      mobile,
      pan,
      use_cache,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !mas_ser_id || !mas_cat_id || !file_no) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (!mobile && !pan) {
      return res.status(400).json({
        success: false,
        message: "Either Mobile or PAN is required",
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
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile, pan });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let httpStatusCode = null;
    let serFetLogId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      let cacheQuery = `
        SELECT *
        FROM service_data_fetch_log
        WHERE mas_ser_id = ?
        AND mas_cat_id = ?
      `;

      const cacheParams = [mas_ser_id, mas_cat_id];

      if (mobile) {
        cacheQuery += ` AND mobile_number = ?`;
        cacheParams.push(mobile);
      }

      if (pan) {
        cacheQuery += ` AND pan_number = ?`;
        cacheParams.push(pan);
      }

      cacheQuery += ` ORDER BY ser_fet_log_id DESC LIMIT 1`;

      const [[existing]] = await connection.query(cacheQuery, cacheParams);

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }

      /* ================= FRESH API CALL ================= */
    } else {
      const payload = { consent: "Y" };
      if (mobile) payload.mobile = mobile;
      if (pan) payload.pan = pan;

      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/check-entity-linkage",
        payload,
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;
      httpStatusCode = apiRes.status;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1009") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1010") {
        responseStatus = "no_data";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, pan_number,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          mobile || null,
          pan || null,
          JSON.stringify(fullResponse),
          responseStatus,
          httpStatusCode,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
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
        "ENTITY_LINKAGE",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE ENTITY LINKAGE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkDigitalFootprintCacheController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { mas_ser_id, mas_cat_id, phone } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND mobile_number = ?
          AND api_name = 'DIGITAL_FOOTPRINT' 
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, phone],
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
    console.error("❌ checkDigitalFootprintCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeDigitalFootprintController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      phone,
      email = "",
      name = "",
      consent,
      use_cache,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !mas_ser_id ||
      !mas_cat_id ||
      !file_no ||
      !phone ||
      phone.length !== 10 ||
      consent !== "Y"
    ) {
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
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ phone, email, name });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, phone],
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

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/mobile/digital-footprint",
        {
          phone,
          email,
          name,
          consent,
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          timeout: 20000,
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1030") {
        shouldDeduct = true;
        responseStatus = "success";
      } else {
        responseStatus = "failed";
      }

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
          phone,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "DIGITAL_FOOTPRINT",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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

    console.error("❌ EXECUTE DIGITAL FOOTPRINT ERROR:", err.message);

    if (err.response?.status === 504) {
      return res.json({
        success: false,
        message:
          "Digital Footprint service is temporarily unavailable. Please try again later.",
        error_code: "GRIDLINES_TIMEOUT",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Digital footprint fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const checkElectricityBillCacheController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { mas_ser_id, mas_cat_id, consumer_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND consumer_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, consumer_number],
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
    console.error("❌ checkElectricityBillCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeElectricityBillController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      electricity_provider,
      consumer_number,
      mobile_number,
      installation_number,
      operator_code,
      consent,
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      electricity_provider,
      consumer_number,
      mobile_number,
      installation_number,
      operator_code,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let transactionId = null;
    let requestId = null;
    let walletTransactionId = null;
    let serFetLogId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT * FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND consumer_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, consumer_number],
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

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/utility/fetch-electricity-bill",
        {
          electricity_provider,
          consumer_number,
          mobile_number,
          installation_number,
          operator_code,
          consent,
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1006") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1004") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, consumer_number,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          consumer_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "ELECTRICITY_BILL",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkNationalIdsByPhoneCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, phone } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND mobile_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, phone],
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
    console.error("❌ National ID Cache Error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeNationalIdsByPhoneController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      phone,
      first_name,
      last_name,
      pan,
      consent,
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

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ phone, first_name, last_name, pan });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, phone],
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

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/individual/fetch-national-ids",
        {
          phone,
          first_name,
          last_name,
          pan,
          consent_text: "I provide consent to fetch information.",
          consent,
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1001") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1004") {
        responseStatus = "no_data";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, name, pan_number,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          phone,
          first_name + " " + (last_name || ""),
          pan,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
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
        "NATIONAL_IDS_BY_PHONE",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE NATIONAL IDS ERROR:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const checkPanByPhoneCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, phone } = req.body;

    if (!mas_ser_id || !mas_cat_id || !phone) {
      return res.json({ hasCache: false });
    }

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND mobile_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, phone],
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
    console.error("❌ checkPanByPhoneCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executePanByPhoneController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      phone,
      first_name,
      last_name,
      use_cache,
    } = req.body;

    if (!usr_ser_id || !mas_ser_id || !mas_cat_id || !file_no || !phone) {
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
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId],
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ phone, first_name, last_name });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, phone],
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

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/individual/fetch-pan",
        {
          phone,
          first_name,
          last_name,
          consent_text: "I provide consent to fetch information.",
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1003") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1004") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, first_name,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          phone,
          first_name,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "PAN_BY_PHONE",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE PAN BY PHONE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkPersonalProfileCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, phone } = req.body;

    const [[existing]] = await connection.query(
      `
      SELECT response_status, fetched_at
      FROM service_data_fetch_log
      WHERE mas_ser_id = ?
        AND mas_cat_id = ?
        AND mobile_number = ?
      ORDER BY ser_fet_log_id DESC
      LIMIT 1
      `,
      [mas_ser_id, mas_cat_id, phone],
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
    console.error("❌ checkPersonalProfileCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executePersonalProfileController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      phone,
      first_name,
      last_name,
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

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ phone, first_name, last_name, pan });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, phone],
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

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/individual/fetch-personal-profile",
        {
          phone,
          first_name,
          last_name,
          pan,
          consent_text: "I provide consent to fetch information.",
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1004") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, first_name, pan_number,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          phone,
          first_name,
          pan || null,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "PERSONAL_PROFILE",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE PERSONAL PROFILE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkMobileAgeCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `
      SELECT response_status, fetched_at
      FROM service_data_fetch_log
      WHERE mas_ser_id = ?
        AND mas_cat_id = ?
        AND mobile_number = ?
      ORDER BY ser_fet_log_id DESC
      LIMIT 1
      `,
      [mas_ser_id, mas_cat_id, mobile_number],
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
    console.error("❌ checkMobileAgeCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeMobileAgeController = async (req, res) => {
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

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile_number });

    let fullResponse;
    let apiStatus = "FAILED";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, mobile_number],
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      apiStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (apiStatus === "success") {
        shouldDeduct = true;
      }

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/mobile/number-age",
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
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1008") {
        apiStatus = "success";
        shouldDeduct = true;
      } else if (code === "1004") {
        apiStatus = "not_found";
      } else {
        apiStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, api_response,
          response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          mobile_number,
          JSON.stringify(fullResponse),
          apiStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "MOBILE_NUMBER_AGE",
        apiStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE MOBILE AGE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkMobileLookupCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `
      SELECT response_status, fetched_at
      FROM service_data_fetch_log
      WHERE mas_ser_id = ?
        AND mas_cat_id = ?
        AND mobile_number = ?
      ORDER BY ser_fet_log_id DESC
      LIMIT 1
      `,
      [mas_ser_id, mas_cat_id, mobile_number],
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
    console.error("❌ checkMobileLookupCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeMobileLookupController = async (req, res) => {
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

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile_number });

    let fullResponse;
    let apiStatus = "FAILED";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, mobile_number],
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      apiStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (apiStatus === "success") {
        shouldDeduct = true;
      }

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/telco/mobile-lookup",
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
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1007") {
        apiStatus = "success";
        shouldDeduct = true;
      } else if (code === "1004") {
        apiStatus = "not_found";
      } else {
        apiStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, api_response,
          response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          mobile_number,
          JSON.stringify(fullResponse),
          apiStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "MOBILE_LOOKUP",
        apiStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE MOBILE LOOKUP ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkMobilePrefillCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `
      SELECT response_status, fetched_at
      FROM service_data_fetch_log
      WHERE mas_ser_id = ?
        AND mas_cat_id = ?
        AND mobile_number = ?
        AND api_name = 'MOBILE_PREFILL'
      ORDER BY ser_fet_log_id DESC
      LIMIT 1
      `,
      [mas_ser_id, mas_cat_id, mobile_number],
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
    console.error("❌ checkMobilePrefillCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeMobilePrefillController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      mobile_number,
      first_name,
      last_name,
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

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({
      mobile_number,
      first_name,
      last_name,
    });

    let fullResponse;
    let apiStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, mobile_number],
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      apiStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (apiStatus === "success") {
        shouldDeduct = true;
      }

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/mobile/prefill",
        {
          mobile_number,
          first_name,
          last_name,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "Content-Type": "application/json",
          },
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1015") {
        apiStatus = "success";
        shouldDeduct = true;
      } else if (code === "1004") {
        apiStatus = "not_found";
      } else {
        apiStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, first_name,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          mobile_number,
          first_name,
          JSON.stringify(fullResponse),
          apiStatus,
          apiRes.status,
          userId,
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "MOBILE_PREFILL",
        apiStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE MOBILE PREFILL ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkMobileNameLookupCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `
      SELECT response_status, fetched_at
      FROM service_data_fetch_log
      WHERE mas_ser_id = ?
        AND mas_cat_id = ?
        AND mobile_number = ?
      ORDER BY ser_fet_log_id DESC
      LIMIT 1
      `,
      [mas_ser_id, mas_cat_id, mobile_number],
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
    console.error("❌ checkMobileNameLookupCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeMobileNameLookupController = async (req, res) => {
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

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile_number });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, mobile_number],
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

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/mobile/name-lookup",
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
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1014") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1004") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, api_response,
          response_status, http_status_code, created_by)
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
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "MOBILE_NAME_LOOKUP",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE MOBILE NAME LOOKUP ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const checkPanLookupByMobileCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `
      SELECT response_status, fetched_at
      FROM service_data_fetch_log
      WHERE mas_ser_id = ?
        AND mas_cat_id = ?
        AND mobile_number = ?
        AND api_name = 'PAN_LOOKUP_BY_MOBILE'
      ORDER BY ser_fet_log_id DESC
      LIMIT 1
      `,
      [mas_ser_id, mas_cat_id, mobile_number],
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
    console.error("❌ checkPanLookup cache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executePanLookupByMobileController = async (req, res) => {
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

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile_number });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, mobile_number],
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

      /* ================= FRESH API CALL ================= */
    } else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/profile-api/mobile/pan-lookup",
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
          validateStatus: () => true,
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1003") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1004") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, api_response,
          response_status, http_status_code, created_by)
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
        ],
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET DEDUCTION ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

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

      walletTransactionId = walletTxn.insertId;
    }

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        input_payload, credits_used,
        api_name, api_status, wallet_transaction_id,
        transaction_id, request_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "PAN_LOOKUP_BY_MOBILE",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
        serFetLogId,
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
    console.error("❌ EXECUTE PAN LOOKUP ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
