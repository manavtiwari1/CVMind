// Static markup for Ask Leo interactive video walkthrough demo
export const ASK_LEO_MARKUP = `
<!-- ═════════ ASK LEO · PRODUCT VIDEO WALKTHROUGH ═════════ -->
<div class="lsn-wrap lsn-root">
  <section class="lsn-bsec" id="build" aria-label="Ask Leo video walkthrough">
    <div class="lsn-b-head">
      <div>
        <span class="lsn-b-new"><b>VIDEO DEMO</b>Ask Leo · Tailor &amp; cover letter in 17s</span>
        <h2>Paste the job you want.<br>Leo makes your resume <span class="lsn-hl">fit.</span></h2>
      </div>
      <div class="lsn-b-steps">
        <div class="lsn-b-step" aria-live="polite">
          <span class="lsn-b-step-k" id="bK">1 · Paste the job</span>
          <h3 id="bH">Paste it. No forms.</h3>
          <p id="bP">Paste the job description and attach your resume. Leo reads both together.</p>
        </div>
        <div class="lsn-b-bars" id="bBars" title="Click any chapter to jump">
          <button type="button" aria-label="Step 1: Paste the job" title="1. Paste the job"><span><i></i></span></button>
          <button type="button" aria-label="Step 2: Leo reads both" title="2. Leo reads both"><span><i></i></span></button>
          <button type="button" aria-label="Step 3: Tailored resume" title="3. Tailored resume"><span><i></i></span></button>
          <button type="button" aria-label="Step 4: Cover letter" title="4. Cover letter"><span><i></i></span></button>
          <button type="button" aria-label="Step 5: Save and apply" title="5. Save and apply"><span><i></i></span></button>
        </div>
      </div>
    </div>

    <div class="lsn-bw lsn-rv" aria-label="Interactive video player showing CVMind workspace">
      <!-- Window header -->
      <div class="lsn-bw-bar">
        <span class="lsn-d"><i></i><i></i><i></i></span>
        <span class="lsn-bk">← My Documents</span>
        <span class="lsn-bn">Frontend Developer · Example Co.</span>
        <span class="lsn-sp"></span>
        <span class="lsn-bw-tag"><i></i>Interactive Walkthrough</span>
        <span class="lsn-bw-av">A</span>
        <span class="lsn-btn lsn-btn-dark lsn-btn-sm lsn-bw-dl" id="bDl">Download</span>
      </div>

      <!-- Video canvas stage -->
      <div class="lsn-bw-stage" id="bStage" title="Click stage to Play / Pause">
        <!-- Center play overlay (visible when paused) -->
        <button type="button" class="lsn-voverlay" id="bVidOverlay" aria-label="Play video demo">
          <span class="lsn-voverlay-btn">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </span>
          <span class="lsn-voverlay-tx">Click to Play Demo</span>
        </button>

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

      <!-- Modern Video Player Controls Bar -->
      <div class="lsn-vctrls" id="bVidControls" aria-label="Video walkthrough controls">
        <button type="button" class="lsn-vc-btn" id="bVidPlay" aria-label="Play / Pause video" title="Play or Pause">
          <span class="lsn-vc-icon-play" id="bVidPlayIcon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </span>
          <span class="lsn-vc-icon-pause" id="bVidPauseIcon" style="display:none">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </span>
        </button>

        <span class="lsn-vc-time" id="bVidTime">0:00 / 0:17</span>

        <div class="lsn-vc-scrub" id="bVidScrub" role="slider" aria-label="Video scrubber" aria-valuemin="0" aria-valuemax="17" aria-valuenow="0" tabindex="0">
          <div class="lsn-vc-track">
            <div class="lsn-vc-fill" id="bVidFill"></div>
            <div class="lsn-vc-thumb" id="bVidThumb"></div>
            <span class="lsn-vc-mark" style="left:0%" title="Chapter 1: Paste Job"></span>
            <span class="lsn-vc-mark" style="left:22.6%" title="Chapter 2: Leo Reads Both"></span>
            <span class="lsn-vc-mark" style="left:42.4%" title="Chapter 3: Tailored Resume"></span>
            <span class="lsn-vc-mark" style="left:63.3%" title="Chapter 4: Cover Letter"></span>
            <span class="lsn-vc-mark" style="left:80.8%" title="Chapter 5: Save & Apply"></span>
          </div>
        </div>

        <button type="button" class="lsn-vc-speed" id="bVidSpeed" aria-label="Playback speed" title="Toggle Speed">1x</button>

        <button type="button" class="lsn-vc-btn" id="bVidRestart" aria-label="Restart video" title="Replay from start">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>

        <div class="lsn-vc-badge">
          <span class="lsn-vc-live-dot"></span>
          <span>Live Demo</span>
        </div>
      </div>
    </div>
    <p class="lsn-mock-note">Sample workspace · Interactive video preview of Ask Leo AI engine</p>
  </section>
</div>
`;
