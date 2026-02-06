import { lazy } from "react";


const  FetchCompany = lazy(() => import("./FetchCompany.jsx"))
const  FetchCinByPan = lazy(() => import("./FetchCinByPan.jsx"))
const  FetchDirector = lazy(() => import("./FetchDirector.jsx"))
const  FetchCompanybyName = lazy(() => import("./FetchCompanyByName.jsx"))
const  FetchDinByPan = lazy(() => import("./FetchDinByPan.jsx"))
const  FetchTan = lazy(() => import("./FetchTan.jsx"))

const bank_companyRoutes = [

  { path: "/company/FetchCompany", element: <FetchCompany /> },
  { path: "/company/FetchCinByPan", element: <FetchCinByPan /> },
  { path: "/company/FetchDirector", element: <FetchDirector /> },
  { path: "/company/FetchCompanybyName", element: <FetchCompanybyName /> },
  { path: "/company/FetchDinbyPan", element: <FetchDinByPan /> },
  { path: "/company/TanVerfication", element: <FetchTan /> },
];

export default bank_companyRoutes;
