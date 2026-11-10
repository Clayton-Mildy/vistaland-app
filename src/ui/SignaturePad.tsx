import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1D2A44';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    ref.current!.setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(...pos(e));
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext('2d')!;
    ctx.lineTo(...pos(e));
    ctx.stroke();
    if (empty) setEmpty(false);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (!empty) onChange(ref.current!.toDataURL('image/png'));
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink/70">{t('ui.signature.label')}</span>
        <button type="button" onClick={clear} className="text-xs font-bold text-brand-dark">{t('ui.signature.clear')}</button>
      </div>
      <div className="relative h-36 rounded-2xl border-2 border-dashed border-line bg-white">
        <canvas ref={ref} className="h-full w-full touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink/30">{t('ui.signature.placeholder')}</span>}
        <span className="pointer-events-none absolute bottom-6 left-6 right-6 border-b border-line" />
      </div>
    </div>
  );
}
