import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Team", to: "/team" },
  { label: "Events", to: "/events" },
  { label: "Projects", to: "/projects" },
  { label: "Join", to: "/join" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <NavLink className="brand" to="/">
          <span className="brand-mark">KP</span>
          <span>
            <strong>KP Dev Cell</strong>
            <small>Build. Learn. Ship.</small>
          </span>
        </NavLink>

        <button
          className="menu-toggle"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle navigation"
        >
          Menu
        </button>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              to={item.to}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <NavLink
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                to="/admin"
                onClick={() => setOpen(false)}
              >
                Admin
              </NavLink>
              <button
                className="button button-ghost button-small"
                type="button"
                onClick={async () => {
                  await signOut();
                  setOpen(false);
                }}
              >
                {location.pathname === "/admin" ? "Lock dashboard" : "Sign out"}
              </button>
            </>
          ) : (
            <NavLink className="button button-small" to="/login" onClick={() => setOpen(false)}>
              Admin Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;

