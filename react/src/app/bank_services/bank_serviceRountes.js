import { lazy } from "react";

const RcFetchDetailed = lazy(() => import("./RcFetchDetailed.jsx"));
const RcLookupByMobile = lazy(() => import("./RcLookupByMobile.jsx"));
const RcFetchLite = lazy(() => import("./RcFetchLite.jsx"));
const RcFetchContact = lazy(() => import("./RcFetchContact.jsx"));
const RcFetchRegByChassis = lazy(() => import("./RcFetchRegByChassis.jsx"));
const FastagFetchDetailed = lazy(() => import("./FastagFetchDetailed.jsx"));
const FetchRcEchallan = lazy(() => import("./FetchRcEchallan.jsx"));
const RcFetchDetailedByChassis = lazy(() => import("./RcFetchDetailedByChassis.jsx"));


const bank_serviceRountes = [

  { path: "/services/RcFetchDetailed", element: <RcFetchDetailed /> },
  { path: "/services/RcLookupByMobile", element: <RcLookupByMobile /> },
  { path: "/services/RcFetchLite", element: <RcFetchLite /> },
  { path: "/services/RcFetchContact", element: <RcFetchContact /> },
  { path: "/services/RcFetchRegByChassis", element: <RcFetchRegByChassis /> },
  { path: "/services/FastagFetchDetailed", element: <FastagFetchDetailed /> },
  { path: "/services/FetchRcEchallan", element: <FetchRcEchallan /> },
  { path: "/services/RcFetchDetailedByChassis", element: <RcFetchDetailedByChassis /> },
];

export default bank_serviceRountes;
