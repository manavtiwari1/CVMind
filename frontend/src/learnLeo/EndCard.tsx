import { useState } from 'react';
import { ArrowLeft, Code2, MessagesSquare, BookOpen, Loader2 } from 'lucide-react';
import { LeoAvatar } from '../components/ResumeOnboarding';
import type { Lesson } from './learnLeoApi';

interface Props {
  lesson: Lesson;
  checkpointsDone: boolean;
  approachShown: boolean;
  onPractice: () => void;
  onFullApproach: () => Promise<void>;
  onBackToProblem: () => void;
  onNewLesson: () => void;
}

/** Shown after the last beat: the lesson summary and where to go next. */
export default function EndCard({ lesson, checkpointsDone, approachShown, onPractice, onFullApproach, onBackToProblem, onNewLesson }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dsa = lesson.source === 'dsa_problem';
  const hinglish = lesson.language === 'hinglish';

  const approach = async () => {
    setLoading(true);
    setError('');
    try {
      await onFullApproach();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the full approach.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ll-end ll-enter" aria-label="Lesson complete">
      <div className="ll-end-head">
        <LeoAvatar size={52} pose="cheer" />
        <div>
          <h3>{hinglish ? 'Lesson complete! Shabaash.' : 'Lesson complete. Well done!'}</h3>
          <p>{lesson.topic}</p>
        </div>
      </div>
      {lesson.summary && <p className="ll-end-summary">{lesson.summary}</p>}

      <div className="ll-end-actions">
        {dsa ? (
          <>
            <button type="button" className="ll-btn ll-btn-primary" onClick={onBackToProblem}>
              <ArrowLeft size={17} /> Back to problem
            </button>
            {!approachShown && (
              <button type="button" className="ll-btn" onClick={approach} disabled={!checkpointsDone || loading} title={checkpointsDone ? '' : 'Answer the checkpoint to unlock'}>
                {loading ? <Loader2 size={17} className="ll-spin" /> : <Code2 size={17} />} Show full approach
              </button>
            )}
          </>
        ) : (
          <button type="button" className="ll-btn ll-btn-primary" onClick={onPractice}>
            <MessagesSquare size={17} /> Practice this in Interview Prep
          </button>
        )}
        <button type="button" className="ll-btn" onClick={onNewLesson}>
          <BookOpen size={17} /> Learn another topic
        </button>
      </div>
      {dsa && !checkpointsDone && !approachShown && <p className="ll-muted">Answer the checkpoint above to unlock the full approach.</p>}
      {error && <p className="ll-error" role="alert">{error}</p>}
    </section>
  );
}
