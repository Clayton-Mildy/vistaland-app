import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { hashString, type PhotoStats } from '../domain/ai';
import { useT } from '../i18n';
import { savePhoto } from '../store/photos';
import { cx } from './cx';
import { Photo } from './Photo';

export interface PickedPhoto { id: string; hash: string; stats?: PhotoStats }

/** Camera / upload (compressed to ≤1000 px) plus a strip of bundled sample photos. */
export function PhotoPicker({ onPicked, samples = [], className, selectedId }: { onPicked: (p: PickedPhoto) => void; samples?: string[]; className?: string; selectedId?: string }) {
  const t = useT();
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      onPicked(await savePhoto(f));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => camera.current?.click()} className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand/35 bg-brand-tint/40 text-xs font-semibold text-brand-dark">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          {t('ui.photo.camera')}
        </button>
        <button type="button" onClick={() => upload.current?.click()} className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-white text-xs font-semibold text-ink/65">
          <ImagePlus className="h-5 w-5" />
          {t('ui.photo.upload')}
        </button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={upload} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {samples.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink/40">{t('ui.photo.samples')}</p>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {samples.map((s) => {
              const id = `sample:${s}`;
              return (
                <button key={s} type="button" onClick={() => onPicked({ id, hash: String(hashString(id)) })} className={cx('shrink-0 rounded-xl p-0.5 ring-2 transition', selectedId === id ? 'ring-brand' : 'ring-transparent')}>
                  <Photo id={id} className="h-16 w-20 rounded-[10px]" />
                  <span className="mt-0.5 block text-[10px] font-semibold text-ink/55">{t(`sample.${s}`)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
