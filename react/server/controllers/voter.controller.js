import axios from "axios";
import db from "../database/db.js";
import fs from "fs";
import FormData from "form-data";

//meson
export const fetchVoterDetailsController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, voter_id, file_no, consent } = req.body;

   
    if (!usr_ser_id || !voter_id || !file_no || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();


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

    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
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

    const apiRes = await axios.post(
      "https://api.gridlines.io/voter-api/boson/fetch",
      { voter_id, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

  
    if (code !== "1000") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }


    const v = apiRes.data?.data?.voter_data || {};

    const normalizedVoterData = {
      document_type: v.document_type || "VOTER",
      name: v.name || "-",
      father_name: v.father_name || "-",
      gender: v.gender || "-",
      age: v.age || "-",
      district: v.district || "-",
      state: v.state || "-",
      assembly_constituency_number: v.assembly_constituency_number || "-",
      assembly_constituency_name: v.assembly_constituency_name || "-",
      parliamentary_constituency_name: v.parliamentary_constituency_name || "-",
      part_number: v.part_number || "-",
      part_name: v.part_name || "-",
      serial_number: v.serial_number || "-",
      polling_station: v.polling_station || "-",
    };


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
        credits_used, api_name, api_status,
        wallet_transaction_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "VOTER_FETCH",
        "success",
        walletTxn.insertId,
        userId,
      ]
    );

    await connection.commit();

    /* ================= FINAL RESPONSE ================= */
    res.json({
      success: true,
      data: {
        ...apiRes.data,
        data: {
          ...apiRes.data.data,
          voter_data: normalizedVoterData,
        },
      },
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ VOTER Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Voter fetch failed",
    });
  } finally {
    connection.release();
  }
};


export const voterOcrController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const { usr_ser_id, file_no, consent } = req.body;
    const fileFront = req.files?.file_front?.[0];
    const fileBack = req.files?.file_back?.[0];

 
    if (!usr_ser_id || !file_no || consent !== "Y" || !fileFront) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

   
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

    const formData = new FormData();
    formData.append("file_front", fs.createReadStream(fileFront.path));
    if (fileBack) {
      formData.append("file_back", fs.createReadStream(fileBack.path));
    }
    formData.append("consent", consent);

    const apiRes = await axios.post(
      "https://api.gridlines.io/voter-api/ocr",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Reference-ID": file_no,
        },
      }
    );

    const code = apiRes.data?.data?.code;

    
    if (code !== "1008") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data, 
      });
    }

  
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
        "VOTER_OCR",
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
    console.error("❌ Voter OCR Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Voter ID OCR failed",
    });
  } finally {
    connection.release();
  }
};
export const voterOcrController = async (req, res) => {
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
    if (fileBack) formData.append("file_back", fs.createReadStream(fileBack.path));
    formData.append("consent", "Y");

    const apiRes = await axios.post(
      "https://api.gridlines.io/voter-api/ocr",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Reference-ID": file_no,
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

    if (code === "1008") {
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
        "VOTER_OCR",
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
    console.error("❌ VOTER OCR ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};


export const voterMesonInitController = async (req, res) => {
  try {
    const apiRes = await axios.get(
      "https://api.gridlines.io/voter-api/meson/init",
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
        },
      }
    );

    return res.json({
      success: true,
      data: apiRes.data, // 🔥 FULL RESPONSE
    });
  } catch (error) {
    console.error("❌ Voter Meson Init Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize voter verification",
    });
  }
};


export const voterMesonFetchController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const { usr_ser_id, file_no, voter_id, captcha, consent, transaction_id } =
      req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !file_no ||
      !voter_id ||
      !captcha ||
      consent !== "Y" ||
      !transaction_id
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

    /* ================= GRIDLINES FETCH ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/voter-api/meson/fetch",
      {
        voter_id,
        captcha,
        consent,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "X-Transaction-ID": transaction_id,
          "X-Reference-ID": file_no,
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= NON-SUCCESS ================= */
    if (code !== "1000") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data, // full API response
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
        "VOTER_MESON_FETCH",
        "success",
        walletTxn.insertId,
        userId,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      data: apiRes.data, // 🔥 FULL RESPONSE
      wallet: {
        opening_balance: openingBalance,
        credits_used: creditsUsed,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Voter Meson Fetch Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch voter details",
    });
  } finally {
    connection.release();
  }
};


//new controller
export const checkVoterCacheController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { mas_ser_id, mas_cat_id, voter_id } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND voter_id = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, voter_id]
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
    console.error("❌ checkVoterCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

export const executeVoterFetchController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      voter_id,
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

    const requestPayload = {
  voter_id,

};
    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;

    /* =====================================================
                      CACHE FLOW
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND voter_id = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, voter_id]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
        transactionId = fullResponse?.transaction_id || null;
        requestId = fullResponse?.request_id || null;
      }
    }

    /* =====================================================
                      FRESH FLOW
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/voter-api/boson/fetch",
        {
          voter_id,
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

      fullResponse = apiRes.data;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1007") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, voter_id,
          api_response, response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          voter_id,
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
        `UPDATE users
         SET wallet_amount = ?
         WHERE users_id = ?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id, transaction_type, amount,
          opening_balance, closing_balance,
          reference_type, created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [
          userId,
          creditsUsed,
          openingBalance,
          closingBalance,
          userId,
        ]
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
    input_payload,
    created_by)
   VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  [
    userId,
    usr_ser_id,
    file_no,
    shouldDeduct ? creditsUsed : 0,
    "VOTER_FETCH",
    responseStatus,
    walletTransactionId,
    transactionId,
    requestId,
    JSON.stringify(requestPayload),
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

    console.error(
      "❌ EXECUTE VOTER FETCH ERROR:",
      err.response?.data || err.message
    );

    return res.status(500).json({
      success: false,
      message: err.message || "Voter fetch failed",
    });
  } finally {
    connection.release();
  }
};

export const checkVoterMesonCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, voter_id } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND voter_id = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, voter_id]
    );

    /* ===== NO CACHE ===== */
    if (!existing) {
      return res.json({ hasCache: false });
    }

    /* ===== ONLY SUCCESS CACHE ALLOWED ===== */
    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });
  } catch (err) {
    console.error("❌ checkVoterMesonCache error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Cache check failed",
    });
  } finally {
    connection.release();
  }
};
export const executeVoterMesonFetchController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      voter_id,
      captcha,
      transaction_id,
      use_cache,
    } = req.body;

    await connection.beginTransaction();

    /* ================= SERVICE ================= */
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id=? AND users_id=? AND status='active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    /* ================= WALLET ================= */
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id=? FOR UPDATE`,
      [userId]
    );

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */
    const inputPayload = {
      voter_id,
  
    };

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionIdResp = null;
    let requestIdResp = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT * FROM service_data_fetch_log
         WHERE mas_ser_id=? AND mas_cat_id=? AND voter_id=?
         ORDER BY ser_fet_log_id DESC LIMIT 1`,
        [mas_ser_id, mas_cat_id, voter_id]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse =
        typeof existing.api_response === "string"
          ? JSON.parse(existing.api_response)
          : existing.api_response;

      responseStatus = existing.response_status;

      transactionIdResp = fullResponse?.transaction_id || null;
      requestIdResp = fullResponse?.request_id || null;

      if (responseStatus === "success") shouldDeduct = true;
    }

    /* ================= FRESH FLOW ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/voter-api/meson/fetch",
        {
          voter_id,
          captcha,
          consent: "Y",
        },
        {
          headers: {
            "X-API-Key": process.env.GRIDLINES_API_KEY,
            "X-Auth-Type": "API-Key",
            "X-Transaction-ID": transaction_id,
            "X-Reference-ID": file_no,
          },
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      transactionIdResp = fullResponse?.transaction_id || null;
      requestIdResp = fullResponse?.request_id || null;

      const code = fullResponse?.data?.code;

      if (code === "1000") {
        responseStatus = "success";
        shouldDeduct = true;
      } else if (code === "1007") {
        responseStatus = "not_found";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number, voter_id,
          api_response, response_status, http_status_code, created_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          voter_id,
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
        `UPDATE users SET wallet_amount=? WHERE users_id=?`,
        [closingBalance, userId]
      );

      const [walletTxn] = await connection.query(
        `INSERT INTO wallet_transactions
         (users_id, transaction_type, amount,
          opening_balance, closing_balance,
          reference_type, created_by)
         VALUES (?, 'debit', ?, ?, ?, 'service_usage', ?)`,
        [
          userId,
          creditsUsed,
          openingBalance,
          closingBalance,
          userId,
        ]
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
        input_payload,
        created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "VOTER_MESON_FETCH",
        responseStatus,
        walletTransactionId,
        transactionIdResp,
        requestIdResp,
        JSON.stringify(inputPayload),
        userId,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      data: fullResponse,
    });
  } catch (err) {
    await connection.rollback();

    console.error("❌ VOTER MESON ERROR:", err.response?.data || err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};