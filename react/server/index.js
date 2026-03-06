import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import employeserviceRoutes from "./routes/employeservice.routes.js";
import drivingRoutes from "./routes/driving.routes.js"
import profileRoutes from "./routes/profileLookup.routes.js"
import panRoutes from "./routes/pan.routes.js";
import voterRoutes from "./routes/voter.routes.js";
import bankverificationRoutes from "./routes/bankverification.routes.js";
import gstinROutes from './routes/gstin.routes.js'
import passverificationRoutes from "./routes/passverification.routes.js";
import companyRoutes from "./routes/company.routes.js";
import msmeverificatinRoutes from "./routes/msmeverification.routes.js";
import aadharverificationRoutes from "./routes/aadharverification.routes.js";
import facematchverificationRoutes from "./routes/facematchvarification.routes.js";
import ccrvRoutes from "./routes/ccrv.routes.js"
import dashboardRoutes from "./routes/dashboard.routes.js";
import { locationGuard } from "./middleware/locationGuard.middleware.js";
import { verifyToken } from "./middleware/auth.middleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api", servicesRoutes);
app.use("/api", employeserviceRoutes);
app.use("/api", drivingRoutes);
app.use("/api", profileRoutes);
app.use("/api", panRoutes);
app.use("/api", voterRoutes);
app.use("/api", bankverificationRoutes);
app.use("/api", gstinROutes);
app.use("/api", passverificationRoutes);
app.use("/api", companyRoutes);
app.use("/api", msmeverificatinRoutes);
app.use("/api", aadharverificationRoutes);
app.use("/api", facematchverificationRoutes);
app.use("/api", ccrvRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", verifyToken, locationGuard);

app.get("/", (req, res) => {
  res.send("Backend running...");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});



//deployed index on server
// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import path from "path";
// import { fileURLToPath } from "url";

// import authRoutes from "./routes/auth.routes.js";
// import servicesRoutes from "./routes/services.routes.js";
// import employeserviceRoutes from "./routes/employeservice.routes.js";
// import drivingRoutes from "./routes/driving.routes.js";
// import profileRoutes from "./routes/profileLookup.routes.js";
// import panRoutes from "./routes/pan.routes.js";
// import voterRoutes from "./routes/voter.routes.js";
// import bankverificationRoutes from "./routes/bankverification.routes.js";
// import gstinROutes from "./routes/gstin.routes.js";
// import passverificationRoutes from "./routes/passverification.routes.js";
// import companyRoutes from "./routes/company.routes.js";
// import msmeverificatinRoutes from "./routes/msmeverification.routes.js";
// import aadharverificationRoutes from "./routes/aadharverification.routes.js";
// import facematchverificationRoutes from "./routes/facematchvarification.routes.js";

// dotenv.config();

// const app = express();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// app.use(cors());
// app.use(express.json());

// // ✅ Serve React static files
// app.use(express.static(__dirname));

// // ✅ Backend routes
// app.use("/auth", authRoutes);
// app.use("/api", servicesRoutes);
// app.use("/api", employeserviceRoutes);
// app.use("/api", drivingRoutes);
// app.use("/api", profileRoutes);
// app.use("/api", panRoutes);
// app.use("/api", voterRoutes);
// app.use("/api", bankverificationRoutes);
// app.use("/api", gstinROutes);
// app.use("/api", passverificationRoutes);
// app.use("/api", companyRoutes);
// app.use("/api", msmeverificatinRoutes);
// app.use("/api", aadharverificationRoutes);
// app.use("/api", facematchverificationRoutes);

// // 🔥 CRITICAL SPA FALLBACK (Passenger-safe)
// app.use((req, res, next) => {
//   if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
//     return next();
//   }
//   res.sendFile(path.join(__dirname, "index.html"));
// });

// app.listen(process.env.PORT, () => {
//   console.log(`🚀 Server running on port ${process.env.PORT}`);
// });
