'use client';

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type DataTableColumn<T> = {
  header: ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T, index: number) => ReactNode;
};

export type DataTablePagination = {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
};

// Общая таблица списков в админке: обёртка rounded-2xl border, header на
// bg-brand-tint (см. ui/table.tsx), py-1 в ячейках, pl-4/pr-4 по краям.
// Если передан onRowNavigate — справа добавляется колонка со стрелкой для
// перехода (клик на всю строку не вешаем, только на стрелку — так исторически
// сделано на странице пользователей).
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  isFetching,
  emptyMessage = 'Ничего не найдено',
  onRowNavigate,
  rowClassName,
  pagination,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => React.Key;
  isLoading?: boolean;
  // Фоновая перезагрузка (смена фильтра/страницы) поверх уже отрисованных
  // строк — в отличие от isLoading (первая загрузка, данных ещё нет), тут
  // строки остаются на экране, просто приглушаются, чтобы было видно, что
  // список обновляется.
  isFetching?: boolean;
  emptyMessage?: string;
  onRowNavigate?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  pagination?: DataTablePagination;
}) {
  const colSpan = columns.length + (onRowNavigate ? 1 : 0);

  return (
    <div>
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-border transition-opacity',
          isFetching && !isLoading && 'pointer-events-none opacity-60',
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className={cn(i === 0 && 'pl-4', col.headerClassName)}>
                  {col.header}
                </TableHead>
              ))}
              {onRowNavigate && <TableHead className="w-16 pr-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                  Загрузка…
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={rowKey(row)} className={rowClassName?.(row)}>
                  {columns.map((col, i) => (
                    <TableCell key={i} className={cn('py-1', i === 0 && 'pl-4', col.cellClassName)}>
                      {col.render(row, index)}
                    </TableCell>
                  ))}
                  {onRowNavigate && (
                    <TableCell className="py-1 pr-4">
                      <button
                        type="button"
                        onClick={() => onRowNavigate(row)}
                        aria-label="Открыть"
                        className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-brand-tint hover:text-brand"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="mt-3.5 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={pagination.onPrev} disabled={pagination.page === 1}>
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            Стр. {pagination.page} из {pagination.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={pagination.onNext}
            disabled={pagination.page >= pagination.pageCount}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}
