# CV Mind - Resume Intelligence & ATS Optimizer

CV Mind is a state-of-the-art, premium SPA tool designed to parse, analyze, and optimize resumes against corporate applicant tracking systems (ATS). Built using a high-end cyber-stage layout, transparent brand vectors, professional metrics dashboards, and a hybrid database fallback, it delivers an instant corporate recruiter audit scorecard, structural alerts, missing keyword matrices, and AI-powered bullet rewrites in seconds.

---

## 🚀 Key Features

*   **AI Resume Audit Console:** Instant, non-blocking scan checking ATS algorithms, corporate action verbs, quantified achievements, and overall readability.
*   **Highly Polished Dashboard:** Glassmorphism UI presenting rating gauges, score distributions, active keyword radars, and beautiful interactive summaries.
*   **Hybrid Database System:** Seamlessly integrates with MongoDB Atlas and gracefully falls back to a local JSON file store if environment credentials are absent.
*   **Secure Admin Workspace:** Secure administrator area with persistent session states and database health telemetry.
*   **OpenRouter API Routing:** Direct fallback support for custom Gemini/OpenRouter keys, optimizing budget parameters with precise token thresholds.
*   **Clean History Routing:** Powered by the HTML5 History API, removing old `#` hash routes for clean subpath navigation.

---

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TypeScript, Lucide Icons, Vanilla CSS Grid & Flexbox, HTML5 History API.
*   **Backend:** Node.js, Express, Mongoose, Muli-part Form Parser, Cloud API Integrations.
*   **Database:** MongoDB Atlas + local JSON document fallback database.

---

### ⚙️ Setup & Installation

### 1. Prerequisites
*   Node.js (v18+)
*   MongoDB Atlas Connection String (Optional, fallback to local JSON database is automated)

### 2. Environment Configurations
Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_or_openrouter_api_key
```

### 3. Install & Start Development Servers
From the root workspace, run:

#### Start Backend:
```bash
cd backend
npm install
npm run dev
```

#### Start Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧑‍💻 Author & Contributions

Created with ❤️ by **[Manav Tiwari](https://www.manavtiwari.in)**.
