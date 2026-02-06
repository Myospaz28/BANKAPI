import { lazy } from "react";

const AadhaarUidMasking = lazy(() => import("./AadhaarUidMasking.jsx"));
const AadhaarOcrV2 = lazy(() => import("./AadhaarOcrV2.jsx"));

const aadhar_verifyRoutes = [
  { path: "/services/AadhaarUidMasking", element: <AadhaarUidMasking /> },
  { path: "/services/AadhaarOcrV2", element: <AadhaarOcrV2 /> },
];

export default aadhar_verifyRoutes;
