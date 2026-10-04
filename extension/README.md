# CVMind AI — Auto Apply Copilot (Chrome Extension v1.0)

A powerful Manifest V3 browser extension that brings CVMind's career intelligence directly into job application workflows.

---

## 🚀 Quick Setup (30 Seconds)

1. Open **Google Chrome** (or Edge / Brave / Chromium browser).
2. Navigate to: `chrome://extensions/`
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select this directory:
   `f:\AI Resume Checker\extension`
5. The **CVMind AI Copilot** extension is now active!

---

## 🌟 Key Features

1. **Intelligent Application Detector**: Automatically identifies job application pages (Greenhouse, Lever, Workday, LinkedIn, Indeed, Naukri, or custom company career portals).
2. **Floating AI Copilot Badge & Drawer**: Injects a sleek, draggable widget directly into the job page without interfering with standard layout.
3. **1-Click Form Autofill**: Instantly maps candidate profile data (Name, Email, Phone, Socials, Education, Experience, Skills) to matching input fields.
4. **AI-Powered Open-Ended Answering**: Generates tailored, high-converting answers for questions like *"Why should we hire you?"* or *"Describe a challenging project"*.
5. **Human-in-the-Loop Safety**: Prompts explicit user review for sensitive fields (Visa sponsorship, Relocation, Salary expectations).
6. **Real-time Application Tracker**: Seamlessly tracks completed applications directly back to the CVMind Auto Apply Kanban Dashboard.

---

## 🎯 Interactive Demo Sandbox

The Demo Sandbox is a page inside the CVMind web app with its own built-in autofill. The extension does not run there; it only runs on Greenhouse, Lever and Workday application pages.

To try the sandbox:
1. Start CVMind Web App: `npm run dev`
2. Open: `http://localhost:5173/auto-apply`
3. Click the **"Launch Live Demo Sandbox"** button.
4. Click **Test CVMind AI Autofill** and review the filled answers.

To test the extension itself, pair it from CVMind and open a job application on Greenhouse, Lever or Workday (including Greenhouse forms embedded in a company's careers page). The CVMind Copilot badge appears on the page.

After you press the site's own submit button, the drawer asks **Did your application go through?** CVMind records the application as submitted only when you click **Yes, mark it submitted**, so a form the site rejected is never counted.
