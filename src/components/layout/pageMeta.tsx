/* =====================================================================
   Page meta context — replaces the prototype's window.PORTAL_PAGE.
   Each screen calls usePageMeta({ active, title, crumbs }) so the sidebar
   highlights the right item and the topbar shows the title + breadcrumbs.
   ===================================================================== */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface PageMeta {
  active: string;
  title: string;
  crumbs: string[];
}

interface PageMetaCtx {
  meta: PageMeta;
  setMeta: (meta: PageMeta) => void;
}

const DEFAULT: PageMeta = { active: 'dashboard', title: '', crumbs: [] };
const Ctx = createContext<PageMetaCtx | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>(DEFAULT);
  const value = useMemo(() => ({ meta, setMeta }), [meta]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function usePageMetaCtx(): PageMetaCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('page meta used outside AppShell');
  return ctx;
}

/** Read the current meta (topbar + sidebar). */
export function usePageMetaValue(): PageMeta {
  return usePageMetaCtx().meta;
}

/** Set the page meta from a screen. */
export function usePageMeta(active: string, title: string, crumbs: string[]): void {
  const { setMeta } = usePageMetaCtx();
  // crumbs is a new array each render; join to a stable dep.
  const crumbKey = crumbs.join('›');
  useEffect(() => {
    setMeta({ active, title, crumbs });
    document.title = `${title} | Guarantee Referral Portal`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, title, crumbKey, setMeta]);
}
