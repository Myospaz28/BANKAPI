import { lazy } from "react";

const FetchGenerateMrz = lazy(() => import("./FetchGenerateMrz.jsx"));

const FetchPassportOcr = lazy(() => import("./FetchPassportOcr.jsx"));

const FetchPassportDetails = lazy(() => import("./FetchPassportDetails.jsx"));

const VerifyMrz = lazy(() => import("./VerifyMrz.jsx"));

const FetchPassportVerify = lazy(() => import("./FetchPassportVerify.jsx"));

const passport_verifyRoutes = [
  {
    path: "/services/FetchGenerateMrz",
    element: <FetchGenerateMrz />,
  },
  {
    path: "/services/FetchPassportOcr",
    element: <FetchPassportOcr />,
  },
  {
    path: "/services/FetchPassportDetails",
    element: <FetchPassportDetails />,
  },
  {
    path: "/services/VerifyMrz",
    element: <VerifyMrz />,
  },
  {
    path: "/services/FetchPassportVerify",
    element: <FetchPassportVerify />,
  },
];

export default passport_verifyRoutes;
