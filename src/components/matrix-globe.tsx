"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight 3D-ish Matrix globe — a rotating sphere of green dots drawn on a
 * 2D canvas. No WebGL / Three.js, so it stays GPU-light and doesn't hurt the
 * performance score. Respects prefers-reduced-motion.
 */
export function MatrixGlobe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, R = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, h) * 0.42;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Fibonacci sphere of points
    const N = 460;
    const pts: { x: number; y: number; z: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let angle = 0;
    let raf = 0;
    const tilt = 0.42;
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      for (const p of pts) {
        // rotate around Y
        const x1 = p.x * ca - p.z * sa;
        const z1 = p.x * sa + p.z * ca;
        // tilt around X
        const y2 = p.y * cosT - z1 * sinT;
        const z2 = p.y * sinT + z1 * cosT;
        const depth = (z2 + 1) / 2; // 0 (back) .. 1 (front)
        const sx = cx + x1 * R;
        const sy = cy + y2 * R;
        const size = 0.5 + depth * 1.8;
        const alpha = 0.12 + depth * 0.7;
        ctx.beginPath();
        ctx.fillStyle = `rgba(24, 226, 106, ${alpha.toFixed(3)})`;
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) {
        angle += 0.0016;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
