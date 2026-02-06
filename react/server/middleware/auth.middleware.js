// import jwt from "jsonwebtoken";

// export const verifyToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };


// import jwt from "jsonwebtoken";

// export const verifyToken = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     // ❌ No Authorization header
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         message: "Authorization token missing",
//       });
//     }

//     const token = authHeader.split(" ")[1];

//     // 🔐 Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // ✅ Attach user payload to request
//     req.user = decoded;

//     next();
//   } catch (error) {
//     console.error("JWT verification failed:", error.message);

//     return res.status(401).json({
//       message: "Invalid or expired token",
//     });
//   }
// };



import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication token missing",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
  
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please login again.",
      });
    }


    return res.status(401).json({
      message: "Invalid authentication token",
    });
  }
};