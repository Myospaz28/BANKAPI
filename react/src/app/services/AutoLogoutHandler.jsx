// import { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import jwtAuthService from "app/services/jwtAuthService";

// export default function AutoLogoutHandler() {
//   const navigate = useNavigate();

//   useEffect(() => {
//     const authUser = JSON.parse(localStorage.getItem("auth_user"));
//     if (!authUser) return;

//     const logSessionTime = authUser.user.log_session_time || "00:15:00";

//     const [hrs, mins, secs] = logSessionTime.split(":").map(Number);
//     const sessionMs = ((hrs * 60 + mins) * 60 + secs) * 1000;

//     let expiryTime = localStorage.getItem("session_expiry");
//     if (!expiryTime) {
//       expiryTime = Date.now() + sessionMs;
//       localStorage.setItem("session_expiry", expiryTime);
//     } else {
//       expiryTime = parseInt(expiryTime, 10);
//     }

//     const remaining = expiryTime - Date.now();

//     if (remaining <= 0) {
//       jwtAuthService.logout();
//       navigate("/sessions/signin", { replace: true });
//       return;
//     }

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

export default function AutoLogoutHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    const expiryTime = localStorage.getItem("session_expiry");

    // Not logged in
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
    const timer = setTimeout(() => {
      jwtAuthService.logout();
      localStorage.removeItem("session_expiry");
      navigate("/sessions/signin", { replace: true });
    }, remaining);

    return () => clearTimeout(timer);
  }, [navigate]);

  return null;
}