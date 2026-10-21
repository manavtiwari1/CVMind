import { lazy, Suspense, useState } from 'react';
import { Check, X, Lightbulb } from 'lucide-react';
import { renderInline } from '../../pages/code/richInline';
import type { BoardElement as Element } from '../learnLeoApi';
import CodeBlock from './CodeBlock';

// KaTeX and Mermaid only load when a lesson uses them
const Formula = lazy(() => import('./Formula'));
const Diagram = lazy(() => import('./Diagram'));

export interface CheckpointResult { chosen: number; correct: boolean; answer: number; explanation: string }

interface Props {
  el: Element;
  id: string;
  animate: boolean;
  checkpoint?: {
    result: CheckpointResult | null;
    onAnswer: (chosen: number) => Promise<void>;
  };
}

function Checkpoint({ el, state }: { el: Extract<Element, { type: 'checkpoint' }>; state: NonNullable<Props['checkpoint']> }) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { result } = state;

  const choose = async (i: number) => {
    if (result || pending !== null) return;
    setPending(i);
    setError('');
    try {
      await state.onAnswer(i);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answer. Try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="ll-check" role="group" aria-label="Checkpoint">
      <div className="ll-check-tag"><Lightbulb size={15} aria-hidden="true" /> Checkpoint</div>
      <p className="ll-check-q">{el.question}</p>
      <div className={`ll-check-options${el.format === 'true_false' ? ' is-tf' : ''}`}>
        {el.options.map((option, i) => {
          const isAnswer = result && i === result.answer;
          const isWrongPick = result && i === result.chosen && !result.correct;
          return (
            <button
              key={i}
              type="button"
              className={`ll-check-option${isAnswer ? ' is-right' : ''}${isWrongPick ? ' is-wrong' : ''}${pending === i ? ' is-pending' : ''}`}
              disabled={!!result || pending !== null}
              onClick={() => choose(i)}
              aria-pressed={result?.chosen === i}
            >
              <span className="ll-check-key">{el.format === 'true_false' ? '' : String.fromCharCode(65 + i)}</span>
              <span>{option}</span>
              {isAnswer && <Check size={16} aria-label="Right answer" />}
              {isWrongPick && <X size={16} aria-label="Your answer" />}
            </button>
          );
        })}
      </div>
      {!result && <p className="ll-check-hint">Leo is waiting for your answer.</p>}
      {result?.explanation && <p className="ll-check-why">{result.explanation}</p>}
      {error && <p className="ll-error" role="alert">{error}</p>}
    </div>
  );
}

/** One element on Leo's board. */
export default function BoardElement({ el, id, animate, checkpoint }: Props) {
  const anim = animate ? ' ll-enter' : '';
  switch (el.type) {
    case 'heading':
      return <h3 className={`ll-heading${anim}`}>{el.content}</h3>;
    case 'bullet':
      return (
        <ul className={`ll-bullets${anim}`}>
          {el.items.map((item, i) => <li key={i}>{renderInline(item, `${id}-${i}`)}</li>)}
        </ul>
      );
    case 'callout':
      return <div className={`ll-callout${anim}`}><strong>Takeaway</strong><span>{renderInline(el.content, id)}</span></div>;
    case 'code':
      return <div className={anim}><CodeBlock code={el.content} language={el.language} animate={animate} /></div>;
    case 'formula':
      return <div className={anim}><Suspense fallback={<pre className="ll-formula-raw">{el.content}</pre>}><Formula tex={el.content} /></Suspense></div>;
    case 'diagram':
      return <Suspense fallback={<div className="ll-diagram-wait">Drawing…</div>}><Diagram source={el.content} /></Suspense>;
    case 'table':
      return (
        <div className={`ll-table-wrap${anim}`}>
          <table className="ll-table">
            <thead><tr>{el.headers.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{el.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{renderInline(cell, `${id}-${r}-${c}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'checkpoint':
      return checkpoint ? <div className={anim}><Checkpoint el={el} state={checkpoint} /></div> : null;
    default:
      return null;
  }
}
