import express from 'express';
import { runJudgeSubmission } from '../services/codeJudge.js';
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
  getCustomCodingProblems
} from '../db.js';
import { CURATED_PROBLEMS } from '../data/curatedProblems.js';

const router = express.Router();

// Active submissions tracker & stats in-memory
const SUBMISSIONS_DB = [];
const CUSTOM_PROBLEMS = [];

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
      acceptanceRate: p.acceptanceRate || '52.0%',
      isAiGenerated: !!p.isAiGenerated
    }));

    res.json({ success: true, count: sanitized.length, problems: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Problem by ID
router.get('/problems/:id', (req, res) => {
  const { id } = req.params;
  const problem = [...CURATED_PROBLEMS, ...CUSTOM_PROBLEMS].find(p => p.id === id || p.slug === id);
  if (!problem) {
    return res.status(404).json({ success: false, error: 'Problem not found' });
  }

  // Don't leak hidden test cases
  const { hiddenTestCases, ...safeProblem } = problem;
  res.json({ success: true, problem: safeProblem });
});

// Run Code (Sample test cases only)
router.post('/run', async (req, res) => {
  try {
    const { problemId, code, language, customTestCases, userId } = req.body;
    const dbCustom = await getCustomCodingProblems();
    const problem = [...CURATED_PROBLEMS, ...(dbCustom || [])].find(p => p.id === problemId || p.slug === problemId);

    const testCasesToRun = customTestCases && customTestCases.length > 0 
      ? customTestCases 
      : (problem ? problem.sampleTestCases : []);

    const fnName = problem ? problem.functionName : 'solution';
    const result = await runJudgeSubmission({
      code,
      language: language || 'javascript',
      testCases: testCasesToRun,
      functionName: fnName
    });

    // Save run record to MongoDB (non-blocking)
    saveCodingSubmission({
      userId: userId || 'anonymous',
      problemId: problem ? problem.id : 'custom',
      problemTitle: problem ? problem.title : 'Custom Run',
      language,
      code,
      verdict: result.verdict,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      runtimeMs: result.runtimeMs,
      memoryMb: result.memoryMb,
      error: result.error
    }).catch(err => console.error('[MONGODB] Save run error:', err));

    res.json({ success: true, result });
  } catch (error) {
    console.error('[CODE RUN ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit Code (Full evaluation against sample + hidden test cases & saved to MongoDB)
router.post('/submit', async (req, res) => {
  try {
    const { problemId, code, language, userId } = req.body;
    const dbCustom = await getCustomCodingProblems();
    const problem = [...CURATED_PROBLEMS, ...(dbCustom || [])].find(p => p.id === problemId || p.slug === problemId);

    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found for evaluation' });
    }

    const fullTestCases = [...(problem.sampleTestCases || []), ...(problem.hiddenTestCases || [])];
    const result = await runJudgeSubmission({
      code,
      language: language || 'javascript',
      testCases: fullTestCases,
      functionName: problem.functionName
    });

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
      memoryMb: result.memoryMb,
      runtimePercentile: result.runtimePercentile,
      memoryPercentile: result.memoryPercentile,
      createdAt: new Date().toISOString()
    };

    // Save submission to MongoDB
    await saveCodingSubmission(submissionRecord);

    // Update user profile in MongoDB (ratings & solved count)
    const updatedProfile = await updateUserCodingProfile(submissionRecord.userId, {
      problemId: problem.id,
      verdict: result.verdict
    });

    res.json({
      success: true,
      submission: submissionRecord,
      profile: updatedProfile,
      verdict: result.verdict,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      runtimeMs: result.runtimeMs,
      memoryMb: result.memoryMb,
      runtimePercentile: result.runtimePercentile,
      memoryPercentile: result.memoryPercentile,
      results: result.results.slice(0, 3) // Return only public feedback
    });
  } catch (error) {
    console.error('[CODE SUBMIT ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Hint (Progressive 6-tier)
router.post('/ai/hint', async (req, res) => {
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
router.post('/ai/generate-problem', async (req, res) => {
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

// User Coding Profile & Standardized CVMind Skill Score from MongoDB
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await getUserCodingProfile(userId);
    const submissions = await getUserCodingSubmissions(userId);

    const solvedList = profile.solvedProblemIds || [];
    const uniqueSolved = solvedList.length;

    const profileStats = {
      userId,
      rating: profile.rating || (1640 + uniqueSolved * 15),
      streakDays: profile.streak || 14,
      solvedProblemIds: solvedList,
      problemsSolved: {
        total: uniqueSolved,
        easy: Math.min(uniqueSolved, 8),
        medium: Math.max(0, Math.min(uniqueSolved - 8, 12)),
        hard: Math.max(0, uniqueSolved - 20)
      },
      skillScore: {
        overall: Math.min(98, 75 + uniqueSolved * 4),
        dsa: Math.min(99, 78 + uniqueSolved * 3),
        problemSolving: Math.min(99, 80 + uniqueSolved * 3),
        codeQuality: 92,
        languages: {
          javascript: 90,
          python: 88,
          cpp: 82
        }
      },
      badges: [
        { id: 'first-solve', name: 'First Solve', icon: '🚀', description: 'Solved first coding challenge on CVMind Code', earned: uniqueSolved >= 1 },
        { id: 'streak-7', name: '7-Day Streak', icon: '🔥', description: 'Coded 7 consecutive days', earned: true },
        { id: 'array-master', name: 'Array Master', icon: '⚡', description: 'Solved 10+ Array challenges', earned: uniqueSolved >= 2 },
        { id: 'dp-conqueror', name: 'DP Conqueror', icon: '🧠', description: 'Solved Dynamic Programming challenge', earned: false },
        { id: 'verified-candidate', name: 'CVMind Verified SDE', icon: '⭐', description: 'Skill score verified on CVMind Resume', earned: true }
      ],
      recentSubmissions: submissions.slice(0, 10)
    };

    res.json({ success: true, profile: profileStats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get User's Past Submissions from MongoDB
router.get('/submissions/:userId', async (req, res) => {
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
