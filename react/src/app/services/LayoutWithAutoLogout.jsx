// // LayoutWithAutoLogout.jsx
// import { Outlet } from "react-router-dom";
// import AutoLogoutHandler from "./AutoLogoutHandler";

// export default function LayoutWithAutoLogout() {
//   return (
//     <>
//       <AutoLogoutHandler />
//       <Outlet />
//     </>
//   );
// }
// LayoutWithAutoLogout.jsx
import { Outlet } from "react-router-dom";
import AutoLogoutHandler from "./AutoLogoutHandler";

export default function LayoutWithAutoLogout() {
  return (
    <>
      <AutoLogoutHandler />
      <Outlet />
    </>
  );
}