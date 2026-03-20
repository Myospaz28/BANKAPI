import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import axios from "axios";



export const getUserServiceLogsCountController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { userId, role } = req.user;

    let query = `
      SELECT COUNT(*) AS total_count
      FROM user_service_logs
    `;

    let params = [];

    // ✅ role based filtering
    if (role !== "admin") {
      query += ` WHERE created_by = ?`;
      params.push(userId);
    }

    const [rows] = await connection.execute(query, params);

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "Service logs count fetched",
      data: rows[0],
    });
  } catch (error) {
    connection.release();
    console.error("Count Error:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch count",
      error: error.message,
    });
  }
};


export const getUsersCountController = async (req, res) => {
  try {
    const connection = await db.getConnection();

    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS total_count FROM users`
    );

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "Users count fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching users count:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch users count",
      error: error.message,
    });
  }
};


export const getTodayCreditsUsedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { userId, role } = req.user;

    let query = `
      SELECT 
        COALESCE(SUM(credits_used), 0) AS total_credits_used
      FROM user_service_logs
      WHERE DATE(created_at) = CURDATE()
    `;

    let params = [];

    // ✅ role based filtering
    if (role !== "admin") {
      query += ` AND created_by = ?`;
      params.push(userId);
    }

    const [rows] = await connection.execute(query, params);

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "Today's credits usage fetched",
      data: rows[0],
    });

  } catch (error) {
    connection.release();
    console.error("Today Credits Error:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch today's credits usage",
      error: error.message,
    });
  }
};


export const getTopApiUsersController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { userId, role } = req.user;

    let query = `
      SELECT 
        u.users_id AS user_id,
        u.name,
        COUNT(*) AS usage_count
      FROM user_service_logs usl
      INNER JOIN users u 
        ON u.users_id = usl.created_by
    `;

    let params = [];

    // ✅ role based filtering
    if (role !== "admin") {
      query += ` WHERE usl.created_by = ?`;
      params.push(userId);
    }

    query += `
      GROUP BY u.users_id, u.name
      ORDER BY usage_count DESC
    `;

    const [rows] = await connection.execute(query, params);

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "Users usage list fetched",
      data: rows,
    });

  } catch (error) {
    connection.release();
    console.error("Top Users Error:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch users usage",
      error: error.message,
    });
  }
};


export const getTotalActiveServicesController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { userId } = req.user;

    const query = `
      SELECT 
        COUNT(*) AS total_active_services
      FROM user_services
      WHERE users_id = ?
      AND status = 'active'
    `;

    const [rows] = await connection.execute(query, [userId]);

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "Total active services fetched",
      data: rows[0],
    });

  } catch (error) {
    connection.release();
    console.error("Active Services Count Error:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch active services count",
      error: error.message,
    });
  }
};


export const getTodayServicesUsedCountController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { userId, role } = req.user;

    let query = `
      SELECT 
        COUNT(*) AS today_services_used
      FROM user_service_logs
      WHERE created_at >= CURDATE()
      AND created_at < CURDATE() + INTERVAL 1 DAY
    `;

    let params = [];

    // ✅ role based filter
    if (role !== "admin") {
      query += ` AND created_by = ?`;
      params.push(userId);
    }

    const [rows] = await connection.execute(query, params);

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "Today services count fetched",
      data: rows[0],
    });

  } catch (error) {
    connection.release();
    console.error("Today Services Count Error:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch today services count",
      error: error.message,
    });
  }
};


export const getTotalCreditsUsedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { userId, role } = req.user;

    let query = `
      SELECT 
        COALESCE(SUM(credits_used), 0) AS total_credits_used
      FROM user_service_logs
    `;

    let params = [];

    // ✅ role based filter
    if (role !== "admin") {
      query += ` WHERE created_by = ?`;
      params.push(userId);
    }

    const [rows] = await connection.execute(query, params);

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "Total credits used fetched",
      data: rows[0],
    });

  } catch (error) {
    connection.release();
    console.error("Total Credits Used Error:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch total credits used",
      error: error.message,
    });
  }
};