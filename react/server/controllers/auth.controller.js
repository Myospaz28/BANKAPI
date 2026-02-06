import db from "../database/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


// export const login = async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     if (!username || !password) {
//       return res.status(400).json({ message: "Username and password are required" });
//     }

//     const [rows] = await db.query(
//       `SELECT u.users_id, u.name, u.username, u.email, u.password, r.role
//        FROM users u
//        JOIN userrole r ON r.ur_id = u.role_id
//        WHERE u.username = ?
//          AND u.status = 'active'`,
//       [username]
//     );

//     if (!rows.length) {
//       return res.status(401).json({ message: "Invalid username or password" });
//     }

//     const user = rows[0];

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid username or password" });
//     }

//     // ✅ Store everything you need in JWT
//     const token = jwt.sign(
//       {
//         userId: user.users_id,
//         name: user.name,
//         username: user.username,
//         role: user.role,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({
//       success: true,
//       user: {
//         userId: user.users_id,
//         name: user.name,
//         username: user.username,
//         email: user.email,
//         role: user.role,
//       },
//       token,
//     });
//     console.log("user", user)

//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };



export const login1 = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const [rows] = await db.query(
      `
      SELECT 
        u.users_id,
        u.name,
        u.username,
        u.email,
        u.password,
        u.contact_number,
        u.address,
        u.wallet_amount,
        u.status,
        u.created_at,
        u.updated_at,
        r.role
      FROM users u
      JOIN userrole r ON r.ur_id = u.role_id
      WHERE u.username = ?
        AND u.status = 'active'
      `,
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = rows[0];

    // 🔐 Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // ✅ JWT → only minimal, non-sensitive data
    const token = jwt.sign(
      {
        userId: user.users_id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Frontend-safe user object
    res.json({
      success: true,
      user: {
        userId: user.users_id,
        name: user.name,
        username: user.username,
        email: user.email,
        contact_number: user.contact_number,
        address: user.address,
        wallet_amount: user.wallet_amount,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        role: user.role,
      },
      token,
    });
     console.log("user", user)

    console.log("✅ User logged in:", user.username);
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required',
      });
    }

    const [rows] = await db.query(
      `SELECT 
         u.users_id,
         u.name,
         u.username,
         u.email,
         u.password,
         u.log_session_time,
         r.role
         
       FROM users u
       JOIN userrole r ON r.ur_id = u.role_id
       WHERE u.username = ?
         AND u.status = 'active'`,
      [username],
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    /* ================= SESSION TIME ================= */
    let sessionMinutes = 15; // default

    if (user.log_session_time) {
      const [hrs, mins] = user.log_session_time.split(':').map(Number);
      sessionMinutes = hrs * 60 + mins;
    }

    /* ================= JWT ================= */
    const token = jwt.sign(
      {
        userId: user.users_id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: `${sessionMinutes}m`,
      },
    );

    res.json({
      success: true,
      user: {
        userId: user.users_id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        log_session_time: user.log_session_time,
      },
      token,
    });
    console.log("user", user)
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const signup1 = async (req, res) => {
  const conn = await db.getConnection();

  try {
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
    } = req.body;

    const updated_by = req.session?.user?.id || null;

    /* ================= VALIDATION ================= */
    if (!name || !role_id || !email || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one service is required" });
    }

    /* ================= TRANSACTION START ================= */
    await conn.beginTransaction();

    /* ================= CHECK DUPLICATE ================= */
    const [existing] = await conn.query(
      "SELECT users_id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ message: "User already exists" });
    }

    /* ================= HASH PASSWORD ================= */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ================= INSERT USER ================= */
    const [userResult] = await conn.query(
      `INSERT INTO users
       (name, role_id, email, contact_number, username, password, address, wallet_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        role_id,
        email,
        mobile || null,
        username,
        hashedPassword,
        address || null,
        wallet_amount || 0,
      ]
    );

    const users_id = userResult.insertId;

    /* ================= INSERT USER SERVICES ================= */
    const serviceValues = services.map((s) => [
      users_id,
      s.mas_ser_id,
      s.credits,
      "active",
      updated_by,
    ]);

    await conn.query(
      `INSERT INTO user_services
       (users_id, mas_ser_id, actual_credits, status, updated_by)
       VALUES ?`,
      [serviceValues]
    );

    /* ================= COMMIT ================= */
    await conn.commit();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      users_id,
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

export const signup2 = async (req, res) => {
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

      // NEW FIELDS
      login_time,
      logout_time,
      log_session_time, // minutes
      latitude,
      longitude,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!name || !role_id || !email || !username || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res
        .status(400)
        .json({ message: 'At least one service is required' });
    }

    await conn.beginTransaction();

    /* ================= CHECK DUPLICATE ================= */
    const [existing] = await conn.query(
      'SELECT users_id FROM users WHERE email = ? OR username = ?',
      [email, username],
    );

    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'User already exists' });
    }

    /* ================= PASSWORD ================= */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ================= SESSION TIME ================= */
    const DEFAULT_SESSION_MINUTES = 15;
    const sessionMinutes =
      log_session_time !== undefined &&
      log_session_time !== null &&
      log_session_time !== ''
        ? parseInt(log_session_time)
        : DEFAULT_SESSION_MINUTES;

    const sessionTime = minutesToTime(sessionMinutes);

    /* ================= INSERT USER ================= */
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
         longitude
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        latitude || null,
        longitude || null,
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

      // NEW FIELDS
      login_time,
      logout_time,
      log_session_time, // minutes
      latitude,
      longitude,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!name || !role_id || !email || !username || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res
        .status(400)
        .json({ message: 'At least one service is required' });
    }

    await conn.beginTransaction();

    /* ================= CHECK DUPLICATE ================= */
    const [existing] = await conn.query(
      'SELECT users_id FROM users WHERE email = ? OR username = ?',
      [email, username],
    );

    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'User already exists' });
    }

    /* ================= PASSWORD ================= */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ================= SESSION TIME ================= */
    const DEFAULT_SESSION_MINUTES = 15;
    const sessionMinutes =
      log_session_time !== undefined &&
      log_session_time !== null &&
      log_session_time !== ''
        ? parseInt(log_session_time)
        : DEFAULT_SESSION_MINUTES;

    const sessionTime = minutesToTime(sessionMinutes);

    /* ================= INSERT USER ================= */
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
         longitude
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        latitude || null,
        longitude || null,
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
        message: "New password is required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // 🔐 Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 💾 Update password
    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE users_id = ?",
      [hashedPassword, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
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

    // ================= BASE UPDATE FIELDS =================
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
      mobile,
      address,
      login_time || null,
      logout_time || null,
      log_session_time || null,
      latitude || null,
      longitude || null,
    ];

    // ================= OPTIONAL PASSWORD RESET =================
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