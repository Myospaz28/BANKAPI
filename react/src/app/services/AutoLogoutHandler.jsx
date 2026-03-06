
// import { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import jwtAuthService from "app/services/jwtAuthService";

// export default function AutoLogoutHandler() {
//   const navigate = useNavigate();

//   useEffect(() => {
//     const authUser = localStorage.getItem("auth_user");
//     const expiryTime = localStorage.getItem("session_expiry");

//     // Not logged in
//     if (!authUser || !expiryTime) return;

//     const remaining = parseInt(expiryTime, 10) - Date.now();

//     // Session already expired
//     if (remaining <= 0) {
//       jwtAuthService.logout();
//       localStorage.removeItem("session_expiry");
//       navigate("/sessions/signin", { replace: true });
//       return;
//     }

//     // Resume logout timer
//     const timer = setTimeout(() => {
//       jwtAuthService.logout();
//       localStorage.removeItem("session_expiry");
//       navigate("/sessions/signin", { replace: true });
//     }, remaining);

//     return () => clearTimeout(timer);
//   }, [navigate]);

//   return null;
// }

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jwtAuthService from "app/services/jwtAuthService";
import api from "../services/api";

export default function AutoLogoutHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    const expiryTime = localStorage.getItem("session_expiry");

    
    if (!authUser || !expiryTime) return;

    const remaining = parseInt(expiryTime, 10) - Date.now();

    // Session already expired
    if (remaining <= 0) {
      jwtAuthService.logout();
      localStorage.removeItem("session_expiry");
      navigate("/sessions/signin", { replace: true });
      return;
    }

    // Resume logout timer
    // const timer = setTimeout(() => {
    //   jwtAuthService.logout();
    //   localStorage.removeItem("session_expiry");
    //   navigate("/sessions/signin", { replace: true });
    // }, remaining);


const timer = setTimeout(async () => {
  try {
    await api.post("/auth/logout", {
      reason: "Session time expired",
    });
  } catch (err) {
    console.log("Backend logout failed");
  }

  localStorage.setItem("session_expired", "true"); // 👈 ADD

  jwtAuthService.logout();
  localStorage.removeItem("session_expiry");
  navigate("/sessions/signin", { replace: true });
}, remaining);


    return () => clearTimeout(timer);
  }, [navigate]);

  return null;
}