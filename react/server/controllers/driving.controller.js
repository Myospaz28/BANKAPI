import axios from "axios";
import db from "../database/db.js";

import FormData from "form-data";
import fs from "fs";

export const fetchDrivingLicenseController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      driving_license_number,
      date_of_birth,
      file_no,
      consent,
      source = 2,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !driving_license_number ||
      !date_of_birth ||
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
      "https://api.gridlines.io/dl-api/fetch",
      {
        driving_license_number,
        date_of_birth,
        consent,
        source,
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

    /* ================= HANDLE NON-SUCCESS ================= */
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
        "DRIVING_LICENSE_FETCH",
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
    console.error("❌ Driving License Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Driving license fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const drivingLicenseOcrController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const { usr_ser_id, file_no, consent } = req.body;
    const fileFront = req.files?.file_front?.[0];
    const fileBack = req.files?.file_back?.[0];

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || consent !== "Y" || !fileFront) {
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

    /* ================= GRIDLINES OCR API ================= */
    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(fileFront.path));
    if (fileBack) {
      formData.append("file_back", fs.createReadStream(fileBack.path));
    }
    formData.append("consent", consent);

    const apiRes = await axios.post(
      "https://api.gridlines.io/dl-api/ocr",
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

    /* ================= NON-SUCCESS ================= */
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
        "DRIVING_LICENSE_OCR",
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
    console.error("❌ DL OCR Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Driving License OCR failed",
    });
  } finally {
    connection.release();
  }
};
export const drivingLicenseOcrController = async (req, res) => {
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

    const fileFront = req.files?.file_front?.[0];
    const fileBack = req.files?.file_back?.[0];

    if (!usr_ser_id || !mas_ser_id || !mas_cat_id || !file_no || !fileFront || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId]
    );

    const openingBalance = Number(user.wallet_amount);

    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(fileFront.path));
    if (fileBack) {
      formData.append("file_back", fs.createReadStream(fileBack.path));
    }
    formData.append("consent", "Y");

    const apiRes = await axios.post(
      "https://api.gridlines.io/dl-api/ocr",
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

    if (code === "1002") {
      responseStatus = "success";
      shouldDeduct = true;
    }

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

    const inputPayload = JSON.stringify({
      file_no,
      has_back: !!fileBack,
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
        "DRIVING_LICENSE_OCR",
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
    console.error("❌ DL OCR ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};
// new controllers can be added here

export const checkDrivingLicenseCache = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, driving_license_number } = req.body;

    if (!mas_ser_id || !mas_cat_id || !driving_license_number) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    const [[existing]] = await connection.query(
      `SELECT *
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND dl_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, driving_license_number],
    );

    if (existing) {
      return res.json({
        success: true,
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({
      success: true,
      hasCache: false,
    });
  } catch (err) {
    console.error("❌ DL Cache Error:", err);
    return res.status(500).json({
      success: false,
      message: "Cache check failed",
    });
  } finally {
    connection.release();
  }
};

// export const executeDrivingLicenseController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       driving_license_number,
//       date_of_birth,
//       source = 2,
//       use_cache,
//     } = req.body;

//     if (
//       !usr_ser_id ||
//       !mas_ser_id ||
//       !mas_cat_id ||
//       !file_no ||
//       !driving_license_number ||
//       !date_of_birth
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payload",
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

//     const openingBalance = Number(user.wallet_amount);

//     if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

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
//            AND dl_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, driving_license_number],
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
//         "https://api.gridlines.io/dl-api/fetch",
//         {
//           driving_license_number,
//           date_of_birth,
//           consent: "Y",
//           source,
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
//         code === "1000" ? "SUCCESS" : code === "1001" ? "NOT_FOUND" : "FAILED";

//       await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           dl_number, api_response,
//           response_status, http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id,
//           mas_cat_id,
//           file_no,
//           driving_license_number,
//           JSON.stringify(fullResponse),
//           responseStatus,
//           apiRes.status,
//           userId,
//         ],
//       );
//     }

//     /* ================= WALLET DEDUCTION ================= */
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

//     /* ================= SERVICE LOG ================= */
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
//         "DRIVING_LICENSE_FETCH",
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
//     console.error("❌ DL Execute Error:", err);

//     return res.status(500).json({
//       success: false,
//       message: err.message || "Driving License fetch failed",
//     });
//   } finally {
//     connection.release();
//   }
// };

export const executeDrivingLicenseController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      driving_license_number,
      date_of_birth,
      source = 2,
      use_cache,
    } = req.body;

    if (
      !usr_ser_id ||
      !mas_ser_id ||
      !mas_cat_id ||
      !file_no ||
      !driving_license_number ||
      !date_of_birth
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

    if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

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
      driving_license_number,
      date_of_birth,
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
           AND dl_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, driving_license_number],
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
        "https://api.gridlines.io/dl-api/fetch",
        {
          driving_license_number,
          date_of_birth,
          consent: "Y",
          source,
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
        code === "1000" ? "SUCCESS" : code === "1001" ? "NOT_FOUND" : "FAILED";

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          dl_number, api_response,
          response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          driving_license_number,
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
        "DRIVING_LICENSE_FETCH",
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
    console.error("❌ DL Execute Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Driving License fetch failed",
    });
  } finally {
    connection.release();
  }
};
