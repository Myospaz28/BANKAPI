import { lazy } from "react";


const FetchPanDetailed = lazy(() => import("./FetchPanDetailed.jsx"))
const FetchPanLite = lazy(() => import("./FetchPanLite.jsx"))
const FetchPanName = lazy(() => import("./FetchPanName.jsx"))
const VerifyBusinessPan = lazy(() => import("./VerifyBusinessPan.jsx"))
const ValidatePanDetails = lazy(() => import("./ValidatePanDetails.jsx"))
const FetchPanEssentials = lazy(() => import("./FetchPanEssentials.jsx"))
const PullPan = lazy(() => import("./PullPan.jsx"))

const bank_serviceRountes = [

  { path: "/pan/FetchPanDetailed", element: <FetchPanDetailed /> },
  { path: "/pan/FetchPanLite", element: <FetchPanLite /> },
  { path: "/pan/FetchNameOnPan", element: <FetchPanName /> },
  { path: "/pan/VerifyBusinessPan", element: <VerifyBusinessPan /> },
  { path: "/pan/ValidatePanDetails", element: <ValidatePanDetails /> },
  { path: "/pan/FetchPanEssentials", element: <FetchPanEssentials /> },
  { path: "/pan/PullPan", element: <PullPan /> },
];


export default bank_serviceRountes;
