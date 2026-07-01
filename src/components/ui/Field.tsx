/* =====================================================================
   Field (.field) — label + control + optional hint layout.
   Wraps native <input>/<select>/<textarea> so the prototype's form markup
   is reproduced exactly while keeping controls uncontrolled/controlled as
   each screen needs.
   ===================================================================== */
import type { CSSProperties, ReactNode } from 'react';

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
  style,
  span2,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  span2?: boolean;
}) {
  const cls = ['field'];
  if (span2) cls.push('span-2');
  if (className) cls.push(className);
  return (
    <div className={cls.join(' ')} style={style}>
      {label != null && (
        <label htmlFor={htmlFor}>
          {label}
          {hint != null && <> <span className="hint">{hint}</span></>}
        </label>
      )}
      {children}
      {label == null && hint != null && <span className="hint">{hint}</span>}
    </div>
  );
}
