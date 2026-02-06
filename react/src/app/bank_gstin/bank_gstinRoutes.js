import { lazy } from "react";

const FetchGstinLite = lazy(() => import("./FetchGstinLite.jsx"))
const FetchGstinDetailed = lazy(() => import("./FetchGstinDetailed.jsx"))
const FetchGstinByMobile = lazy(() => import("./FetchGstinByMobile.jsx"))
const FetchGstinContactDetails = lazy(() => import("./FetchGstinContactDetails.jsx"))
const FetchGstinByPan = lazy(() => import("./FetchGstinByPan.jsx"))
const FetchGstinMccCodes = lazy(() => import("./FetchGstinMccCodes.jsx"))


const bank_gstinRountes = [

  { path: "/gstin/FetchGstinLite", element: <FetchGstinLite /> },
  { path: "/gstin/FetchGstinDetailed", element: <FetchGstinDetailed /> },
  { path: "/gstin/FetchGstinByMobile", element: <FetchGstinByMobile /> },
  { path: "/gstin/FetchGstinContactDetails", element: <FetchGstinContactDetails /> },
  { path: "/gstin/FetchGstinByPan", element: <FetchGstinByPan /> },
  { path: "/gstin/FetchGstinMccCodes", element: <FetchGstinMccCodes /> },

];

export default bank_gstinRountes;
