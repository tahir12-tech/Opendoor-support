import { useEffect } from 'react';

/** Sets the document title (used by the pre-auth pages that sit outside AppShell). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | Guarantee Referral Portal`;
  }, [title]);
}
