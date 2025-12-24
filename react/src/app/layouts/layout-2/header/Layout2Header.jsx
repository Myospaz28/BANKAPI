import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import Dropdown from "react-bootstrap/Dropdown";

import useHeader from "./useHeader";
import { getTimeDifference } from "@utils";
import MegaMenu from "app/layouts/shared/MegaMenu";

import { logoutJWTUser } from "app/redux/auth/authSlice";

import { NOTIFICATIONS, SHORTCUT_MENUS } from "./data";

export default function Layout2Header() {
  const dispatch = useDispatch();
  const { handleMenuClick, toggleFullScreen, handleSearchBoxOpen } = useHeader();

  return (
    <div className="main-header">
      <div className="logo">
        <img src="/assets/images/logo.png" alt="Logo" />
      </div>

      <div className="menu-toggle" onClick={handleMenuClick}>
        <div />
        <div />
        <div />
      </div>

      <div className="d-none d-lg-flex align-items-center gap-3">
        {/* MEGA MENU BUTTON */}
        <Dropdown>
          <Dropdown.Toggle as="div" className="toggle-hidden cursor-pointer">
            Mega Menu
          </Dropdown.Toggle>

          <div className="mega-menu">
            <Dropdown.Menu className="mt-3">
              <MegaMenu />
            </Dropdown.Menu>
          </div>
        </Dropdown>

        {/* SEARCH BOX INPUT */}
        <div className="search-bar">
          <input type="text" placeholder="Search" onFocus={handleSearchBoxOpen} />
          <i className="search-icon text-muted i-Magnifi-Glass1" />
        </div>
      </div>

      <div className="m-auto" />

      <div className="header-part-right">
        {/* FULLSCREEN HANDLER */}
        <i
          datafullscreen="true"
          onClick={toggleFullScreen}
          className="i-Full-Screen header-icon d-none d-sm-inline-block"
        />

        {/* APPS MENU BAR */}
        <Dropdown>
          <Dropdown.Toggle as="span" className="toggle-hidden">
            <i className="i-Safe-Box text-muted header-icon" role="button" />
          </Dropdown.Toggle>

          <Dropdown.Menu className="mt-3">
            <div className="menu-icon-grid">
              {SHORTCUT_MENUS.map((menu) => (
                <Link key={menu.text} to={menu.link}>
                  <i className={menu.icon} /> {menu.text}
                </Link>
              ))}
            </div>
          </Dropdown.Menu>
        </Dropdown>

        {/* NOTIFICATION MENU BAR */}
        <Dropdown>
          <Dropdown.Toggle
            as="div"
            id="dropdownNotification"
            className="badge-top-container toggle-hidden">
            <span className="badge bg-primary cursor-pointer">3</span>
            <i className="i-Bell text-muted header-icon" />
          </Dropdown.Toggle>

          <Dropdown.Menu className="notification-dropdown mt-2">
            {NOTIFICATIONS.map((note, index) => (
              <div key={index} className="dropdown-item d-flex">
                <div className="notification-icon">
                  <i className={`${note.icon} text-${note.color} mr-1`} />
                </div>

                <div className="notification-details flex-grow-1">
                  <p className="m-0 d-flex align-items-center">
                    <span>{note.title}</span>

                    <span className={`badge rounded-pill bg-${note.color} ms-1 me-1`}>
                      {note.status}
                    </span>

                    <span className="flex-grow-1" />

                    <span className="text-small text-muted ms-auto">
                      {getTimeDifference(new Date(note.time))} ago
                    </span>
                  </p>

                  <p className="text-small text-muted m-0">{note.description}</p>
                </div>
              </div>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {/* USER PROFILE MENU BAR */}
        <div className="user col px-3">
          <Dropdown>
            <Dropdown.Toggle as="span" className="toggle-hidden cursor-pointer">
              <img src="/assets/images/faces/1.jpg" id="userDropdown" alt="User Profile" />
            </Dropdown.Toggle>

            <Dropdown.Menu className="mt-3">
              <Dropdown.Item>
                <i className="i-Lock-User me-1" /> Timothy Carlson
              </Dropdown.Item>

              <Dropdown.Item as={Link} to="/">
                <i className="i-Data-Settings me-1" /> Account settings
              </Dropdown.Item>

              <Dropdown.Item as={Link} to="/">
                <i className="i-Billing me-1" /> Billing history
              </Dropdown.Item>

              <Dropdown.Item as={Link} to="/" onClick={() => dispatch(logoutJWTUser())}>
                <i className="i-Lock-2 me-1" /> Sign out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
