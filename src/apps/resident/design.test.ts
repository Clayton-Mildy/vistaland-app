import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

/** Every non-test source file of the customer app, plus the shared tile it alone uses. */
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
export const REFRESHED: string[] = [
  ...walk('src/apps/resident').filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)),
  'src/ui/IconTile.tsx',
];

const RULES: [string, RegExp][] = [
  ['text below 12px', /text-\[(9|10|10\.5|11)px\]/],
  ['extra-bold or black weight', /font-(extrabold|black)/],
  ['rainbow tile tints (TONES)', /\bTONES\b/],
  ['the old white app bar', /ui\/AppBar/],
  ['a hard-coded brand red (breaks teal projects)', /#(D7192B|B01222)\b/i],
];

describe('premium design rules', () => {
  test('the guard covers the whole customer app', () => expect(REFRESHED.length).toBeGreaterThan(50));
  test.each(REFRESHED)('%s follows the premium design rules', (file) => {
    expect(existsSync(file), `${file} does not exist`).toBe(true);
    const src = readFileSync(file, 'utf8');
    const broken = RULES.filter(([, re]) => re.test(src)).map(([name]) => name);
    expect(broken, `${file} breaks: ${broken.join(', ')}`).toEqual([]);
  });
});
