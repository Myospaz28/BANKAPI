import { lazy } from "react";


const FetchEmploymentHistory = lazy(
  () => import("./FetchEmploymentHistory.jsx"),
);

const FetchLatestEmploymentByMobile = lazy(
  () => import("./FetchLatestEmploymentByMobile.jsx"),
);

const FetchLatestPassbookByMobile = lazy(
  () => import("./FetchLatestPassbookByMobile.jsx"),
);

const FetchUanProfileDetails = lazy(
  () => import("./FetchUanProfileDetails.jsx"),
);
const FetchUanFromMobile = lazy(() => import("./FetchUanFromMobile.jsx"));
const FetchUanByPan = lazy(() => import("./FetchUanByPan.jsx"))

const FetchEmployerVerify = lazy(() => import("./FetchEmployerVerify.jsx"));

const bank_empRountes = [
  {
    path: "/services/FetchEmploymentHistory",
    element: <FetchEmploymentHistory />,
  },
  {
    path: "/services/FetchLatestEmploymentByMobile",
    element: <FetchLatestEmploymentByMobile />,
  },
  {
    path: "/services/FetchLatestPassbookByMobile",
    element: <FetchLatestPassbookByMobile />,
  },
  {
    path: "/services/FetchUanProfileDetails",
    element: <FetchUanProfileDetails />,
  },
  {
    path: "/services/FetchEmployerVerify",
    element: <FetchEmployerVerify />,
  },
  {
    path: "/services/FetchUanFromMobile",
    element: <FetchUanFromMobile />,
  },
  {
    path: "/services/FetchUanByPan",
    element: <FetchUanByPan />,
  },
];

export default bank_empRountes;
