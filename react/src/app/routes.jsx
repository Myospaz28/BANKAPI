import { createBrowserRouter, redirect } from "react-router-dom";

import AuthGuard from "./auth/AuthGuard";

import dashboardRoutes from "./views/dashboard/dashboardRoutes";
import pagesRoutes from "./views/pages/pagesRoutes";
import iconsRoutes from "./views/icons/iconsRoutes";
import formsRoutes from "./views/forms/formsRoutes";
import chartsRoute from "./views/charts/chartsRoute";
import uiKitsRoutes from "./views/ui-kits/uiKitsRoutes";
import widgetsRoute from "./views/widgets/widgetsRoute";
import dataTableRoute from "./views/data-table/dataTableRoute";
import extraKitsRoutes from "./views/extra-kits/extraKitsRoutes";
import chatRoutes from "./views/app/chat/chatRoutes";
import inboxRoutes from "./views/app/inbox/inboxRoutes";
import invoiceRoutes from "./views/app/invoice/invoiceRoutes";
import contactRoutes from "./views/app/contact/contactRoutes";
import calendarRoutes from "./views/app/calendar/calendarRoutes";
import ecommerceRoutes from "./views/app/ecommerce/ecommerceRoutes";
import taskManagerRoutes from "./views/app/task-manager/taskManagerRoutes";


//priyanka
import usersRoutes from "./bank/usersRoutes";
import bank_serviceRountes from "./bank_services/bank_serviceRountes";
import bank_empRountes from "./bank_employement/bank_empRountes";
import bank_drivingRountes from "./bank_driving/bank_drivingRoutes";
import bank_profileRountes from "./bank_profileLookUp/bank_profileROutes";
import bank_panRountes from "./bank_pan/bank_panRoutes";
import bank_voterRountes from "./bank_voter/bank_voterRoutes";
import bank_verifyRoutes from "./bank_verification/bank_verifyRoutes";
import Error404 from "./views/sessions/Error";
import sessionsRoutes from "./views/sessions/sessionsRoutes";

export const protectedRoutes = [
  ...dashboardRoutes,
  ...uiKitsRoutes,
  ...formsRoutes,
  ...widgetsRoute,
  ...chartsRoute,
  ...dataTableRoute,
  ...extraKitsRoutes,
  ...pagesRoutes,
  ...iconsRoutes,
  ...invoiceRoutes,
  ...inboxRoutes,
  ...calendarRoutes,
  ...taskManagerRoutes,
  ...ecommerceRoutes,
  ...contactRoutes,
  ...chatRoutes,
  ...usersRoutes,
  ...bank_serviceRountes,
  ...bank_empRountes,
  ...bank_drivingRountes,
  ...bank_profileRountes,
  ...bank_panRountes,
  ...bank_voterRountes,
  ...bank_verifyRoutes,
];


const routes = createBrowserRouter([
  {
    element: <AuthGuard />,
    children: protectedRoutes
  },
  ...sessionsRoutes,
  { path: "/", loader: () => redirect("/dashboard/v1") },
  { path: "*", element: <Error404 /> }
]);

export default routes;
