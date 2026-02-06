// import axios from "axios";

// // const api = axios.create({
// //   baseURL: "http://localhost:5000/",
// // });

// // export default api;

// const api = axios.create({
//   // baseURL: "https://api.risqcorporate.com/",
//   baseURL: "http://localhost:5000/",
// });

// // 🔐 AUTO attach token
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
  // baseURL: "https://api.risqcorporate.com/",
  baseURL: "http://localhost:5000/",
});

// 🔐 Auto attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
