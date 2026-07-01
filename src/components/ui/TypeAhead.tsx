/* =====================================================================
   TypeAhead — a single select-or-add field (input + dropdown of options).
   Options are built by the parent (so it controls matching, "create new"
   rows and highlighting). Selection uses mousedown so it fires before the
   input blurs. The AgentBranchPicker composes two of these.
   ===================================================================== */
import { useRef, useState, type ReactNode } from 'react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

export interface TypeAheadOption {
  id: string;
  icon: ReactNode;
  main: ReactNode;
  sub?: string;
  isNew?: boolean;
  onSelect: () => void;
}

export interface TypeAheadProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  options: TypeAheadOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
}

/** Highlight the matched substring using the .typeahead__match style. */
export function highlightMatch(name: string, query: string): ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return name;
  const i = name.toLowerCase().indexOf(q);
  if (i === -1) return name;
  return (
    <>
      {name.slice(0, i)}
      <span className="typeahead__match">{name.slice(i, i + q.length)}</span>
      {name.slice(i + q.length)}
    </>
  );
}

export function TypeAhead({ id, value, onChange, onEnter, options, placeholder, disabled, emptyText = 'No matches' }: TypeAheadProps) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useOnClickOutside(wrap, () => setOpen(false), open);

  return (
    <div className="typeahead" ref={wrap}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter?.();
            setOpen(false);
          }
        }}
      />
      {open && (
        <div className="typeahead__menu">
          {options.length === 0 ? (
            <div className="typeahead__opt">
              <div className="typeahead__opt-sub">{emptyText}</div>
            </div>
          ) : (
            options.map((o) => (
              <div
                key={o.id}
                className={`typeahead__opt${o.isNew ? ' typeahead__opt--new' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  o.onSelect();
                  setOpen(false);
                }}
              >
                <span className="typeahead__opt-ic">{o.icon}</span>
                <div>
                  <div className="typeahead__opt-main">{o.main}</div>
                  {o.sub != null && <div className="typeahead__opt-sub">{o.sub}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
