import api from "./api";
import localStorageService from "./localStorageService";

class JwtAuthService {
  async loginWithUsernameAndPassword({ username, password }) {
    const res = await api.post("/auth/signin", {
      username,
      password
    });

    this.setSession(res.data.token);
    this.setUser(res.data);

    return res.data;
  }

  setSession(token) {
    if (token) {
      localStorage.setItem("jwt_token", token);
      api.defaults.headers.common["Authorization"] = "Bearer " + token;
    } else {
      localStorage.removeItem("jwt_token");
      delete api.defaults.headers.common["Authorization"];
    }
  }

  setUser(user) {
    localStorageService.setItem("auth_user", user);
  }

  logout() {
    this.setSession(null);
    localStorage.removeItem("auth_user");
  }
}

export default new JwtAuthService();
