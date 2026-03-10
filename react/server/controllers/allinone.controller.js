import axios from "axios";
import db from "../database/db.js";


// export const checkUnifiedMobileLookupCacheController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

//     const [[existing]] = await connection.query(
//       `SELECT response_status, fetched_at
//        FROM service_data_fetch_log
//        WHERE mas_ser_id    = ?
//          AND mas_cat_id    = ?
//          AND mobile_number = ?
//        ORDER BY ser_fet_log_id DESC
//        LIMIT 1`,
//       [mas_ser_id, mas_cat_id, mobile_number],
//     );

//     if (!existing) return res.json({ hasCache: false });

//     if (existing.response_status === "success") {
//       return res.json({ hasCache: true, lastFetchedAt: existing.fetched_at });
//     }

//     return res.json({ hasCache: false });
//   } catch (err) {
//     console.error("❌ checkUnifiedMobileLookup cache error:", err.message);
//     return res.status(500).json({ success: false });
//   } finally {
//     connection.release();
//   }
// };

// export const executeUnifiedMobileLookupController = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const userId = req.user.userId;

//     const {
//       usr_ser_id,
//       mas_ser_id,
//       mas_cat_id,
//       file_no,
//       mobile_number,
//       first_name = "",
//       last_name  = "",
//       email      = "",
//       name       = "",
//       use_cache,
//     } = req.body;

//     await connection.beginTransaction();

//     /* ================= SERVICE CHECK ================= */
//     const [[service]] = await connection.query(
//       `SELECT actual_credits
//        FROM user_services
//        WHERE usr_ser_id = ?
//          AND users_id   = ?
//          AND status     = 'active'
//        FOR UPDATE`,
//       [usr_ser_id, userId],
//     );

//     if (!service) throw new Error("Service not allowed");
//     const creditsUsed = Number(service.actual_credits);

//     /* ================= WALLET CHECK ================= */
//     const [[user]] = await connection.query(
//       `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
//       [userId],
//     );

//     if (!user) throw new Error("User not found");
//     const openingBalance = Number(user.wallet_amount);

//     /* ================= INPUT PAYLOAD ================= */
//     const inputPayload = JSON.stringify({ mobile_number, first_name, last_name, email, name });

//     let panResponse       = null;
//     let prefillResponse   = null;
//     let footprintResponse = null;
//     let mobileAgeResponse = null;

//     let responseStatus      = "failed";
//     let shouldDeduct        = false;
//     let walletTransactionId = null;
//     let transactionId       = null;
//     let requestId           = null;
//     let serFetLogId         = null;

//     /* ================= CACHE FLOW ================= */
//     if (use_cache) {
//       const [[existing]] = await connection.query(
//         `SELECT *
//          FROM service_data_fetch_log
//          WHERE mas_ser_id    = ?
//            AND mas_cat_id    = ?
//            AND mobile_number = ?
//          ORDER BY ser_fet_log_id DESC
//          LIMIT 1`,
//         [mas_ser_id, mas_cat_id, mobile_number],
//       );

//       if (!existing) throw new Error("Cache not found");

//       const cached =
//         typeof existing.api_response === "string"
//           ? JSON.parse(existing.api_response)
//           : existing.api_response;

//       panResponse       = cached?.pan        || null;
//       prefillResponse   = cached?.prefill    || null;
//       footprintResponse = cached?.footprint  || null;
//       mobileAgeResponse = cached?.mobile_age || null;

//       responseStatus = existing.response_status;
//       serFetLogId    = existing.ser_fet_log_id;
//       transactionId  = cached?.transaction_id || null;
//       requestId      = cached?.request_id     || null;

//       if (responseStatus === "success") shouldDeduct = true;

//     /* ================= FRESH API CALLS ================= */
//     } else {

//       /* ── 1. PAN LOOKUP ── */
//       try {
//         const panRes = await axios.post(
//           "https://api.gridlines.io/profile-api/mobile/pan-lookup",
//           { mobile_number, consent: "Y" },
//           {
//             headers: {
//               "X-API-Key": process.env.GRIDLINES_API_KEY,
//               "X-Auth-Type": "API-Key",
//               "Content-Type": "application/json",
//             },
//             validateStatus: () => true,
//           },
//         );
//         panResponse   = panRes.data;
//         transactionId = panResponse?.transaction_id || null;
//         requestId     = panResponse?.request_id     || null;
//       } catch (err) {
//         console.error("❌ PAN LOOKUP call failed:", err.message);
//       }

//       /* ── 2. MOBILE PREFILL ── */
//       try {
//         const prefillRes = await axios.post(
//           "https://api.gridlines.io/profile-api/mobile/prefill",
//           { mobile_number, first_name, last_name, consent: "Y" },
//           {
//             headers: {
//               "X-API-Key": process.env.GRIDLINES_API_KEY,
//               "X-Auth-Type": "API-Key",
//               "Content-Type": "application/json",
//             },
//             validateStatus: () => true,
//           },
//         );
//         prefillResponse = prefillRes.data;
//       } catch (err) {
//         console.error("❌ MOBILE PREFILL call failed:", err.message);
//       }

//       /* ── 3. DIGITAL FOOTPRINT ── */
//       try {
//         const footprintRes = await axios.post(
//           "https://api.gridlines.io/profile-api/mobile/digital-footprint",
//           { phone: mobile_number, email, name, consent: "Y" },
//           {
//             headers: {
//               "X-API-Key": process.env.GRIDLINES_API_KEY,
//               "X-Auth-Type": "API-Key",
//               "Content-Type": "application/json",
//             },
//             timeout: 20000,
//             validateStatus: () => true,
//           },
//         );
//         footprintResponse = footprintRes.data;
//       } catch (err) {
//         console.error("❌ DIGITAL FOOTPRINT call failed:", err.message);
//       }

//       /* ── 4. MOBILE NUMBER AGE ── */
//       try {
//         const ageRes = await axios.post(
//           "https://api.gridlines.io/profile-api/mobile/number-age",
//           { mobile_number, consent: "Y" },
//           {
//             headers: {
//               "X-API-Key": process.env.GRIDLINES_API_KEY,
//               "X-Auth-Type": "API-Key",
//               "Content-Type": "application/json",
//             },
//             validateStatus: () => true,
//           },
//         );
//         mobileAgeResponse = ageRes.data;
//       } catch (err) {
//         console.error("❌ MOBILE AGE call failed:", err.message);
//       }

//       /* ── Determine overall status ── */
//       const panCode       = panResponse?.data?.code;
//       const prefillCode   = prefillResponse?.data?.code;
//       const footprintCode = footprintResponse?.data?.code;
//       const ageCode       = mobileAgeResponse?.data?.code;

//       if (
//         panCode       === "1003" ||
//         prefillCode   === "1015" ||
//         footprintCode === "1030" ||
//         ageCode       === "1008"
//       ) {
//         responseStatus = "success";
//         shouldDeduct   = true;
//       } else if (panCode === "1004" || prefillCode === "1004" || ageCode === "1004") {
//         responseStatus = "not_found";
//       } else {
//         responseStatus = "failed";
//       }

//       /* ── Store combined response ── */
//       const combinedResponse = {
//         pan        : panResponse,
//         prefill    : prefillResponse,
//         footprint  : footprintResponse,
//         mobile_age : mobileAgeResponse,
//         transaction_id: transactionId,
//         request_id    : requestId,
//       };

//       const [fetchInsert] = await connection.query(
//         `INSERT INTO service_data_fetch_log
//          (mas_ser_id, mas_cat_id, file_number,
//           mobile_number, first_name,
//           api_response, response_status,
//           http_status_code, created_by)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           mas_ser_id, mas_cat_id, file_no,
//           mobile_number, first_name,
//           JSON.stringify(combinedResponse),
//           responseStatus, 200, userId,
//         ],
//       );

//       serFetLogId = fetchInsert.insertId;
//     }

//     if (!serFetLogId) throw new Error("ser_fet_log_id not found");

//     /* ================= WALLET DEDUCTION ================= */
//     if (shouldDeduct) {
//       if (openingBalance < creditsUsed) throw new Error("Insufficient balance");

//       const closingBalance = openingBalance - creditsUsed;

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
//        (users_id, usr_ser_id, file_no,
//         input_payload, credits_used,
//         api_name, api_status, wallet_transaction_id,
//         transaction_id, request_id,
//         ser_fet_log_id, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         userId, usr_ser_id, file_no,
//         inputPayload,
//         shouldDeduct ? creditsUsed : 0,
//         "ALL_IN_ONE_MOBILE_LOOKUP",
//         responseStatus,
//         walletTransactionId,
//         transactionId, requestId,
//         serFetLogId, userId,
//       ],
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       data: {
//         pan        : panResponse,
//         prefill    : prefillResponse,
//         footprint  : footprintResponse,
//         mobile_age : mobileAgeResponse,
//         transaction_id: transactionId,
//         request_id    : requestId,
//       },
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error("❌ EXECUTE UNIFIED MOBILE LOOKUP ERROR:", err.message);
//     return res.status(500).json({ success: false, message: err.message });
//   } finally {
//     connection.release();
//   }
// };



export const checkUnifiedMobileLookupCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id    = ?
         AND mas_cat_id    = ?
         AND mobile_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, mobile_number],
    );

    if (!existing) return res.json({ hasCache: false });

    if (existing.response_status === "success") {
      return res.json({ hasCache: true, lastFetchedAt: existing.fetched_at });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ checkUnifiedMobileLookup cache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeUnifiedMobileLookupController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      mobile_number,
      first_name = "",
      last_name  = "",
      email      = "",
      name       = "",
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id   = ?
         AND status     = 'active'
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

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = JSON.stringify({ mobile_number, first_name, last_name, email, name });

    let panResponse       = null;
    let prefillResponse   = null;
    let footprintResponse = null;
    let mobileAgeResponse = null;
    let rcLookupResponse  = null;

    let responseStatus      = "failed";
    let shouldDeduct        = false;
    let walletTransactionId = null;
    let transactionId       = null;
    let requestId           = null;
    let serFetLogId         = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id    = ?
           AND mas_cat_id    = ?
           AND mobile_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, mobile_number],
      );

      if (!existing) throw new Error("Cache not found");

      const cached =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      panResponse       = cached?.pan        || null;
      prefillResponse   = cached?.prefill    || null;
      footprintResponse = cached?.footprint  || null;
      mobileAgeResponse = cached?.mobile_age || null;
      rcLookupResponse  = cached?.rc_lookup  || null;

      responseStatus = existing.response_status;
      serFetLogId    = existing.ser_fet_log_id;
      transactionId  = cached?.transaction_id || null;
      requestId      = cached?.request_id     || null;

      if (responseStatus === "success") shouldDeduct = true;

    /* ================= FRESH API CALLS ================= */
    } else {

      /* ── 1. PAN LOOKUP ── */
      try {
        const panRes = await axios.post(
          "https://api.gridlines.io/profile-api/mobile/pan-lookup",
          { mobile_number, consent: "Y" },
          {
            headers: {
              "X-API-Key": process.env.GRIDLINES_API_KEY,
              "X-Auth-Type": "API-Key",
              "Content-Type": "application/json",
            },
            validateStatus: () => true,
          },
        );
        panResponse   = panRes.data;
        transactionId = panResponse?.transaction_id || null;
        requestId     = panResponse?.request_id     || null;
      } catch (err) {
        console.error("❌ PAN LOOKUP call failed:", err.message);
      }

      /* ── 2. MOBILE PREFILL ── */
      try {
        const prefillRes = await axios.post(
          "https://api.gridlines.io/profile-api/mobile/prefill",
          { mobile_number, first_name, last_name, consent: "Y" },
          {
            headers: {
              "X-API-Key": process.env.GRIDLINES_API_KEY,
              "X-Auth-Type": "API-Key",
              "Content-Type": "application/json",
            },
            validateStatus: () => true,
          },
        );
        prefillResponse = prefillRes.data;
      } catch (err) {
        console.error("❌ MOBILE PREFILL call failed:", err.message);
      }

      /* ── 3. DIGITAL FOOTPRINT ── */
      try {
        const footprintRes = await axios.post(
          "https://api.gridlines.io/profile-api/mobile/digital-footprint",
          { phone: mobile_number, email, name, consent: "Y" },
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
        footprintResponse = footprintRes.data;
      } catch (err) {
        console.error("❌ DIGITAL FOOTPRINT call failed:", err.message);
      }

      /* ── 4. MOBILE NUMBER AGE ── */
      try {
        const ageRes = await axios.post(
          "https://api.gridlines.io/profile-api/mobile/number-age",
          { mobile_number, consent: "Y" },
          {
            headers: {
              "X-API-Key": process.env.GRIDLINES_API_KEY,
              "X-Auth-Type": "API-Key",
              "Content-Type": "application/json",
            },
            validateStatus: () => true,
          },
        );
        mobileAgeResponse = ageRes.data;
      } catch (err) {
        console.error("❌ MOBILE AGE call failed:", err.message);
      }

      /* ── 5. RC LOOKUP BY MOBILE ── */
      try {
        const rcRes = await axios.post(
          "https://api.gridlines.io/rc-api/lookup-by-mobile",
          { mobile_number, consent: "Y" },
          {
            headers: {
              "X-API-Key": process.env.GRIDLINES_API_KEY,
              "X-Auth-Type": "API-Key",
              "Content-Type": "application/json",
            },
            validateStatus: () => true,
          },
        );
        rcLookupResponse = rcRes.data;
      } catch (err) {
        console.error("❌ RC LOOKUP call failed:", err.message);
      }

      /* ── Determine overall status ── */
      const panCode       = panResponse?.data?.code;
      const prefillCode   = prefillResponse?.data?.code;
      const footprintCode = footprintResponse?.data?.code;
      const ageCode       = mobileAgeResponse?.data?.code;
      const rcCode        = rcLookupResponse?.data?.code;

      if (
        panCode       === "1003" ||
        prefillCode   === "1015" ||
        footprintCode === "1030" ||
        ageCode       === "1008" ||
        rcCode        === "1000"
      ) {
        responseStatus = "success";
        shouldDeduct   = true;
      } else if (
        panCode     === "1004" ||
        prefillCode === "1004" ||
        ageCode     === "1004" ||
        rcCode      === "1011"
      ) {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ── Store combined response ── */
      const combinedResponse = {
        pan        : panResponse,
        prefill    : prefillResponse,
        footprint  : footprintResponse,
        mobile_age : mobileAgeResponse,
        rc_lookup  : rcLookupResponse,
        transaction_id: transactionId,
        request_id    : requestId,
      };

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, first_name,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id, mas_cat_id, file_no,
          mobile_number, first_name,
          JSON.stringify(combinedResponse),
          responseStatus, 200, userId,
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
        userId, usr_ser_id, file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "ALL_IN_ONE_MOBILE_LOOKUP",
        responseStatus,
        walletTransactionId,
        transactionId, requestId,
        serFetLogId, userId,
      ],
    );

    await connection.commit();

    return res.json({
      success: true,
      data: {
        pan        : panResponse,
        prefill    : prefillResponse,
        footprint  : footprintResponse,
        mobile_age : mobileAgeResponse,
        rc_lookup  : rcLookupResponse,
        transaction_id: transactionId,
        request_id    : requestId,
      },
    });

  } catch (err) {
    await connection.rollback();
    console.error("❌ EXECUTE UNIFIED MOBILE LOOKUP ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};
