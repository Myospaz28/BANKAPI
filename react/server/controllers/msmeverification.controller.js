import axios from "axios";
import db from "../database/db.js";
import fs from "fs";
import FormData from "form-data";

export const fetchUdyamByMobileController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("📥 Fetch Udyam By Mobile API HIT");

    const userId = req.user.userId;
    console.log("👤 User ID:", userId);
    console.log("📦 req.body:", req.body);

    const { usr_ser_id, file_no, mobile_number, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!mobile_number || consent !== "Y") {
      console.log("❌ VALIDATION FAILED");
      return res.status(400).json({
        success: false,
        message: "Mobile number & consent required",
      });
    }

    await connection.beginTransaction();

    /* ================= SERVICE CHECK (LOG ONLY) ================= */
    if (usr_ser_id) {
      const [[service]] = await connection.query(
        `SELECT actual_credits FROM user_services
         WHERE usr_ser_id=? AND users_id=? AND status='active'
         FOR UPDATE`,
        [usr_ser_id, userId],
      );
      console.log("🧾 UDYAM Service:", service);

      if (!service) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Service not allowed",
        });
      }
    }

    /* ================= WALLET (NO DEDUCT) ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId],
    );

    console.log("💰 Wallet Balance:", user.wallet_amount);
    console.log("ℹ️ Udyam Fetch does NOT deduct wallet");

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/msme-api/udyam/mobile",
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

    console.log("✅ Gridlines Response:", apiRes.data);

    const code = apiRes.data?.data?.code;
    const message = apiRes.data?.data?.message;

    console.log("📌 UDYAM Code:", code);
    console.log("📌 UDYAM Message:", message);

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
          "FETCH_UDYAM_BY_MOBILE",
          code === "1010" ? "success" : "failed",
          userId,
        ],
      );
      console.log("📝 Udyam service log inserted");
    }

    await connection.commit();

    res.json({
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
    console.log("🔥 FETCH UDYAM ERROR:", err?.response?.data || err.message);

    res.json({
      success: true,
      data: err?.response?.data,
    });
  } finally {
    connection.release();
  }
};

export const fetchMSMEByPanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    console.log("📥 Fetch MSME By PAN API HIT");

    const userId = req.user.userId;
    const { usr_ser_id, file_no, pan_number, detailed_response, consent } =
      req.body;

    console.log("👤 User ID:", userId);
    console.log("📦 Payload:", req.body);

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !pan_number || consent !== "Y") {
      console.log("❌ VALIDATION FAILED");
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

    console.log("🧾 Service:", service);

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    const creditsUsed = Number(service.actual_credits);
    console.log("💳 Credits Required:", creditsUsed);

    /* ================= WALLET CHECK ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId],
    );

    console.log("💰 Wallet Balance:", user.wallet_amount);

    if (user.wallet_amount < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    console.log("🚀 Calling Gridlines MSME Fetch By PAN");

    const apiRes = await axios.post(
      "https://api.gridlines.io/msme-api/udyam/fetch-by-pan",
      {
        pan_number,
        detailed_response: Boolean(detailed_response),
        consent: "Y",
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    console.log("✅ Gridlines Response:", apiRes.data);

    const code = apiRes.data?.data?.code;

    /* ================= FAILURE (NO WALLET DEDUCT) ================= */
    if (!["1014", "1016"].includes(code)) {
      await connection.rollback();

      await connection.query(
        `INSERT INTO user_service_logs
         (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, usr_ser_id, file_no, 0, "MSME_FETCH_BY_PAN", "failed", userId],
      );

      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCT ================= */
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

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "MSME_FETCH_BY_PAN",
        "success",
        txn.insertId,
        userId,
      ],
    );

    await connection.commit();

    console.log("🎉 MSME FETCH SUCCESS");

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

    console.error("🔥 MSME FETCH ERROR:", err?.response?.data || err.message);

    res.json({
      success: true,
      data: err?.response?.data,
    });
  } finally {
    connection.release();
  }
};

export const fetchVerifyUdyamAdvancedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    console.log("📥 Verify Udyam Advanced API HIT");

    const userId = req.user.userId;
    const { usr_ser_id, file_no, udyam_reference_number, consent } = req.body;

    console.log("👤 User:", userId);
    console.log("📦 Payload:", req.body);

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !udyam_reference_number || consent !== "Y") {
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

    if (user.wallet_amount < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES CALL ================= */
    console.log("🚀 Calling Gridlines Verify Udyam Advanced");

    const apiRes = await axios.post(
      "https://api.gridlines.io/msme-api/udyam-advanced",
      {
        udyam_reference_number,
        consent: "Y",
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    console.log("✅ Gridlines Response:", apiRes.data);

    const code = apiRes.data?.data?.code;

    /* ================= FAILURE (NO WALLET DEDUCT) ================= */
    if (code !== "1000") {
      await connection.rollback();

      await connection.query(
        `INSERT INTO user_service_logs
         (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          usr_ser_id,
          file_no,
          0,
          "UDYAM_ADVANCED_VERIFY",
          "failed",
          userId,
        ],
      );

      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCT ================= */
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

    /* ================= SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, wallet_transaction_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "UDYAM_ADVANCED_VERIFY",
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
    console.error(
      "🔥 UDYAM ADVANCED ERROR:",
      err?.response?.data || err.message,
    );

    res.json({
      success: true,
      data: err?.response?.data,
    });
  } finally {
    connection.release();
  }
};

export const fetchUdyamCertificateOcrController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    console.log("📥 UDYAM CERTIFICATE OCR API HIT");

    const userId = req.user.userId;
    const { usr_ser_id, file_no, consent } = req.body;
    const file = req.file;

    console.log("👤 User:", userId);
    console.log("📦 Body:", req.body);
    console.log("📎 MIME type:", file?.mimetype);
    console.log("📄 File:", file);

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || !file || consent !== "Y") {
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

    if (user.wallet_amount < creditsUsed) {
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

    console.log("🚀 Calling Gridlines Udyam Certificate OCR");

    const apiRes = await axios.post(
      "https://api.gridlines.io/msme-api/udyam-certificate-ocr",
      formData,
      {
        headers: {
          ...formData.getHeaders(), // ✅ NOW THIS WORKS
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      },
    );

    console.log("✅ Gridlines Response:", apiRes.data);

    const code = apiRes.data?.data?.code;

    /* ================= FAILURE ================= */
    if (code !== "1013") {
      await connection.rollback();

      await connection.query(
        `INSERT INTO user_service_logs
         (users_id, usr_ser_id, file_no, credits_used, api_name, api_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          usr_ser_id,
          file_no,
          0,
          "UDYAM_CERTIFICATE_OCR",
          "failed",
          userId,
        ],
      );

      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCT ================= */
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
        "UDYAM_CERTIFICATE_OCR",
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
    console.error(
      "🔥 UDYAM CERT OCR ERROR:",
      err?.response?.data || err.message,
    );

    res.json({
      success: true,
      data: err?.response?.data,
    });
  } finally {
    connection.release();
  }
};

//new controllers can be added here

export const checkUdyamMobileCache = async (req, res) => {
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
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

// export const executeUdyamMobileController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       mobile_number,
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

//     /* ================= DEDUCT WALLET ================= */
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

//     const walletTransactionId = walletTxn.insertId;

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

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;
//     } else {
//       /* ================= FRESH API CALL ================= */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/msme-api/udyam/mobile",
//         {
//           mobile_number,
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

//       responseStatus =
//         code === "1010"
//           ? "SUCCESS"
//           : code === "1011"
//             ? "NO_RECORD"
//             : "BUSINESS_FAIL";

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
//         creditsUsed,
//         "FETCH_UDYAM_BY_MOBILE",
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

export const executeUdyamMobileController = async (req, res) => {
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
      const apiRes = await axios.post(
        "https://api.gridlines.io/msme-api/udyam/mobile",
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

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus =
        code === "1010"
          ? "SUCCESS"
          : code === "1011"
            ? "NO_RECORD"
            : "BUSINESS_FAIL";

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
        "FETCH_UDYAM_BY_MOBILE",
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

export const checkMSMEPanCache = async (req, res) => {
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

// export const executeMSMEPanController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       pan_number,
//       detailed_response,
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
//     let closingBalance = openingBalance;

//     let fullResponse;
//     let responseStatus = "UNKNOWN";
//     let requestId = null;
//     let transactionId = null;
//     let walletTransactionId = null;

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
//       /* ================= FRESH FLOW ================= */
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/msme-api/udyam/fetch-by-pan",
//         {
//           pan_number,
//           detailed_response: Boolean(detailed_response),
//           consent: "Y",
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
//           },
//         },
//       );

//       fullResponse = apiRes.data;

//       requestId = fullResponse?.request_id || null;
//       transactionId = fullResponse?.transaction_id || null;

//       const code = fullResponse?.data?.code;

//       responseStatus = ["1014", "1016"].includes(code)
//         ? "SUCCESS"
//         : "NO_RECORD";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number, pan_number,
//           api_response, response_status, http_status_code, created_by)
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

//     /* ===== WALLET DEDUCT ONLY IF SUCCESS ===== */
//     if (responseStatus === "SUCCESS") {
//       closingBalance = openingBalance - creditsUsed;

//       await connection.query(
//         `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
//         [closingBalance, userId],
//       );

//       const [walletTxn] = await connection.query(
//         `INSERT INTO wallet_transactions
//          (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
//          VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
//         [userId, creditsUsed, openingBalance, closingBalance, userId],
//       );

//       walletTransactionId = walletTxn.insertId;
//     }

//     /* ===== ALWAYS INSERT SERVICE LOG ===== */
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
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "MSME_FETCH_BY_PAN",
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

export const executeMSMEPanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      pan_number,
      detailed_response,
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
       (users_id, transaction_type, amount, opening_balance, closing_balance, reference_type, created_by)
       VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
      [userId, creditsUsed, openingBalance, closingBalance, userId],
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= PREPARE INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ pan_number, detailed_response });

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
        "https://api.gridlines.io/msme-api/udyam/fetch-by-pan",
        {
          pan_number,
          detailed_response: Boolean(detailed_response),
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
          },
        },
      );

      fullResponse = apiRes.data;

      requestId = fullResponse?.request_id || null;
      transactionId = fullResponse?.transaction_id || null;

      const code = fullResponse?.data?.code;
      responseStatus = ["1014", "1016"].includes(code)
        ? "SUCCESS"
        : "NO_RECORD";

      const [fetchInsert] = await connection.query(
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
        "MSME_FETCH_BY_PAN",
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

export const checkVerifyUdyamAdvancedCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, udyam_reference_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND udyam_reference_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, udyam_reference_number],
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

// export const executeVerifyUdyamAdvancedController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       udyam_reference_number,
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

//     /* ================= CACHE FLOW ================= */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id = ?
//            AND mas_cat_id = ?
//            AND udyam_reference_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, udyam_reference_number],
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
//       const apiRes = await axios.post(
//         "https://api.gridlines.io/msme-api/udyam-advanced",
//         {
//           udyam_reference_number,
//           consent: "Y",
//         },
//         {
//           headers: {
//             "X-API-Key": process.env.GRIDLINES_API_KEY,
//             "X-Auth-Type": "API-Key",
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
//          (mas_ser_id, mas_cat_id, file_number, udyam_reference_number,
//           api_response, response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           udyam_reference_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ===== WALLET DEDUCT ONLY IF SUCCESS ===== */
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
//         api_name, api_status, wallet_transaction_id,
//         request_id, transaction_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId,
//         usr_ser_id,
//         file_no,
//         responseStatus === "SUCCESS" ? creditsUsed : 0,
//         "UDYAM_ADVANCED_VERIFY",
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

export const executeVerifyUdyamAdvancedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      udyam_reference_number,
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
    const inputPayload = JSON.stringify({ udyam_reference_number });

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
           AND udyam_reference_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, udyam_reference_number],
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
        "https://api.gridlines.io/msme-api/udyam-advanced",
        {
          udyam_reference_number,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
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
         (mas_ser_id, mas_cat_id, file_number, udyam_reference_number,
          api_response, response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          udyam_reference_number,
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
        "UDYAM_ADVANCED_VERIFY",
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
