import { Sparkles } from 'lucide-react';
import { Photo } from './Photo';

export function AiScanning({ photoId, label }: { photoId: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <Photo id={photoId} className="h-48 w-full">
        <div className="absolute inset-0 bg-ink/25" />
        <div className="absolute inset-x-0 h-12 animate-scan bg-gradient-to-b from-transparent via-white/60 to-transparent" />
        <div className="absolute inset-3 rounded-xl border-2 border-white/70 [border-style:dashed]" />
      </Photo>
      <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-brand-dark">
        <Sparkles className="h-4 w-4 animate-pulse" />
        {label}
      </div>
    </div>
  );
}
