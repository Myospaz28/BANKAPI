import { lazy } from "react";


const  CcrvRapid = lazy(() => import("./CcrvRapid.jsx"))


const bank_ccrvRoutes = [

  { path: "/company/CcrvRapid", element: <CcrvRapid /> },

];

export default bank_ccrvRoutes;
