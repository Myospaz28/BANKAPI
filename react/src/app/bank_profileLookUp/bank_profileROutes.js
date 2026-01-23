import { lazy } from "react";

const FetchPersonalProfile = lazy( () => import("./FetchPersonalProfile.jsx"),);
const FetchNationalIdsByPhone = lazy( () => import("./FetchNationalIdsByPhone.jsx"),);
const FetchAddressByPhone = lazy( () => import("./FetchAddressByPhone.jsx"),);
const FetchPanByPhone = lazy( () => import("./FetchPanByPhone.jsx"),);

const bank_profileRountes = [
  { path: "/services/FetchPersonalProfile", element: <FetchPersonalProfile />, },
  { path: "/services/FetchNationalIdsByPhone", element: <FetchNationalIdsByPhone />, },
  { path: "/services/FetchAddressByPhone", element: <FetchAddressByPhone />, },
  { path: "/services/FetchPanByPhone", element: <FetchPanByPhone />, },
];

export default bank_profileRountes;
