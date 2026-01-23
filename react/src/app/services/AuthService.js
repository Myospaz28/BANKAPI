// export const signin = (data) => {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       resolve({ age: 25, userId: "1", Name: "Rosy", email: "ui-lib@gmail.com" });
//     }, 1000);
//   });
// };

// export const signup = (data) => {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       resolve({ userId: "1", Name: "Rosy", email: "ui-lib@gmail.com", age: 25 });
//     }, 1000);
//   });
// };

// export const signout = () => {
//   // console.log("Log out successfule");
//   return new Promise((resolve, reject) => {
//     setTimeout(() => resolve(true), 1000);
//   });
// };

// export const getAuthStatus = () => true;


import api from "./api";

export const signin = async (data) => {
  const res = await api.post("/auth/signin", data);
  return res.data;
};

export const signout = () => {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("auth_user");
};
