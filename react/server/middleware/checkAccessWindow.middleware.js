
// import db from "../database/db.js";

// export const accessWindowMiddleware = async (req, res, next) => {
//   try {
//     const userId = req.user?.userId;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     const [[user]] = await db.query(
//       `
//       SELECT login_time, logout_time
//       FROM users
//       WHERE users_id = ?
//         AND status = 'active'
//       `,
//       [userId]
//     );

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found or inactive",
//       });
//     }

//     const { login_time, logout_time } = user;

//     /* ================= NO TIME LIMIT ================= */
//     if (!login_time || !logout_time) {
//       return next();
//     }

//     const now = new Date();
//     const currentTime = now.toTimeString().slice(0, 8); // HH:mm:ss

//     /* ================= NORMAL WINDOW (09:30 → 18:30) ================= */
//     if (login_time <= logout_time) {
//       if (currentTime < login_time || currentTime > logout_time) {
//         return res.status(403).json({
//           success: false,
//           message: "Service access time expired",
//         });
//       }
//     }
//     /* ================= OVERNIGHT WINDOW (22:00 → 06:00) ================= */
//     else {
//       if (currentTime > logout_time && currentTime < login_time) {
//         return res.status(403).json({
//           success: false,
//           message: "Service access time expired",
//         });
//       }
//     }

//     next();
//   } catch (error) {
//     console.error("❌ Access window error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

import db from "../database/db.js";

const timeToSeconds = (time) => {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};

export const accessWindowMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [[user]] = await db.query(
      `
      SELECT login_time, logout_time
      FROM users
      WHERE users_id = ?
        AND status = 'active'
      `,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const { login_time, logout_time } = user;

    /* ================= NO TIME LIMIT ================= */
    if (!login_time || !logout_time) {
      return next();
    }

    // ✅ IST current time → seconds
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const currentSeconds =
      now.getHours() * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds();

    const loginSeconds = timeToSeconds(login_time);
    const logoutSeconds = timeToSeconds(logout_time);
console.log({
  login_time,
  logout_time,
  currentSeconds,
  loginSeconds,
  logoutSeconds,
});

    /* ================= NORMAL WINDOW ================= */
    if (loginSeconds <= logoutSeconds) {
      if (
        currentSeconds < loginSeconds ||
        currentSeconds > logoutSeconds
      ) {
        return res.status(403).json({
          success: false,
          message: "Service access time expired",
        });
      }
    }
    /* ================= OVERNIGHT WINDOW ================= */
    else {
      if (
        currentSeconds > logoutSeconds &&
        currentSeconds < loginSeconds
      ) {
        return res.status(403).json({
          success: false,
          message: "Service access time expired",
        });
      }
    }

    next();
  } catch (error) {
    console.error("❌ Access window error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
