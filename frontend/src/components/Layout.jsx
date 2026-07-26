import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useSidebar } from '../hooks/useSidebar';

/** Product shell — light canvas, committed. */
function Layout({ children }) {
  const { isDesktop, collapsed, toggleCollapsed, mobileOpen, closeMobile, toggleMobile } = useSidebar();
  const { pathname } = useLocation();

  /* A route change on mobile should never leave the drawer covering the page. */
  useEffect(() => {
    if (!isDesktop) closeMobile();
  }, [pathname, isDesktop, closeMobile]);

  return (
    <div className="surface-light flex min-h-screen">
      <Sidebar
        isOpen={mobileOpen}
        collapsed={collapsed}
        onClose={closeMobile}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={toggleMobile} sidebarOpen={mobileOpen} />
        {/* Both wrappers are flex columns so a page marked `.workspace` can
            claim the leftover viewport height instead of stranding the footer
            halfway up a tall screen. */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div key={pathname} className="animate-rise flex flex-1 flex-col">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default Layout;
