import { lazy } from "react";

const FetchBankAccountVerifyHybrid = lazy(
  () => import("./FetchBankAccountVerifyHybrid.jsx"),
);

const FetchBankAccountVerifyPenniless = lazy(
  () => import("./FetchBankAccountVerifyPenniless.jsx"),
);

const bank_verifyRoutes = [
  {
    path: "/services/FetchBankAccountVerifyHybrid",
    element: <FetchBankAccountVerifyHybrid />,
  },
  {
    path: "/services/FetchBankAccountVerifyPenniless",
    element: <FetchBankAccountVerifyPenniless />,
  },
];

export default bank_verifyRoutes;
