// import db from "../database/db.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";


// // export const login = async (req, res) => {
// //   try {
// //     const { username, password } = req.body;

// //     if (!username || !password) {
// //       return res.status(400).json({ message: "Username and password are required" });
// //     }

// //     const [rows] = await db.query(
// //       `SELECT u.users_id, u.name, u.username, u.email, u.password, r.role
// //        FROM users u
// //        JOIN userrole r ON r.ur_id = u.role_id
// //        WHERE u.username = ?
// //          AND u.status = 'active'`,
// //       [username]
// //     );

// //     if (!rows.length) {
// //       return res.status(401).json({ message: "Invalid username or password" });
// //     }

// //     const user = rows[0];

// //     const isMatch = await bcrypt.compare(password, user.password);
// //     if (!isMatch) {
// //       return res.status(401).json({ message: "Invalid username or password" });
// //     }

// //     // ✅ Store everything you need in JWT
// //     const token = jwt.sign(
// //       {
// //         userId: user.users_id,
// //         name: user.name,
// //         username: user.username,
// //         role: user.role,
// //       },
// //       process.env.JWT_SECRET,
// //       { expiresIn: "1d" }
// //     );

// //     res.json({
// //       success: true,
// //       user: {
// //         userId: user.users_id,
// //         name: user.name,
// //         username: user.username,
// //         email: user.email,
// //         role: user.role,
// //       },
// //       token,
// //     });
// //     console.log("user", user)

// //   } catch (err) {
// //     console.error("Login error:", err);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };



// export const login1 = async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     if (!username || !password) {
//       return res
//         .status(400)
//         .json({ message: "Username and password are required" });
//     }

//     const [rows] = await db.query(
//       `
//       SELECT 
//         u.users_id,
//         u.name,
//         u.username,
//         u.email,
//         u.password,
//         u.contact_number,
//         u.address,
//         u.wallet_amount,
//         u.status,
//         u.created_at,
//         u.updated_at,
//         r.role
//       FROM users u
//       JOIN userrole r ON r.ur_id = u.role_id
//       WHERE u.username = ?
//         AND u.status = 'active'
//       `,
//       [username]
//     );

//     if (!rows.length) {
//       return res.status(401).json({ message: "Invalid username or password" });
//     }

//     const user = rows[0];

//     // 🔐 Password check
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid username or password" });
//     }

//     // ✅ JWT → only minimal, non-sensitive data
//     const token = jwt.sign(
//       {
//         userId: user.users_id,
//         username: user.username,
//         role: user.role,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     // ✅ Frontend-safe user object
//     res.json({
//       success: true,
//       user: {
//         userId: user.users_id,
//         name: user.name,
//         username: user.username,
//         email: user.email,
//         contact_number: user.contact_number,
//         address: user.address,
//         wallet_amount: user.wallet_amount,
//         status: user.status,
//         created_at: user.created_at,
//         updated_at: user.updated_at,
//         role: user.role,
//       },
//       token,
//     });
//      console.log("user", user)

//     console.log("✅ User logged in:", user.username);
//   } catch (err) {
//     console.error("❌ Login error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     if (!username || !password) {
//       return res.status(400).json({
//         message: 'Username and password are required',
//       });
//     }

//     const [rows] = await db.query(
//       `SELECT 
//          u.users_id,
//          u.name,
//          u.username,
//          u.email,
//          u.password,
//          u.log_session_time,
//          r.role
         
//        FROM users u
//        JOIN userrole r ON r.ur_id = u.role_id
//        WHERE u.username = ?
//          AND u.status = 'active'`,
//       [username],
//     );

//     if (!rows.length) {
//       return res.status(401).json({ message: 'Invalid username or password' });
//     }

//     const user = rows[0];

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid username or password' });
//     }

//     /* ================= SESSION TIME ================= */
//     let sessionMinutes = 15; // default

//     if (user.log_session_time) {
//       const [hrs, mins] = user.log_session_time.split(':').map(Number);
//       sessionMinutes = hrs * 60 + mins;
//     }

//     /* ================= JWT ================= */
//     const token = jwt.sign(
//       {
//         userId: user.users_id,
//         name: user.name,
//         username: user.username,
//         role: user.role,
//       },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: `${sessionMinutes}m`,
//       },
//     );

//     res.json({
//       success: true,
//       user: {
//         userId: user.users_id,
//         name: user.name,
//         username: user.username,
//         email: user.email,
//         role: user.role,
//         log_session_time: user.log_session_time,
//       },
//       token,
//     });
//     console.log("user", user)
//   } catch (err) {
//     console.error('Login error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// export const signup1 = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const {
//       name,
//       role_id,
//       email,
//       username,
//       password,
//       address,
//       mobile,
//       wallet_amount,
//       services = [],
//     } = req.body;

//     const updated_by = req.session?.user?.id || null;

//     /* ================= VALIDATION ================= */
//     if (!name || !role_id || !email || !username || !password) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     if (!Array.isArray(services) || services.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "At least one service is required" });
//     }

//     /* ================= TRANSACTION START ================= */
//     await conn.beginTransaction();

//     /* ================= CHECK DUPLICATE ================= */
//     const [existing] = await conn.query(
//       "SELECT users_id FROM users WHERE email = ? OR username = ?",
//       [email, username]
//     );

//     if (existing.length) {
//       await conn.rollback();
//       return res.status(409).json({ message: "User already exists" });
//     }

//     /* ================= HASH PASSWORD ================= */
//     const hashedPassword = await bcrypt.hash(password, 10);

//     /* ================= INSERT USER ================= */
//     const [userResult] = await conn.query(
//       `INSERT INTO users
//        (name, role_id, email, contact_number, username, password, address, wallet_amount)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         name,
//         role_id,
//         email,
//         mobile || null,
//         username,
//         hashedPassword,
//         address || null,
//         wallet_amount || 0,
//       ]
//     );

//     const users_id = userResult.insertId;

//     /* ================= INSERT USER SERVICES ================= */
//     const serviceValues = services.map((s) => [
//       users_id,
//       s.mas_ser_id,
//       s.credits,
//       "active",
//       updated_by,
//     ]);

//     await conn.query(
//       `INSERT INTO user_services
//        (users_id, mas_ser_id, actual_credits, status, updated_by)
//        VALUES ?`,
//       [serviceValues]
//     );

//     /* ================= COMMIT ================= */
//     await conn.commit();

//     res.status(201).json({
//       success: true,
//       message: "User created successfully",
//       users_id,
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error("❌ Signup error:", err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const signup2 = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     /* ================= HELPER ================= */
//     const minutesToTime = (minutes) => {
//       const hrs = Math.floor(minutes / 60);
//       const mins = minutes % 60;
//       return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(
//         2,
//         '0',
//       )}:00`;
//     };

//     const {
//       name,
//       role_id,
//       email,
//       username,
//       password,
//       address,
//       mobile,
//       wallet_amount,
//       services = [],

//       // NEW FIELDS
//       login_time,
//       logout_time,
//       log_session_time, // minutes
//       latitude,
//       longitude,
//     } = req.body;

//     /* ================= VALIDATION ================= */
//     if (!name || !role_id || !email || !username || !password) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     if (!Array.isArray(services) || services.length === 0) {
//       return res
//         .status(400)
//         .json({ message: 'At least one service is required' });
//     }

//     await conn.beginTransaction();

//     /* ================= CHECK DUPLICATE ================= */
//     const [existing] = await conn.query(
//       'SELECT users_id FROM users WHERE email = ? OR username = ?',
//       [email, username],
//     );

//     if (existing.length) {
//       await conn.rollback();
//       return res.status(409).json({ message: 'User already exists' });
//     }

//     /* ================= PASSWORD ================= */
//     const hashedPassword = await bcrypt.hash(password, 10);

//     /* ================= SESSION TIME ================= */
//     const DEFAULT_SESSION_MINUTES = 15;
//     const sessionMinutes =
//       log_session_time !== undefined &&
//       log_session_time !== null &&
//       log_session_time !== ''
//         ? parseInt(log_session_time)
//         : DEFAULT_SESSION_MINUTES;

//     const sessionTime = minutesToTime(sessionMinutes);

//     /* ================= INSERT USER ================= */
//     const [userResult] = await conn.query(
//       `INSERT INTO users
//        (
//          name,
//          role_id,
//          email,
//          contact_number,
//          username,
//          password,
//          address,
//          wallet_amount,
//          login_time,
//          logout_time,
//          log_session_time,
//          latitude,
//          longitude
//        )
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         name,
//         role_id,
//         email,
//         mobile || null,
//         username,
//         hashedPassword,
//         address || null,
//         wallet_amount || 0,
//         login_time || null,
//         logout_time || null,
//         sessionTime,
//         latitude || null,
//         longitude || null,
//       ],
//     );

//     const users_id = userResult.insertId;

//     /* ================= INSERT SERVICES ================= */
//     const serviceValues = services.map((s) => [
//       users_id,
//       s.mas_ser_id,
//       s.credits,
//       'active',
//       null,
//     ]);

//     await conn.query(
//       `INSERT INTO user_services
//        (users_id, mas_ser_id, actual_credits, status, updated_by)
//        VALUES ?`,
//       [serviceValues],
//     );

//     await conn.commit();

//     res.status(201).json({
//       success: true,
//       message: 'User created successfully',
//       users_id,
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error('Signup error:', err);
//     res.status(500).json({ message: 'Server error' });
//   } finally {
//     conn.release();
//   }
// };


// export const signup = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     /* ================= HELPER ================= */
//     const minutesToTime = (minutes) => {
//       const hrs = Math.floor(minutes / 60);
//       const mins = minutes % 60;
//       return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(
//         2,
//         '0',
//       )}:00`;
//     };

//     const {
//       name,
//       role_id,
//       email,
//       username,
//       password,
//       address,
//       mobile,
//       wallet_amount,
//       services = [],

//       // NEW FIELDS
//       login_time,
//       logout_time,
//       log_session_time, // minutes
//       latitude,
//       longitude,
//     } = req.body;

//     /* ================= VALIDATION ================= */
//     if (!name || !role_id || !email || !username || !password) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     if (!Array.isArray(services) || services.length === 0) {
//       return res
//         .status(400)
//         .json({ message: 'At least one service is required' });
//     }

//     await conn.beginTransaction();

//     /* ================= CHECK DUPLICATE ================= */
//     const [existing] = await conn.query(
//       'SELECT users_id FROM users WHERE email = ? OR username = ?',
//       [email, username],
//     );

//     if (existing.length) {
//       await conn.rollback();
//       return res.status(409).json({ message: 'User already exists' });
//     }

//     /* ================= PASSWORD ================= */
//     const hashedPassword = await bcrypt.hash(password, 10);

//     /* ================= SESSION TIME ================= */
//     const DEFAULT_SESSION_MINUTES = 15;
//     const sessionMinutes =
//       log_session_time !== undefined &&
//       log_session_time !== null &&
//       log_session_time !== ''
//         ? parseInt(log_session_time)
//         : DEFAULT_SESSION_MINUTES;

//     const sessionTime = minutesToTime(sessionMinutes);

//     /* ================= INSERT USER ================= */
//     const [userResult] = await conn.query(
//       `INSERT INTO users
//        (
//          name,
//          role_id,
//          email,
//          contact_number,
//          username,
//          password,
//          address,
//          wallet_amount,
//          login_time,
//          logout_time,
//          log_session_time,
//          latitude,
//          longitude
//        )
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         name,
//         role_id,
//         email,
//         mobile || null,
//         username,
//         hashedPassword,
//         address || null,
//         wallet_amount || 0,
//         login_time || null,
//         logout_time || null,
//         sessionTime,
//         latitude || null,
//         longitude || null,
//       ],
//     );

//     const users_id = userResult.insertId;

//     /* ================= INSERT SERVICES ================= */
//     const serviceValues = services.map((s) => [
//       users_id,
//       s.mas_ser_id,
//       s.credits,
//       'active',
//       null,
//     ]);

//     await conn.query(
//       `INSERT INTO user_services
//        (users_id, mas_ser_id, actual_credits, status, updated_by)
//        VALUES ?`,
//       [serviceValues],
//     );

//     await conn.commit();

//     res.status(201).json({
//       success: true,
//       message: 'User created successfully',
//       users_id,
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error('Signup error:', err);
//     res.status(500).json({ message: 'Server error' });
//   } finally {
//     conn.release();
//   }
// };


// export const changePassword = async (req, res) => {
//   try {
//     const userId = req.user.userId; // from JWT
//     const { newPassword } = req.body;

//     if (!newPassword) {
//       return res.status(400).json({
//         message: "New password is required",
//       });
//     }

//     if (newPassword.length < 6) {
//       return res.status(400).json({
//         message: "Password must be at least 6 characters",
//       });
//     }

//     // 🔐 Hash new password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     // 💾 Update password
//     const [result] = await db.query(
//       "UPDATE users SET password = ? WHERE users_id = ?",
//       [hashedPassword, userId]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json({
//       success: true,
//       message: "Password changed successfully",
//     });
//   } catch (error) {
//     console.error("Change password error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// export const updateUserController = async (req, res) => {
//   try {
//     const {
//       users_id,
//       name,
//       username,
//       email,
//       mobile,
//       address,
//       login_time,
//       logout_time,
//       log_session_time,
//       latitude,
//       longitude,
//       new_password,
//     } = req.body;

//     if (!users_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID required',
//       });
//     }

//     // ================= BASE UPDATE FIELDS =================
//     let updateFields = `
//       name = ?,
//       username = ?,
//       email = ?,
//       contact_number = ?,
//       address = ?,
//       login_time = ?,
//       logout_time = ?,
//       log_session_time = ?,
//       latitude = ?,
//       longitude = ?
//     `;

//     const values = [
//       name,
//       username,
//       email,
//       mobile,
//       address,
//       login_time || null,
//       logout_time || null,
//       log_session_time || null,
//       latitude || null,
//       longitude || null,
//     ];

//     // ================= OPTIONAL PASSWORD RESET =================
//     if (new_password && new_password.trim() !== '') {
//       const hashedPassword = await bcrypt.hash(new_password, 10);
//       updateFields += `, password = ?`;
//       values.push(hashedPassword);
//     }

//     values.push(users_id);

//     const sql = `
//       UPDATE users
//       SET ${updateFields}
//       WHERE users_id = ?
//     `;

//     await db.query(sql, values);

//     return res.json({
//       success: true,
//       message: 'User updated successfully',
//     });
//   } catch (error) {
//     console.error('❌ Update User Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to update user',
//     });
//   }
// };

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';

/* ================= DISTANCE HELPER ================= */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


/* ================= LOGIN ================= */
// export const login = async (req, res) => {
//   try {
//     const { username, password, latitude, longitude } = req.body;

//     /* ================= VALIDATION ================= */
//     if (!username || !password) {
//       return res.status(400).json({
//         message: 'Username and password are required',
//       });
//     }

//     if (!latitude || !longitude) {
//       return res.status(400).json({
//         message: 'Location access is required to login',
//       });
//     }

//     /* ================= GET USER ================= */
//     const [rows] = await db.query(
//       `SELECT 
//          u.users_id,
//          u.name,
//          u.username,
//          u.email,
//          u.password,
//          u.log_session_time,
//          u.latitude AS office_latitude,
//          u.longitude AS office_longitude,
//          u.allowed_radius,
//          r.role
//        FROM users u
//        JOIN userrole r ON r.ur_id = u.role_id
//        WHERE u.username = ?
//          AND u.status = 'active'`,
//       [username],
//     );

//     if (!rows.length) {
//       return res.status(401).json({
//         message: 'Invalid username or password',
//       });
//     }

//     const user = rows[0];

//     /* ================= PASSWORD CHECK ================= */
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         message: 'Invalid username or password',
//       });
//     }

//     /* ================= LOCATION CONFIG CHECK ================= */
//     if (!user.office_latitude || !user.office_longitude) {
//       return res.status(403).json({
//         message: 'User location not configured. Contact admin.',
//       });
//     }

//     /* ================= DISTANCE CHECK ================= */
//     const distance = getDistanceInMeters(
//       Number(user.office_latitude),
//       Number(user.office_longitude),
//       Number(latitude),
//       Number(longitude),
//     );


//     if (distance > user.allowed_radius) {
//       await db.query(
//         `INSERT INTO user_session_logs
//          (user_id, login_time, latitude, longitude, login_remark)
//          VALUES (?, NOW(), ?, ?, ?)`,
//         [
//           user.users_id,
//           latitude,
//           longitude,
//           'Login attempt outside allowed area',
//         ],
//       );

//       return res.status(403).json({
//         message: 'You are outside the allowed area. Access denied.',
//       });
//     }

//     /* =========================================================
//        NORMAL LOGIN (INSIDE AREA)
//     ========================================================== */

//     const [logResult] = await db.query(
//       `INSERT INTO user_session_logs
//        (user_id, login_time, latitude, longitude, login_remark)
//        VALUES (?, NOW(), ?, ?, ?)`,
//       [
//         user.users_id,
//         latitude,
//         longitude,
//         'Login successful',
//       ],
//     );

//     const sessionLogId = logResult.insertId;

//     /* ================= SESSION TIME ================= */
//     let sessionMinutes = 15;

//     if (user.log_session_time) {
//       const [hrs, mins] = user.log_session_time.split(':').map(Number);
//       sessionMinutes = hrs * 60 + mins;
//     }

//     /* ================= JWT ================= */
//     const token = jwt.sign(
//       {
//         userId: user.users_id,
//         sessionLogId: sessionLogId,
//         name: user.name,
//         username: user.username,
//         role: user.role,
//       },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: `${sessionMinutes}m`,
//       },
//     );

//     /* ================= RESPONSE ================= */
//     res.json({
//       success: true,
//       user: {
//         userId: user.users_id,
//         name: user.name,
//         username: user.username,
//         email: user.email,
//         role: user.role,
//         log_session_time: user.log_session_time,
//         latitude: user.office_latitude,
//         longitude: user.office_longitude,
//       },
//       token,
//     });

//     console.log('✅ Login success:', user.username);
//   } catch (err) {
//     console.error('❌ Login error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

export const login = async (req, res) => {
  try {
    const { username, password, latitude, longitude } = req.body;

    /* ================= VALIDATION ================= */
    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required',
      });
    }

    /* ================= GET USER ================= */
    const [rows] = await db.query(
      `SELECT 
         u.users_id,
         u.name,
         u.username,
         u.email,
         u.password,
         u.log_session_time,
         u.latitude AS office_latitude,
         u.longitude AS office_longitude,
         u.allowed_radius,
         u.geo_fencing_status,
         r.role
       FROM users u
       JOIN userrole r ON r.ur_id = u.role_id
       WHERE u.username = ?
         AND u.status = 'active'`,
      [username],
    );

    if (!rows.length) {
      return res.status(401).json({
        message: 'Invalid username or password',
      });
    }

    const user = rows[0];

    /* ================= PASSWORD CHECK ================= */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid username or password',
      });
    }

    /* =========================================================
       GEO FENCING CHECK (ONLY IF ACTIVE)
    ========================================================== */

    let sessionLatitude = null;
    let sessionLongitude = null;

    if (user.geo_fencing_status === 'active') {

      if (!latitude || !longitude) {
        return res.status(400).json({
          message: 'Location required',
        });
      }

      if (!user.office_latitude || !user.office_longitude) {
        return res.status(403).json({
          message: 'User location not configured. Contact admin.',
        });
      }

      const distance = getDistanceInMeters(
        Number(user.office_latitude),
        Number(user.office_longitude),
        Number(latitude),
        Number(longitude),
      );

      if (distance > user.allowed_radius) {
        await db.query(
          `INSERT INTO user_session_logs
           (user_id, login_time, latitude, longitude, login_remark)
           VALUES (?, NOW(), ?, ?, ?)`,
          [
            user.users_id,
            latitude,
            longitude,
            'Login attempt outside allowed area',
          ],
        );

        return res.status(403).json({
          message: 'You are outside the allowed area. Access denied.',
        });
      }

      sessionLatitude = latitude;
      sessionLongitude = longitude;
    }

    /* =========================================================
       NORMAL LOGIN (INSIDE AREA OR GEO DISABLED)
    ========================================================== */

    const [logResult] = await db.query(
      `INSERT INTO user_session_logs
       (user_id, login_time, latitude, longitude, login_remark)
       VALUES (?, NOW(), ?, ?, ?)`,
      [
        user.users_id,
        sessionLatitude,
        sessionLongitude,
        user.geo_fencing_status === 'active'
          ? 'Login successful'
          : 'Login successful (Geo fencing disabled)',
      ],
    );

    const sessionLogId = logResult.insertId;

    /* ================= SESSION TIME ================= */
    let sessionMinutes = 15;

    if (user.log_session_time) {
      const [hrs, mins] = user.log_session_time.split(':').map(Number);
      sessionMinutes = hrs * 60 + mins;
    }

    /* ================= JWT ================= */
    const token = jwt.sign(
      {
        userId: user.users_id,
        sessionLogId: sessionLogId,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: `${sessionMinutes}m`,
      },
    );

    /* ================= RESPONSE ================= */
    res.json({
      success: true,
      user: {
        userId: user.users_id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        log_session_time: user.log_session_time,
        geo_fencing_status: user.geo_fencing_status,
      },
      token,
    });

    console.log('✅ Login success:', user.username);
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const signup = async (req, res) => {
  const conn = await db.getConnection();

  try {
    /* ================= HELPER ================= */
    const minutesToTime = (minutes) => {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(
        2,
        '0',
      )}:00`;
    };

    const {
      name,
      role_id,
      email,
      username,
      password,
      address,
      mobile,
      wallet_amount,
      services = [],
      login_time,
      logout_time,
      log_session_time,
      latitude,
      longitude,
      allowed_radius,
    } = req.body;

    if (!name || !role_id || !email || !username || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res
        .status(400)
        .json({ message: 'At least one service is required' });
    }

    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT users_id FROM users WHERE email = ? OR username = ?',
      [email, username],
    );

    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'User already exists' });
    }

 
    const hashedPassword = await bcrypt.hash(password, 10);

    const DEFAULT_SESSION_MINUTES = 15;
    const sessionMinutes =
      log_session_time !== undefined &&
      log_session_time !== null &&
      log_session_time !== ''
        ? parseInt(log_session_time)
        : DEFAULT_SESSION_MINUTES;

    const sessionTime = minutesToTime(sessionMinutes);

   
    let lat = latitude;
    let lng = longitude;

    if (
      typeof latitude === 'string' &&
      latitude.includes(',') &&
      (longitude === undefined || longitude === null || longitude === '')
    ) {
      const parts = latitude.split(',').map((v) => v.trim());
      lat = parts[0];
      lng = parts[1];
    }
    lat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null;
    lng = lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null;


    if (
      (lat !== null && Number.isNaN(lat)) ||
      (lng !== null && Number.isNaN(lng))
    ) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Invalid latitude / longitude format',
      });
    }

    if (
      (lat !== null && (lat < -90 || lat > 90)) ||
      (lng !== null && (lng < -180 || lng > 180))
    ) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Invalid latitude or longitude range',
      });
    }

    const [userResult] = await conn.query(
      `INSERT INTO users
       (
         name,
         role_id,
         email,
         contact_number,
         username,
         password,
         address,
         wallet_amount,
         login_time,
         logout_time,
         log_session_time,
         latitude,
         longitude,
         allowed_radius
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        role_id,
        email,
        mobile || null,
        username,
        hashedPassword,
        address || null,
        wallet_amount || 0,
        login_time || null,
        logout_time || null,
        sessionTime,
        lat,
        lng,
        allowed_radius || 300,
      ],
    );

    const users_id = userResult.insertId;

    /* ================= INSERT SERVICES ================= */
    const serviceValues = services.map((s) => [
      users_id,
      s.mas_ser_id,
      s.credits,
      'active',
      null,
    ]);

    await conn.query(
      `INSERT INTO user_services
       (users_id, mas_ser_id, actual_credits, status, updated_by)
       VALUES ?`,
      [serviceValues],
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      users_id,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};


export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId; // from JWT
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        message: 'New password is required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      });
    }

    // 🔐 Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 💾 Update password
    const [result] = await db.query(
      'UPDATE users SET password = ? WHERE users_id = ?',
      [hashedPassword, userId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateUserController = async (req, res) => {
  try {
    const {
      users_id,
      name,
      username,
      email,
      mobile,
      address,
      login_time,
      logout_time,
      log_session_time,
      latitude,
      longitude,
      new_password,
    } = req.body;

    if (!users_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    /* ================= LAT / LNG VALIDATION ================= */
    const lat =
      latitude !== undefined && latitude !== null && latitude !== ''
        ? Number(latitude)
        : null;

    const lng =
      longitude !== undefined && longitude !== null && longitude !== ''
        ? Number(longitude)
        : null;

    if (lat === null || lng === null) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude range',
      });
    }

    /* ================= BASE UPDATE FIELDS ================= */
    let updateFields = `
      name = ?,
      username = ?,
      email = ?,
      contact_number = ?,
      address = ?,
      login_time = ?,
      logout_time = ?,
      log_session_time = ?,
      latitude = ?,
      longitude = ?
    `;

    const values = [
      name,
      username,
      email,
      mobile || null,
      address || null,
      login_time || null,
      logout_time || null,
      log_session_time || null,
      lat, // ✅ validated latitude
      lng, // ✅ validated longitude
    ];

    /* ================= OPTIONAL PASSWORD RESET ================= */
    if (new_password && new_password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(new_password, 10);
      updateFields += `, password = ?`;
      values.push(hashedPassword);
    }

    values.push(users_id);

    const sql = `
      UPDATE users
      SET ${updateFields}
      WHERE users_id = ?
    `;

    await db.query(sql, values);

    return res.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('❌ Update User Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
    });
  }
};

export const manualLogout = async (req, res) => {
  try {
    // console.log('Decoded user:', req.user);

    const sessionLogId = req.user.sessionLogId;
    const { reason } = req.body;

    const remark = reason || 'Manual logout';

    if (!sessionLogId) {
      return res.status(400).json({ message: 'Session not found' });
    }

    const [result] = await db.query(
      `UPDATE user_session_logs
       SET logout_time = NOW(),
           remark = ?
       WHERE u_log_id = ?
       AND logout_time IS NULL`,
      [remark, sessionLogId],
    );

    // console.log('Update result:', result);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};


export const getUserSessionLogs = async (req, res) => {
  try {
    const { userId: loggedInUserId, role } = req.user;
    const { userId } = req.params;   // clicked user id
    const { from_date, to_date } = req.query;

    // If normal user → override with their own id
    const targetUserId =
      role.toLowerCase() === "admin"
        ? userId || loggedInUserId
        : loggedInUserId;

    /* ================= DATE FILTER ================= */
    let dateCondition = "";
    let params = [targetUserId];

    if (from_date && to_date) {
      dateCondition = `AND usl.login_time BETWEEN ? AND ?`;
      params.push(`${from_date} 00:00:00`, `${to_date} 23:59:59`);
    } else if (from_date) {
      dateCondition = `AND usl.login_time >= ?`;
      params.push(`${from_date} 00:00:00`);
    } else if (to_date) {
      dateCondition = `AND usl.login_time <= ?`;
      params.push(`${to_date} 23:59:59`);
    }

    const [rows] = await db.query(
      `
      SELECT 
        usl.u_log_id,
        usl.user_id,
        u.name,
        u.username,
        u.email,
        ur.role,
        usl.login_time,
        usl.logout_time,
        usl.latitude,
        usl.longitude,
        usl.login_remark,
        usl.remark,
        usl.created_at
      FROM user_session_logs usl
      JOIN users u ON u.users_id = usl.user_id
      JOIN userrole ur ON ur.ur_id = u.role_id
      WHERE usl.user_id = ?
      ${dateCondition}
      ORDER BY usl.login_time DESC
      `,
      params
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Get session logs error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};