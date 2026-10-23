'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { avatarEmoji } from '@/components/Avatar';
import { useGameStore } from '@/lib/store';
import { SITE_URL } from '@/lib/brand';
import type { GameResult, NearMiss } from '@/lib/types';

const DISPLAY = '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif';
const SANS = '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif';
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
const WIDTH = 1080;
const HEIGHT = 1350;

interface RecapData {
  results: GameResult[];
  nearMiss: NearMiss | null;
  frame: string | null;
  code: string;
  rounds: number;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string {
  context.font = font;
  if (context.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && context.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the drawing'));
    image.src = source;
  });
}

/** True when the frame has something other than the paper background on it. */
async function frameHasInk(source: string): Promise<boolean> {
  try {
    const image = await loadImage(source);
    const sample = document.createElement('canvas');
    sample.width = 160;
    sample.height = 120;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) return true;
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);
    for (let index = 0; index < data.length; index += 4) {
      if (Math.min(data[index], data[index + 1], data[index + 2]) < 228) return true;
    }
    return false;
  } catch {
    // A frame we cannot decode should not be used for the keepsake.
    return false;
  }
}

/** Prefer the latest frame that actually contains a drawing. */
async function pickRecapFrame(frames: string[]): Promise<string | null> {
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    if (await frameHasInk(frames[index])) return frames[index];
  }
  return null;
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

async function buildRecap(data: RecapData): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');

  const winner = data.results[0];
  if (!winner) throw new Error('No results to recap');

  // Background and ambient colour blobs.
  const background = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#0c1222');
  background.addColorStop(0.55, '#080b13');
  background.addColorStop(1, '#0b101b');
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.globalAlpha = 0.2;
  context.fillStyle = '#8b5cf6';
  context.beginPath();
  context.arc(960, 90, 340, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#22d3ee';
  context.beginPath();
  context.arc(60, 1240, 300, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.08;
  context.fillStyle = '#b8f36b';
  context.beginPath();
  context.arc(1040, 1300, 260, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // Brand header.
  const brandGradient = context.createLinearGradient(72, 64, 132, 124);
  brandGradient.addColorStop(0, '#b8f36b');
  brandGradient.addColorStop(1, '#22d3ee');
  context.fillStyle = brandGradient;
  roundRect(context, 72, 64, 56, 56, 16);
  context.fill();
  context.fillStyle = '#08110b';
  context.font = `800 34px ${DISPLAY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('S', 100, 93);

  context.textAlign = 'left';
  context.fillStyle = '#eef1f8';
  context.font = `700 36px ${DISPLAY}`;
  context.fillText('SketchRush', 148, 92);

  const roomLabel = `ROOM ${data.code}`;
  context.font = `600 20px ${SANS}`;
  const roomWidth = context.measureText(roomLabel).width + 40;
  context.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(context, WIDTH - 72 - roomWidth, 72, roomWidth, 42, 21);
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.1)';
  context.lineWidth = 1;
  roundRect(context, WIDTH - 72 - roomWidth, 72, roomWidth, 42, 21);
  context.stroke();
  context.fillStyle = '#b8f36b';
  context.textAlign = 'center';
  context.fillText(roomLabel, WIDTH - 72 - roomWidth / 2, 93);

  context.textAlign = 'left';
  context.fillStyle = '#b8f36b';
  context.font = `700 18px ${SANS}`;
  context.fillText('GAME RECAP', 72, 164);

  // Winner panel.
  const panelGradient = context.createLinearGradient(72, 190, 1008, 450);
  panelGradient.addColorStop(0, 'rgba(184,243,107,0.1)');
  panelGradient.addColorStop(0.5, 'rgba(20,26,41,0.92)');
  panelGradient.addColorStop(1, 'rgba(34,211,238,0.08)');
  context.fillStyle = panelGradient;
  roundRect(context, 72, 190, 936, 260, 32);
  context.fill();
  context.strokeStyle = 'rgba(184,243,107,0.24)';
  context.lineWidth = 2;
  roundRect(context, 72, 190, 936, 260, 32);
  context.stroke();

  context.fillStyle = 'rgba(8,11,19,0.62)';
  roundRect(context, 112, 236, 168, 168, 34);
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.12)';
  context.lineWidth = 2;
  roundRect(context, 112, 236, 168, 168, 34);
  context.stroke();
  context.font = `100px ${EMOJI}`;
  context.textAlign = 'center';
  context.fillText(avatarEmoji(winner.avatarSeed), 196, 326);

  context.textAlign = 'left';
  context.fillStyle = '#b8f36b';
  context.font = `700 18px ${SANS}`;
  context.fillText('WINNER', 318, 254);

  context.fillStyle = '#eef1f8';
  context.font = `700 62px ${DISPLAY}`;
  const winnerName = fitText(context, winner.nickname, 570, `700 62px ${DISPLAY}`);
  context.fillText(winnerName, 318, 318);

  context.fillStyle = '#b8f36b';
  context.font = `700 42px ${DISPLAY}`;
  context.fillText(`${winner.score} pts`, 318, 382);

  const subline = `${data.rounds} round${data.rounds === 1 ? '' : 's'} · ${data.results.length} player${
    data.results.length === 1 ? '' : 's'
  }`;
  context.fillStyle = '#8b94a9';
  context.font = `500 22px ${SANS}`;
  context.fillText(subline, 318, 420);

  context.textAlign = 'right';
  context.font = `58px ${EMOJI}`;
  context.fillText('🏆', 956, 250);

  // The final masterpiece; fall back to a playful placeholder.
  context.textAlign = 'left';
  context.fillStyle = '#8b94a9';
  context.font = `600 16px ${SANS}`;
  context.fillText('THE LAST MASTERPIECE', 240, 476);

  const artX = 240;
  const artY = 494;
  const artWidth = 600;
  const artHeight = 450;
  context.save();
  roundRect(context, artX, artY, artWidth, artHeight, 26);
  context.clip();
  context.fillStyle = '#fbfbf7';
  context.fillRect(artX, artY, artWidth, artHeight);
  if (data.frame) {
    try {
      console.log('[recap] loading frame', data.frame.length, data.frame.slice(0, 32));
      const image = await loadImage(data.frame);
      console.log('[recap] frame loaded', image.width, image.height);
      drawImageCover(context, image, artX, artY, artWidth, artHeight);
    } catch (error) {
      console.log('[recap] frame failed', error);
      // Keep the paper placeholder if the frame cannot be decoded.
    }
  }
  if (!data.frame) {
    context.strokeStyle = '#1f2937';
    context.lineWidth = 9;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(artX + 140, artY + 300);
    context.bezierCurveTo(artX + 210, artY + 120, artX + 360, artY + 120, artX + 420, artY + 260);
    context.bezierCurveTo(artX + 330, artY + 200, artX + 250, artY + 360, artX + 160, artY + 330);
    context.stroke();
    context.fillStyle = '#8a93a3';
    context.font = `600 22px ${SANS}`;
    context.textAlign = 'center';
    context.fillText('No drawing survived.', artX + artWidth / 2, artY + artHeight - 54);
  }
  context.restore();
  context.strokeStyle = 'rgba(255,255,255,0.14)';
  context.lineWidth = 2;
  roundRect(context, artX, artY, artWidth, artHeight, 26);
  context.stroke();

  // Highlight cards.
  const fastest = data.results
    .filter((result) => result.stats.fastestGuessMs !== null)
    .sort((a, b) => (a.stats.fastestGuessMs ?? 0) - (b.stats.fastestGuessMs ?? 0))[0];
  const highlights = [
    { label: 'ROUNDS', value: `${data.rounds}` },
    { label: 'PLAYERS', value: `${data.results.length}` },
    {
      label: 'CLOSEST MISS',
      value: data.nearMiss
        ? `${data.nearMiss.nickname} · ${data.nearMiss.offBy} off`
        : 'Nobody blinked',
    },
    {
      label: 'FASTEST GUESS',
      value: fastest
        ? `${fastest.nickname} · ${((fastest.stats.fastestGuessMs ?? 0) / 1000).toFixed(1)}s`
        : 'No guesses',
    },
  ];

  const cardWidth = 222;
  const cardGap = 16;
  highlights.forEach((highlight, index) => {
    const x = 72 + index * (cardWidth + cardGap);
    context.fillStyle = 'rgba(20,26,41,0.86)';
    roundRect(context, x, 972, cardWidth, 78, 20);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.07)';
    context.lineWidth = 1;
    roundRect(context, x, 972, cardWidth, 78, 20);
    context.stroke();
    context.fillStyle = '#8b94a9';
    context.font = `600 13px ${SANS}`;
    context.textAlign = 'left';
    context.fillText(highlight.label, x + 16, 998);
    context.fillStyle = '#eef1f8';
    context.font = `600 20px ${SANS}`;
    context.fillText(fitText(context, highlight.value, cardWidth - 32, `600 20px ${SANS}`), x + 16, 1028);
  });

  // Podium rows.
  context.fillStyle = '#8b94a9';
  context.font = `600 15px ${SANS}`;
  context.fillText('THE PODIUM', 72, 1086);

  data.results.slice(0, 3).forEach((result, index) => {
    const y = 1104 + index * 48;
    context.fillStyle = index === 0 ? 'rgba(184,243,107,0.1)' : 'rgba(20,26,41,0.8)';
    roundRect(context, 72, y, 936, 40, 14);
    context.fill();
    context.strokeStyle = index === 0 ? 'rgba(184,243,107,0.2)' : 'rgba(255,255,255,0.06)';
    context.lineWidth = 1;
    roundRect(context, 72, y, 936, 40, 14);
    context.stroke();

    context.fillStyle = index === 0 ? '#b8f36b' : '#8b94a9';
    context.font = `700 18px ${DISPLAY}`;
    context.textAlign = 'left';
    context.fillText(`${index + 1}`, 92, y + 20);

    context.font = `24px ${EMOJI}`;
    context.fillText(avatarEmoji(result.avatarSeed), 124, y + 20);

    context.fillStyle = '#eef1f8';
    context.font = `600 18px ${SANS}`;
    context.fillText(fitText(context, result.nickname, 560, `600 18px ${SANS}`), 158, y + 20);

    context.textAlign = 'right';
    context.fillStyle = index === 0 ? '#b8f36b' : '#eef1f8';
    context.font = `700 18px ${DISPLAY}`;
    context.fillText(`${result.score}`, 988, y + 20);
  });

  // Footer.
  context.textAlign = 'left';
  context.fillStyle = '#8b94a9';
  context.font = `500 18px ${SANS}`;
  context.fillText(SITE_HOST, 72, 1300);
  context.textAlign = 'right';
  context.fillText('Draw. Guess. Chaos.', 1008, 1300);

  return canvas.toDataURL('image/png');
}

export function RecapCard() {
  const state = useGameStore((store) => store.state);
  const frames = useGameStore((store) => store.replay.frames);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const lastFrame = frames[frames.length - 1] ?? null;
  const results = state?.gameResults ?? null;
  const signature = state
    ? `${state.code}|${(results ?? []).map((result) => `${result.playerId}:${result.score}`).join(',')}|${
        state.gameNearMiss?.playerId ?? ''
      }:${state.gameNearMiss?.offBy ?? ''}|${lastFrame?.length ?? 0}`
    : '';

  useEffect(() => {
    if (!open || !state || !results?.length) return;
    let cancelled = false;
    setBusy(true);
    setFailed(false);
    setImage(null);

    void (async () => {
      try {
        const frame = await pickRecapFrame(frames);
        const dataUrl = await buildRecap({
          results,
          nearMiss: state.gameNearMiss,
          frame,
          code: state.code,
          rounds: state.totalRounds,
        });
        if (!cancelled) {
          setImage(dataUrl);
          setBusy(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // The signature captures every input that changes the final image.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signature]);

  const download = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = `sketchrush-${state?.code ?? 'recap'}.png`;
    link.click();
  };

  const share = async () => {
    if (!image) return;
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], `sketchrush-${state?.code ?? 'recap'}.png`, { type: 'image/png' });
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: 'SketchRush recap',
          text: 'The evidence from our drawing game.',
        });
        return;
      }
    } catch {
      // Fall back to a plain download when native sharing is unavailable.
    }
    download();
  };

  const openRecap = () => {
    toast.dismiss();
    setOpen(true);
  };

  if (!state || !results?.length) return null;

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={openRecap}>
        <Sparkles size={15} /> Recap card
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Your recap"
        description="A keepsake from this masterpiece. Save it or send it to the group chat."
      >
        {busy ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-white/6 bg-white/3 text-center">
            <Loader2 size={24} className="animate-spin text-accent-2" />
            <p className="text-sm text-muted">Painting your recap…</p>
          </div>
        ) : failed ? (
          <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-6 text-center text-sm text-danger">
            The recap could not be painted. Try again in a moment.
          </div>
        ) : image ? (
          <img
            src={image}
            alt="SketchRush game recap card"
            className="mx-auto max-h-[58dvh] w-auto rounded-xl border border-white/10 shadow-2xl"
          />
        ) : null}

        <div className="mt-4 flex gap-2">
          <button type="button" className="btn btn-primary flex-1" disabled={!image} onClick={download}>
            <Download size={15} /> Save image
          </button>
          <button type="button" className="btn btn-ghost flex-1" disabled={!image} onClick={share}>
            <Share2 size={15} /> Share
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">
          Room {state.code} · {state.totalRounds} round{state.totalRounds === 1 ? '' : 's'} · made with questionable
          artistic vision
        </p>
      </Modal>
    </>
  );
}
