import type { ApplicationEventItem } from '../../types/agent';

const EVENT_LABELS: Record<string, string> = {
  'application.created': 'Job added',
  'job.parsed': 'Read the job posting',
  'job.parse_failed': 'Could not read the job',
  'score.computed': 'Scored your fit',
  'score.failed': 'Scoring failed',
  'decision.approved': 'You approved',
  'decision.skipped': 'You skipped',
  'decision.gate_override': 'You approved despite a failed requirement',
  'application.rescore_requested': 'Re-score requested',
  'queue.dead': 'Stopped after repeated errors',
  'legacy.event': 'Earlier activity'
};

export default function EventTimeline({ events }: { events: ApplicationEventItem[] }) {
  if (!events.length) return null;
  return (
    <section>
      <h4 className="aa-score-subtitle">Activity</h4>
      <ol className="aa-timeline">
        {events.map(event => (
          <li key={event.id}>
            <span className="aa-timeline-dot" aria-hidden="true" />
            <div>
              <strong>{EVENT_LABELS[event.type] ?? event.type}</strong>
              {event.message && <p>{event.message}</p>}
              <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
