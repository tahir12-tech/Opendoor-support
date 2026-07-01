/* =====================================================================
   Modal — the shared scrim + dialog used by org, application detail,
   partners, users and help. Closes on scrim click and Escape. Rendered in
   a portal so it stacks above the app shell.
   ===================================================================== */
import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './Modal.css';

export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  width,
  bodyStyle,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  bodyStyle?: React.CSSProperties;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-scrim is-open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} style={width ? { maxWidth: width } : undefined}>
        <div className="modal__head">
          <div>
            <div className="modal__title" id={titleId}>{title}</div>
            {sub != null && <div className="modal__sub">{sub}</div>}
          </div>
          <button className="modal__close" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal__body" style={bodyStyle}>{children}</div>
        {footer != null && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
