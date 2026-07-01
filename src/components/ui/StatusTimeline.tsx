/* =====================================================================
   StatusTimeline — the Sent → Paid → Deed Issued timeline on the
   application detail view. The reached stage is "current"; earlier stages
   are "done"; later stages are "todo".
   ===================================================================== */
import { Icon } from './Icon';

export interface TimelineStep {
  label: string;
  date: string;
  note: string;
}

export function StatusTimeline({ steps, reached }: { steps: TimelineStep[]; reached: number }) {
  return (
    <div className="timeline">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < reached ? 'done' : n === reached ? 'current' : 'todo';
        return (
          <div className={`tl-step tl-step--${state}`} key={s.label}>
            <div className="tl-step__node">{state !== 'todo' && <Icon name="check" strokeWidth={2.4} />}</div>
            <div className="tl-step__label">{s.label}</div>
            <div className="tl-step__date">{s.date}</div>
            <div className="tl-step__note">{s.note}</div>
          </div>
        );
      })}
    </div>
  );
}
