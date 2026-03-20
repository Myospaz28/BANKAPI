import axios from "axios";
import db from "../database/db.js";

export const fetchEmploymentHistoryByUanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    let {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      uan_number,
      consent,
      force_refresh,
    } = req.body;

    usr_ser_id = Number(usr_ser_id);
    mas_ser_id = Number(mas_ser_id);
    mas_cat_id = Number(mas_cat_id);
    force_refresh = Boolean(force_refresh);

    /* ================= VALIDATION ================= */
    if (
      !Number.isInteger(usr_ser_id) ||
      !file_no ||
      !uan_number ||
      consent !== "Y"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    /* ================= CACHE CHECK ================= */
    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND uan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, uan_number],
    );

    let cachedResponse = null;

    if (existing && !force_refresh) {
      cachedResponse = existing;
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

    /* ================= API / CACHE ================= */
    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;
    let transactionId = null;

    if (cachedResponse) {
      fullResponse =
        typeof cachedResponse.api_response === "string"
          ? JSON.parse(cachedResponse.api_response)
          : cachedResponse.api_response;

      responseStatus = cachedResponse.response_status;
    } else {
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/employment-history/fetch-by-uan",
        {
          uan_number,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1013") responseStatus = "SUCCESS";
      else if (code === "1011") responseStatus = "NOT_EXIST";
      else if (code === "1015") responseStatus = "NO_RECORD";
      else responseStatus = "BUSINESS_FAIL";

      await connection.query(
        `INSERT INTO service_data_fetch_log (
          mas_ser_id,
          mas_cat_id,
          file_number,
          uan_number,
          api_response,
          response_status,
          http_status_code,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          uan_number,
          JSON.stringify(fullResponse),
          responseStatus,
          fullResponse.status,
          userId,
        ],
      );
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
        request_id,
        transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "EPFO_EMPLOYMENT_HISTORY",
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
      isFromCache: !!cachedResponse,
      data: fullResponse,
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

    console.error(
      "❌ Employment History Error:",
      error.response?.data || error,
    );

    return res.status(500).json({
      success: false,
      message: "Employment history fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchLatestEmploymentByMobileController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mobile_number,
      file_no,
      consent,
      include_profile_details,
      include_employer_details,
    } = req.body;

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

    /* ================= CLEAN PAYLOAD (IMPORTANT) ================= */
    const payload = {
      mobile_number,
      consent: "Y",

      // ✅ FORCE BOOLEAN (no strings)
      include_profile_details:
        typeof include_profile_details === "boolean"
          ? include_profile_details
          : true,

      include_employer_details:
        typeof include_employer_details === "boolean"
          ? include_employer_details
          : true,
    };

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/epfo-api/employment/fetch-latest-by-mobile",
      payload,
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    /* ================= NO DATA / FAILURE ================= */
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
        "EPFO_LATEST_EMPLOYMENT",
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
    console.error("❌ Latest Employment Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Fetch latest employment failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchLatestPassbookByMobileController = async (req, res) => {
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
      "https://api.gridlines.io/epfo-api/passbook/fetch-latest-by-mobile",
      //   "https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154726/epfo-api/passbook/fetch-latest-by-mobile",
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
      },
    );

    const code = apiRes.data?.data?.code;

    /* ================= NO SUCCESS ================= */
    if (code !== "1022") {
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
        "EPFO_LATEST_PASSBOOK",
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
    console.error("❌ Latest Passbook Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Fetch latest passbook failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchUanProfileDetailsController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    let {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      uan,
      consent,
      force_refresh,
    } = req.body;

    usr_ser_id = Number(usr_ser_id);
    mas_ser_id = Number(mas_ser_id);
    mas_cat_id = Number(mas_cat_id);
    force_refresh = Boolean(force_refresh);

    /* ================= VALIDATION ================= */
    if (!Number.isInteger(usr_ser_id) || !file_no || !uan || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    /* ================= CACHE CHECK ================= */
    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND uan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, uan],
    );

    let cachedResponse = null;
    if (existing && !force_refresh) {
      cachedResponse = existing;
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

    /* ================= API / CACHE ================= */
    let fullResponse;
    let responseStatus = "UNKNOWN";
    let requestId = null;
    let transactionId = null;

    if (cachedResponse) {
      fullResponse =
        typeof cachedResponse.api_response === "string"
          ? JSON.parse(cachedResponse.api_response)
          : cachedResponse.api_response;

      responseStatus = cachedResponse.response_status;
    } else {
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/profile-details",
        { uan, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1035") responseStatus = "SUCCESS";
      else if (["1036", "1037"].includes(code))
        responseStatus = "BUSINESS_FAIL";
      else responseStatus = "UNKNOWN";

      await connection.query(
        `INSERT INTO service_data_fetch_log (
          mas_ser_id,
          mas_cat_id,
          file_number,
          uan_number,
          api_response,
          response_status,
          http_status_code,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          uan,
          JSON.stringify(fullResponse),
          responseStatus,
          fullResponse.status,
          userId,
        ],
      );
    }

    /* ================= WALLET DEDUCTION ONLY IF SUCCESS ================= */
    if (fullResponse?.data?.code === "1035") {
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

      await connection.query(
        `INSERT INTO user_service_logs (
          users_id,
          usr_ser_id,
          file_no,
          credits_used,
          api_name,
          api_status,
          wallet_transaction_id,
          request_id,
          transaction_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          usr_ser_id,
          file_no,
          creditsUsed,
          "EPFO_UAN_PROFILE_DETAILS",
          responseStatus,
          walletTxn.insertId,
          requestId,
          transactionId,
          userId,
        ],
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      isFromCache: !!cachedResponse,
      data: fullResponse,
      wallet: {
        opening_balance: openingBalance,
        credits_used: fullResponse?.data?.code === "1035" ? creditsUsed : 0,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error(
      "❌ UAN Profile Details Error:",
      error.response?.data || error,
    );

    return res.status(500).json({
      success: false,
      message: "Fetch UAN profile details failed",
    });
  } finally {
    connection.release();
  }
};

export const fetchEmployerVerifyController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      file_no,
      employer_name,
      establishment_id,
      establishment_code_number,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      consent !== "Y" ||
      (!employer_name && !establishment_id && !establishment_code_number)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "File No, consent and at least one employer detail is required",
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

    /* ================= GRIDLINES PAYLOAD ================= */
    const payload = { consent: "Y" };

    if (employer_name) payload.employer_name = employer_name;
    if (establishment_id) payload.establishment_id = establishment_id;
    if (establishment_code_number)
      payload.establishment_code_number = establishment_code_number;

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/epfo-api/employer-verify",
      payload,
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      },
    );

    const code = apiRes.data?.data?.code;

    /* ================= NOT FOUND ================= */
    if (code !== "1031") {
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
        "EPFO_EMPLOYER_VERIFY",
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
    console.error("❌ Employer Verify Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Employer verification failed",
    });
  } finally {
    connection.release();
  }
};

// new controller to fetch for double check before executing

export const checkEmploymentHistoryCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, uan_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND uan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, uan_number],
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

// export const executeEmploymentHistoryController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_cat_id,
//       mas_ser_id,
//       file_no,
//       uan_number,
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
//       `SELECT wallet_amount
//        FROM users
//        WHERE users_id = ?
//        FOR UPDATE`,
//       [userId],
//     );

//     if (user.wallet_amount < creditsUsed)
//       throw new Error("Insufficient balance");

//     const openingBalance = Number(user.wallet_amount);
//     const closingBalance = openingBalance - creditsUsed;

//     /* ===== DEDUCT WALLET ===== */
//     await connection.query(
//       `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//       [closingBalance, userId],
//     );

//     const [walletTxn] = await connection.query(
//       `INSERT INTO wallet_transactions
//        (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
//        VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//       [userId, creditsUsed, openingBalance, closingBalance, userId],
//     );

//     const walletTransactionId = walletTxn.insertId;

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
//            AND uan_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, uan_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//     } else {
//       const referenceId = `${Date.now()}-${userId}`;

//       const apiRes = await axios.post(
//         "https://api.gridlines.io/epfo-api/employment-history/fetch-by-uan",
//         { uan_number, consent: "Y" },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "X-Reference-ID": referenceId,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       const code = fullResponse?.data?.code;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       if (code === "1013") responseStatus = "SUCCESS";
//       else if (code === "1011") responseStatus = "NOT_EXIST";
//       else if (code === "1015") responseStatus = "NO_RECORD";
//       else responseStatus = "BUSINESS_FAIL";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number, uan_number,
//           api_response, response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           uan_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== SERVICE LOG ===== */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status, wallet_transaction_id,
//         request_id, transaction_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         creditsUsed,
//         "EPFO_EMPLOYMENT_HISTORY",
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
//         credits_used: creditsUsed,
//         closing_balance: closingBalance,
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

export const executeEmploymentHistoryController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
      file_no,
      uan_number,
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
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ uan_number });

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
           AND uan_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, uan_number],
      );

      if (!existing) throw new Error("No cache available");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      /* ================= FRESH API CALL ================= */
    } else {
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/employment-history/fetch-by-uan",
        { uan_number, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1013") responseStatus = "SUCCESS";
      else if (code === "1011") responseStatus = "NOT_EXIST";
      else if (code === "1015") responseStatus = "NO_RECORD";
      else responseStatus = "BUSINESS_FAIL";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, uan_number,
          api_response, response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          uan_number,
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
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "EPFO_EMPLOYMENT_HISTORY",
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

export const checkLatestEmploymentCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

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

// export const executeLatestEmploymentController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_cat_id,
//       mas_ser_id,
//       file_no,
//       mobile_number,
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
//       `SELECT wallet_amount
//        FROM users
//        WHERE users_id = ?
//        FOR UPDATE`,
//       [userId],
//     );

//     if (user.wallet_amount < creditsUsed)
//       throw new Error("Insufficient balance");

//     const openingBalance = Number(user.wallet_amount);
//     const closingBalance = openingBalance - creditsUsed;

//     /* ===== DEDUCT WALLET ===== */
//     await connection.query(
//       `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//       [closingBalance, userId],
//     );

//     const [walletTxn] = await connection.query(
//       `INSERT INTO wallet_transactions
//        (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
//        VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//       [userId, creditsUsed, openingBalance, closingBalance, userId],
//     );

//     const walletTransactionId = walletTxn.insertId;

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
//            AND mobile_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, mobile_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;

//       // History controller jaisa — cache me IDs assign nahi ho rahi
//       requestId = null;
//       transactionId = null;
//     } else {
//       /* ===== FRESH API FLOW ===== */
//       const referenceId = `${Date.now()}-${userId}`;

//       const apiRes = await axios.post(
//         "https://api.gridlines.io/epfo-api/employment/fetch-latest-by-mobile",
//         {
//           mobile_number,
//           consent: "Y",
//           include_profile_details: true,
//           include_employer_details: true,
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "X-Reference-ID": referenceId,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       const code = fullResponse?.data?.code;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       if (code === "1014") responseStatus = "SUCCESS";
//       else if (code === "1015") responseStatus = "NO_RECORD";
//       else responseStatus = "BUSINESS_FAIL";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number, mobile_number,
//           api_response, response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           mobile_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== SERVICE LOG ===== */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status, wallet_transaction_id,
//         request_id, transaction_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         creditsUsed,
//         "EPFO_LATEST_EMPLOYMENT",
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
//         credits_used: creditsUsed,
//         closing_balance: closingBalance,
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

export const executeLatestEmploymentController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
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
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile_number });

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
           AND mobile_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, mobile_number],
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
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/employment/fetch-latest-by-mobile",
        {
          mobile_number,
          consent: "Y",
          include_profile_details: true,
          include_employer_details: true,
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1014") responseStatus = "SUCCESS";
      else if (code === "1015") responseStatus = "NO_RECORD";
      else responseStatus = "BUSINESS_FAIL";

      const [fetchInsert] = await connection.query(
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
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "EPFO_LATEST_EMPLOYMENT",
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

export const checkLatestPassbookCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

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

// export const executeLatestPassbookController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_cat_id,
//       mas_ser_id,
//       file_no,
//       mobile_number,
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
//       `SELECT wallet_amount
//        FROM users
//        WHERE users_id = ?
//        FOR UPDATE`,
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
//            AND mobile_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, mobile_number],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//     } else {
//       const referenceId = `${Date.now()}-${userId}`;

//       const apiRes = await axios.post(
//         "https://api.gridlines.io/epfo-api/passbook/fetch-latest-by-mobile",
//         {
//           mobile_number,
//           consent: "Y",
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "X-Reference-ID": referenceId,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       const code = fullResponse?.data?.code;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       if (code === "1022") responseStatus = "SUCCESS";
//       else if (code === "1023") responseStatus = "UNAVAILABLE";
//       else if (code === "1015") responseStatus = "NO_RECORD";
//       else responseStatus = "BUSINESS_FAIL";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number, mobile_number,
//           api_response, response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           mobile_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== DEDUCT WALLET ===== */
//     await connection.query(
//       `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//       [closingBalance, userId],
//     );

//     const [walletTxn] = await connection.query(
//       `INSERT INTO wallet_transactions
//        (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
//        VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//       [userId, creditsUsed, openingBalance, closingBalance, userId],
//     );

//     const walletTransactionId = walletTxn.insertId;

//     /* ===== SERVICE LOG ===== */
//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status, wallet_transaction_id,
//         request_id, transaction_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         creditsUsed,
//         "EPFO_LATEST_PASSBOOK",
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
//         credits_used: creditsUsed,
//         closing_balance: closingBalance,
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

export const executeLatestPassbookController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_cat_id,
      mas_ser_id,
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
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile_number });

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
           AND mobile_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, mobile_number],
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
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/passbook/fetch-latest-by-mobile",
        {
          mobile_number,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1022") responseStatus = "SUCCESS";
      else if (code === "1023") responseStatus = "UNAVAILABLE";
      else if (code === "1015") responseStatus = "NO_RECORD";
      else responseStatus = "BUSINESS_FAIL";

      const [fetchInsert] = await connection.query(
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
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "EPFO_LATEST_PASSBOOK",
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

export const checkUanProfileCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, uan } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND uan_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, uan],
    );

    if (existing) {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.created_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

// export const executeUanProfileController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const { usr_ser_id, mas_ser_id, mas_cat_id, file_no, uan, use_cache } =
//       req.body;

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
//       `SELECT wallet_amount
//        FROM users
//        WHERE users_id = ?
//        FOR UPDATE`,
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
//            AND uan_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, uan],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//     } else {
//       const referenceId = `${Date.now()}-${userId}`;

//       const apiRes = await axios.post(
//         "https://api.gridlines.io/epfo-api/profile-details",
//         { uan, consent: "Y" },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "X-Reference-ID": referenceId,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       const code = fullResponse?.data?.code;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       if (code === "1035") responseStatus = "SUCCESS";
//       else if (["1036", "1037"].includes(code))
//         responseStatus = "BUSINESS_FAIL";
//       else responseStatus = "UNKNOWN";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number, uan_number,
//           api_response, response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           uan,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== WALLET DEDUCTION ===== */
//     await connection.query(
//       `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//       [closingBalance, userId],
//     );

//     const [walletTxn] = await connection.query(
//       `INSERT INTO wallet_transactions
//        (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
//        VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//       [userId, creditsUsed, openingBalance, closingBalance, userId],
//     );

//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status, wallet_transaction_id,
//         request_id, transaction_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         creditsUsed,
//         "EPFO_UAN_PROFILE_DETAILS",
//         responseStatus,
//         walletTxn.insertId,
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
//         credits_used: creditsUsed,
//         closing_balance: closingBalance,
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

export const executeUanProfileController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const { usr_ser_id, mas_ser_id, mas_cat_id, file_no, uan, use_cache } =
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
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ uan });

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
           AND uan_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, uan],
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
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/profile-details",
        { uan, consent: "Y" },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1035") responseStatus = "SUCCESS";
      else if (["1036", "1037"].includes(code))
        responseStatus = "BUSINESS_FAIL";
      else responseStatus = "UNKNOWN";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, uan_number,
          api_response, response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          uan,
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
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "EPFO_UAN_PROFILE_DETAILS",
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

export const checkEmployerVerifyCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, employer_key } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND reference_key = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, employer_key],
    );

    if (existing) {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.created_at,
      });
    }

    return res.json({ hasCache: false });
  } catch {
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

// export const executeEmployerVerifyController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       employer_name,
//       establishment_id,
//       establishment_code_number,
//       use_cache,
//     } = req.body;

//     const employerKey =
//       employer_name || establishment_id || establishment_code_number;

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
//       `SELECT wallet_amount
//        FROM users
//        WHERE users_id = ?
//        FOR UPDATE`,
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
//            AND reference_key = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, employerKey],
//       );

//       if (!existing) throw new Error("No cache available");

//       fullResponse =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       responseStatus = existing.response_status;
//     } else {
//       const referenceId = `${Date.now()}-${userId}`;

//       const payload = { consent: "Y" };
//       if (employer_name) payload.employer_name = employer_name;
//       if (establishment_id) payload.establishment_id = establishment_id;
//       if (establishment_code_number)
//         payload.establishment_code_number = establishment_code_number;

//       const apiRes = await axios.post(
//         "https://api.gridlines.io/epfo-api/employer-verify",
//         payload,
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//             "X-Reference-ID": referenceId,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       const code = fullResponse?.data?.code;
//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       if (code === "1031") responseStatus = "SUCCESS";
//       else responseStatus = "NOT_FOUND";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           reference_key, api_response, response_status,
//           http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           employerKey,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== WALLET DEDUCTION ===== */
//     await connection.query(
//       `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//       [closingBalance, userId],
//     );

//     const [walletTxn] = await connection.query(
//       `INSERT INTO wallet_transactions
//        (users_id, transaction_type, amount,
//         opening_balance, closing_balance,
//         reference_type, created_by)
//        VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//       [userId, creditsUsed, openingBalance, closingBalance, userId],
//     );

//     await connection.query(
//       `INSERT INTO user_service_logs
//        (users_id, usr_ser_id, file_no, credits_used,
//         api_name, api_status, wallet_transaction_id,
//         request_id, transaction_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         creditsUsed,
//         "EPFO_EMPLOYER_VERIFY",
//         responseStatus,
//         walletTxn.insertId,
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
//         credits_used: creditsUsed,
//         closing_balance: closingBalance,
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

export const executeEmployerVerifyController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      employer_name,
      establishment_id,
      establishment_code_number,
      use_cache,
    } = req.body;

    const employerKey =
      employer_name || establishment_id || establishment_code_number;

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
    const inputPayload = JSON.stringify({
      employer_name,
      establishment_id,
      establishment_code_number,
    });

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
           AND reference_key = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, employerKey],
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
      const referenceId = `${Date.now()}-${userId}`;

      const payload = { consent: "Y" };
      if (employer_name) payload.employer_name = employer_name;
      if (establishment_id) payload.establishment_id = establishment_id;
      if (establishment_code_number)
        payload.establishment_code_number = establishment_code_number;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/employer-verify",
        payload,
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1031") responseStatus = "SUCCESS";
      else responseStatus = "NOT_FOUND";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          reference_key, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          employerKey,
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
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "EPFO_EMPLOYER_VERIFY",
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


export const checkUanMobileCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

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

    if (existing) {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("checkUanMobileCache error:", err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

/* ================= EXECUTE UAN FROM MOBILE ================= */
export const executeUanMobileController = async (req, res) => {
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
    const inputPayload = JSON.stringify({ mobile_number });

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
           AND mobile_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, mobile_number],
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
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/fetch-uan",
        {
          mobile_number,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      if (code === "1016") responseStatus = "SUCCESS";
      else if (code === "1007") responseStatus = "NOT_FOUND";
      else responseStatus = "UNKNOWN";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, api_response, response_status,
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
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "EPFO_FETCH_UAN_MOBILE",
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
    console.error("executeUanMobileController error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

/* ================= CHECK UAN PAN CACHE ================= */
export const checkUanPanCache = async (req, res) => {
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
    console.error("checkUanPanCache error:", err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

/* ================= EXECUTE UAN BY PAN ================= */
export const executeUanPanController = async (req, res) => {
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
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
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
      const referenceId = `${Date.now()}-${userId}`;

      const apiRes = await axios.post(
        "https://api.gridlines.io/epfo-api/uan/fetch-by-pan",
        {
          pan_number,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Reference-ID": referenceId,
            "Content-Type": "application/json",
          },
        },
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      // 1029 = UAN fetched, 1030 = no UAN linked or invalid PAN
      if (code === "1029") responseStatus = "SUCCESS";
      else if (code === "1030") responseStatus = "NOT_FOUND";
      else responseStatus = "UNKNOWN";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          pan_number, api_response, response_status,
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
        api_name, api_status, wallet_transaction_id,
        request_id, transaction_id,
        ser_fet_log_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        creditsUsed,
        "EPFO_FETCH_UAN_PAN",
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
    console.error("executeUanPanController error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};