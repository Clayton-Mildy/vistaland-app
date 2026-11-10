import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cx } from './cx';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; text: ReactNode; kind: Kind }
const Ctx = createContext<{ show: (text: ReactNode, kind?: Kind) => void }>({ show: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((text: ReactNode, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === 'info' ? 6000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex w-full max-w-[360px] animate-pop items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lift', t.kind === 'error' ? 'bg-[#B4192A] text-white' : 'bg-ink text-white')}>
            {t.kind === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE7A0]" />}
            {t.kind === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.kind === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
