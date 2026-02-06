import { lazy } from "react";

const FaceMatch = lazy(() => import("./FaceMatch.jsx"));

const facematch_verifyRoutes = [
  { path: "/services/FaceMatch", element: <FaceMatch /> },
];
export default facematch_verifyRoutes;
