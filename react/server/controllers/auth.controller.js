import db from "../database/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1️⃣ Validate input
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // 2️⃣ Fetch user by username
  const [rows] = await db.query(
  `SELECT u.*, r.role
   FROM users u
   JOIN userrole r ON r.ur_id = u.role_id
   WHERE u.username = ?
     AND u.status = 'active'`,
  [username]
);


    if (!rows.length) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = rows[0];

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      {
        userId: user.users_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5️⃣ Send response
    res.json({
      userId: user.users_id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      token,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const signup1 = async (req, res) => {
  try {
    const {
      name,
      role_id,
      email,
      username,
      password,
      address
    } = req.body;

    // 1️⃣ Check required fields
    if (!name || !role_id || !email || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 2️⃣ Check if user already exists
    const [existing] = await db.query(
      "SELECT users_id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existing.length) {
      return res.status(409).json({ message: "User already exists" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Insert user
    await db.query(
      `INSERT INTO users 
       (name, role_id, email, username, password, address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, role_id, email, username, hashedPassword, address]
    );

    res.status(201).json({
      message: "User registered successfully ✅"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};




export const signup = async (req, res) => {
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
