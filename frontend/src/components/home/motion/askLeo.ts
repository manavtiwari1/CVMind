import { gsap } from 'gsap';

/* The Ask Leo workspace video walkthrough:
   Paste a job → Leo reads both → Tailored resume → Cover letter → Saved & applied.
   Operates as an interactive video demo with playback controls (Play/Pause, Timeline Scrubber,
   Speed Toggle 1x/1.5x/2x, Chapter Jumps, and Restart). Autoplays when in viewport.
*/
export function runAskLeo(root: HTMLElement): () => void {
  const $ = (id: string) => root.querySelector<HTMLElement>('#' + id)!;
  const stage = $('bStage'), world = $('bWorld');

  // Phone layout by screen width
  const M = window.innerWidth < 700, W = M ? 420 : 1100;
  if (M) {
    stage.parentElement!.classList.add('lsn-m');
    $('bPath').setAttribute('d', 'M130,240 C130,262 110,262 110,282');
    $('bDot').setAttribute('cx', '110');
    $('bDot').setAttribute('cy', '282');
  }
  const fit = () => world.style.setProperty('--s', (stage.clientWidth / W).toFixed(4));
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(stage);

  const bars = Array.from(root.querySelectorAll<HTMLElement>('#bBars i'));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bars.forEach((b) => { b.style.transform = 'scaleX(1)'; });
    return () => ro.disconnect();
  }

  /* cursor stops for each layout */
  const P = M
    ? { start: [360, 420], ask: [170, 738], go: [386, 738], job: [120, 130], res: [300, 420], cl: [330, 120] }
    : { start: [900, 300], ask: [520, 575], go: [782, 577], job: [470, 330], res: [760, 250], cl: [1000, 250] };

  const STEPS = [
    { k: '1 · Paste the job', h: 'Paste it. No forms.', p: 'Paste the job description and attach your resume. Leo reads both together.' },
    { k: '2 · Leo reads both', h: 'Your skills against theirs.', p: 'Leo matches every skill and keyword in the job post against your resume, and shows what is missing.' },
    { k: '3 · Tailored resume', h: 'Rewritten for this role.', p: 'Your bullets are reordered and reworded for this job, in your own words. The match score updates as it goes.' },
    { k: '4 · Cover letter', h: 'From the same job post.', p: 'Leo writes a cover letter that matches the tailored resume, ready to edit.' },
    { k: '5 · Save and apply', h: 'One click to a clean PDF.', p: 'Open it in the Tailor to download an ATS-safe PDF and save it to My Documents.' },
  ];
  const PROMPT = 'Tailor my resume for this job: example.co/jobs/frontend';
  const L1 = 'Rebuilt the React checkout, cutting load time from 3.1s to 1.2s.';
  const L2 = 'Added Jest and Playwright tests, raising coverage to 80%.';
  const L3 = 'Set up CI/CD on GitHub Actions for weekly releases.';
  const LEO_THINK = '<span class="lsn-dots3"><i></i><i></i><i></i></span>';
  const LEO_1 = 'You match 9 of 14 skills. I moved your React work up and added your testing and CI/CD experience.';
  const LEO_2 = 'I also wrote a cover letter from the same job post. Want it shorter?';

  const ac = new AbortController();
  const ctx = gsap.context(() => {
    const jobChips = Array.from(root.querySelectorAll<HTMLElement>('#bJobChips span'));
    const resChips = root.querySelectorAll('#bResChips span');
    const typed = { a: 0, l1: 0, l2: 0, l3: 0 }, match = { v: 58 };
    const typeTo = (el: HTMLElement, str: string, p: number) => { el.textContent = str.slice(0, Math.round(str.length * p)); };
    const cur = $('bCur'), click = $('bClick');

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

    /* starting state */
    tl.set(cur, { x: P.start[0], y: P.start[1], opacity: 0 }, 0)
      .set('#bAskTx', { className: 'lsn-tx' }, 0)
      .set(typed, { a: 0, l1: 0, l2: 0, l3: 0 }, 0)
      .set(match, { v: 58 }, 0)
      .set('#bJob', { opacity: 0, y: -40, scale: .92, rotation: -3 }, 0)
      .set(jobChips, { className: '' }, 0)
      .set(['#bPath', '#bDot'], { opacity: 0 }, 0)
      .set('#bLeo', { opacity: 0, y: 16, scale: .96 }, 0)
      .set('#bRes', { opacity: 0, y: 30, scale: .95 }, 0)
      .set('#bPill', { opacity: 0, scale: .6 }, 0)
      .set(resChips, { opacity: 0, scale: .5 }, 0)
      .set('#bCl', { opacity: 0, x: 120, rotation: 12 }, 0)
      .set('#bCl .lsn-ln', { scaleX: 0, transformOrigin: '0 50%' }, 0)
      .set('#bToast', { opacity: 0, y: -14 }, 0)
      .set('#bDl', { scale: 1 }, 0)
      .call(() => {
        ['bL1', 'bL2', 'bL3'].forEach((id) => { $(id).textContent = ''; });
        $('bMatch').textContent = '58%'; $('bMeter').style.width = '58%';
      }, undefined, 0)

    /* 1 · paste the job */
      .addLabel('s1', 0)
      .to(cur, { opacity: 1, duration: .2 }, 's1+=.2')
      .to(cur, { x: P.ask[0], y: P.ask[1], duration: .9, ease: 'power3.inOut' }, 's1+=.25')
      .fromTo(click, { opacity: .9, scale: .3 }, { opacity: 0, scale: 1.8, duration: .45 }, 's1+=1.1')
      .set('#bAskTx', { className: 'lsn-tx lsn-typed' }, 's1+=1.15')
      .to(typed, { a: 1, duration: 1.4, ease: 'none', onUpdate: () => typeTo($('bAskTx'), PROMPT, typed.a) }, 's1+=1.15')
      .to(cur, { x: P.go[0], y: P.go[1], duration: .5, ease: 'power3.inOut' }, 's1+=2.55')
      .fromTo(click, { opacity: .9, scale: .3 }, { opacity: 0, scale: 1.8, duration: .45 }, 's1+=3.05')
      .to('#bJob', { opacity: 1, y: 0, scale: 1, rotation: 0, duration: .7, ease: 'back.out(1.6)' }, 's1+=3.15')
      .call(() => { $('bAskTx').className = 'lsn-tx'; $('bAskTx').textContent = 'Ask Leo or paste a job description…'; }, undefined, 's1+=3.3')

    /* 2 · Leo reads both */
      .addLabel('s2', 's1+=3.9')
      .to(cur, { x: P.job[0], y: P.job[1], duration: .7, ease: 'power3.inOut' }, 's2')
      .to('#bLeo', { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(1.8)' }, 's2+=.1')
      .set(jobChips[0], { className: 'lsn-hit' }, 's2+=1.0')
      .set(jobChips[1], { className: 'lsn-hit' }, 's2+=1.25')
      .set(jobChips[2], { className: 'lsn-add' }, 's2+=1.5')
      .set(jobChips[3], { className: 'lsn-add' }, 's2+=1.75')
      .fromTo(jobChips, { scale: 1 }, { scale: 1.12, duration: .12, yoyo: true, repeat: 1, stagger: .25 }, 's2+=.95')
      .to(['#bPath', '#bDot'], { opacity: 1, duration: .4 }, 's2+=2.0')
      .fromTo('#bDot', { scale: .4, transformOrigin: '50% 50%' }, { scale: 1.4, duration: .35, yoyo: true, repeat: 3 }, 's2+=2.0')

    /* 3 · tailored resume */
      .addLabel('s3', 's2+=3.4')
      .to('#bRes', { opacity: 1, y: 0, scale: 1, duration: .7, ease: 'back.out(1.4)' }, 's3')
      .to(cur, { x: P.res[0], y: P.res[1], duration: .8, ease: 'power3.inOut' }, 's3+=.2')
      .to('#bPill', { opacity: 1, scale: 1, duration: .4, ease: 'back.out(2.4)' }, 's3+=.5')
      .to(typed, { l1: 1, duration: .9, ease: 'none', onUpdate: () => typeTo($('bL1'), L1, typed.l1) }, 's3+=.7')
      .to(typed, { l2: 1, duration: .9, ease: 'none', onUpdate: () => typeTo($('bL2'), L2, typed.l2) }, 's3+=1.6')
      .to(typed, { l3: 1, duration: .8, ease: 'none', onUpdate: () => typeTo($('bL3'), L3, typed.l3) }, 's3+=2.5')
      .to(match, { v: 84, duration: 2.6, ease: 'power1.inOut', onUpdate: () => {
        const v = Math.round(match.v);
        $('bMatch').textContent = v + '%'; $('bMeter').style.width = v + '%';
      } }, 's3+=.7')
      .to(resChips, { opacity: 1, scale: 1, duration: .4, ease: 'back.out(2.2)', stagger: .12 }, 's3+=2.9')

    /* 4 · cover letter */
      .addLabel('s4', 's3+=3.6')
      .to('#bCl', { opacity: 1, x: 0, rotation: 3, duration: .8, ease: 'back.out(1.3)' }, 's4')
      .to('#bCl .lsn-ln', { scaleX: 1, duration: .5, stagger: .15, ease: 'power2.out' }, 's4+=.5')
      .to(cur, { x: P.cl[0], y: P.cl[1], duration: .8, ease: 'power3.inOut' }, 's4+=.3')
      .fromTo('#bLeo', { scale: 1 }, { scale: 1.03, duration: .15, yoyo: true, repeat: 1 }, 's4+=1.0')

    /* 5 · save and apply */
      .addLabel('s5', 's4+=3.0')
      .to(cur, { opacity: 0, duration: .3 }, 's5')
      .to('#bDl', { scale: .92, duration: .12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 's5+=.4')
      .to('#bToast', { opacity: 1, y: 0, duration: .5, ease: 'back.out(2)' }, 's5+=.6')
      .to('#bToast', { opacity: 1, duration: 2.2 }, 's5+=1.1')
      .addLabel('end', 's5+=3.3');

    const starts = ['s1', 's2', 's3', 's4', 's5', 'end'].map((l) => tl.labels[l]);
    const totalDuration = tl.duration() || 17.2;

    let shown = -1, leoState = '';
    const stepAt = (t: number) => { for (let i = 4; i >= 0; i--) if (t >= starts[i]) return i; return 0; };

    // Video Player Controls Elements
    const playBtn = $('bVidPlay');
    const playIcon = $('bVidPlayIcon');
    const pauseIcon = $('bVidPauseIcon');
    const timeDisplay = $('bVidTime');
    const scrubTrack = $('bVidScrub');
    const fillBar = $('bVidFill');
    const thumb = $('bVidThumb');
    const speedBtn = $('bVidSpeed');
    const restartBtn = $('bVidRestart');
    const overlay = $('bVidOverlay');

    const fmtTime = (sec: number) => {
      const s = Math.max(0, Math.floor(sec));
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return `${m}:${rem < 10 ? '0' : ''}${rem}`;
    };

    let userPaused = false;
    let restartTimer: number | null = null;

    const updatePlayStateUI = () => {
      const isPlaying = tl.isActive();
      if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        overlay.classList.add('lsn-playing');
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        overlay.classList.remove('lsn-playing');
      }
    };

    const render = () => {
      const t = tl.time(), s = stepAt(t);

      // Chapter progress bars at top
      bars.forEach((b, i) => {
        const p = i < s ? 1 : i > s ? 0 : (t - starts[i]) / (starts[i + 1] - starts[i]);
        b.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)).toFixed(3) + ')';
      });

      // Step text
      if (s !== shown) {
        shown = s;
        gsap.fromTo(['#bK', '#bH', '#bP'], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, stagger: .05, ease: 'power2.out' });
        $('bK').textContent = STEPS[s].k; $('bH').textContent = STEPS[s].h; $('bP').textContent = STEPS[s].p;
      }

      // Leo message state
      const want = t < starts[1] + .9 ? 'think' : t < starts[3] + .9 ? 'one' : 'two';
      if (want !== leoState) {
        leoState = want;
        $('bLeoTx').innerHTML = want === 'think' ? LEO_THINK : want === 'one' ? LEO_1 : LEO_2;
      }

      // Video Controls updates
      const pct = Math.max(0, Math.min(1, t / totalDuration));
      fillBar.style.width = (pct * 100) + '%';
      thumb.style.left = (pct * 100) + '%';
      scrubTrack.setAttribute('aria-valuenow', Math.round(t).toString());
      timeDisplay.textContent = `${fmtTime(t)} / ${fmtTime(totalDuration)}`;

      updatePlayStateUI();
    };

    tl.eventCallback('onUpdate', render);
    render();

    // Toggle Play / Pause function
    const togglePlay = () => {
      if (restartTimer) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      if (tl.isActive()) {
        tl.pause();
        userPaused = true;
      } else {
        if (tl.time() >= totalDuration - 0.2) {
          tl.restart();
        } else {
          tl.play();
        }
        userPaused = false;
      }
      updatePlayStateUI();
    };

    // Stage and overlay click triggers Play/Pause
    stage.addEventListener('click', (e) => {
      // Don't toggle if clicking on interactive form simulation elements
      const target = e.target as HTMLElement;
      if (target.closest('.lsn-vctrls')) return;
      togglePlay();
    }, { signal: ac.signal });

    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    }, { signal: ac.signal });

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    }, { signal: ac.signal });

    // Restart button
    restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (restartTimer) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      userPaused = false;
      tl.restart();
      updatePlayStateUI();
    }, { signal: ac.signal });

    // Speed toggle
    const speeds = [1, 1.5, 2];
    let speedIdx = 0;
    speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speedIdx = (speedIdx + 1) % speeds.length;
      const spd = speeds[speedIdx];
      tl.timeScale(spd);
      speedBtn.textContent = spd + 'x';
    }, { signal: ac.signal });

    // Interactive timeline scrubber
    let isScrubbing = false;
    const seekWithClientX = (clientX: number) => {
      const rect = scrubTrack.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      tl.seek(ratio * totalDuration);
      render();
    };

    scrubTrack.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      isScrubbing = true;
      if (restartTimer) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      tl.pause();
      seekWithClientX(e.clientX);

      const onPointerMove = (ev: PointerEvent) => {
        if (isScrubbing) seekWithClientX(ev.clientX);
      };
      const onPointerUp = () => {
        if (isScrubbing) {
          isScrubbing = false;
          if (!userPaused) tl.play();
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }, { signal: ac.signal });

    // Clicking top chapter bars seeks video directly to that chapter
    root.querySelectorAll<HTMLButtonElement>('#bBars button').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        if (restartTimer) {
          window.clearTimeout(restartTimer);
          restartTimer = null;
        }
        tl.seek(starts[i] + 0.05);
        if (!userPaused) tl.play();
        render();
      }, { signal: ac.signal });
    });

    // Seamless loop on video completion with brief hold
    tl.eventCallback('onComplete', () => {
      updatePlayStateUI();
      restartTimer = window.setTimeout(() => {
        if (!userPaused) {
          tl.restart();
        }
      }, 2400);
    });

    // Autoplay when visible in viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!userPaused && tl.paused()) {
            tl.play();
          }
        } else {
          tl.pause();
        }
        updatePlayStateUI();
      });
    }, { threshold: 0.25 });

    observer.observe(root);

    // Initial state setup
    updatePlayStateUI();

    ac.signal.addEventListener('abort', () => {
      if (restartTimer) window.clearTimeout(restartTimer);
      observer.disconnect();
    });
  }, root);

  return () => {
    ac.abort();
    ro.disconnect();
    ctx.revert();
  };
}
