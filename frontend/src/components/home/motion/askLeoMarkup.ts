// Static markup for a home motion section (no user data). The animation in the matching .ts file drives it.
export const ASK_LEO_MARKUP = `
<!-- ═════════ ASK LEO · BUILD SECTION ═════════ -->
<div class="lsn-wrap lsn-root">
  <section class="lsn-bsec" id="build" aria-label="Ask Leo tailors a resume">
    <div class="lsn-b-head">
      <div>
        <span class="lsn-b-new"><b>NEW</b>Ask Leo · Tailor &amp; cover letter</span>
        <h2>Paste the job you want.<br>Leo makes your resume <span class="lsn-hl">fit.</span></h2>
      </div>
      <div class="lsn-b-steps">
        <div class="lsn-b-step" aria-live="polite">
          <span class="lsn-b-step-k" id="bK">1 · Paste the job</span>
          <h3 id="bH">Paste it. No forms.</h3>
          <p id="bP">Paste the job description and attach your resume. Leo reads both together.</p>
        </div>
        <div class="lsn-b-bars" id="bBars">
          <button type="button" aria-label="Step 1: Paste the job"><span><i></i></span></button>
          <button type="button" aria-label="Step 2: Leo reads both"><span><i></i></span></button>
          <button type="button" aria-label="Step 3: Tailored resume"><span><i></i></span></button>
          <button type="button" aria-label="Step 4: Cover letter"><span><i></i></span></button>
          <button type="button" aria-label="Step 5: Save and apply"><span><i></i></span></button>
        </div>
      </div>
    </div>

    <div class="lsn-bw lsn-rv" aria-label="Sample CVMind workspace">
      <div class="lsn-bw-bar">
        <span class="lsn-d"><i></i><i></i><i></i></span>
        <span class="lsn-bk">← My Documents</span>
        <span class="lsn-bn">Frontend Developer · Example Co.</span>
        <span class="lsn-sp"></span>
        <span class="lsn-bw-tag"><i></i>Sample workspace</span>
        <span class="lsn-bw-av">A</span>
        <span class="lsn-btn lsn-btn-dark lsn-btn-sm lsn-bw-dl" id="bDl">Download</span>
      </div>
      <div class="lsn-bw-stage" id="bStage">
        <div class="lsn-bw-world" id="bWorld">
          <div class="lsn-bw-rail" aria-hidden="true"><i></i><i class="lsn-on"></i><i></i><i></i><i></i><i></i></div>

          <div class="lsn-bw-notes" aria-hidden="true">
            <span class="lsn-nl">My notes</span>
            <div class="lsn-note lsn-y">Apply by Friday</div>
            <div class="lsn-note lsn-g">Keep it to one page</div>
            <div class="lsn-note lsn-b">Lead with React work</div>
          </div>

          <svg class="lsn-blink" aria-hidden="true"><path id="bPath" d="M555,190 C583,190 583,160 610,160"/><circle id="bDot" cx="610" cy="160" r="4"/></svg>

          <div class="lsn-bcard" id="bJob">
            <span class="lsn-k">Job post</span>
            <span class="lsn-tt">Frontend Developer</span>
            <span class="lsn-sub">Example Co. · Bengaluru · Hybrid</span>
            <div class="lsn-ln"></div><div class="lsn-ln lsn-m"></div><div class="lsn-ln lsn-s"></div>
            <div class="lsn-bchips" id="bJobChips"><span>React</span><span>TypeScript</span><span>Testing</span><span>CI/CD</span><span>Accessibility</span><span>Next.js</span></div>
          </div>

          <div class="lsn-bcard" id="bRes">
            <span class="lsn-k">Resume</span>
            <span class="lsn-nm">Aarav Sharma</span>
            <span class="lsn-bpill" id="bPill">Tailored for Example Co.</span>
            <div class="lsn-bmeter"><div class="lsn-row"><span>Job match</span><b id="bMatch">84%</b></div><div class="lsn-tr"><i id="bMeter"></i></div></div>
            <ul>
              <li id="bL1">Rebuilt the React checkout, cutting load time from 3.1s to 1.2s.</li>
              <li id="bL2">Added Jest and Playwright tests, raising coverage to 80%.</li>
              <li id="bL3">Set up CI/CD on GitHub Actions for weekly releases.</li>
            </ul>
            <div class="lsn-bchips" id="bResChips"><span class="lsn-hit">React</span><span class="lsn-hit">TypeScript</span><span class="lsn-add">Testing</span><span class="lsn-add">CI/CD</span></div>
          </div>

          <div class="lsn-bcard" id="bCl">
            <span class="lsn-k">Cover letter</span>
            <span class="lsn-tt">Dear hiring team at Example Co.,</span>
            <div class="lsn-ln"></div><div class="lsn-ln lsn-m"></div><div class="lsn-ln"></div><div class="lsn-ln lsn-s"></div>
          </div>

          <div class="lsn-bleo" id="bLeo">
            <span class="lsn-av">L</span>
            <div><b>Leo</b><span id="bLeoTx">You match 9 of 14 skills. I moved your React work up and added your testing and CI/CD experience.</span></div>
          </div>

          <div class="lsn-bask" id="bAsk">
            <span class="lsn-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="#2dc08d" aria-hidden="true"><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z"/></svg></span>
            <span class="lsn-tx" id="bAskTx">Ask Leo or paste a job description…</span>
            <span class="lsn-go">↑</span>
          </div>

          <div class="lsn-btoast" id="bToast"><span class="lsn-ok">✓</span><span><b>Saved to My Documents</b> · Frontend_ExampleCo.pdf</span></div>

          <div class="lsn-bcur" id="bCur" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#0d0d0d" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><span class="lsn-bclick" id="bClick"></span></div>
        </div>
      </div>
    </div>
    <p class="lsn-mock-note">Sample workspace · placeholder content for the mockup</p>
  </section>
</div>

`;
