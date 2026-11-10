import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import type { MonthKey } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';

/** Categorical slots 1–2 of the validated chart palette (identity, not status). */
const INCOME = '#2a78d6';
const COST = '#eb6834';

export interface IncomeCostPoint { month: MonthKey; income: number; cost: number }

/** Six months of income vs cost on one Rupiah axis, with a legend and hover tooltip. */
export function IncomeCostChart({ data, height = 240 }: { data: IncomeCostPoint[]; height?: number }) {
  const t = useT();
  const [lang] = useLang();
  const rows = data.map((d) => ({ ...d, label: formatDate(d.month, lang, 'month').replace(/ \d{2}(\d{2})$/, ' ’$1') }));
  // Axis ticks in millions without decimals: "24 jt" / "24M".
  const axis = (v: number) => (v === 0 ? '0' : `${Math.round(v / 1e6)}${lang === 'id' ? ' jt' : 'M'}`);
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-ink/70" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} />{t('dash.fin.income')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COST }} />{t('dash.fin.cost')}</span>
      </div>
      <div style={{ height }} role="img" aria-label={t('dash.fin.chartLabel')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#ECEAE6" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#D9D6D0' }} tick={{ fontSize: 11, fill: '#6B6A66' }} />
            <YAxis tickFormatter={axis} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6B6A66' }} width={48} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              formatter={(v: number, name: string) => [formatRp(v), name === 'income' ? t('dash.fin.income') : t('dash.fin.cost')]}
              labelStyle={{ fontWeight: 700, color: '#141414' }}
              itemStyle={{ color: '#3A3936' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E5E2DC', fontSize: 12 }}
            />
            <Bar dataKey="income" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="cost" fill={COST} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
