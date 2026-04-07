import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Navbar from "./Navbar";

function Layout() {
  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Navbar />
      <main className="page-shell">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;

