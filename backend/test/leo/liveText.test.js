import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonFieldReader, withLiveText } from '../../src/leo/liveText.js';
import { liveTextWatcher } from '../../src/services/claude.js';

const read = (fields, chunks) => {
  let out = '';
  const feed = jsonFieldReader(fields, (t) => { out += t; });
  for (const c of chunks) feed(c);
  return out;
};

const letter = JSON.stringify({ name: 'greeting', email: 'a@b.in', greeting: 'Dear Team,', paragraphs: ['First "quoted" line.', 'Second\nline é'], closing: 'Best,' });

test('only the named fields come through, however the JSON is cut up', () => {
  const expected = 'Dear Team,\n\nFirst "quoted" line.\n\nSecond\nline é\n\nBest,\n\n';
  assert.equal(read(['greeting', 'paragraphs', 'closing'], [letter]), expected);
  assert.equal(read(['greeting', 'paragraphs', 'closing'], [...letter]), expected);
});

test('a value that looks like a field name is not mistaken for one', () => {
  assert.equal(read(['greeting'], ['{"name":"greeting","other":"hidden"}']), '');
});

test('fields inside lists of objects are read, and neighbours skipped', () => {
  const json = JSON.stringify({ steps: [{ stepNumber: 1, phaseName: 'Learn', timeframe: '1m', actions: ['Do A', 'Do B'] }] });
  assert.equal(read(['phaseName', 'actions'], ['Sure:\n', json]), 'Learn\n\nDo A\n\nDo B\n\n');
});

test('unicode escapes split over chunks still decode', () => {
  assert.equal(read(['a'], ['{"a":"x\\u', '00', 'e9y"}']), 'xéy\n\n');
});

test('words written during the work reach the chat, even when the work then fails', async () => {
  const sent = [];
  await assert.rejects(withLiveText(['a'], { progress: (d) => sent.push(d.text) }, async () => {
    liveTextWatcher()('{"a":"hello"}');
    throw new Error('boom');
  }));
  assert.equal(sent.join(''), 'hello\n\n');
});
