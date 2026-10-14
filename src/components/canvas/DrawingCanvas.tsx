import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { CanvasStroke, LiveStroke, Point } from '@/types/canvas';
import { cn } from '@/lib/utils';

export interface DrawingCanvasHandle { toDataURL: () => string | null }

interface Props {
  strokes: CanvasStroke[];
  live?: LiveStroke[];
  editable?: boolean;
  color?: string;
  width?: number;
  erasing?: boolean;
  onLive?: (points: Point[]) => void;
  onCommit?: (points: Point[]) => void;
  onEraseAt?: (point: Point) => void;
  className?: string;
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, width: number, points: Point[]) {
  if (!points.length) return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, width * w);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0] * w, points[0][1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0][0] * w, points[0][1] * h);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * w, points[i][1] * h);
  ctx.stroke();
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { strokes, live = [], editable = false, color = '#222', width = 0.008, erasing = false, onLive, onCommit, onEraseAt, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = useRef<Point[] | null>(null);

  useImperativeHandle(ref, () => ({ toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? null }));

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
    ctx.fillStyle = paper ? `hsl(${paper})` : '#f4f1e8';
    ctx.fillRect(0, 0, w, h);
    for (const s of strokes) paint(ctx, w, h, s.color, s.width, s.points);
    for (const s of live) paint(ctx, w, h, s.color, s.width, s.points);
    if (current.current) paint(ctx, w, h, color, width, current.current);
  }, [strokes, live, color, width]);

  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const toPoint = (e: React.PointerEvent): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  };

  const down = (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (erasing) { onEraseAt?.(toPoint(e)); return; }
    current.current = [toPoint(e)];
    onLive?.(current.current);
    redraw();
  };
  const move = (e: React.PointerEvent) => {
    if (!editable) return;
    if (erasing) { if (e.buttons) onEraseAt?.(toPoint(e)); return; }
    if (!current.current) return;
    const pt = toPoint(e);
    const last = current.current[current.current.length - 1];
    if (Math.abs(pt[0] - last[0]) + Math.abs(pt[1] - last[1]) < 0.003) return;
    current.current = [...current.current, pt];
    onLive?.(current.current);
    redraw();
  };
  const up = () => {
    if (!current.current) return;
    const pts = current.current;
    current.current = null;
    onCommit?.(pts);
  };

  return (
    <div ref={wrapRef} className={cn('relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border', className)}>
      <canvas
        ref={canvasRef}
        aria-label={editable ? 'Drawing canvas — draw here' : 'Shared drawing'}
        className={cn('absolute inset-0 h-full w-full', editable && 'cursor-crosshair touch-none')}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      />
    </div>
  );
});

export default DrawingCanvas;
