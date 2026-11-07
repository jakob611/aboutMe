export function createCanvas(host: HTMLElement, label: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas unavailable");
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.renderer = label;
  host.append(canvas);
  let width = 1, height = 1, ratio = 1, dirty = true, previous = 0, disposed = false, frame = 0;
  const observer = new ResizeObserver(() => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(1_200_000 / (width * height)));
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    dirty = true;
  });
  observer.observe(host);
  return {
    invalidate() { dirty = true; },
    loop(render: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, dirty: boolean) => void) {
      const animate = (now: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        if (document.hidden) { previous = 0; return; }
        const dt = previous ? Math.min(.05, (now - previous) / 1000) : 0;
        previous = now;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        render(ctx, width, height, dt, dirty);
        dirty = false;
      };
      frame = requestAnimationFrame(animate);
    },
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); canvas.remove(); },
  };
}
export function polygon(ctx: CanvasRenderingContext2D, color: string | CanvasGradient, points: [number, number][]) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) ctx.moveTo(...points[i]);
    else ctx.lineTo(...points[i]);
  }
  ctx.closePath(); ctx.fill();
}
export function ellipse(ctx: CanvasRenderingContext2D, color: string | CanvasGradient, x: number, y: number, rx: number, ry: number) {
  if (rx <= 0 || ry <= 0) return;
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
