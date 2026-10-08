# Agent queue worker: parses resumes and jobs, scores, tailors, renders PDFs and fills forms.
# The API can run serverless, but this cannot — it polls a queue and drives a real browser.
#
# Build from the REPOSITORY ROOT, not from auto-apply-agent/:
#   docker build -f auto-apply-agent/Dockerfile -t cvmind-worker .
#
# The image tag must match the installed playwright version (package.json: playwright ^1.61.1),
# otherwise Playwright refuses to start against a mismatched browser build.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

# npm workspaces: the root lockfile covers both packages, but only the agent's dependencies are installed
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY auto-apply-agent/package.json ./auto-apply-agent/
RUN npm ci -w @cvmind/auto-apply-agent --include-workspace-root=false --omit=dev

# adapters/base.js reads these two files from disk at import time so the server and the
# browser extension fill forms with identical code. Without them the worker crashes on boot.
COPY extension/shared ./extension/shared
COPY auto-apply-agent/src ./auto-apply-agent/src

WORKDIR /app/auto-apply-agent
ENV NODE_ENV=production

# Required at runtime: MONGODB_URI, GEMINI_API_KEY, AUTH_SECRET.
# Optional: AGENT_SERVER_ADAPTERS (default greenhouse,lever,workday),
#           GEMINI_MODEL, GEMINI_EMBED_MODEL, AGENT_*_CONCURRENCY.
CMD ["node", "src/worker.js"]
