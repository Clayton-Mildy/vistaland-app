import cool from '../assets/moni/cool.png';
import crossed from '../assets/moni/crossed.png';
import point from '../assets/moni/point.png';
import thumbs from '../assets/moni/thumbs.png';
import waveSm from '../assets/moni/wave-sm.png';
import wave from '../assets/moni/wave.png';
import icon from '../assets/moni/icon.jpg';
import { cx } from './cx';

const POSES = { wave, waveSm, point, thumbs, crossed, cool };
export type MoniPose = keyof typeof POSES;
export const MONI_ICON = icon;

/** Moni, the VHome mascot. */
export function Moni({ pose = 'waveSm', size = 72, className }: { pose?: MoniPose; size?: number; className?: string }) {
  return <img src={POSES[pose]} alt="Moni" width={size} height={size * 1.4} style={{ width: size, height: 'auto' }} className={cx('select-none', className)} draggable={false} />;
}
