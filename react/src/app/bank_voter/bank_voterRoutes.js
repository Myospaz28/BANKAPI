import { lazy } from "react";

const FetchVoterDetails = lazy(() => import("./FetchVoterDetails.jsx"));
const FetchVoterMeson = lazy(() => import("./FetchVoterMeson.jsx"));


const bank_voterRountes = [

  { path: "/voter/FetchVoterDetails", element: <FetchVoterDetails /> },

  { path: "/voter/FetchDetailsMeson", element: <FetchVoterMeson /> },
];

export default bank_voterRountes;
