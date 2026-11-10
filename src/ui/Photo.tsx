import { ImageOff } from 'lucide-react';
import { usePhotoUrl } from '../store/photos';
import { cx } from './cx';

export function Photo({ id, className, alt = '', children }: { id?: string; className?: string; alt?: string; children?: React.ReactNode }) {
  const url = usePhotoUrl(id);
  return (
    <div className={cx('relative overflow-hidden bg-[#E9E5DE]', className)}>
      {url ? <img src={url} alt={alt} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-ink/25"><ImageOff className="h-5 w-5" /></div>}
      {children}
    </div>
  );
}
