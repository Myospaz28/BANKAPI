

// import jwt from "jsonwebtoken";

// export const verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({
//       message: "Authentication token missing",
//     });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
  
//     if (err.name === "TokenExpiredError") {
//       return res.status(401).json({
//         message: "Session expired. Please login again.",
//       });
//     }


//     return res.status(401).json({
//       message: "Invalid authentication token",
//     });
//   }
// };

import jwt from "jsonwebtoken";
import { closeUserSession } from "../utils/sessionUtils.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication token missing",
      forceLogout: true,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // 🔥 SESSION EXPIRED
    if (err.name === "TokenExpiredError") {
      try {
        const decoded = jwt.decode(token);

        if (decoded?.sessionLogId) {
          await closeUserSession(
            decoded.sessionLogId,
            "Session expired"
          );
        }
      } catch (e) {
        console.error("Session close error:", e);
      }

      return res.status(401).json({
        message: "Session expired. Please login again.",
        forceLogout: true,
      });
    }

    return res.status(401).json({
      message: "Invalid authentication token",
      forceLogout: true,
    });
  }
};