import { lazy } from "react";

const FetchPersonalProfile = lazy( () => import("./FetchPersonalProfile.jsx"),);
const FetchNationalIdsByPhone = lazy( () => import("./FetchNationalIdsByPhone.jsx"),);
const FetchAddressByPhone = lazy( () => import("./FetchAddressByPhone.jsx"),);
const FetchPanByPhone = lazy( () => import("./FetchPanByPhone.jsx"),);
const FetchMobileLookup = lazy( () => import("./FetchMobileLookup.jsx"),);
const FetchMobileNumberAge = lazy( () => import("./FetchMobileNumberAge.jsx"),);
const FetchDigitalFootprint = lazy( () => import("./FetchDigitalFootprint.jsx"),);
const FetchEntityLinkage = lazy( () => import("./FetchEntityLinkage.jsx"),);
const FetchElectricityBill = lazy( () => import("./FetchElectricityBill.jsx"),);
const FetchMobilePrefill = lazy( () => import("./FetchMobilePrefill.jsx"),);
const FetchMobileNameLookup = lazy( () => import("./FetchMobileNameLookup.jsx"),);
const PanLookupByMobile = lazy( () => import("./PanLookupByMobile.jsx"),);


const bank_profileRountes = [
  { path: "/services/FetchPersonalProfile", element: <FetchPersonalProfile />, },
  { path: "/services/FetchNationalIdsByPhone", element: <FetchNationalIdsByPhone />, },
  { path: "/services/FetchAddressByPhone", element: <FetchAddressByPhone />, },
  { path: "/services/FetchPanByPhone", element: <FetchPanByPhone />, },
  { path: "/services/FetchMobileLookup", element: <FetchMobileLookup />, },
  { path: "/services/FetchMobileNumberAge", element: <FetchMobileNumberAge />, },
  { path: "/services/FetchDigitalFootprint", element: <FetchDigitalFootprint />, },
  { path: "/services/FetchEntityLinkage", element: <FetchEntityLinkage />, },
  { path: "/services/FetchElectricityBill", element: <FetchElectricityBill />, },
  { path: "/services/FetchMobilePrefill", element: <FetchMobilePrefill />, },
  { path: "/services/FetchMobileNameLookup", element: <FetchMobileNameLookup />, },
  { path: "/services/PanLookupByMobile", element: <PanLookupByMobile />, },
];

export default bank_profileRountes;
