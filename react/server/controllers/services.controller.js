import axios from "axios";
import db from "../database/db.js";


export const getActiveMasterServicesByCategory = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        mc.mas_cat_id,
        mc.category_name,
        mc.status AS category_status,

        ms.mas_ser_id,
        ms.service_name,
        ms.default_credits,
        ms.status AS service_status
      FROM master_category mc
      LEFT JOIN master_services ms 
        ON mc.mas_cat_id = ms.mas_cat_id
        AND ms.status = 'active'
      WHERE mc.status = 'active'
      ORDER BY mc.mas_cat_id, ms.mas_ser_id
      `
    );

    // 🧠 Transform flat rows → grouped object
    const result = [];
    const categoryMap = {};

    for (const row of rows) {
      if (!categoryMap[row.mas_cat_id]) {
        categoryMap[row.mas_cat_id] = {
          mas_cat_id: row.mas_cat_id,
          category_name: row.category_name,
          status: row.category_status,
          services: [],
        };
        result.push(categoryMap[row.mas_cat_id]);
      }

      // Push service ONLY if active service exists
      if (row.mas_ser_id) {
        categoryMap[row.mas_cat_id].services.push({
          mas_ser_id: row.mas_ser_id,
          service_name: row.service_name,
          default_credits: row.default_credits,
          status: row.service_status,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error fetching active master services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active master services",
    });
  }
};


export const getAllUserRoles = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        ur_id,
        role,
        created_at,
        updated_at
      FROM userrole
      ORDER BY ur_id
      `
    );

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Error fetching user roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user roles",
    });
  }
};



export const getUsersController1 = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        u.users_id,
        u.name,
        u.username,
        u.email,
        u.contact_number,
        u.address,
        u.wallet_amount,
        u.status,
        u.created_at,
        u.login_time,
        u.logout_time,
        u.log_session_time,
        u.latitude,
        u.longitude,

        r.role AS role_name
      FROM users u
      JOIN userrole r ON r.ur_id = u.role_id
      WHERE u.status = 'active'
      ORDER BY u.users_id DESC`
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export const getUsersController = async (req, res) => {
  try {
    const { role, userId } = req.user; // ✅ FIX HERE

    console.log("User Info:", req.user);

    let query = `
      SELECT 
        u.users_id,
        u.name,
        u.username,
        u.email,
        u.contact_number,
        u.address,
        u.wallet_amount,
        u.status,
        u.created_at,
        u.login_time,
        u.logout_time,
        u.log_session_time,
        u.latitude,
        u.longitude,
        u.geo_fencing_status,
        r.role AS role_name
      FROM users u
      JOIN userrole r ON r.ur_id = u.role_id
   
    `;

    const params = [];

    // 🔐 ROLE BASED CONDITION
    if (role === "bank") {
      query += " AND u.users_id = ?";
      params.push(userId); // ✅ FIX HERE
    }

    query += " ORDER BY u.users_id DESC";

    const [rows] = await db.query(query, params);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};
export const toggleGeoFencingStatus = async (req, res) => {
  try {
    const { user_id, geo_fencing_status } = req.body;

    if (!user_id || !geo_fencing_status) {
      return res.status(400).json({
        message: "User ID and geo fencing status required",
      });
    }

    await db.query(
      `UPDATE users
       SET geo_fencing_status = ?
       WHERE users_id = ?`,
      [geo_fencing_status, user_id]
    );

    res.json({
      success: true,
      message: "Geo fencing status updated successfully",
    });
  } catch (err) {
    console.error("Geo toggle error:", err);
    res.status(500).json({
      message: "Failed to update geo fencing status",
    });
  }
};
export const getUserByIdController = async (req, res) => {
  try {
    const { role, userId } = req.user; // session user
    const { id } = req.params; // user to fetch

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    let query = `
      SELECT 
        u.users_id,
        u.name,
        u.username,
        u.email,
        u.contact_number,
        u.address,
        u.wallet_amount,
        u.status,
        u.created_at,
        u.login_time,
        u.logout_time,
        u.log_session_time,
        u.latitude,
        u.longitude,
        r.role AS role_name
      FROM users u
      JOIN userrole r ON r.ur_id = u.role_id
      WHERE u.users_id = ?
    `;

    const params = [id];

    /* ================= ROLE-BASED ACCESS ================= */

    if (role === "bank") {
      // Bank can only fetch its own record
      if (Number(id) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0], // single user
    });

  } catch (error) {
    console.error("❌ getUserById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};
export const toggleUserStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { user_id } = req.body;
    const { userId: loggedInUserId, role } = req.user;

    /* ================= ADMIN CHECK ================= */
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can change user status",
      });
    }

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    await connection.beginTransaction();

    /* ================= FETCH USER ================= */
    const [rows] = await connection.query(
      `SELECT users_id, status 
       FROM users 
       WHERE users_id = ?
       FOR UPDATE`,
      [user_id]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = rows[0];

    /* ================= PREVENT SELF DEACTIVATION ================= */
    if (Number(user.users_id) === Number(loggedInUserId)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "You cannot change your own status",
      });
    }

    /* ================= TOGGLE STATUS ================= */
    const newStatus =
      user.status === "active" ? "inactive" : "active";

    await connection.query(
      `UPDATE users
       SET status = ?,
           updated_at = NOW()
       WHERE users_id = ?`,
      [newStatus, user_id]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: `User marked as ${newStatus}`,
      data: {
        user_id,
        old_status: user.status,
        new_status: newStatus,
      },
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ toggleUserStatus error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  } finally {
    connection.release();
  }
};


export const getUserServicesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        us.usr_ser_id,
        us.users_id,
        us.mas_ser_id,
        us.actual_credits,
        us.status AS user_service_status,
        us.created_at,

        ms.service_name,
        ms.default_credits,
        ms.status AS master_service_status,

        mc.mas_cat_id,
        mc.category_name

      FROM user_services us
      INNER JOIN master_services ms 
        ON ms.mas_ser_id = us.mas_ser_id
      INNER JOIN master_category mc 
        ON mc.mas_cat_id = ms.mas_cat_id

      WHERE us.users_id = ?
        AND us.status = 'active'
        AND ms.status = 'active'
        AND mc.status = 'active'

      ORDER BY mc.mas_cat_id, ms.mas_ser_id
      `,
      [userId]
    );

    /* ================= FORMAT RESPONSE ================= */
    const grouped = {};

    rows.forEach((row) => {
      if (!grouped[row.mas_cat_id]) {
        grouped[row.mas_cat_id] = {
          mas_cat_id: row.mas_cat_id,
          category_name: row.category_name,
          services: [],
        };
      }

      grouped[row.mas_cat_id].services.push({
        usr_ser_id: row.usr_ser_id,
        mas_ser_id: row.mas_ser_id,
        service_name: row.service_name,
        default_credits: row.default_credits,
        actual_credits: row.actual_credits,
        status: row.user_service_status,
        created_at: row.created_at,
      });
    });

    res.status(200).json({
      success: true,
      data: Object.values(grouped),
    });
  } catch (error) {
    console.error("❌ getUserServicesByUserId error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const getAvailableMasterServicesByCategoryForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        mc.mas_cat_id,
        mc.category_name,

        ms.mas_ser_id,
        ms.service_name,
        ms.default_credits,
        ms.status AS master_service_status,

        us.usr_ser_id,
        us.status AS user_service_status

      FROM master_category mc
      INNER JOIN master_services ms 
        ON ms.mas_cat_id = mc.mas_cat_id

      LEFT JOIN user_services us 
        ON us.mas_ser_id = ms.mas_ser_id
       AND us.users_id = ?

      WHERE mc.status = 'active'
        AND ms.status = 'active'
        AND (
          us.mas_ser_id IS NULL
          OR us.status = 'inactive'
        )

      ORDER BY mc.mas_cat_id, ms.mas_ser_id
      `,
      [userId]
    );

    /* ================= GROUP BY CATEGORY ================= */
    const grouped = {};

    rows.forEach((row) => {
      if (!grouped[row.mas_cat_id]) {
        grouped[row.mas_cat_id] = {
          mas_cat_id: row.mas_cat_id,
          category_name: row.category_name,
          services: [],
        };
      }

      grouped[row.mas_cat_id].services.push({
        mas_ser_id: row.mas_ser_id,
        service_name: row.service_name,
        default_credits: row.default_credits,
        already_assigned: !!row.usr_ser_id, // true if inactive in user_services
        user_service_status: row.user_service_status || null,
      });
    });

    res.status(200).json({
      success: true,
      data: Object.values(grouped),
    });
  } catch (error) {
    console.error("❌ getAvailableMasterServicesByCategoryForUser error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const updateUserServiceCredits = async (req, res) => {
  try {
    const { usr_ser_id, actual_credits } = req.body;
    const updatedBy = req.user?.userId

    if (!usr_ser_id || actual_credits === undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (!updatedBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [result] = await db.query(
      `UPDATE user_services
       SET actual_credits = ?, updated_by = ?
       WHERE usr_ser_id = ? AND status = 'active'`,
      [actual_credits, updatedBy, usr_ser_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Active service not found",
      });
    }

    res.json({
      success: true,
      message: "Credits updated successfully",
    });
  } catch (error) {
    console.error("❌ updateUserServiceCredits error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const deactivateUserService = async (req, res) => {
  try {
    const { usr_ser_id } = req.params;
    const updatedBy = req.user?.userId;

    if (!usr_ser_id) {
      return res.status(400).json({
        success: false,
        message: "User service ID is required",
      });
    }

    if (!updatedBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [result] = await db.query(
      `UPDATE user_services
       SET status = 'inactive',
           updated_by = ?
       WHERE usr_ser_id = ?
         AND status = 'active'`,
      [updatedBy, usr_ser_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Active service not found or already inactive",
      });
    }

    res.json({
      success: true,
      message: "Service deactivated successfully",
    });
  } catch (error) {
    console.error("❌ deactivateUserService error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const addUserServicesBulk1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { user_id, services } = req.body;
    const updatedBy = req.user?.userId;

    if (!user_id || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (!updatedBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await connection.beginTransaction();

    for (const service of services) {
      const { mas_ser_id, actual_credits } = service;

      if (!mas_ser_id || actual_credits === undefined) continue;

      // 🔍 Check if service already exists for user
      const [existing] = await connection.query(
        `SELECT usr_ser_id, status
         FROM user_services
         WHERE users_id = ? AND mas_ser_id = ?`,
        [user_id, mas_ser_id]
      );

      if (existing.length === 0) {
        // ✅ INSERT new service
        await connection.query(
          `INSERT INTO user_services
           (users_id, mas_ser_id, actual_credits, status, created_at, updated_by)
           VALUES (?, ?, ?, 'active', NOW(), ?)`,
          [user_id, mas_ser_id, actual_credits, updatedBy]
        );
      } else {
        const record = existing[0];

        if (record.status === "inactive") {
          // ♻️ RE-ACTIVATE service
          await connection.query(
            `UPDATE user_services
             SET actual_credits = ?,
                 status = 'active',
                 updated_by = ?,
                 updated_at = NOW()
             WHERE usr_ser_id = ?`,
            [actual_credits, updatedBy, record.usr_ser_id]
          );
        }
        // ✅ If already active → do nothing (no duplicates)
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Services added successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ addUserServicesBulk error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    connection.release();
  }
};
export const addUserServicesBulk = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { user_id, services } = req.body;
    const sessionUser = req.user; // from JWT middleware

    /* ================= ROLE VALIDATION ================= */

    if (!sessionUser || sessionUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const updatedBy = sessionUser.userId;

    /* ================= INPUT VALIDATION ================= */

    if (!user_id || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    await connection.beginTransaction();

    /* ================= PROCESS SERVICES ================= */

    for (const service of services) {
      const { mas_ser_id, actual_credits } = service;

      if (!mas_ser_id || actual_credits === undefined) continue;

      // 🔍 Check if service already exists
      const [existing] = await connection.query(
        `SELECT usr_ser_id, status
         FROM user_services
         WHERE users_id = ? AND mas_ser_id = ?`,
        [user_id, mas_ser_id]
      );

      if (existing.length === 0) {
        // ✅ INSERT new service
        await connection.query(
          `INSERT INTO user_services
           (users_id, mas_ser_id, actual_credits, status, created_at, updated_by)
           VALUES (?, ?, ?, 'active', NOW(), ?)`,
          [user_id, mas_ser_id, actual_credits, updatedBy]
        );
      } else {
        const record = existing[0];

        if (record.status === "inactive") {
          // ♻️ RE-ACTIVATE service
          await connection.query(
            `UPDATE user_services
             SET actual_credits = ?,
                 status = 'active',
                 updated_by = ?,
                 updated_at = NOW()
             WHERE usr_ser_id = ?`,
            [actual_credits, updatedBy, record.usr_ser_id]
          );
        }
        // If already active → do nothing
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Services updated successfully",
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ addUserServicesBulk error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    connection.release();
  }
};



export const getUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT users_id, wallet_amount
       FROM users
       WHERE users_id = ? AND status = 'active'`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        users_id: rows[0].users_id,
        wallet_amount: Number(rows[0].wallet_amount),
      },
    });
  } catch (error) {
    console.error("❌ getUserWallet error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const addUserWalletAmount1 = async (req, res) => {
  try {
    const { user_id, amount } = req.body;
    const updatedBy = req.user?.userId;

    if (!user_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (!updatedBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [result] = await db.query(
      `UPDATE users
       SET wallet_amount = wallet_amount + ?,
           updated_at = NOW()
       WHERE users_id = ? AND status = 'active'`,
      [amount, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    res.json({
      success: true,
      message: "Wallet amount added successfully",
    });
  } catch (error) {
    console.error("❌ addUserWalletAmount error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const addUserWalletAmount = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { user_id, amount } = req.body;
    const createdBy = req.user?.userId;

    if (!user_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await connection.beginTransaction();

    // 🔹 1. Get current wallet balance
    const [userRows] = await connection.query(
      `SELECT wallet_amount 
       FROM users 
       WHERE users_id = ? AND status = 'active'
       FOR UPDATE`,
      [user_id]
    );

    if (!userRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const openingBalance = Number(userRows[0].wallet_amount);
    const creditAmount = Number(amount);
    const closingBalance = openingBalance + creditAmount;

    // 🔹 2. Update user wallet
    await connection.query(
      `UPDATE users
       SET wallet_amount = ?,
           updated_at = NOW()
       WHERE users_id = ?`,
      [closingBalance, user_id]
    );

    // 🔹 3. Insert wallet transaction
    await connection.query(
      `INSERT INTO wallet_transactions (
        users_id,
        transaction_type,
        amount,
        opening_balance,
        closing_balance,
        reference_type,
        reference_id,
        remarks,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        'credit',
        creditAmount,
        openingBalance,
        closingBalance,
        'admin_deposit',
        null,
        null,
        createdBy,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Wallet amount added successfully",
      data: {
        opening_balance: openingBalance,
        credited_amount: creditAmount,
        closing_balance: closingBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ addUserWalletAmount error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    connection.release();
  }
};
export const updateUserWalletAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { user_id, amount, type } = req.body;

    const sessionUser = req.user; // from JWT middleware

    /* ================= ROLE VALIDATION ================= */

    if (!sessionUser || sessionUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const createdBy = sessionUser.userId;

    /* ================= INPUT VALIDATION ================= */

    if (!user_id || !amount || Number(amount) <= 0 || !type) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    await connection.beginTransaction();

    /* ================= GET CURRENT BALANCE ================= */

    const [userRows] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ? AND status = 'active'
       FOR UPDATE`,
      [user_id]
    );

    if (!userRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const openingBalance = Number(userRows[0].wallet_amount);
    const txnAmount = Number(amount);

    let closingBalance;

    /* ================= CREDIT / DEBIT LOGIC ================= */

    if (type === "credit") {
      closingBalance = openingBalance + txnAmount;
    } else {
      if (openingBalance < txnAmount) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }
      closingBalance = openingBalance - txnAmount;
    }

    /* ================= UPDATE WALLET ================= */

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?,
           updated_at = NOW()
       WHERE users_id = ?`,
      [closingBalance, user_id]
    );

    /* ================= INSERT TRANSACTION ================= */

    await connection.query(
      `INSERT INTO wallet_transactions (
        users_id,
        transaction_type,
        amount,
        opening_balance,
        closing_balance,
        reference_type,
        reference_id,
        remarks,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        type,
        txnAmount,
        openingBalance,
        closingBalance,
        type === "credit"
          ? "admin_deposit"
          : "admin_deduction",
        null,
        null,
        createdBy,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      message:
        type === "credit"
          ? "Wallet credited successfully"
          : "Wallet deducted successfully",
      data: {
        opening_balance: openingBalance,
        transaction_amount: txnAmount,
        closing_balance: closingBalance,
      },
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ updateUserWalletAmount error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    connection.release();
  }
};



export const getUserActiveCategories = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [rows] = await db.query(
      `
      SELECT DISTINCT
        mc.mas_cat_id,
        mc.category_name,
        mc.order_no
      FROM user_services us
      INNER JOIN master_services ms 
        ON ms.mas_ser_id = us.mas_ser_id
      INNER JOIN master_category mc
        ON mc.mas_cat_id = ms.mas_cat_id
      WHERE us.users_id = ?
        AND us.status = 'active'
        AND ms.status = 'active'
        AND mc.status = 'active'
      ORDER BY mc.order_no ASC
      `,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (error) {
    console.error("❌ getUserActiveCategories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




export const getLoggedInUserWallet = async (req, res) => {
  try {
    // 🔐 userId from JWT
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [rows] = await db.query(
      `SELECT 
         users_id,
         wallet_amount
       FROM users
       WHERE users_id = ?
         AND status = 'active'`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user_id: rows[0].users_id,
        wallet_amount: rows[0].wallet_amount,
      },
    });
  } catch (error) {
    console.error("❌ getUserWallet error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const getUserActiveServicesByCategory1 = async (req, res) => {
  try {
    const { mas_cat_id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mas_cat_id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    /* ================= CATEGORY ================= */
    const [categoryRows] = await db.query(
      `SELECT mas_cat_id, category_name
       FROM master_category
       WHERE mas_cat_id = ?
         AND status = 'active'`,
      [mas_cat_id]
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found or inactive",
      });
    }

    /* ================= SERVICES ================= */
    const [services] = await db.query(
      `SELECT 
         us.usr_ser_id,
         us.mas_ser_id,
         ms.service_name,
         ms.route_path,
         us.actual_credits,
         us.status
       FROM user_services us
       INNER JOIN master_services ms 
         ON ms.mas_ser_id = us.mas_ser_id
       WHERE us.users_id = ?
         AND ms.mas_cat_id = ?
         AND us.status = 'active'
         AND ms.status = 'active'
       ORDER BY ms.service_name ASC`,
      [userId, mas_cat_id]
    );

    return res.json({
      success: true,
      data: {
        category: categoryRows[0],
        services,
      },
    });
  } catch (error) {
    console.error("❌ getUserActiveServicesByCategory error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const getUserActiveServicesByCategory = async (req, res) => {
  try {
    const { mas_cat_id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mas_cat_id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    /* ================= CATEGORY ================= */
    const [categoryRows] = await db.query(
      `
      SELECT mas_cat_id, category_name
      FROM master_category
      WHERE mas_cat_id = ?
        AND status = 'active'
      `,
      [mas_cat_id],
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found or inactive",
      });
    }

    /* ================= SERVICES ================= */
    const [services] = await db.query(
      `
      SELECT 
        us.usr_ser_id,
        us.mas_ser_id,
        ms.service_name,
        ms.route_path,          -- ✅ REQUIRED FOR REDIRECT
        us.actual_credits,
        us.status,
        ms.sample               -- ✅ SAMPLE JSON / STRING
      FROM user_services us
      INNER JOIN master_services ms 
        ON ms.mas_ser_id = us.mas_ser_id
      WHERE us.users_id = ?
        AND ms.mas_cat_id = ?
        AND us.status = 'active'
        AND ms.status = 'active'
      ORDER BY ms.service_name ASC
      `,
      [userId, mas_cat_id],
    );

    return res.json({
      success: true,
      data: {
        category: categoryRows[0],
        services,
      },
    });
  } catch (error) {
    console.error("❌ getUserActiveServicesByCategory error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const getUserWalletCreditHistory1 = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        wt.wt_id,
        wt.transaction_type,
        wt.amount,
        wt.opening_balance,
        wt.closing_balance,
        wt.reference_type,
        wt.remarks,
        wt.created_at,
        u.name AS created_by_name
      FROM wallet_transactions wt
      INNER JOIN users u ON u.users_id = wt.created_by
      WHERE wt.users_id = ?
        AND wt.transaction_type = 'credit'
      ORDER BY wt.created_at DESC
      `,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("❌ getUserWalletCreditHistory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet transactions",
    });
  }
};
export const getUserWalletCreditHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const query = `
      SELECT 
        wt.wt_id,
        wt.transaction_type,
        wt.amount,
        wt.opening_balance,
        wt.closing_balance,
        wt.reference_type,
        wt.remarks,
        wt.created_at,
        u.name AS created_by_name
      FROM wallet_transactions wt
      INNER JOIN users u ON u.users_id = wt.created_by
      WHERE wt.users_id = ?
        AND wt.reference_type IN ('admin_deposit', 'admin_deduction')
      ORDER BY wt.created_at DESC
    `;

    const [rows] = await db.query(query, [userId]);

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });

  } catch (error) {
    console.error("❌ getUserWalletCreditHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet transactions",
    });
  }
};


export const getUserWalletStatementController1 = async (req, res) => {
  try {
    const { userId } = req.params;
    const { from_date, to_date } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    /* ================= DATE FILTER BUILD ================= */
    let dateCondition = "";
    const params = [userId];

    if (from_date && to_date) {
      dateCondition = `AND DATE(wt.created_at) BETWEEN ? AND ?`;
      params.push(from_date, to_date);
    } else if (from_date) {
      dateCondition = `AND DATE(wt.created_at) >= ?`;
      params.push(from_date);
    } else if (to_date) {
      dateCondition = `AND DATE(wt.created_at) <= ?`;
      params.push(to_date);
    }

    const [rows] = await db.query(
      `
      SELECT
        wt.wt_id,
        wt.created_at            AS transaction_date,
        wt.transaction_type,
        wt.amount,
        wt.opening_balance,
        wt.closing_balance,
        wt.reference_type,
        wt.remarks,

        -- Service usage details
        usl.api_name,
        usl.file_no,
        usl.credits_used,
        usl.api_status,

        -- Service name
        ms.service_name,

        -- Performed by
        u.name                   AS performed_by

      FROM wallet_transactions wt

      LEFT JOIN user_service_logs usl
        ON usl.wallet_transaction_id = wt.wt_id

      LEFT JOIN user_services us
        ON us.usr_ser_id = usl.usr_ser_id

      LEFT JOIN master_services ms
        ON ms.mas_ser_id = us.mas_ser_id

      LEFT JOIN users u
        ON u.users_id = wt.created_by

      WHERE wt.users_id = ?
      ${dateCondition}

      ORDER BY wt.created_at DESC
      `,
      params
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("❌ getUserWalletStatementController error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet statement",
    });
  }
};
export const getUserWalletStatementController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { from_date, to_date } = req.query;

    if (!userId || userId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    /* ================= DATE FILTER ================= */
    let dateCondition = "";
    const params = [userId];

    if (from_date && to_date) {
      dateCondition = `AND wt.created_at BETWEEN ? AND ?`;
      params.push(`${from_date} 00:00:00`, `${to_date} 23:59:59`);
    } else if (from_date) {
      dateCondition = `AND wt.created_at >= ?`;
      params.push(`${from_date} 00:00:00`);
    } else if (to_date) {
      dateCondition = `AND wt.created_at <= ?`;
      params.push(`${to_date} 23:59:59`);
    }

    const [rows] = await db.query(
      `
      SELECT
        wt.wt_id,
        wt.created_at              AS transaction_date,

        -- WALLET INFO (always present)
        wt.transaction_type,
        wt.amount,
        wt.opening_balance,
        wt.closing_balance,

        -- SERVICE USAGE INFO
        usl.api_name,
        usl.file_no,
        usl.credits_used,
        usl.api_status,
        usl.usl_id ,
        usl.input_payload ,

        -- SERVICE NAME (never null now)
        ms.service_name,
        ms.mas_ser_id,

        -- ACTION USER
        u.name                     AS performed_by

      FROM wallet_transactions wt

      INNER JOIN user_service_logs usl
        ON usl.wallet_transaction_id = wt.wt_id

      INNER JOIN user_services us
        ON us.usr_ser_id = usl.usr_ser_id

      INNER JOIN master_services ms
        ON ms.mas_ser_id = us.mas_ser_id

      LEFT JOIN users u
        ON u.users_id = wt.created_by

      WHERE wt.users_id = ?
        AND wt.transaction_type = 'debit'
        ${dateCondition}

      ORDER BY wt.created_at DESC
      `,
      params
    );

    res.json({
      success: true,
      data: rows,
      meta: {
        user_id: userId,
        from_date: from_date || null,
        to_date: to_date || null,
        total_records: rows.length,
      },
    });
  } catch (error) {
    console.error("❌ getUserWalletStatementController error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service usage statement",
    });
  }
};
export const getAllUsersWalletStatementController = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    /* ================= DATE FILTER ================= */
    let dateCondition = "";
    const params = [];

    if (from_date && to_date) {
      dateCondition = `AND wt.created_at BETWEEN ? AND ?`;
      params.push(`${from_date} 00:00:00`, `${to_date} 23:59:59`);
    } else if (from_date) {
      dateCondition = `AND wt.created_at >= ?`;
      params.push(`${from_date} 00:00:00`);
    } else if (to_date) {
      dateCondition = `AND wt.created_at <= ?`;
      params.push(`${to_date} 23:59:59`);
    }

    const [rows] = await db.query(
      `
      SELECT
        wt.wt_id,
        wt.created_at              AS transaction_date,

        -- WALLET INFO
        wt.transaction_type,
        wt.amount,
        wt.opening_balance,
        wt.closing_balance,

        -- WALLET OWNER
        u.users_id,
        u.name                     AS wallet_user_name,
        u.username,
        u.email,

        -- SERVICE USER
        su.users_id                AS service_user_id,
        su.name                    AS service_user_name,

        -- SERVICE USAGE INFO
        usl.api_name,
        usl.file_no,
        usl.credits_used,
        usl.api_status,
        usl.usl_id,
        usl.input_payload,

        -- SERVICE NAME
        ms.service_name,
        ms.mas_ser_id,

        -- ACTION USER
        au.name                    AS performed_by

      FROM wallet_transactions wt

      INNER JOIN user_service_logs usl
        ON usl.wallet_transaction_id = wt.wt_id

      INNER JOIN user_services us
        ON us.usr_ser_id = usl.usr_ser_id

      INNER JOIN master_services ms
        ON ms.mas_ser_id = us.mas_ser_id

      LEFT JOIN users u
        ON u.users_id = wt.users_id

      -- NEW JOIN
      LEFT JOIN users su
        ON su.users_id = usl.users_id

      LEFT JOIN users au
        ON au.users_id = wt.created_by

      WHERE wt.transaction_type = 'debit'
      ${dateCondition}

      ORDER BY wt.created_at DESC
      `,
      params
    );

    res.json({
      success: true,
      data: rows,
      meta: {
        from_date: from_date || null,
        to_date: to_date || null,
        total_records: rows.length,
      },
    });
  } catch (error) {
    console.error("❌ getAllUsersWalletStatementController error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all users service usage statement",
    });
  }
};




export const fetchRcDetailedController1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { usr_ser_id, rc_number, owner_name, consent } = req.body;

    if (!usr_ser_id || !rc_number || !consent) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    /* ================= VALIDATE SERVICE ================= */
    const [[service]] = await db.query(
      `SELECT actual_credits 
       FROM user_services 
       WHERE usr_ser_id = ? 
         AND users_id = ? 
         AND status = 'active'`,
      [usr_ser_id, userId]
    );

    if (!service) {
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    /* ================= CHECK WALLET ================= */
    const [[user]] = await db.query(
      `SELECT wallet_amount FROM users WHERE users_id = ?`,
      [userId]
    );

    if (Number(user.wallet_amount) < service.actual_credits) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= CALL GRIDLINES ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-detailed",
      // "https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154724/rc-api/fetch-detailed",
      {
        rc_number,
        owner_name,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    /* ================= DEDUCT CREDITS ================= */
    await db.query(
      `UPDATE users 
       SET wallet_amount = wallet_amount - ? 
       WHERE users_id = ?`,
      [service.actual_credits, userId]
    );

    res.json({
      success: true,
      data: apiRes.data,
    });
  } catch (error) {
    console.error("❌ RC Detailed Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC fetch failed",
    });
  }
};
export const fetchRcDetailedController2 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, rc_number, owner_name, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !rc_number || !consent) {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-detailed",
      {
        rc_number,
        owner_name,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
        reference_id,
        remarks,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'debit',
        creditsUsed,
        openingBalance,
        closingBalance,
        'service_usage',
        null,
        null,
        userId,
      ]
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs (
        users_id,
        usr_ser_id,
        mas_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        null,          // mas_ser_id intentionally NULL
        rc_number,
        creditsUsed,
        'RC_DETAILED',
        'success',
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ RC Detailed Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC fetch failed",
    });
  } finally {
    connection.release();
  }
};
export const fetchRcDetailedController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    // 🔹 file_no added
    const { usr_ser_id, rc_number, owner_name, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !rc_number || !owner_name || !file_no || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-detailed",
      {
        rc_number,
        owner_name,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
      [userId, creditsUsed, openingBalance, closingBalance, userId]
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
        file_no, // ✅ FILE NUMBER STORED
        creditsUsed,
        "RC_DETAILED",
        "success",
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ RC Detailed Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC detailed fetch failed",
    });
  } finally {
    connection.release();
  }
};


export const fetchRcLookupByMobileController1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { usr_ser_id, mobile_number, consent } = req.body;

    if (!usr_ser_id || !mobile_number || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    /* ================= VALIDATE SERVICE ================= */
    const [[service]] = await db.query(
      `SELECT actual_credits
       FROM user_services
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'`,
      [usr_ser_id, userId]
    );

    if (!service) {
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    /* ================= CHECK WALLET ================= */
    const [[user]] = await db.query(
      `SELECT wallet_amount FROM users WHERE users_id = ?`,
      [userId]
    );

    if (Number(user.wallet_amount) < service.actual_credits) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/lookup-by-mobile",
      // "https://stoplight.io/mocks/gridlines/gridlines-api-docs/133154724/rc-api/lookup-by-mobile",
      {
        mobile_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
    if (code !== "1000") {
      return res.json({
        success: true,
        data: apiRes.data, // pass raw response
      });
    }

    /* ================= DEDUCT CREDITS ================= */
    await db.query(
      `UPDATE users
       SET wallet_amount = wallet_amount - ?
       WHERE users_id = ?`,
      [service.actual_credits, userId]
    );

    res.json({
      success: true,
      data: apiRes.data,
    });
  } catch (error) {
    console.error("❌ RC Lookup By Mobile Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC lookup by mobile failed",
    });
  }
};
export const fetchRcLookupByMobileController2 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, mobile_number, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !mobile_number || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/lookup-by-mobile",
      {
        mobile_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
        reference_id,
        remarks,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'debit',
        creditsUsed,
        openingBalance,
        closingBalance,
        'service_usage',
        null,
        null,
        userId,
      ]
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs (
        users_id,
        usr_ser_id,
        mas_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        null,                 // mas_ser_id kept NULL
        mobile_number,        // file_no
        creditsUsed,
        'RC_LOOKUP_MOBILE',
        'success',
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ RC Lookup By Mobile Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC lookup by mobile failed",
    });
  } finally {
    connection.release();
  }
};
export const fetchRcLookupByMobileController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    // 🔹 file_no added
    const { usr_ser_id, mobile_number, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !mobile_number || !file_no || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/lookup-by-mobile",
      {
        mobile_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
      [userId, creditsUsed, openingBalance, closingBalance, userId]
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
        file_no, // ✅ FILE NUMBER STORED
        creditsUsed,
        "RC_LOOKUP_MOBILE",
        "success",
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ RC Lookup By Mobile Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC lookup by mobile failed",
    });
  } finally {
    connection.release();
  }
};






export const fetchRcLiteController1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { usr_ser_id, rc_number, owner_name, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !rc_number || !consent) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    /* ================= SERVICE CHECK ================= */
    const [[service]] = await db.query(
      `SELECT actual_credits 
       FROM user_services 
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'`,
      [usr_ser_id, userId]
    );

    if (!service) {
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    /* ================= WALLET CHECK ================= */
    const [[user]] = await db.query(
      `SELECT wallet_amount FROM users WHERE users_id = ?`,
      [userId]
    );

    if (Number(user.wallet_amount) < service.actual_credits) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-lite",
      {
        rc_number,
        owner_name,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
    if (code !== "1000") {
      return res.json({
        success: true,
        data: apiRes.data, // frontend will decide message
      });
    }

    /* ================= DEDUCT CREDITS ================= */
    await db.query(
      `UPDATE users 
       SET wallet_amount = wallet_amount - ?
       WHERE users_id = ?`,
      [service.actual_credits, userId]
    );

    /* ================= SUCCESS ================= */
    res.json({
      success: true,
      data: apiRes.data,
    });
  } catch (error) {
    console.error("❌ fetchRcLite error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC Lite fetch failed",
    });
  }
};
export const fetchRcLiteController2 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, rc_number, owner_name, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !rc_number || !consent) {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-lite",
      {
        rc_number,
        owner_name,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
        reference_id,
        remarks,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'debit',
        creditsUsed,
        openingBalance,
        closingBalance,
        'service_usage',
        null,
        null,
        userId,
      ]
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs (
        users_id,
        usr_ser_id,
        mas_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        null,                // mas_ser_id intentionally NULL
        rc_number,           // file_no
        creditsUsed,
        'RC_LITE',
        'success',
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ fetchRcLite error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC Lite fetch failed",
    });
  } finally {
    connection.release();
  }
};
export const fetchRcLiteController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    // 🔹 file_no added
    const { usr_ser_id, rc_number, owner_name, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !rc_number || !owner_name || !file_no || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-lite",
      {
        rc_number,
        owner_name,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
      [userId, creditsUsed, openingBalance, closingBalance, userId]
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
        file_no, // ✅ FILE NUMBER STORED
        creditsUsed,
        "RC_LITE",
        "success",
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ fetchRcLite error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC Lite fetch failed",
    });
  } finally {
    connection.release();
  }
};



export const fetchRcContactController1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { usr_ser_id, rc_number, consent } = req.body;

    if (!usr_ser_id || !rc_number || consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    /* ================= VALIDATE SERVICE ================= */
    const [[service]] = await db.query(
      `SELECT actual_credits 
       FROM user_services 
       WHERE usr_ser_id = ?
         AND users_id = ?
         AND status = 'active'`,
      [usr_ser_id, userId]
    );

    if (!service) {
      return res.status(403).json({
        success: false,
        message: "Service not allowed",
      });
    }

    /* ================= CHECK WALLET ================= */
    const [[user]] = await db.query(
      `SELECT wallet_amount FROM users WHERE users_id = ?`,
      [userId]
    );

    if (Number(user.wallet_amount) < service.actual_credits) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-contact",
      {
        rc_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= DEDUCT CREDITS ON SUCCESS ================= */
    if (code === "1000") {
      await db.query(
        `UPDATE users 
         SET wallet_amount = wallet_amount - ? 
         WHERE users_id = ?`,
        [service.actual_credits, userId]
      );
    }

    res.json({
      success: true,
      data: apiRes.data,
    });
  } catch (error) {
    console.error("❌ RC Contact Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC Contact fetch failed",
    });
  }
};
export const fetchRcContactController2 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, rc_number, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !rc_number || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-contact",
      {
        rc_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
        reference_id,
        remarks,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'debit',
        creditsUsed,
        openingBalance,
        closingBalance,
        'service_usage',
        null,
        null,
        userId,
      ]
    );

    const walletTransactionId = walletTxn.insertId;

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs (
        users_id,
        usr_ser_id,
        mas_ser_id,
        file_no,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        null,          // mas_ser_id kept NULL
        rc_number,
        creditsUsed,
        'RC_CONTACT',
        'success',
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ RC Contact Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC Contact fetch failed",
    });
  } finally {
    connection.release();
  }
};
export const fetchRcContactController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    // 🔹 file_no added
    const { usr_ser_id, rc_number, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !rc_number || !file_no || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-contact",
      {
        rc_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
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
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
      [userId, creditsUsed, openingBalance, closingBalance, userId]
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
        file_no, // ✅ FILE NUMBER STORED
        creditsUsed,
        "RC_CONTACT",
        "success",
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ RC Contact Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC Contact fetch failed",
    });
  } finally {
    connection.release();
  }
};



export const fetchVehicleRegByChassisController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const { usr_ser_id, chassis_number, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !chassis_number || !file_no || consent !== "Y") {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-reg-num-by-chassis",
      {
        chassis_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
    if (code !== "1007") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
      [userId, creditsUsed, openingBalance, closingBalance, userId]
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
        file_no, // ✅ FILE NUMBER STORED
        creditsUsed,
        "RC_REG_BY_CHASSIS",
        "success",
        walletTransactionId,
        userId,
      ]
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
    console.error(
      "❌ RC Reg By Chassis Error:",
      error.response?.data || error
    );
    res.status(500).json({
      success: false,
      message: "RC fetch by chassis failed",
    });
  } finally {
    connection.release();
  }
};


export const fetchFastagDetailedController1 = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, rc_number, tag_id, file_no, consent } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no || consent !== "Y" || (!rc_number && !tag_id)) {
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fastag/fetch-detailed",
      {
        rc_number,
        tag_id,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= HANDLE FAILURE ================= */
    if (code !== "1009") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
      [userId, creditsUsed, openingBalance, closingBalance, userId]
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
        "FASTAG_DETAILED",
        "success",
        walletTransactionId,
        userId,
      ]
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
    console.error("❌ FASTag Detailed Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "FASTag fetch failed",
    });
  } finally {
    connection.release();
  }
};
export const fetchFastagDetailedController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      rc_number,
      tag_id,
      file_no,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!usr_ser_id || !file_no) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (!rc_number && !tag_id) {
      return res.status(400).json({
        success: false,
        message: "Either RC Number or FASTag ID is required",
      });
    }

    if (consent !== "Y") {
      return res.status(400).json({
        success: false,
        message: "Consent not provided",
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fastag/fetch-detailed",
      {
        rc_number: rc_number || undefined,
        tag_id: tag_id || undefined,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const apiCode = apiRes.data?.data?.code;

    /* ================= HANDLE NON-SUCCESS ================= */
    if (apiCode !== "1009") {
      await connection.rollback();
      return res.json({
        success: true,
        data: apiRes.data,
      });
    }

    /* ================= WALLET DEDUCTION ================= */
    const closingBalance = openingBalance - creditsUsed;

    await connection.query(
      `UPDATE users
       SET wallet_amount = ?
       WHERE users_id = ?`,
      [closingBalance, userId]
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
      [
        userId,
        creditsUsed,
        openingBalance,
        closingBalance,
        userId,
      ]
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
        "FASTAG_DETAILED",
        "success",
        walletTransactionId,
        userId,
      ]
    );

    await connection.commit();

    /* ================= SUCCESS RESPONSE ================= */
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
    console.error(
      "❌ FASTag Detailed Error:",
      error.response?.data || error
    );

    res.status(500).json({
      success: false,
      message: "FASTag detailed fetch failed",
    });
  } finally {
    connection.release();
  }
};


export const fetchRcEchallanController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const {
      usr_ser_id,
      rc_number,
      chassis_number,
      engine_number,
      file_no,
      consent,
    } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !usr_ser_id ||
      !rc_number ||
      !chassis_number ||
      !engine_number ||
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

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/echallan/fetch",
      {
        rc_number,
        chassis_number,
        engine_number,
        consent,
      },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    /* ================= NO DEDUCTION ON FAILURE ================= */
    if (code !== "1005") {
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
        "RC_ECHALLAN",
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
    console.error("❌ RC E-Challan error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "E-Challan fetch failed",
    });
  } finally {
    connection.release();
  }
};
export const fetchRcDetailedByChassisController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.userId;
    const { usr_ser_id, chassis_number, file_no, consent } = req.body;

    if (!usr_ser_id || !chassis_number || !file_no || consent !== "Y") {
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
      return res.status(403).json({ success: false, message: "Service not allowed" });
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
      return res.status(400).json({ success: false, message: "Insufficient credits" });
    }

    /* ================= GRIDLINES API ================= */
    const apiRes = await axios.post(
      "https://api.gridlines.io/rc-api/fetch-detailed-by-chassis",
      { chassis_number, consent },
      {
        headers: {
          "X-API-Key": process.env.GRIDLINES_API_KEY,
          "X-Auth-Type": "API-Key",
          "Content-Type": "application/json",
        },
      }
    );

    const code = apiRes.data?.data?.code;

    if (code !== "1007") {
      await connection.rollback();
      return res.json({ success: true, data: apiRes.data });
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
        api_status, wallet_transaction_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        creditsUsed,
        "RC_DETAILED_BY_CHASSIS",
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
    console.error("❌ RC Detailed error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "RC Detailed fetch failed",
    });
  } finally {
    connection.release();
  }
};


export const getUserSessionTimesController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await connection.beginTransaction();

    /* ================= USER SESSION TIMES ================= */
    const [[user]] = await connection.query(
      `
      SELECT 
        login_time,
        logout_time,
        log_session_time
      FROM users
      WHERE users_id = ?
      FOR UPDATE
      `,
      [userId]
    );

    if (!user) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Session times fetched successfully",
      data: {
        login_time: user.login_time,
        logout_time: user.logout_time,
        log_session_time: user.log_session_time,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Get session times error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch session times",
    });
  } finally {
    connection.release();
  }
};


export const getLoggedInUserController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await connection.beginTransaction();

    const [[user]] = await connection.query(
      `
      SELECT
        u.users_id,
        u.name,
        u.role_id,
        r.role AS role,
        u.email,
        u.contact_number,
        u.username,
        u.address,
        u.wallet_amount,
        u.status,
        u.created_at,
        u.updated_at,
        u.login_time,
        u.logout_time,
        u.log_session_time,
        u.latitude,
        u.longitude
      FROM users u
      LEFT JOIN userrole r
        ON r.ur_id = u.role_id
      WHERE u.users_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!user) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await connection.commit();

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Get logged-in user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  } finally {
    connection.release();
  }
};



export const getUserAccessDetailsController = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role; // ✅ from session

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [[user]] = await db.query(
      `
      SELECT
        login_time,
        logout_time,
        latitude,
        longitude
      FROM users
      WHERE users_id = ?
        AND status = 'active'
      LIMIT 1
      `,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    res.json({
      success: true,
      data: {
        login_time: user.login_time,
        logout_time: user.logout_time,
        latitude: user.latitude,
        longitude: user.longitude,
        role, // ✅ added from session
      },
    });
  } catch (error) {
    console.error("❌ getUserAccessDetailsController error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




//new controllers 
export const checkRcLiteCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, rc_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND rc_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, rc_number]
    );

    if (!existing) {
      return res.json({ hasCache: false });
    }

    // Allow cache only if last response was success
    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });

  } catch (err) {
    console.error("❌ checkRcLiteCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeRcLiteController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      owner_name,
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

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    let transactionId = null;
    let requestId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-lite",
        {
          rc_number,
          owner_name,
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

      if (apiRes.status !== 200) {
        await connection.rollback();

        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } 
      else if (code === "1001") {
        responseStatus = "not_found";
      } 
      else if (code === "1002") {
        responseStatus = "multiple";
      } 
      else {
        responseStatus = "failed";
      }

      /* ===== STORE IN CACHE ===== */
      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
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
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "RC_LITE",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
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
    console.error("❌ EXECUTE RC LITE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};
export const executeRcLiteController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      owner_name,
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      rc_number,
      owner_name,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let serFetLogId = null;

    /* ================= CACHE FLOW ================= */

    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */

    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-lite",
        {
          rc_number,
          owner_name,
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

      if (apiRes.status !== 200) {
        await connection.rollback();

        return res.json({
          success: false,
          message:
            apiRes.data?.error?.message ||
            "Gridlines service unavailable",
          data: apiRes.data,
        });
      }

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      }
      else if (code === "1001") {
        responseStatus = "not_found";
      }
      else if (code === "1002") {
        responseStatus = "multiple";
      }
      else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET ================= */

    if (shouldDeduct) {

      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "RC_LITE",
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

    console.error("❌ EXECUTE RC LITE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};




export const checkRcContactCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, rc_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND rc_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, rc_number]
    );

    if (!existing) {
      return res.json({ hasCache: false });
    }

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });

  } catch (err) {
    console.error("❌ checkRcContactCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeRcContactController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
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

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    let transactionId = null;
    let requestId = null;

    /* =====================================================
       ================= CACHE FLOW ========================
       ===================================================== */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* =====================================================
       ================= FRESH FLOW ========================
       ===================================================== */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-contact",
        {
          rc_number,
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

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1011") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
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
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */
    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "RC_CONTACT",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
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
    console.error("❌ EXECUTE RC CONTACT ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};
export const executeRcContactController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      rc_number,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let serFetLogId = null;

    /* ================= CACHE FLOW ================= */

    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */

    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-contact",
        {
          rc_number,
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

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1011") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET ================= */

    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "RC_CONTACT",
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

    console.error("❌ EXECUTE RC CONTACT ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};



export const checkRcLookupByMobileCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, mobile_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND mobile_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, mobile_number]
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
    console.error("❌ checkRcLookupMobileCache error:", err.message);
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeRcLookupByMobileController1 = async (req, res) => {
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

    /* SERVICE CHECK */
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

    /* WALLET CHECK */
    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    let transactionId = null;
    let requestId = null;

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
        [mas_ser_id, mas_cat_id, mobile_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);
      responseStatus = existing.response_status;

      if (responseStatus === "success") shouldDeduct = true;
    }

    /* ================= FRESH FLOW ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/lookup-by-mobile",
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
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1011") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, api_response, response_status,
          http_status_code, created_by)
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
        ]
      );
    }

    /* WALLET DEDUCTION */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "RC_LOOKUP_MOBILE",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeRcLookupByMobileController = async (req, res) => {
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      mobile_number,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
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
        [mas_ser_id, mas_cat_id, mobile_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response;
      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */

    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/lookup-by-mobile",
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
          validateStatus: () => true,
        }
      );

      fullResponse = apiRes.data;

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1011") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          mobile_number, api_response, response_status,
          http_status_code, created_by)
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
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId) throw new Error("ser_fet_log_id not found");

    /* ================= WALLET ================= */

    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "RC_LOOKUP_MOBILE",
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

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};



export const checkRcDetailedCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, rc_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND rc_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, rc_number]
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
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeRcDetailedController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      owner_name,
      use_cache,
    } = req.body;

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

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;

    let transactionId = null;
    let requestId = null;

    /* ================= CACHE ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);
      responseStatus = existing.response_status;

      if (responseStatus === "success") shouldDeduct = true;
    }

    /* ================= FRESH ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-detailed",
        {
          rc_number,
          owner_name,
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

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1001") {
        responseStatus = "not_found";
      } else if (code === "1002") {
        responseStatus = "multiple";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "RC_DETAILED",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeRcDetailedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      owner_name,
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      rc_number,
      owner_name,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let serFetLogId = null;

    /* ================= CACHE ================= */

    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      /* keep same behaviour as your original */
      fullResponse = existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH ================= */

    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-detailed",
        {
          rc_number,
          owner_name,
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

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1000") {
        shouldDeduct = true;
        responseStatus = "success";
      } 
      else if (code === "1001") {
        responseStatus = "not_found";
      } 
      else if (code === "1002") {
        responseStatus = "multiple";
      } 
      else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET ================= */

    if (shouldDeduct) {

      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "RC_DETAILED",
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

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {

    connection.release();
  }
};



export const checkRcEchallanCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, rc_number } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND rc_number = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, rc_number]
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
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeRcEchallanController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      chassis_number,
      engine_number,
      use_cache,
    } = req.body;

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

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!user) throw new Error("User not found");

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;

    /* ================= CACHE ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = JSON.parse(existing.api_response);
      responseStatus = existing.response_status;

      if (responseStatus === "success") shouldDeduct = true;
    }

    /* ================= FRESH ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/echallan/fetch",
        {
          rc_number,
          chassis_number,
          engine_number,
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

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1005") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1006") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "RC_ECHALLAN",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeRcEchallanController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      chassis_number,
      engine_number,
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      rc_number,
      chassis_number,
      engine_number,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let serFetLogId = null;

    /* ================= CACHE ================= */

    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND rc_number = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH ================= */

    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/echallan/fetch",
        {
          rc_number,
          chassis_number,
          engine_number,
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

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1005") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1006") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, api_response,
          response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET ================= */

    if (shouldDeduct) {

      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "RC_ECHALLAN",
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

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {

    connection.release();
  }
};



export const checkFastagDetailedCacheController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { mas_ser_id, mas_cat_id, rc_number, tag_id } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND (rc_number = ? OR fastag_id = ?)
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, rc_number || null, tag_id || null]
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
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeFastagDetailedController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      tag_id,
      use_cache,
    } = req.body;

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

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;

    /* ================= CACHE ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND (rc_number = ? OR fastag_id = ?)
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number || null, tag_id || null]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);
      responseStatus = existing.response_status;

      if (responseStatus === "success") shouldDeduct = true;
    }

    /* ================= FRESH ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fastag/fetch-detailed",
        {
          rc_number: rc_number || undefined,
          tag_id: tag_id || undefined,
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

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1009") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1010") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, fastag_id,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number || null,
          tag_id || null,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "FASTAG_DETAILED",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeFastagDetailedController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      rc_number,
      tag_id,
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      rc_number: rc_number || null,
      tag_id: tag_id || null,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let serFetLogId = null;

    /* ================= CACHE ================= */

    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND (rc_number = ? OR fastag_id = ?)
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, rc_number || null, tag_id || null]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = (existing.api_response);

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH ================= */

    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fastag/fetch-detailed",
        {
          rc_number: rc_number || undefined,
          tag_id: tag_id || undefined,
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

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1009") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1010") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          rc_number, fastag_id,
          api_response, response_status,
          http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          rc_number || null,
          tag_id || null,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET ================= */

    if (shouldDeduct) {

      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "FASTAG_DETAILED",
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

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {

    connection.release();
  }
};



export const checkVehicleRegByChassisCacheController = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { mas_ser_id, mas_cat_id, chassis_no } = req.body;

    const [[existing]] = await connection.query(
      `SELECT response_status, fetched_at
       FROM service_data_fetch_log
       WHERE mas_ser_id = ?
         AND mas_cat_id = ?
         AND chassis_no = ?
       ORDER BY ser_fet_log_id DESC
       LIMIT 1`,
      [mas_ser_id, mas_cat_id, chassis_no]
    );

    if (!existing) return res.json({ hasCache: false });

    if (existing.response_status === "success") {
      return res.json({
        hasCache: true,
        lastFetchedAt: existing.fetched_at,
      });
    }

    return res.json({ hasCache: false });

  } catch {
    return res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};
export const executeVehicleRegByChassisController1 = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      chassis_no,
      use_cache,
    } = req.body;

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

    if (!service) throw new Error("Service not allowed");

    const creditsUsed = Number(service.actual_credits);

    const [[user]] = await connection.query(
      `SELECT wallet_amount
       FROM users
       WHERE users_id = ?
       FOR UPDATE`,
      [userId]
    );

    const openingBalance = Number(user.wallet_amount);

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;
    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;

    /* ================= CACHE FLOW ================= */
    if (use_cache) {
      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND chassis_no = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, chassis_no]
      );

      if (!existing) throw new Error("Cache not found");

      fullResponse = existing.api_response; // ✅ NO PARSE
      responseStatus = existing.response_status;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */
    else {
      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-reg-num-by-chassis",
        { chassis_number: chassis_no, consent: "Y" },
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

      const code = fullResponse?.data?.code;
      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1007") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1008") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          chassis_no, api_response,
          response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          chassis_no,
          JSON.stringify(fullResponse),

          responseStatus,
          apiRes.status,
          userId,
        ]
      );
    }

    /* ================= WALLET ================= */
    if (shouldDeduct) {
      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id, usr_ser_id, file_no,
        credits_used, api_name, api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        shouldDeduct ? creditsUsed : 0,
        "RC_REG_BY_CHASSIS",
        responseStatus,
        walletTransactionId,
        transactionId,
        requestId,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
export const executeVehicleRegByChassisController = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.userId;

    const {
      usr_ser_id,
      mas_ser_id,
      mas_cat_id,
      file_no,
      chassis_no,
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

    const openingBalance = Number(user.wallet_amount);

    /* ================= INPUT PAYLOAD ================= */

    const inputPayload = JSON.stringify({
      chassis_no,
    });

    let fullResponse;
    let responseStatus = "failed";
    let shouldDeduct = false;

    let walletTransactionId = null;
    let transactionId = null;
    let requestId = null;
    let serFetLogId = null;

    /* ================= CACHE FLOW ================= */

    if (use_cache) {

      const [[existing]] = await connection.query(
        `SELECT *
         FROM service_data_fetch_log
         WHERE mas_ser_id = ?
           AND mas_cat_id = ?
           AND chassis_no = ?
         ORDER BY ser_fet_log_id DESC
         LIMIT 1`,
        [mas_ser_id, mas_cat_id, chassis_no]
      );

      if (!existing) throw new Error("Cache not found");

      /* ⚠ keep as string (same as your original logic) */
      fullResponse = existing.api_response;

      responseStatus = existing.response_status;
      serFetLogId = existing.ser_fet_log_id;

      if (responseStatus === "success") {
        shouldDeduct = true;
      }
    }

    /* ================= FRESH FLOW ================= */

    else {

      const apiRes = await axios.post(
        "https://api.gridlines.io/rc-api/fetch-reg-num-by-chassis",
        { chassis_number: chassis_no, consent: "Y" },
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

      const code = fullResponse?.data?.code;

      transactionId = fullResponse?.transaction_id || null;
      requestId = fullResponse?.request_id || null;

      if (code === "1007") {
        shouldDeduct = true;
        responseStatus = "success";
      } else if (code === "1008") {
        responseStatus = "not_found";
      } else {
        responseStatus = "failed";
      }

      /* ===== INSERT FETCH LOG FIRST ===== */

      const [fetchInsert] = await connection.query(
        `INSERT INTO service_data_fetch_log
         (mas_ser_id, mas_cat_id, file_number,
          chassis_no, api_response,
          response_status, http_status_code, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mas_ser_id,
          mas_cat_id,
          file_no,
          chassis_no,
          JSON.stringify(fullResponse),
          responseStatus,
          apiRes.status,
          userId,
        ]
      );

      serFetLogId = fetchInsert.insertId;
    }

    if (!serFetLogId)
      throw new Error("ser_fet_log_id not found");

    /* ================= WALLET ================= */

    if (shouldDeduct) {

      if (openingBalance < creditsUsed)
        throw new Error("Insufficient balance");

      const closingBalance = openingBalance - creditsUsed;

      await connection.query(
        `UPDATE users SET wallet_amount = ? WHERE users_id = ?`,
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

    /* ================= USER SERVICE LOG ================= */

    await connection.query(
      `INSERT INTO user_service_logs
       (users_id,
        usr_ser_id,
        file_no,
        input_payload,
        credits_used,
        api_name,
        api_status,
        wallet_transaction_id,
        transaction_id,
        request_id,
        ser_fet_log_id,
        created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usr_ser_id,
        file_no,
        inputPayload,
        shouldDeduct ? creditsUsed : 0,
        "RC_REG_BY_CHASSIS",
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

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {

    connection.release();
  }
};