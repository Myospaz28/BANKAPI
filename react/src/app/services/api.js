
// import axios from "axios";

// const api = axios.create({
//   // baseURL: "https://api.risqcorporate.com/",
//   baseURL: "http://localhost:5000/",
// });

// // 🔐 Auto attach token
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("jwt_token");

//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   return config;
// });

// export default api;
import axios from "axios";


const api = axios.create({
  // baseURL: "http://localhost:5000/",
  baseURL: "https://api.risqcorporate.com/",
});


let cachedLocation = null;
let lastFetched = 0;

const LOCATION_TTL = 60 * 1000; 

const fetchLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject("Geolocation not supported");
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        lastFetched = Date.now();
        resolve(cachedLocation);
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false, 
        timeout: 8000,
        maximumAge: LOCATION_TTL,
      }
    );
  });


api.interceptors.request.use(
  async (config) => {

    const token = localStorage.getItem("jwt_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }


    try {
      if (
        !cachedLocation ||
        Date.now() - lastFetched > LOCATION_TTL
      ) {
        await fetchLocation();
      }

      if (cachedLocation) {
        config.headers["X-Latitude"] =
          cachedLocation.latitude;
        config.headers["X-Longitude"] =
          cachedLocation.longitude;
      }
    } catch (err) {
      console.warn("Location unavailable");
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.response?.data?.forceLogout
    ) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("session_expiry");

      window.location.href = "/sessions/signin";
    }

    return Promise.reject(error);
  }
);

export default api;