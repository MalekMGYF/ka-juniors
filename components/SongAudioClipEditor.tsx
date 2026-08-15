"use client";

import { useEffect, useRef, useState } from "react";

type ClipTarget = "intro" | "full";

type Props = {
  introFile: File | null;
  fullFile: File | null;
  onIntroFile: (file: File | null) => void;
  onFullFile: (file: File | null) => void;
  disabled?: boolean;
};

const MAX_SOURCE_BYTES = 24 * 1024 * 1024;
const MAX_CLIP_SECONDS = 55;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function makeWavFile(buffer: AudioBuffer, start: number, end: number, name: string) {
  const sampleRate = 44100;
  const outputChannels = Math.min(2, buffer.numberOfChannels);
  const sourceStart = Math.max(0, Math.floor(start * buffer.sampleRate));
  const sourceEnd = Math.min(buffer.length, Math.ceil(end * buffer.sampleRate));
  const sourceLength = Math.max(1, sourceEnd - sourceStart);
  const outputLength = Math.max(1, Math.floor((sourceLength / buffer.sampleRate) * sampleRate));
  const output = new Int16Array(outputLength * outputChannels);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = Math.min(sourceEnd - 1, sourceStart + Math.floor((index / outputLength) * sourceLength));
    for (let channel = 0; channel < outputChannels; channel += 1) {
      const sourceChannel = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
      const sample = Math.max(-1, Math.min(1, sourceChannel[sourceIndex] || 0));
      output[index * outputChannels + channel] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
  }

  const bytesPerSample = 2;
  const dataBytes = output.byteLength;
  const wav = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(wav);
  const writeText = (offset: number, text: string) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, outputChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * outputChannels * bytesPerSample, true);
  view.setUint16(32, outputChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);
  new Int16Array(wav, 44).set(output);
  return new File([wav], name, { type: "audio/wav" });
}

export default function SongAudioClipEditor({ introFile, fullFile, onIntroFile, onFullFile, disabled = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [decoded, setDecoded] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [target, setTarget] = useState<ClipTarget>("intro");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = start;
    }
    stopAtRef.current = null;
    setIsPreviewing(false);
  }

  async function selectSource(file: File | null) {
    stopPreview();
    setError("");
    setDecoded(null);
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setError("اختار ملف صوت فقط"); return; }
    if (file.size > MAX_SOURCE_BYTES) { setError("ملف الأغنية كبير جدًا للمحرر. اختار ملفًا أصغر من 24 ميجابايت."); return; }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setSourceUrl(url);
  }

  async function handleMetadata() {
    const nextDuration = audioRef.current?.duration || 0;
    setDuration(nextDuration);
    setStart(0);
    setEnd(Math.min(nextDuration, MAX_CLIP_SECONDS));
    setError("");
    if (!sourceFile) return;
    try {
      const context = new AudioContext();
      const arrayBuffer = await sourceFile.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      setDecoded(buffer);
      await context.close();
    } catch {
      setError("المتصفح قدر يشغل الملف لكن مش قادر يقصه. جرّب MP3 أو WAV أو M4A مختلف.");
    }
  }

  function updateStart(value: number) {
    const capped = Math.min(value, Math.max(0, end - 0.5));
    setStart(capped);
  }

  function updateEnd(value: number) {
    const minEnd = start + 0.5;
    const capped = Math.min(duration, Math.max(minEnd, value));
    if (capped - start > MAX_CLIP_SECONDS) setStart(Math.max(0, capped - MAX_CLIP_SECONDS));
    setEnd(capped);
  }

  function previewClip() {
    if (!audioRef.current || end <= start) return;
    const audio = audioRef.current;
    stopAtRef.current = end;
    audio.currentTime = start;
    void audio.play();
    setIsPreviewing(true);
  }

  function onTimeUpdate() {
    if (audioRef.current && stopAtRef.current !== null && audioRef.current.currentTime >= stopAtRef.current) stopPreview();
  }

  async function saveClip() {
    setError("");
    if (!decoded || end <= start) { setError("اختار ملف وحدد بداية ونهاية المقطع الأول."); return; }
    if (end - start > MAX_CLIP_SECONDS) { setError("المقطع الواحد لازم يكون 55 ثانية أو أقل."); return; }
    setIsPreparing(true);
    try {
      const file = makeWavFile(decoded, start, end, `song-${target}-${Date.now()}.wav`);
      if (file.size > MAX_UPLOAD_BYTES) { setError("المقطع الناتج أكبر من 5 ميجابايت. قص جزء أقصر."); return; }
      if (target === "intro") onIntroFile(file);
      else onFullFile(file);
    } catch {
      setError("حصلت مشكلة أثناء تجهيز المقطع. جرّب جزء أقصر أو ملف MP3/WAV.");
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <section className="song-clip-editor">
      <div className="song-clip-head"><div><span className="song-eyebrow">قص من الأغنية كاملة</span><h4>اختار الجزء اللي اللاعب هيسمعه</h4></div><span>🎧</span></div>
      <p>ارفع الأغنية هنا مرة واحدة، وحدد بداية ونهاية المقطع، واسمعه قبل ما تحفظه. المصدر لا يُرفع للسيرفر؛ اللي بيترفع هو الجزء اللي اخترته فقط.</p>
      {error && <div className="error-text">{error}</div>}
      <label className="song-source-drop"><input type="file" accept="audio/*" disabled={disabled} onChange={(event) => void selectSource(event.target.files?.[0] || null)} /><b>{sourceFile ? sourceFile.name : "ارفع ملف الأغنية الكامل"}</b><small>MP3 / M4A / WAV — حتى 24 ميجابايت للمحرر</small></label>
      {sourceUrl && <div className="song-clip-controls">
        <audio ref={audioRef} src={sourceUrl} preload="metadata" onLoadedMetadata={() => void handleMetadata()} onTimeUpdate={onTimeUpdate} onEnded={() => setIsPreviewing(false)} />
        <div className="song-clip-targets"><button type="button" className={target === "intro" ? "active" : ""} onClick={() => setTarget("intro")}>1. مقطع قبل الإجابة</button><button type="button" className={target === "full" ? "active" : ""} onClick={() => setTarget("full")}>2. مقطع بعد الإجابة</button></div>
        <div className="song-clip-timeline"><div><span>البداية</span><b>{formatTime(start)}</b></div><input type="range" min="0" max={duration || 0} step="0.1" value={start} onChange={(event) => updateStart(Number(event.target.value))} /><div><span>النهاية</span><b>{formatTime(end)}</b></div><input type="range" min="0" max={duration || 0} step="0.1" value={end} onChange={(event) => updateEnd(Number(event.target.value))} /></div>
        <div className="song-clip-summary"><span>الجزء المختار: <b>{formatTime(start)} — {formatTime(end)}</b></span><small>{formatTime(Math.max(0, end - start))} من 55 ثانية كحد أقصى</small></div>
        <div className="song-clip-actions"><button type="button" className="btn btn-outline" onClick={isPreviewing ? stopPreview : previewClip} disabled={!duration || disabled}>{isPreviewing ? "أوقف المعاينة" : "▶ اسمع الجزء"}</button><button type="button" className="btn btn-gold" onClick={() => void saveClip()} disabled={!decoded || isPreparing || disabled}>{isPreparing ? "جاري تجهيز المقطع…" : `احفظ كمقطع ${target === "intro" ? "بداية" : "بعد الإجابة"}`}</button></div>
      </div>}
      <div className="song-saved-clips"><span className={introFile ? "ready" : ""}>🎙️ {introFile ? `مقطع بداية جاهز (${formatTime(start)} تقريبًا)` : "مفيش مقطع بداية محفوظ"}{introFile && <button type="button" onClick={() => onIntroFile(null)}>×</button>}</span><span className={fullFile ? "ready" : ""}>✨ {fullFile ? `مقطع بعد الإجابة جاهز (${formatTime(start)} تقريبًا)` : "مفيش مقطع بعد الإجابة محفوظ"}{fullFile && <button type="button" onClick={() => onFullFile(null)}>×</button>}</span></div>
    </section>
  );
}
