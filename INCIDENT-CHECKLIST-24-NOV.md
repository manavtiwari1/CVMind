# CV Mind Incident Checklist (24 Nov 2026) — Reviewed & Updated

On 24 Nov, between 4:27 and 4:42 pm IST, the test suite was run on a development machine whose `backend/.env` contained production database credentials (`DATABASE_DRIVER=tidb` and `TIDB_DATABASE_URL`). The test runner wrote 196 test users and 22 fake admin accounts into the database and overwrote test configurations.

The fake accounts are already banned/deactivated. Follow the prioritized steps below to secure credentials and restore normal production operations.

---

## 1. Right now: Lock the Database

Rotate production credentials immediately so no external process or cached connection can write to production.

- [ ] **Change the TiDB database password.**
  - Go to **TiDB Cloud** → Select your cluster → Security / Users.
  - Reset the password for the database user present in `TIDB_DATABASE_URL` (or create a new user and delete the compromised one).
- [ ] **Update Render Backend Service.**
  - Go to **Render Dashboard** → Backend service → **Environment** tab.
  - Update `TIDB_DATABASE_URL` with the new connection string and click **Save Changes**.
  - Render will automatically trigger a redeploy/restart.
- [ ] **Update GitHub Repository Secret:**
  ```bash
  gh secret set TIDB_DATABASE_URL -R manavtiwari1/CVMind
  ```
- [ ] **Rotate MongoDB Atlas password (if applicable):**
  - Reset Atlas user password, update `MONGODB_URI` on Render, and update GitHub secret:
  ```bash
  gh secret set MONGODB_URI -R manavtiwari1/CVMind
  ```
- [ ] **Verify Production Health:**
  - After Render finishes deploying, check that `https://cvmind.in` (and health checks) respond normally.

---

## 2. Right now: Lock the Admin Panel & Invalidate All Sessions

- [ ] **Change `ADMIN_PASSWORD` on Render:**
  - Update `ADMIN_PASSWORD` in Render environment variables. This resets the master admin account and prevents any cached sessions from using the old password.
- [ ] **Rotate `AUTH_SECRET` on Render:**
  - Generating a new `AUTH_SECRET` immediately invalidates all existing JWT session tokens across all devices, requiring all users and admins to log in again.
  - Generate a secure 48-byte hex secret:
    ```bash
    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
    ```
  - Paste into Render → Environment → `AUTH_SECRET` → Save.

---

## 3. Shipped Fixes & Developer Environment Security

- [x] **Merged PR 74 into `main`:**
  - Commit `e57c055` merged PR 74 into `main`.
  - Added test runner environment scrub in `backend/scripts/test.mjs` and hard failure guard in `@cvmind/tidb-store` (`LiveDatabaseInTestError`).
- [x] **Patched `auto-apply-agent` test runner:**
  - Added identical `env.DATABASE_DRIVER = 'mongodb'; env.TIDB_DATABASE_URL = ''; env.MONGODB_URI = '';` guard in `auto-apply-agent/scripts/test.mjs`.
- [ ] **Sanitize Local `backend/.env` for all team members:**
  - Pull latest `main`:
    ```bash
    git pull origin main
    ```
  - Remove production database credentials from local `backend/.env`. Local tests run in-memory MongoDB by default.
- [ ] **Check Render Deployment:**
  - Confirm the latest commit on Render backend shows `e57c055` (PR 74) or later.

---

## 4. Today: Turn Off Maintenance Mode

- [ ] Once credentials are reset and database health is verified:
  - Log in to the Admin Panel (`/admin`) → **App Config**.
  - Turn off **Maintenance Mode** so real users can access resume checking and tools again.

---

## 5. Repair Overwritten Settings

Verify and restore the following in the Admin Panel:

- [ ] **ERP Settings:** Holiday calendar, monthly paid leave quota, signatory name and title.
- [ ] **Letter Templates:** Re-check "completion" letter template formatting.
- [ ] **Finance / Accounting:** Verify cash balance for October 2026.
- [ ] **Team Workspace:** Remove fake announcement ("Office closed on Diwali").
- [ ] **Colleges:** Remove fake test templates ("XYZ University" and "ABC College").
- [ ] **Learn Leo:** Confirm lessons and student progress are intact (restore from 23 Nov backup if needed).
- [ ] **Billing / Invoices:** Check payments and refunds for test dummy entries (`@example.com`, `@cvmind.test`).

---

## 6. Cleanup: Remove Injected Test Data

An automated cleanup script has been added to `backend/scripts/clean-incident-test-data.mjs` to automatically inspect and purge the fake test records.

- [ ] **Run Dry-Run to inspect matches:**
  ```bash
  cd backend
  node scripts/clean-incident-test-data.mjs --dry-run
  ```
- [ ] **Execute purge of 22 test admins, 196 test users, and fake templates:**
  ```bash
  cd backend
  node scripts/clean-incident-test-data.mjs --execute
  ```
- [ ] **Re-enable Nightly Backups (after data verification):**
  ```bash
  gh workflow enable nightly-backup.yml -R manavtiwari1/CVMind
  ```
- [ ] **Review GitHub write access & IP allowlisting on TiDB Cloud.**

---

## Status Summary

| Item | Status | Action Required |
|---|---|---|
| **Fake users banned** | Done | Cleanup with `clean-incident-test-data.mjs` |
| **Fake admins disabled** | Done | Cleanup with `clean-incident-test-data.mjs` |
| **Code guard (PR 74)** | **Merged into main** | Deployed on Render |
| **Auto-apply test guard** | **Patched in `sec-fixes`** | Merged & pushed |
| **Database passwords** | **Pending** | User action in TiDB Cloud & Render |
| **Admin credentials** | **Pending** | User action in Render |
| **Maintenance mode** | **Pending** | Toggle off in Admin UI |
