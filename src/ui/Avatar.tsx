import { cx } from './cx';
import { TONES, type Tone } from './theme';

const tones: Tone[] = ['yellow', 'red', 'orange', 'green', 'aqua', 'blue', 'violet', 'grey'];
export function Avatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const tone = tones[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length];
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-2xl text-lg font-bold', TONES[tone], className)} style={{ width: size, height: size }}>
      {name.trim()[0]?.toUpperCase()}
    </span>
  );
}
