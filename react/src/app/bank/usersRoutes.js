import { lazy } from "react";
// import AadharCard from "./AadharCard.jsx";

const AddUser = lazy(() => import("./AddUser.jsx"));
const AdminAddUser = lazy(() => import("./AdminAddUser.jsx"));
const CriminalRecords = lazy(() => import("./CriminalRecords.jsx"));
const AadharCard = lazy(() => import("./AadharCard.jsx"));
const DrivingLience = lazy(() => import("./DrivingLience.jsx"));
const WalletPage = lazy(() => import("./WalletPage.jsx"));
const UserList = lazy(() => import("./UserList.jsx"));
const UserServices = lazy(() => import("./UserServices.jsx"));
const UserWallet = lazy(() => import("./UserWallet.jsx"));
const FetchPanByMobile = lazy(() => import("./FetchPanByMobile.jsx"));
const RcVerification = lazy(() => import("./RcVerification.jsx"));
const CCRVFetchReport = lazy(() => import("./CCRVFetchReport.jsx"));
const GSTINVerification = lazy(() => import("./GSTINVerification.jsx"));
const BankAccountVerification = lazy(() => import("./BankAccountVerification.jsx"));
const UserCategoryServices = lazy(() => import("./UserCategoryServices.jsx"));
const UserReport = lazy(() => import("./UserReport.jsx"));
const UserWalletStatement = lazy(() => import("./UserWalletStatement.jsx"));
const UserLoginLogs = lazy(() => import("./UserLoginLogs.jsx"));

const usersRoutes = [
  { path: "/users/add", element: <AddUser /> },
  { path: "/users/add-admin", element: <AdminAddUser /> },
  { path: "/users/user-list", element: <UserList /> },
  { path: "/users/:userId/services", element: <UserServices /> },
  { path: "/users/:userId/wallet", element: <UserWallet /> },
  { path: "/services/criminalrecords", element: <CriminalRecords /> },
  { path: "/services/aadharcard", element: <AadharCard /> },
  { path: "/services/drivinglicence", element: <DrivingLience /> },
  { path: "/services/panbymobile", element: <FetchPanByMobile /> },
  { path: "/services/walletpage", element: <WalletPage /> },
  { path: "/services/rcverification", element: <RcVerification /> },
  { path: "/services/CCRVFetchReport", element: <CCRVFetchReport /> },
  { path: "/services/GSTINVerification", element: <GSTINVerification /> },
  { path: "/services/bankaccountverification", element: <BankAccountVerification /> },
  { path: "/services/UserCategoryServices", element: <UserCategoryServices /> },
  { path: "/report/userReport", element: <UserReport /> },
  { path: "/users/:userId/wallet-statement", element: <UserWalletStatement /> },
  { path: "/users/:userId/logs", element: <UserLoginLogs /> }
];


export default usersRoutes;
