import type { ReactNode } from 'react';
import { cx } from './cx';

export interface Column<T> { key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string; align?: 'left' | 'right' | 'center' }

export function DataTable<T>({ rows, columns, rowKey, onRowClick, empty, rowClassName, maxHeight }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; empty?: ReactNode; rowClassName?: (r: T) => string | undefined; maxHeight?: number }) {
  return (
    <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[#FAFAF8]">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cx('whitespace-nowrap border-b border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink/45', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cx('border-b border-line/70 last:border-0', onRowClick && 'cursor-pointer hover:bg-[#FBFAF7]', rowClassName?.(r))}>
              {columns.map((c) => (
                <td key={c.key} className={cx('px-4 py-3 align-middle', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left', c.className)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="px-4 py-10 text-center text-sm text-ink/45">{empty}</div>}
    </div>
  );
}
