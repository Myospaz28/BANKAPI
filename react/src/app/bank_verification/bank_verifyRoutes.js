import { lazy } from "react";

const FetchBankAccountVerifyHybrid = lazy(
  () => import("./FetchBankAccountVerifyHybrid.jsx"),
);

const FetchBankAccountVerifyPenniless = lazy(
  () => import("./FetchBankAccountVerifyPenniless.jsx"),
);

const UploadBankStatement = lazy(() => import("./UploadBankStatement.jsx"));

const FetchVerifyIfsc = lazy(() => import("./FetchVerifyIfsc.jsx"));

const FetchBankAccountVerify = lazy(
  () => import("./FetchBankAccountVerify.jsx"),
);

const BankStatementOCR = lazy(() => import("./BankStatementOCR.jsx"));

const ChequeOCR = lazy(() => import("./ChequeOCR.jsx"));

const SalarySlipOCR = lazy(() => import("./SalarySlipOCR.jsx"));

const bank_verifyRoutes = [
  {
    path: "/services/FetchBankAccountVerifyHybrid",
    element: <FetchBankAccountVerifyHybrid />,
  },
  {
    path: "/services/FetchBankAccountVerifyPenniless",
    element: <FetchBankAccountVerifyPenniless />,
  },
  {
    path: "/services/FetchVerifyIfsc",
    element: <FetchVerifyIfsc />,
  },
  {
    path: "/services/UploadBankStatement",
    element: <UploadBankStatement />,
  },
  {
    path: "/services/FetchBankAccountVerify",
    element: <FetchBankAccountVerify />,
  },
  {
    path: "/services/BankStatementOCR",
    element: <BankStatementOCR />,
  },
  {
    path: "/services/ChequeOCR",
    element: <ChequeOCR />,
  },
  {
    path: "/services/SalarySlipOCR",
    element: <SalarySlipOCR />,
  },
];

export default bank_verifyRoutes;
