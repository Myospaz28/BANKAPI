

// import api from "./api";
// import localStorageService from "./localStorageService";

// class JwtAuthService {
//   // 🔐 LOGIN
//   async loginWithUsernameAndPassword({ username, password }) {
//     const res = await api.post("/auth/signin", {
//       username,
//       password,
//     });

//     // ✅ set JWT token
//     this.setSession(res.data.token);

//     // ✅ store user & session expiry (ONLY ONCE)
//     this.setUser(res.data);

//     return res.data;
//   }

//   // 🔐 JWT handling
//   setSession(token) {
//     if (token) {
//       localStorage.setItem("jwt_token", token);
//       api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
//     } else {
//       localStorage.removeItem("jwt_token");
//       delete api.defaults.headers.common["Authorization"];
//     }
//   }

//   // 👤 Store user + session expiry
//   setUser(data) {
//     // data = { success, user, token }
//     localStorageService.setItem("auth_user", data);

//     // ✅ DO NOT reset expiry on refresh
//     if (!localStorage.getItem("session_expiry")) {
//       const logSessionTime = data.user.log_session_time || "00:15:00";
//       const [hrs, mins, secs] = logSessionTime.split(":").map(Number);

//       const sessionMs =
//         ((hrs * 60 + mins) * 60 + secs) * 1000;

//       localStorage.setItem(
//         "session_expiry",
//         Date.now() + sessionMs
//       );
//     }
//   }

//   // 🔁 Restore JWT after page refresh
//   init() {
//     const token = localStorage.getItem("jwt_token");
//     if (token) {
//       this.setSession(token);
//     }
//   }

//   // 🚪 LOGOUT
//   logout() {
//     this.setSession(null);
//     localStorage.removeItem("auth_user");
//     localStorage.removeItem("session_expiry");
//   }
// }

// export default new JwtAuthService();

import api from './api';
import localStorageService from './localStorageService';

class JwtAuthService {
  async loginWithUsernameAndPassword({
    username,
    password,
    latitude,
    longitude,
    sessionExpired,
  }) {
    const res = await api.post('/auth/signin', {
      username,
      password,
      latitude,
      longitude,
      sessionExpired,
    });

    if (res.data?.token) {
      this.setSession(res.data.token);
      this.setUser(res.data.user);
    }

    return res.data;
  }

  setSession(token) {
    if (token) {
      localStorage.setItem('jwt_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('jwt_token');
      delete api.defaults.headers.common['Authorization'];
    }
  }

  setUser(user) {
    // Save user directly
    localStorageService.setItem('auth_user', user);

    if (!localStorage.getItem('session_expiry')) {
      const logSessionTime = user.log_session_time || '00:15:00';
      const [hrs, mins, secs] = logSessionTime.split(':').map(Number);

      const sessionMs = ((hrs * 60 + mins) * 60 + secs) * 1000;

      localStorage.setItem('session_expiry', Date.now() + sessionMs);
    }
  }

  init() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      this.setSession(token);
    }
  }

  // 🚪 LOGOUT
  logout() {
    this.setSession(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('session_expiry');
  }
}

export default new JwtAuthService();