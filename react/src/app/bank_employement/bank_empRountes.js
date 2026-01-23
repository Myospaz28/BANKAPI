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
];

export default bank_empRountes;
