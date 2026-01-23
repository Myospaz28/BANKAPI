import { lazy } from "react";


const FetchPanDetailed = lazy(() => import("./FetchPanDetailed.jsx"))
const FetchPanLite = lazy(() => import("./FetchPanLite.jsx"))

const bank_panRountes = [

  { path: "/pan/FetchPanDetailed", element: <FetchPanDetailed /> },
  { path: "/pan/FetchPanLite", element: <FetchPanLite /> },

];

export default bank_panRountes;
