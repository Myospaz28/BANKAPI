import axios from "axios";
import db from "../database/db.js";
import { v4 as uuidv4 } from 'uuid';

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


export const generateMesonCaptcha = async (req, res) => {
  try {
    const transactionId = uuidv4();

    const apiRes = await axios.get(
      'https://api.gridlines.io/voter-api/meson/captcha',
      {
        headers: {
          'X-API-Key': process.env.GRIDLINES_API_KEY,
          'X-Auth-Type': 'API-Key',
          'X-Transaction-ID': transactionId,
        },
      }
    );

    res.json({
      success: true,
      transaction_id: transactionId,
      captcha_base64: apiRes.data?.data?.captcha_base64,
    });
  } catch (error) {
    console.error(
      '❌ MESON CAPTCHA ERROR:',
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: 'Failed to generate captcha',
    });
  }
};



export const fetchMesonVoterController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;
    const {
      usr_ser_id,
      voter_id,
      file_no,
      consent,
      captcha,
      transaction_id,
    } = req.body;

    // 🔐 Validation
    if (
      !usr_ser_id ||
      !voter_id ||
      !file_no ||
      !captcha ||
      !transaction_id ||
      consent !== 'Y'
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    await connection.beginTransaction();

    // ===== Check service =====
    const [[service]] = await connection.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ? AND users_id = ? AND status = 'active'
       FOR UPDATE`,
      [usr_ser_id, userId]
    );

    if (!service) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Service not allowed',
      });
    }

    const creditsUsed = Number(service.actual_credits);

    // ===== Wallet check =====
    const [[user]] = await connection.query(
      `SELECT wallet_amount FROM users WHERE users_id = ? FOR UPDATE`,
      [userId]
    );

    const openingBalance = Number(user.wallet_amount);

    if (openingBalance < creditsUsed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits',
      });
    }

    // ===== MESON FETCH =====
    const apiRes = await axios.post(
      'https://api.gridlines.io/voter-api/meson/fetch',
      {
        voter_id,
        captcha,
        consent,
      },
      {
        headers: {
          'X-API-Key': process.env.GRIDLINES_API_KEY,
          'X-Auth-Type': 'API-Key',
          'X-Transaction-ID': transaction_id,
          'Content-Type': 'application/json',
        },
      }
    );

    const code = apiRes.data?.data?.code;

    if (code !== '1000') {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    // ===== SUCCESS → deduct wallet =====
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
        'MESON_VOTER_FETCH',
        'success',
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
    console.error('❌ MESON FETCH ERROR:', error.response?.data || error);
    res.status(500).json({
      success: false,
      message: 'Voter fetch failed',
    });
  } finally {
    connection.release();
  }
};
