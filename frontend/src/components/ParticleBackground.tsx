import { useEffect, useRef, useCallback } from 'react';

interface ParticleBackgroundProps {
  theme: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;       // depth layer 0-1 (1 = front, 0 = back)
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  pulseSpeed: number;
  pulseOffset: number;
}

interface GeomShape {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  type: 'triangle' | 'diamond' | 'hex' | 'ring' | 'cross';
  color: string;
  depth: number;  // 0-1
}

export default function ParticleBackground({ theme }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  const isDark = theme !== 'light';

  const COLORS = isDark
    ? ['rgba(41,151,255,', 'rgba(100,180,255,', 'rgba(191,90,242,', 'rgba(48,209,88,']
    : ['rgba(0,80,180,',   'rgba(30,110,220,', 'rgba(120,40,180,', 'rgba(10,160,60,'];

  const createParticles = useCallback((W: number, H: number): Particle[] => {
    const count = Math.min(Math.floor((W * H) / 14000), 90);
    return Array.from({ length: count }, () => {
      const colorBase = COLORS[Math.floor(Math.random() * COLORS.length)];
      const depth = 0.2 + Math.random() * 0.8;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        z: depth,
        vx: (Math.random() - 0.5) * 0.3 * depth,
        vy: (Math.random() - 0.5) * 0.3 * depth,
        radius: 1.2 + Math.random() * 2.4 * depth,
        opacity: 0.25 + Math.random() * 0.55 * depth,
        color: colorBase,
        pulseSpeed: 0.008 + Math.random() * 0.012,
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });
  }, [isDark]);

  const createGeomShapes = useCallback((W: number, H: number): GeomShape[] => {
    const types: GeomShape['type'][] = ['triangle', 'diamond', 'hex', 'ring', 'cross'];
    const count = Math.min(12, Math.floor((W * H) / 60000));
    const shapeColors = isDark
      ? ['rgba(41,151,255,', 'rgba(191,90,242,', 'rgba(48,209,88,', 'rgba(255,200,60,']
      : ['rgba(0,90,210,',   'rgba(130,40,190,', 'rgba(0,140,60,',  'rgba(200,130,0,'];
    return Array.from({ length: count }, () => ({
      x: 50 + Math.random() * (W - 100),
      y: 50 + Math.random() * (H - 100),
      size: 18 + Math.random() * 45,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.004,
      opacity: isDark ? (0.06 + Math.random() * 0.1) : (0.04 + Math.random() * 0.06),
      type: types[Math.floor(Math.random() * types.length)],
      color: shapeColors[Math.floor(Math.random() * shapeColors.length)],
      depth: 0.1 + Math.random() * 0.5,
    }));
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    let particles: Particle[] = [];
    let shapes: GeomShape[] = [];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      particles = createParticles(W, H);
      shapes = createGeomShapes(W, H);
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    // --- Draw helpers ---

    const drawTriangle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = rot + (i * Math.PI * 2) / 3 - Math.PI / 2;
        const px = x + Math.cos(angle) * size;
        const py = y + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawDiamond = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
      ctx.beginPath();
      const pts = [
        [x + Math.cos(rot) * size * 0.6, y + Math.sin(rot) * size * 0.6],
        [x + Math.cos(rot + Math.PI / 2) * size, y + Math.sin(rot + Math.PI / 2) * size],
        [x + Math.cos(rot + Math.PI) * size * 0.6, y + Math.sin(rot + Math.PI) * size * 0.6],
        [x + Math.cos(rot + Math.PI * 1.5) * size, y + Math.sin(rot + Math.PI * 1.5) * size],
      ];
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
    };

    const drawHex = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = rot + (i * Math.PI * 2) / 6;
        const px = x + Math.cos(angle) * size;
        const py = y + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawRing = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number, color: string) => {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // inner ring
      ctx.beginPath();
      ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}${opacity * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawCross = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, opacity: number, color: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.strokeStyle = `${color}${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-size, 0); ctx.lineTo(size, 0);
      ctx.moveTo(0, -size); ctx.lineTo(0, size);
      ctx.stroke();
      // diagonal cross
      ctx.rotate(Math.PI / 4);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, 0); ctx.lineTo(size * 0.7, 0);
      ctx.moveTo(0, -size * 0.7); ctx.lineTo(0, size * 0.7);
      ctx.stroke();
      ctx.restore();
    };

    // --- Main draw loop ---
    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, W, H);

      // ── 1. Grid (perspective) ──────────────────────────────────
      const gridAlpha = isDark ? 0.028 : 0.018;
      ctx.strokeStyle = isDark
        ? `rgba(255,255,255,${gridAlpha})`
        : `rgba(0,0,0,${gridAlpha})`;
      ctx.lineWidth = 0.5;
      const gridSize = 70;
      for (let gx = 0; gx < W; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // ── 2. Geometric background shapes ────────────────────────
      shapes.forEach(s => {
        const parallaxX = (mx / W - 0.5) * 25 * s.depth;
        const parallaxY = (my / H - 0.5) * 25 * s.depth;
        const sx = s.x + parallaxX;
        const sy = s.y + parallaxY;
        s.rotation += s.rotSpeed;

        ctx.save();
        ctx.globalAlpha = 1;

        if (s.type === 'ring') {
          drawRing(ctx, sx, sy, s.size, s.opacity, s.color);
        } else if (s.type === 'cross') {
          drawCross(ctx, sx, sy, s.size * 0.8, s.rotation, s.opacity, s.color);
        } else {
          if (s.type === 'triangle') drawTriangle(ctx, sx, sy, s.size, s.rotation);
          else if (s.type === 'diamond') drawDiamond(ctx, sx, sy, s.size, s.rotation);
          else if (s.type === 'hex') drawHex(ctx, sx, sy, s.size, s.rotation);

          ctx.strokeStyle = `${s.color}${s.opacity})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Fill with very low opacity
          ctx.fillStyle = `${s.color}${s.opacity * 0.15})`;
          ctx.fill();
        }

        ctx.restore();
      });

      // ── 3. Particle connection lines ───────────────────────────
      const maxDist = 145;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.18 * Math.min(p1.z, p2.z);
            const colorBase = isDark ? `rgba(100,170,255,${alpha})` : `rgba(0,80,180,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = colorBase;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // ── 4. Mouse-proximity glow lines ─────────────────────────
      particles.forEach(p => {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const alpha = (1 - dist / 200) * 0.35 * p.z;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = isDark ? `rgba(41,151,255,${alpha})` : `rgba(0,90,220,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      // ── 5. Particles ────────────────────────────────────────────
      particles.forEach(p => {
        // Mouse parallax repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (1 - dist / 120) * 0.8 * p.z;
          p.vx += (dx / dist) * force * 0.025;
          p.vy += (dy / dist) * force * 0.025;
        }

        // Damping
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Pulse
        const pulse = Math.sin(t * p.pulseSpeed * 60 + p.pulseOffset) * 0.3 + 0.7;
        const finalOpacity = p.opacity * pulse;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);

        // Radial glow for front particles
        if (p.z > 0.6) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
          grad.addColorStop(0, `${p.color}${finalOpacity})`);
          grad.addColorStop(1, `${p.color}0)`);
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = `${p.color}${finalOpacity})`;
        }

        ctx.fill();
      });

      // ── 6. Mouse cursor glow ───────────────────────────────────
      if (mx > 0 && my > 0) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
        grad.addColorStop(0, isDark ? 'rgba(41,151,255,0.04)' : 'rgba(0,100,220,0.025)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, 120, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isDark, createParticles, createGeomShapes]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: isDark ? 1 : 0.7,
      }}
      aria-hidden="true"
    />
  );
}
