import React, { useEffect, useRef } from 'react';

export const LiveWallpaperCanvas: React.FC<{
  mode?: 'none' | 'fluent-aurora' | 'mica-waves' | 'cyber-matrix' | 'starfield-3d';
  liveWallpaperId?: 'none' | 'fluent-aurora' | 'mica-waves' | 'cyber-matrix' | 'starfield-3d';
  accentColor?: string;
  isPaused?: boolean;
}> = ({ mode: propMode, liveWallpaperId, isPaused = false }) => {
  const mode = propMode || liveWallpaperId || 'none';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (mode === 'none' || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 120 }, () => ({
      x: (Math.random() - 0.5) * 1600,
      y: (Math.random() - 0.5) * 1000,
      z: Math.random() * 1000 + 50,
    }));

    const render = () => {
      t += 0.012;
      const w = canvas.width;
      const h = canvas.height;

      if (mode === 'fluent-aurora') {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.5, '#071936');
        grad.addColorStop(1, '#030712');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 3; i++) {
          const cx = w * (0.3 + 0.2 * i + Math.sin(t + i * 1.7) * 0.12);
          const cy = h * (0.4 + Math.cos(t * 0.8 + i) * 0.15);
          const rad = Math.max(w, h) * 0.42;
          const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, rad);
          const colors = [
            'rgba(0, 120, 212, 0.26)',
            'rgba(16, 185, 129, 0.18)',
            'rgba(99, 102, 241, 0.22)',
          ];
          g.addColorStop(0, colors[i]);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      } else if (mode === 'mica-waves') {
        ctx.fillStyle = '#080d1a';
        ctx.fillRect(0, 0, w, h);
        for (let wave = 0; wave < 4; wave++) {
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 24) {
            const y =
              h * (0.45 + wave * 0.1) +
              Math.sin(x * 0.003 + t + wave) * 38 +
              Math.cos(x * 0.0015 - t * 0.7) * 24;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fillStyle = `rgba(56, 189, 248, ${0.06 + wave * 0.025})`;
          ctx.fill();
        }
      } else if (mode === 'cyber-matrix') {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.22)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0ea5e9';
        ctx.font = '12px monospace';
        for (let i = 0; i < 40; i++) {
          const x = ((i * 47) % w);
          const y = ((t * 140 + i * 83) % h);
          ctx.fillText(String.fromCharCode(0x30a0 + ((i + Math.floor(t * 10)) % 64)), x, y);
        }
      } else if (mode === 'starfield-3d') {
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;
        for (const s of stars) {
          s.z -= 4;
          if (s.z <= 10) s.z = 1000;
          const sx = cx + (s.x / s.z) * 420;
          const sy = cy + (s.y / s.z) * 420;
          const r = Math.max(0.6, (1 - s.z / 1000) * 2.8);
          ctx.fillStyle = `rgba(186, 230, 253, ${1 - s.z / 1000})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  if (mode === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};
