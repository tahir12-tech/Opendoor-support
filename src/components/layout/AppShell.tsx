/* =====================================================================
   AppShell — the authenticated layout the prototype's portal.js injected:
   sticky sidebar + topbar + scrollable content, with an off-canvas nav
   drawer on tablet/mobile. Wraps pages in PageMetaProvider so each screen
   can set its title, breadcrumbs and active nav item.
   ===================================================================== */
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PageMetaProvider } from './pageMeta';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('sb-open', drawerOpen);
    return () => document.body.classList.remove('sb-open');
  }, [drawerOpen]);

  // Close the drawer on Escape (matches portal.js).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PageMetaProvider>
      <div className="app">
        <aside className="sb">
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </aside>
        <div className="main">
          <header className="topbar">
            <Topbar onMenu={() => setDrawerOpen((v) => !v)} />
          </header>
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
      <div className="sb-scrim" onClick={() => setDrawerOpen(false)} />
    </PageMetaProvider>
  );
}
