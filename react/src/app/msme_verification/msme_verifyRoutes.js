import { lazy } from "react";

const FetchUdyamByMobile = lazy(() => import("./FetchUdyamByMobile.jsx"));

const FetchMSMEByPAN = lazy(() => import("./FetchMSMEByPAN.jsx"));

const VerifyUdyamAdvanced = lazy(() => import("./VerifyUdyamAdvanced.jsx"));

const UdyamCertificateOCR = lazy(() => import("./UdyamCertificateOCR.jsx"));

const msme_verifyRoutes = [
  {
    path: "/services/FetchUdyamByMobile",
    element: <FetchUdyamByMobile />,
  },
  {
    path: "/services/FetchMSMEByPAN",
    element: <FetchMSMEByPAN />,
  },
  {
    path: "/services/VerifyUdyamAdvanced",
    element: <VerifyUdyamAdvanced />,
  },
  {
    path: "/services/UdyamCertificateOCR",
    element: <UdyamCertificateOCR />,
  },
];

export default msme_verifyRoutes;
