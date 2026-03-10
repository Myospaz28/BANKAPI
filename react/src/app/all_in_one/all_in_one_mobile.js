import { lazy } from "react";

const UnifiedMobileLookup = lazy(()=> import("./UnifiedMobileLookup.jsx"))

const all_in_one_mobile = [
  { path: "/company/UnifiedMobileLookup", element: <UnifiedMobileLookup /> },
];

export default all_in_one_mobile;
