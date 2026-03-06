import db from '../database/db.js';
import { closeUserSession } from '../utils/sessionUtils.js';

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ================= LOCATION GUARD ================= */
// export const locationGuard = async (req, res, next) => {
//   try {
//     const userId = req.user.userId;

//     const latitude = req.headers['x-latitude'];
//     const longitude = req.headers['x-longitude'];

//     if (!latitude || !longitude) {
//       return res.status(401).json({
//         message: 'Location required',
//         forceLogout: true,
//       });
//     }

//     const [rows] = await db.query(
//       `SELECT latitude, longitude, allowed_radius
//        FROM users WHERE users_id = ?`,
//       [userId],
//     );

//     if (!rows.length) {
//       return res.status(401).json({
//         message: 'User not found',
//         forceLogout: true,
//       });
//     }

//     const user = rows[0];

//     const distance = getDistanceInMeters(
//       Number(user.latitude),
//       Number(user.longitude),
//       Number(latitude),
//       Number(longitude),
//     );
//     if (distance > user.allowed_radius) {
//       await closeUserSession(
//         req.user.sessionLogId,
//         'Logged out: Outside allowed area',
//       );

//       return res.status(401).json({
//         message: 'Outside allowed area. Logged out.',
//         forceLogout: true,
//       });
//     }

//     next();
//   } catch (err) {
//     console.error('Location guard error:', err);
//     res.status(500).json({
//       message: 'Location check failed',
//       forceLogout: true,
//     });
//   }
// };

export const locationGuard = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        forceLogout: true,
      });
    }

    const [rows] = await db.query(
      `SELECT latitude, longitude, allowed_radius, geo_fencing_status
       FROM users WHERE users_id = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: "User not found",
        forceLogout: true,
      });
    }

    const user = rows[0];

    // ✅ Skip check if inactive
    if (user.geo_fencing_status === "inactive") {
      return next();
    }

    const latitude = Number(req.headers["x-latitude"]);
    const longitude = Number(req.headers["x-longitude"]);

    if (!latitude || !longitude) {
      return res.status(401).json({
        message: "Location required",
        forceLogout: true,
      });
    }

    if (!user.latitude || !user.longitude || !user.allowed_radius) {
      return res.status(401).json({
        message: "Geo fencing not configured properly",
        forceLogout: true,
      });
    }

    const distance = getDistanceInMeters(
      Number(user.latitude),
      Number(user.longitude),
      latitude,
      longitude
    );

    if (distance > Number(user.allowed_radius)) {
      await closeUserSession(
        req.user.sessionLogId,
        "Logged out: Outside allowed area"
      );

      return res.status(401).json({
        message: "Outside allowed area. Logged out.",
        forceLogout: true,
      });
    }

    next();
  } catch (err) {
    console.error("Location guard error:", err);
    res.status(500).json({
      message: "Location check failed",
      forceLogout: true,
    });
  }
};