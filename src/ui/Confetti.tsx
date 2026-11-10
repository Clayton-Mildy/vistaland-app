const COLORS = ['#E8BE5A', '#FFFFFF', '#F9A8B4', '#7DD3FC', '#86EFAC'];
export function Confetti({ pieces = 40 }: { pieces?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: pieces }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 block h-3 w-2 animate-fall rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 10) * 0.15}s`, animationDuration: `${2.4 + (i % 5) * 0.4}s` }}
        />
      ))}
    </div>
  );
}
