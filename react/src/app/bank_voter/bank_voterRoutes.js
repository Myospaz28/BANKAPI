import { lazy } from "react";

const FetchVoterDetails = lazy(() => import("./FetchVoterDetails.jsx"));
const FetchVoterMeson = lazy(() => import("./FetchVoterMeson.jsx"));
const FetchVoterOCR =lazy(() => import("./FetchVoterOcr.jsx"));

const bank_serviceRountes = [

  { path: "/voter/FetchVoterDetails", element: <FetchVoterDetails /> },

  { path: "/voter/FetchDetailsMeson", element: <FetchVoterMeson /> },

  { path: "/voter/VoterIdOcr", element: <FetchVoterOCR /> },
];

export default bank_serviceRountes;
