import { NavLink } from "react-router-dom";
import ScrollBar from "react-perfect-scrollbar";
import clsx from "clsx";
import { useSelector } from "react-redux";

import DropDownMenu from "app/components/DropDownMenu";
import { navigations } from "app/navigations";
import useSidebar from "./useSidebar";

export default function Layout1Sidenav() {
  const { open, state, secondaryNavOpen, closeSecSidenav, onMainItemMouseEnter } =
    useSidebar();

  const { sub } = state.selectedItem || {};

  // ✅ get role from redux
  const userRole = useSelector((state) => state.auth.user?.role);

  // ✅ filter menus by role
  const filteredNavigations = navigations.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <div className="side-content-wrap">
      {/* PRIMARY SIDEBAR */}
      <ScrollBar className={clsx("sidebar-left o-hidden rtl-ps-none", { open })}>
        <ul className="navigation-left">
          {filteredNavigations.map((item, i) => (
            <li
              key={i}
              onMouseEnter={() => onMainItemMouseEnter(item)}
              className={clsx("nav-item", {
                active: state.selectedItem === item,
              })}
            >
              {item.path && item.type !== "extLink" && (
                <NavLink className="nav-item-hold" to={item.path}>
                  <i className={`nav-icon ${item.icon}`} />
                  <span className="nav-text">{item.name}</span>
                </NavLink>
              )}

              {item.path && item.type === "extLink" && (
                <a className="nav-item-hold" href={item.path}>
                  <i className={`nav-icon ${item.icon}`} />
                  <span className="nav-text">{item.name}</span>
                </a>
              )}

              {!item.path && (
                <div className="nav-item-hold">
                  <i className={`nav-icon ${item.icon}`} />
                  <span className="nav-text">{item.name}</span>
                </div>
              )}

              <div className="triangle" />
            </li>
          ))}
        </ul>
      </ScrollBar>

      {/* SECONDARY SIDEBAR */}
      <ScrollBar
        className={clsx("sidebar-left-secondary o-hidden rtl-ps-none", {
          open: secondaryNavOpen,
        })}
      >
        {sub && <DropDownMenu menu={sub} closeSecSidenav={closeSecSidenav} />}
        <span />
      </ScrollBar>

      <div
        onMouseEnter={closeSecSidenav}
        className={clsx("sidebar-overlay", { open: secondaryNavOpen })}
      />
    </div>
  );
}