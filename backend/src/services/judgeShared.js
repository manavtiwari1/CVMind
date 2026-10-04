/**
 * Helpers shared by the JavaScript and Python executors: comparison modes and the final verdict.
 */

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** A function or class name coming from problem data is interpolated into generated source, so it must be a plain identifier. */
export function assertIdentifier(name) {
  if (typeof name !== 'string' || !IDENT.test(name)) throw new Error(`Invalid function name: ${String(name).slice(0, 40)}`);
  return name;
}

const isPlainNumber = (v) => typeof v === 'number' && Number.isFinite(v);

function sortKey(v) {
  return JSON.stringify(v);
}

/**
 * Canonical form used to compare an actual result with the expected one.
 *  exact           values must match exactly
 *  unordered       the outer array may be in any order (inner order still matters), e.g. permutations
 *  unordered-deep  inner arrays are sorted too, e.g. subsets and combinations
 *  float           numbers may differ by a small tolerance
 */
export function canonical(value, mode = 'exact') {
  if (mode === 'unordered' && Array.isArray(value)) {
    return [...value].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
  }
  if (mode === 'unordered-deep' && Array.isArray(value)) {
    const inner = value.map((v) => (Array.isArray(v) ? [...v].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0)) : v));
    return inner.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
  }
  return value;
}

export function valuesMatch(actual, expected, mode = 'exact') {
  if (mode === 'float' && isPlainNumber(actual) && isPlainNumber(expected)) {
    return Math.abs(actual - expected) <= 1e-5 * Math.max(1, Math.abs(expected));
  }
  const a = canonical(actual === undefined ? null : actual, mode);
  const b = canonical(expected === undefined ? null : expected, mode);
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Determines the final verdict from individual test results. No percentiles or memory figures are invented. */
export function computeFinalVerdict(results, totalTestCount, totalRuntime) {
  const passedCount = results.filter((r) => r.passed).length;
  const timeoutItem = results.find((r) => r.isTimeout);
  const errorItem = results.find((r) => r.error);
  const allCustom = results.length > 0 && results.every((r) => r.custom);

  let verdict = 'Accepted';
  if (timeoutItem) verdict = 'Time Limit Exceeded';
  else if (errorItem) verdict = 'Runtime Error';
  else if (passedCount < totalTestCount) verdict = 'Wrong Answer';
  else if (allCustom) verdict = 'Completed';

  const avgRuntime = results.length > 0 ? Math.round((totalRuntime / results.length) * 10) / 10 : 0;

  return {
    verdict,
    passedTests: passedCount,
    totalTests: totalTestCount,
    runtimeMs: avgRuntime,
    error: errorItem ? errorItem.error : null,
    results,
  };
}
