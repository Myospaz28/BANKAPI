import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import merge from "lodash/merge";

import { isMobile } from "@utils";

import { navigations } from "app/navigations";
import { setLayoutSettings } from "app/redux/layout/layoutSlice";

export default function useSidebar() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { settings } = useSelector((state) => state.layout);

  const { open, secondaryNavOpen } = settings.layout2Settings.leftSidebar || {};

  const [state, setState] = useState({
    navOpen: true,
    selectedItem: {},
    secondaryNavOpen: false
  });

  const setSelected = (selectedItem) => {
    setState({ selectedItem });
  };

  const findSelectedItem = useCallback(() => {
    function findItem(navigations, pathname) {
      for (const item of navigations) {
        if (item.path === pathname) return item;

        if (item.sub) {
          const selectedSubItem = findItem(item.sub, pathname);
          if (selectedSubItem) return item;
        }
      }

      return null;
    }

    const selectedItem = findItem(navigations, location.pathname);
    if (selectedItem) setSelected(selectedItem);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSecSidenav = useCallback(() => {
    const merged = merge({}, settings, {
      layout2Settings: {
        leftSidebar: { open: true, secondaryNavOpen: true }
      }
    });

    dispatch(setLayoutSettings(merged));
  }, [dispatch, settings]);

  const closeSecSidenav = useCallback(() => {
    const other = {};

    if (isMobile()) {
      other.open = false;
    }

    const merged = merge({}, settings, {
      layout2Settings: {
        leftSidebar: { ...other, secondaryNavOpen: false }
      }
    });

    dispatch(setLayoutSettings(merged));
  }, [dispatch, settings]);

  const onMainItemMouseEnter = (item) => {
    setSelected(item);
  };

  useEffect(() => {
    findSelectedItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const listener = () => {
      if (window.innerWidth < 1200) closeSecSidenav();
      else openSecSidenav();
    };

    window.addEventListener("resize", listener);

    return () => window.removeEventListener("resize", listener);
  }, [openSecSidenav, closeSecSidenav]);

  return {
    open,
    state,
    secondaryNavOpen,
    closeSecSidenav,
    onMainItemMouseEnter
  };
}
