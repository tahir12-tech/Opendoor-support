/* Card / panel primitives (.card, .card__head/body/foot). */
import type { CSSProperties, ReactNode } from 'react';

interface Base {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, className, style }: Base) {
  return <div className={`card${className ? ` ${className}` : ''}`} style={style}>{children}</div>;
}

/** Card header with a title + optional subtitle on the left and actions on the right. */
export function CardHead({ title, sub, actions, titleId, subId }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; titleId?: string; subId?: string }) {
  return (
    <div className="card__head">
      <div>
        <div className="card__title" id={titleId}>{title}</div>
        {sub != null && <div className="card__sub" id={subId}>{sub}</div>}
      </div>
      {actions}
    </div>
  );
}

export function CardBody({ children, className, style }: Base) {
  return <div className={`card__body${className ? ` ${className}` : ''}`} style={style}>{children}</div>;
}

export function CardFoot({ children, className, style }: Base) {
  return <div className={`card__foot${className ? ` ${className}` : ''}`} style={style}>{children}</div>;
}
