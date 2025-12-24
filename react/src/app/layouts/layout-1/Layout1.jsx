import { Fragment, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import merge from "lodash/merge";
import clsx from "clsx";

import Layout1Header from "./header";
import Layout1Sidenav from "./sidebar";
import Footer from "../shared/Footer";

import Loading from "app/components/Loading";
import GullSearch from "app/layouts/shared/GullSearch";
import { setLayoutSettings } from "app/redux/layout/layoutSlice";

export default function Layout1({ children }) {
  const dispatch = useDispatch();
  const { settings } = useSelector((state) => state.layout);

  const { layout1Settings, footer } = settings || {};

  const handleSearchBoxClose = () => {
    const merged = merge({}, settings, {
      layout1Settings: { searchBox: { open: false } }
    });

    dispatch(setLayoutSettings(merged));
  };

  return (
    <Fragment>
      <div className="app-admin-wrap layout-sidebar-large">
        {/* HEADER  */}
        <Layout1Header />

        {/* NAVIGATION SIDEBAR */}
        <Layout1Sidenav />

        <div
          className={clsx("main-content-wrap d-flex flex-column", {
            "sidenav-open": layout1Settings.leftSidebar.open
          })}>
          <Suspense fallback={<Loading />}>
            <div className="main-content">{children}</div>
          </Suspense>

          {/* FOOTER AREA */}
          {footer.show ? <Footer /> : null}
        </div>
      </div>

      {/* SEARCH AREA MODAL */}
      <GullSearch open={layout1Settings.searchBox.open} handleClose={handleSearchBoxClose} />
    </Fragment>
  );
}
