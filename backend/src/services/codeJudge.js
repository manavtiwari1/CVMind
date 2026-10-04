import { executeJavaScript } from './jsExecutor.js';
import { executePython } from './pyExecutor.js';
import { executeCpp } from './cppExecutor.js';

export { executeJavaScript, executePython, executeCpp };

/**
 * A language this server cannot execute. It reports that plainly instead of inventing a verdict:
 * `simulated: true` tells clients the code was NOT run, and there are no per-test results.
 */
export function notJudged(language, totalTests, reason) {
  return {
    verdict: 'Not Judged',
    simulated: true,
    error: reason || `${language} is not executed on this server yet.`,
    passedTests: 0,
    totalTests,
    runtimeMs: 0,
    results: [],
  };
}

/**
 * Python and C++ run as ordinary processes on the server, not in a sandbox, so user code could reach
 * the machine. They stay off until the judge runs inside an isolated container; set
 * CODE_NATIVE_RUNNERS=true only on a machine where that is acceptable (e.g. local development).
 */
export const NATIVE_LANGUAGES = ['python', 'py', 'cpp', 'c++'];
export const nativeRunnersEnabled = () => process.env.CODE_NATIVE_RUNNERS === 'true';

/**
 * Main entry point for running code in any supported language.
 * `meta` describes how the problem's data maps onto the function:
 *   kind        'function' (default) or 'design' (a class driven by a list of operations)
 *   argTypes    per-argument adapters: 'list' | 'tree' | 'lists' (arrays are converted to linked lists / binary trees)
 *   returnType  'list' | 'tree' converts the returned structure back to an array
 *   adapter     'cyclic-list' builds a list whose tail points back to a position
 *   compare     'exact' (default) | 'unordered' | 'unordered-deep' | 'float'
 *   cppSpec     signature types for C++ (see scripts/build-problems.mjs); without it C++ is reported as not judged
 */
export async function runJudgeSubmission({ code, language, testCases, functionName, meta = {} }) {
  const lang = String(language || 'javascript').toLowerCase();

  if (lang === 'javascript' || lang === 'js') {
    return executeJavaScript({ code, testCases, functionName, meta });
  }

  if (lang === 'python' || lang === 'py') {
    const result = await executePython({ code, testCases, functionName, meta });
    if (result.unavailable) return notJudged('Python', testCases.length, 'Python is not installed on the judge server, so Python code cannot be run here.');
    return result;
  }

  if (lang === 'cpp' || lang === 'c++') {
    const result = await executeCpp({ code, testCases, functionName, meta });
    if (result.unavailable) return notJudged('C++', testCases.length, result.reason);
    return result;
  }

  throw new Error(`Unsupported language: ${language}. Supported languages are javascript, python and cpp.`);
}
