import { Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import merge from "lodash/merge";
import clsx from "clsx";

import Layout2Header from "./header";
import Layout2Sidenav from "./sidebar";
import Footer from "../shared/Footer";

import Loading from "app/components/Loading";
import GullSearch from "app/layouts/shared/GullSearch";
import { setLayoutSettings } from "app/redux/layout/layoutSlice";

export default function Layout2({ children }) {
  const dispatch = useDispatch();
  const { settings } = useSelector((state) => state.layout);

  const { leftSidebar, header, searchBox } = settings.layout2Settings;

  const handleSearchBoxClose = () => {
    const merged = merge({}, settings, {
      layout2Settings: { searchBox: { open: false } }
    });

    dispatch(setLayoutSettings(merged));
  };

  return (
    <div>
      <div
        className={clsx("app-admin-wrap layout-sidebar-compact clearfix", {
          "sidenav-open": leftSidebar.open,
          [leftSidebar.theme]: true
        })}>
        <Layout2Sidenav />

        <div
          className={clsx("main-content-wrap d-flex flex-column", {
            "sidenav-open": leftSidebar.open
          })}>
          {/* HEADER SECTION */}
          {header.show ? <Layout2Header /> : null}

          <Suspense fallback={<Loading />}>
            <div className="main-content">{children}</div>
          </Suspense>

          {/* FOOTER SECTION */}
          <Footer />
        </div>
      </div>

      <GullSearch open={searchBox.open} handleClose={handleSearchBoxClose} />
    </div>
  );
}
