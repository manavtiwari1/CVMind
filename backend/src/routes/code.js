import { requireFreeUse, codeHintFeature } from '../billing/gate.js';
import express from 'express';
import { runJudgeSubmission, notJudged, nativeRunnersEnabled, NATIVE_LANGUAGES } from '../services/codeJudge.js';
import { getSettings } from '../admin/settings.js';
import { 
  generateCodeHint, 
  generateCodeReview, 
  generateCodeDebug, 
  generateAIProblem 
} from '../services/gemini.js';
import {
  saveCodingSubmission,
  getUserCodingSubmissions,
  getUserCodingProfile,
  updateUserCodingProfile,
  saveCustomCodingProblem,
  getCustomCodingProblems,
  getUserCodingProgress,
  resetUserCodingProgress,
  saveCodingDraft,
  deleteCodingDraft
} from '../db.js';
import { CURATED_PROBLEMS } from '../data/curatedProblems.js';
import { optionalUser, requireSelf, requireUser } from '../services/authToken.js';

const router = express.Router();

// Python and C++ are not sandboxed (see codeJudge.js): when they are switched on they still need a
// signed-in account, and a verified one when verification is required. JavaScript stays open to everyone.
// Returns null to go ahead, { result } for a not-judged answer, or { status, error } to refuse.
async function nativeLanguageCheck(req, language, totalTests) {
  const lang = String(language || 'javascript').toLowerCase();
  if (!NATIVE_LANGUAGES.includes(lang)) return null;
  const label = lang.startsWith('py') ? 'Python' : 'C++';
  if (!nativeRunnersEnabled()) return { result: notJudged(label, totalTests, `${label} is turned off on this server for now. Use JavaScript to get a real result.`) };
  if (!req.auth) return { status: 401, error: `Sign in to run ${label} code.` };
  const { security } = await getSettings();
  if (security.requireEmailVerification && req.auth.emailVerified === false) return { status: 403, error: `Verify your email to run ${label} code.` };
  return null;
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// List Problems (Curated + MongoDB Custom Problems)
router.get('/problems', async (req, res) => {
  try {
    const { category, difficulty, company, search } = req.query;
    const dbCustom = await getCustomCodingProblems();
    let list = [...CURATED_PROBLEMS, ...(dbCustom || [])];

    if (category && category !== 'All') {
      list = list.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (difficulty && difficulty !== 'All') {
      list = list.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (company && company !== 'All') {
      list = list.filter(p => p.companies?.some(c => c.toLowerCase().includes(company.toLowerCase())));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    const sanitized = list.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      category: p.category,
      companies: p.companies,
      acceptanceRate: p.acceptanceRate || '',
      isAiGenerated: !!p.isAiGenerated
    }));

    res.json({ success: true, count: sanitized.length, problems: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Problem by ID
router.get('/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // AI-generated problems live in MongoDB, so look there too
    const dbCustom = await getCustomCodingProblems();
    const problem = [...CURATED_PROBLEMS, ...(dbCustom || [])].find(p => p.id === id || p.slug === id);
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    // Don't leak hidden test cases
    const plain = typeof problem.toObject === 'function' ? problem.toObject() : problem;
    const { hiddenTestCases, ...safeProblem } = plain;
    res.json({ success: true, problem: safeProblem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// How a problem's data maps onto its function (linked lists, trees, design classes, answer ordering)
function judgeMeta(problem) {
  return {
    kind: problem?.kind,
    adapter: problem?.adapter,
    argTypes: problem?.argTypes,
    returnType: problem?.returnType,
    compare: problem?.compare,
    cppSpec: problem?.cppSpec,
  };
}

// Run Code (sample test cases only, or one custom input)
router.post('/run', optionalUser, async (req, res) => {
  try {
    const { problemId, code, language, customTestCases } = req.body;
    // Record runs under the signed-in user only (never a userId from the request body)
    const userId = req.auth?.sub;
    const dbCustom = await getCustomCodingProblems();
    const problem = [...CURATED_PROBLEMS, ...(dbCustom || [])].find(p => p.id === problemId || p.slug === problemId);

    const testCasesToRun = customTestCases && customTestCases.length > 0
      ? customTestCases
      : (problem ? problem.sampleTestCases : []);

    const fnName = problem ? problem.functionName : 'solution';
    const blocked = await nativeLanguageCheck(req, language, testCasesToRun.length);
    if (blocked?.status) return res.status(blocked.status).json({ success: false, error: blocked.error });
    if (blocked) return res.json({ success: true, result: blocked.result });

    const result = await runJudgeSubmission({
      code,
      language: language || 'javascript',
      testCases: testCasesToRun,
      functionName: fnName,
      meta: judgeMeta(problem),
    });

    // Keep a record of real runs only; a run that was never executed is not worth storing
    if (!result.simulated) {
      try {
        await saveCodingSubmission({
          userId: userId || 'anonymous',
          kind: 'run',
          problemId: problem ? problem.id : 'custom',
          problemTitle: problem ? problem.title : 'Custom Run',
          language,
          code,
          verdict: result.verdict,
          passedTests: result.passedTests,
          totalTests: result.totalTests,
          runtimeMs: result.runtimeMs,
          error: result.error
        });
      } catch (err) {
        console.error('[MONGODB] Save run error:', err.message);
      }
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('[CODE RUN ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit Code (full evaluation against sample + hidden test cases, saved to MongoDB)
router.post('/submit', optionalUser, async (req, res) => {
  try {
    const { problemId, code, language } = req.body;
    // Record submissions under the signed-in user only (never a userId from the request body)
    const userId = req.auth?.sub;
    const dbCustom = await getCustomCodingProblems();
    const problem = [...CURATED_PROBLEMS, ...(dbCustom || [])].find(p => p.id === problemId || p.slug === problemId);

    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found for evaluation' });
    }

    const samples = problem.sampleTestCases || [];
    const fullTestCases = [...samples, ...(problem.hiddenTestCases || [])];
    const blocked = await nativeLanguageCheck(req, language, fullTestCases.length);
    if (blocked?.status) return res.status(blocked.status).json({ success: false, error: blocked.error });
    const result = blocked ? blocked.result : await runJudgeSubmission({
      code,
      language: language || 'javascript',
      testCases: fullTestCases,
      functionName: problem.functionName,
      meta: judgeMeta(problem),
    });

    // Public feedback: the sample cases, plus the first failing hidden case so the user can see what broke
    const all = result.results || [];
    const firstHiddenFailure = all.slice(samples.length).find(r => !r.passed);
    const publicResults = [...all.slice(0, samples.length), ...(firstHiddenFailure ? [firstHiddenFailure] : [])];

    // A result that was not produced by really running the code is neither stored nor counted
    if (!result.simulated) {
      const submissionRecord = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId: userId || 'anonymous',
        problemId: problem.id,
        problemTitle: problem.title,
        language,
        code,
        verdict: result.verdict,
        passedTests: result.passedTests,
        totalTests: result.totalTests,
        runtimeMs: result.runtimeMs,
        createdAt: new Date().toISOString()
      };
      try {
        await saveCodingSubmission(submissionRecord);
        // Signed-out submissions have no account to credit
        if (userId) {
          await updateUserCodingProfile(userId, { problemId: problem.id, verdict: result.verdict });
        }
      } catch (err) {
        // The verdict is still valid; only the history write failed
        console.error('[MONGODB] Save submission error:', err.message);
      }
    }

    res.json({
      success: true,
      verdict: result.verdict,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      runtimeMs: result.runtimeMs,
      simulated: !!result.simulated,
      error: result.error || undefined,
      results: publicResults
    });
  } catch (error) {
    console.error('[CODE SUBMIT ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Hint (Progressive 6-tier)
router.post('/ai/hint', requireFreeUse(codeHintFeature), async (req, res) => {
  try {
    const { problemTitle, problemDescription, userCode, language, requestedLevel } = req.body;
    const customApiKey = req.headers['x-gemini-key'] || null;

    const hintData = await generateCodeHint({
      problemTitle,
      problemDescription,
      userCode,
      language,
      requestedLevel: Number(requestedLevel || 1),
      customApiKey
    });

    res.json({ success: true, data: hintData });
  } catch (error) {
    console.error('[AI HINT ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Code Review
router.post('/ai/review', async (req, res) => {
  try {
    const { problemTitle, problemDescription, userCode, language } = req.body;
    const customApiKey = req.headers['x-gemini-key'] || null;

    const review = await generateCodeReview({
      problemTitle,
      problemDescription,
      userCode,
      language,
      customApiKey
    });

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('[AI REVIEW ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Debugger
router.post('/ai/debug', async (req, res) => {
  try {
    const { problemTitle, userCode, language, failedTestInfo } = req.body;
    const customApiKey = req.headers['x-gemini-key'] || null;

    const debugAnalysis = await generateCodeDebug({
      problemTitle,
      userCode,
      language,
      failedTestInfo,
      customApiKey
    });

    res.json({ success: true, data: debugAnalysis });
  } catch (error) {
    console.error('[AI DEBUG ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Problem Generator
router.post('/ai/generate-problem', optionalUser, async (req, res) => {
  try {
    const { topic, difficulty, company, customPrompt } = req.body;
    const customApiKey = req.headers['x-gemini-key'] || null;

    const generated = await generateAIProblem({
      topic,
      difficulty,
      company,
      customPrompt,
      customApiKey
    });

    const newProblem = {
      id: generated.slug || `ai-problem-${Date.now()}`,
      title: generated.title,
      slug: generated.slug || `ai-problem-${Date.now()}`,
      difficulty: generated.difficulty || difficulty || 'Medium',
      category: generated.category || topic || 'Algorithms',
      companies: generated.companies || [company || 'Google'],
      description: generated.description,
      constraints: generated.constraints || [],
      examples: generated.examples || [],
      functionName: generated.functionName || 'solution',
      starterCode: generated.starterCode,
      sampleTestCases: (generated.testCases || []).slice(0, 3),
      hiddenTestCases: (generated.testCases || []).slice(3),
      isAiGenerated: true,
      createdBy: req.auth?.sub || 'anonymous',
      createdAt: new Date().toISOString()
    };

    // Save generated problem to MongoDB
    await saveCustomCodingProblem(newProblem);

    res.json({ success: true, problem: newProblem });
  } catch (error) {
    console.error('[AI GENERATE PROBLEM ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Real coding stats for the signed-in user, derived only from what is stored in MongoDB.
// Nothing here is seeded or estimated: a new account starts at zero.
router.get('/profile/:userId', requireSelf(), async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await getUserCodingProfile(userId);
    const submissions = await getUserCodingSubmissions(userId);
    const dbCustom = await getCustomCodingProblems();
    const catalog = [...CURATED_PROBLEMS, ...(dbCustom || [])];

    const solvedList = profile.solvedProblemIds || [];
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    for (const id of solvedList) {
      const p = catalog.find(x => x.id === id);
      const key = String(p?.difficulty || '').toLowerCase();
      if (key in byDifficulty) byDifficulty[key] += 1;
    }

    const accepted = submissions.filter(s => s.verdict === 'Accepted').length;

    res.json({
      success: true,
      profile: {
        userId,
        rating: profile.rating,
        streakDays: profile.streak || 0,
        solvedProblemIds: solvedList,
        totalSubmissions: profile.totalSubmissions || 0,
        acceptedSubmissions: accepted,
        problemsSolved: { total: solvedList.length, ...byDifficulty },
        lastActiveDate: profile.lastActiveDate || null,
        recentSubmissions: submissions.slice(0, 10)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Signed-in user's full CVMind Code state: solved problems, submission history, saved drafts.
// The UI rebuilds streaks, activity and per-topic progress from this, so it matches on every device.
router.get('/progress', requireUser, async (req, res) => {
  try {
    res.json({ success: true, ...(await getUserCodingProgress(req.auth.sub)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Erase the signed-in user's coding progress (profile page "erase" button)
router.delete('/progress', requireUser, async (req, res) => {
  try {
    await resetUserCodingProgress(req.auth.sub);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const MAX_DRAFT_CHARS = 100000;

router.put('/drafts', requireUser, async (req, res) => {
  try {
    const { problemId, language, code } = req.body || {};
    if (!problemId || !language || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'problemId, language and code are required.' });
    }
    if (code.length > MAX_DRAFT_CHARS) {
      return res.status(413).json({ success: false, error: 'Draft is too large to save.' });
    }
    await saveCodingDraft({ userId: req.auth.sub, problemId, language, code });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/drafts', requireUser, async (req, res) => {
  try {
    const { problemId, language } = req.query;
    if (!problemId || !language) {
      return res.status(400).json({ success: false, error: 'problemId and language are required.' });
    }
    await deleteCodingDraft({ userId: req.auth.sub, problemId, language });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// A user's own past submissions from MongoDB
router.get('/submissions/:userId', requireSelf(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { problemId } = req.query;
    const submissions = await getUserCodingSubmissions(userId, problemId);
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Contests
router.get('/contests', (req, res) => {
  res.json({
    success: true,
    contests: [
      {
        id: 'cvmind-weekly-14',
        title: 'CVmind Bi-Weekly Contest #14',
        type: 'Weekly Contest',
        startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        durationMinutes: 90,
        registeredCount: 1420,
        prizePool: 'Verified Recruiter Referrals + Pro Access',
        status: 'UPCOMING'
      },
      {
        id: 'college-cup-2026',
        title: 'Inter-College Algorithmic Cup',
        type: 'College Contest',
        startTime: new Date(Date.now() + 86400000 * 5).toISOString(),
        durationMinutes: 120,
        registeredCount: 3840,
        prizePool: 'Campus Placement Fast-Track',
        status: 'UPCOMING'
      }
    ]
  });
});

// Assessments
router.get('/assessments', (req, res) => {
  res.json({
    success: true,
    assessments: [
      {
        id: 'sde-screening-freshers',
        title: 'Software Development Engineer I — Technical Screening',
        company: 'CVmind Partner Network',
        durationMinutes: 60,
        questionsCount: 3,
        proctoring: {
          tabSwitchMonitoring: true,
          fullscreenEnforced: true,
          webcamProctoring: false
        },
        skillsTested: ['Data Structures', 'Algorithms', 'Code Optimization'],
        status: 'ACTIVE'
      }
    ]
  });
});

export default router;
