import { lazy } from "react";


const AddUser = lazy(() => import("./AddUser.jsx"));

const usersRoutes = [
  { path: "/users/add", element: <AddUser /> },

];

export default usersRoutes;
