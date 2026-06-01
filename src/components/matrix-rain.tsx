"use client";

import { useEffect, useRef } from "react";

/** Lightweight Matrix digital-rain canvas backdrop. */
export function MatrixRain({ className, opacity = 0.18 }: { className?: string; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let cols = 0;
    let drops: number[] = [];
    const fontSize = 14;
    const glyphs = "ｱｲｳｴｵｶｷｸ0123456789ABCDEFｸｹｺｻ<>/\\{}[]=+*".split("");

    function resize() {
      const parent = canvas!.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
      cols = Math.floor(w / fontSize);
      drops = Array(cols).fill(0).map(() => Math.floor((Math.random() * h) / fontSize));
    }
    resize();

    let last = 0;
    function draw(ts: number) {
      raf = requestAnimationFrame(draw);
      if (ts - last < 55) return;
      last = ts;
      ctx!.fillStyle = "rgba(5, 7, 6, 0.16)";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx!.fillStyle = Math.random() > 0.975 ? "#4dff95" : "#18e26a";
        ctx!.fillText(text, x, y);
        if (y > canvas!.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} style={{ opacity }} aria-hidden />;
}
