import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import axios from "axios";



export const getUserServiceLogsCountController = async (req, res) => {
  try {
    const connection = await db.getConnection();

    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS total_count FROM user_service_logs`
    );

    connection.release();

    return res.status(200).json({
      api_status: "success",
      message: "User service logs count fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching user_service_logs count:", error);

    return res.status(500).json({
      api_status: "failed",
      message: "Failed to fetch user service logs count",
      error: error.message,
    });
  }
};