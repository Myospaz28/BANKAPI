import axios from "axios";
import db from "../database/db.js";
import FormData from "form-data";
import fs from "fs";

export const fetchGenerateMrzController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      file_no,
      country_code,
      passport_number,
      surname,
      given_name,
      gender,
      date_of_birth,
      date_of_expiry,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !country_code ||
      !passport_number ||
      !surname ||
      !given_name ||
      !gender ||
      !date_of_birth ||
      !date_of_expiry ||
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
      "https://api.gridlines.io/passport-api/generate-mrz",
      {
        country_code,
        passport_number,
        surname,
        given_name,
        gender,
        date_of_birth,
        date_of_expiry,
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

    const code = apiRes.data?.data?.code;

    /* ================= NOT SUCCESS ================= */
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
        "PASSPORT_GENERATE_MRZ",
        "success",
        walletTransactionId,
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

    /* ✅ Gridlines business errors pass-through */
    if (error.response?.data) {
      return res.json({
        success: true,
        data: error.response.data,
      });
    }

    console.error("❌ Generate MRZ Error:", error);

    res.status(500).json({
      success: false,
      message: "MRZ generation failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchPassportOcrController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const { usr_ser_id, file_no, consent } = req.body;
    const fileFront = req.files?.file_front?.[0];
    const fileBack = req.files?.file_back?.[0];

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !fileFront || consent !== "Y") {
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
      [usr_ser_id, userId],
    );

    if (!service) {
      await connection.rollback();
      return res
        .status(403)
        .json({ success: false, message: "Service not allowed" });
    }

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET CHECK ================= */
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

    /* ================= GRIDLINES OCR ================= */
    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(fileFront.path));
    if (fileBack) {
      formData.append("file_back", fs.createReadStream(fileBack.path));
    }
    formData.append("consent", "Y");

    const apiRes = await axios.post(
      "https://api.gridlines.io/passport-api/ocr",
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

    /* ================= NOT SUCCESS ================= */
    if (code !== "1007") {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
    }

    /* ================= WALLET DEDUCTION ================= */
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
        "PASSPORT_OCR",
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
        opening_balance: user.wallet_amount,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (err) {
    await connection.rollback();

    if (err.response?.data) {
      return res.json({ success: true, data: err.response.data });
    }

    console.error("❌ Passport OCR Error:", err);
    res.status(500).json({
      success: false,
      message: "Passport OCR failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchPassportDetailsController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const { usr_ser_id, file_no, file_number, date_of_birth, consent } =
      req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !file_number ||
      !date_of_birth ||
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

    /* ================= WALLET CHECK ================= */
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/passport-api/fetch",
      {
        file_number,
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

    const code = apiRes.data?.data?.code;

    /* ================= NOT SUCCESS ================= */
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
        "PASSPORT_FETCH",
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

    if (err.response?.data) {
      return res.json({
        success: true,
        data: err.response.data,
      });
    }

    console.error("❌ Passport Fetch Error:", err);

    res.status(500).json({
      success: false,
      message: "Passport fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchVerifyMrzController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      file_no,
      country_code,
      passport_number,
      surname,
      given_name,
      gender,
      date_of_birth,
      date_of_expiry,
      mrz_first_line,
      mrz_second_line,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !country_code ||
      !passport_number ||
      !surname ||
      !given_name ||
      !gender ||
      !date_of_birth ||
      !date_of_expiry ||
      !mrz_first_line ||
      !mrz_second_line ||
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
      `SELECT actual_credits FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active'
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

    /* ================= WALLET CHECK ================= */
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/passport-api/verify-mrz",
      {
        country_code,
        passport_number,
        surname,
        given_name,
        gender,
        date_of_birth,
        date_of_expiry,
        mrz_first_line,
        mrz_second_line,
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

    const code = apiRes.data?.data?.code;

    /* ================= NOT SUCCESS ================= */
    if (!["1001", "1002"].includes(code)) {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
    }

    /* ================= WALLET DEDUCTION ================= */
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
        "PASSPORT_VERIFY_MRZ",
        code === "1001" ? "valid" : "invalid",
        txn.insertId,
        userId,
      ],
    );

    await connection.commit();

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

    if (err.response?.data) {
      return res.json({ success: true, data: err.response.data });
    }

    console.error("❌ Verify MRZ Error:", err);
    res.status(500).json({
      success: false,
      message: "MRZ verification failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchPassportVerifyController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      file_no,
      file_number,
      passport_number,
      surname,
      given_name,
      date_of_birth,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !file_number ||
      !passport_number ||
      !surname ||
      !given_name ||
      !date_of_birth ||
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
      "https://api.gridlines.io/passport-api/verify",
      {
        file_number,
        passport_number,
        surname,
        given_name,
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

    const code = apiRes.data?.data?.code;

    /* ================= NOT SUCCESS ================= */
    if (code !== "1004") {
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

    const walletTransactionId = walletTxn.insertId;

    /* ================= SERVICE LOG ================= */
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
        "PASSPORT_VERIFY",
        "success",
        walletTransactionId,
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

    if (error.response?.data) {
      return res.json({
        success: true,
        data: error.response.data,
      });
    }

    console.error("❌ Passport Verify Error:", error);
    res.status(500).json({
      success: false,
      message: "Passport verification failed",
    });
  } finally {
    connection.release();
  }
};
