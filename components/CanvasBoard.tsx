// Style reminder: the canvas is the visual stage of the dark editorial game UI; keep controls quiet so hand-drawn strokes lead.

"use client";

import { useEffect, useRef, useState } from "react";
import type { Stroke } from "../lib/pictionary";

type Props = { canDraw: boolean; color: string; brushSize: number; tool?: "brush" | "eraser"; clearSignal: number; strokes?: Stroke[]; onStroke?: (points: Array<{ x: number; y: number }>) => void };

function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export default function CanvasBoard({ canDraw, color, brushSize, tool = "brush", clearSignal, strokes = [], onStroke }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const currentStroke = useRef<Array<{ x: number; y: number }>>([]);
  const [hasInk, setHasInk] = useState(false);

  const drawStroke = (context: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
    context.globalCompositeOperation = "source-over";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (context) strokes.forEach((stroke) => drawStroke(context, stroke));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    strokes.forEach((stroke) => drawStroke(context, stroke));
    setHasInk(false);
  }, [clearSignal, strokes]);

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPoint.current = pointFromEvent(event, event.currentTarget);
    currentStroke.current = [lastPoint.current];
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || !lastPoint.current) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const nextPoint = pointFromEvent(event, canvas);
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    context.globalCompositeOperation = "source-over";
    lastPoint.current = nextPoint;
    currentStroke.current.push(nextPoint);
    setHasInk(true);
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (currentStroke.current.length > 1) onStroke?.(currentStroke.current);
    currentStroke.current = [];
    lastPoint.current = null;
  };

  return (
    <div className={`pictionary-canvas-stage ${canDraw ? "pictionary-canvas-active" : ""} ${hasInk ? "has-ink" : ""}`}>
      <div className="pictionary-canvas-grid" aria-hidden="true" />
      <canvas ref={canvasRef} className="pictionary-drawing-canvas" aria-label={canDraw ? "لوحة الرسم" : "لوحة الرسم للعرض"} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} />
      {!canDraw && <div className="pictionary-viewer-note"><span>◉</span><span>اتفرج وخمّن… سلمى بترسم دلوقتي</span></div>}
    </div>
  );
}
