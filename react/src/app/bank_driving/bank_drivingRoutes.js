import { lazy } from "react";


const DlFetchDetails = lazy(() => import("./DlFetchDetails.jsx"))
const FetchDrivingLicenseOCR = lazy(() => import("./FetchDrivingLicenseOCR.jsx"))

const bank_drivingRountes = [

  { path: "/driving/DlFetchDetails", element: <DlFetchDetails /> },
{ path: "/driving/FetchDrivingLicenseOCR", element: <FetchDrivingLicenseOCR /> },

];

export default bank_drivingRountes;
