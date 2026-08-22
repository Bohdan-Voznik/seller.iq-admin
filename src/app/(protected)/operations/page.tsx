'use client';

import { useState } from 'react';
import { useCustomMutation } from '@refinedev/core';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { cn } from '@/lib/utils';

type LastRun = { at: Date; ok: boolean; note?: string } | null;

function useAction() {
  const { mutate, mutation } = useCustomMutation();
  const [lastRun, setLastRun] = useState<LastRun>(null);

  const run = (url: string, values: Record<string, unknown>, successMessage: string, note?: string) => {
    mutate(
      { url, method: 'post', values },
      {
        onSuccess: () => {
          toast.success(successMessage);
          setLastRun({ at: new Date(), ok: true, note });
        },
        onError: (err) => {
          toast.error(err.message || 'Не удалось выполнить операцию');
          setLastRun({ at: new Date(), ok: false });
        },
      },
    );
  };

  return { run, isPending: mutation.isPending, lastRun };
}

function LastRunLine({ lastRun }: { lastRun: LastRun }) {
  if (!lastRun) {
    return (
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-border" />
        Ещё не запускалось
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
      <span className={cn('size-1.5 rounded-full', lastRun.ok ? 'bg-success-fg' : 'bg-destructive')} />
      Последний запуск: {lastRun.at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} —{' '}
      {lastRun.ok ? (lastRun.note ?? 'успешно') : 'ошибка'}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase first:mt-0">
      {children}
    </div>
  );
}

export default function OperationsPage() {
  const posScan = useAction();
  const categoriesScan = useAction();
  const cabinetSync = useAction();
  const ordersExport = useAction();

  const [userId, setUserId] = useState('');
  const [cabinetId, setCabinetId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-[21px] font-semibold tracking-tight">Операции</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Ручные операции, обычно выполняемые по расписанию
        </p>
      </div>

      <SectionLabel>Сканеры</SectionLabel>
      <div className="grid grid-cols-2 gap-3.5">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Пересканировать все позиции</CardTitle>
            <CardDescription>
              Ставит в очередь пересчёт позиций по всем активным поисковым запросам.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-2.5">
            <ConfirmActionButton
              label="Запустить scan-all"
              confirmDescription="Поставит в очередь пересканирование позиций по всем активным запросам всех пользователей."
              pending={posScan.isPending}
              onConfirm={() =>
                posScan.run('/admin/position/scan-all', {}, 'Сканирование позиций поставлено в очередь')
              }
            />
            <LastRunLine lastRun={posScan.lastRun} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Пересканировать категории (Black Box)</CardTitle>
            <CardDescription>Форсирует немедленный пересчёт расписания сканирования категорий.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-2.5">
            <ConfirmActionButton
              label="Запустить categories/scan-all"
              confirmDescription="Форсирует пересканирование всех категорий Black Box прямо сейчас."
              pending={categoriesScan.isPending}
              onConfirm={() =>
                categoriesScan.run('/admin/categories/scan-all', {}, 'Пересканирование категорий запущено')
              }
            />
            <LastRunLine lastRun={categoriesScan.lastRun} />
          </CardContent>
        </Card>
      </div>

      <SectionLabel>Rozetka Cabinet</SectionLabel>
      <div className="grid grid-cols-2 gap-3.5">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Синхронизировать кабинет</CardTitle>
            <CardDescription>
              Синхронизирует кабинет(ы) конкретного пользователя. Cabinet ID необязателен — если пусто,
              синхронизируются все кабинеты этого пользователя.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-2.5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>User ID</Label>
                <Input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-28"
                />
              </div>
              <div className="space-y-1">
                <Label>Cabinet ID (опц.)</Label>
                <Input
                  type="number"
                  value={cabinetId}
                  onChange={(e) => setCabinetId(e.target.value)}
                  className="w-28"
                />
              </div>
              <ConfirmActionButton
                label="Синхронизировать"
                confirmDescription={`Запустит синхронизацию кабинета(ов) Rozetka для userId=${userId || '?'}.`}
                pending={cabinetSync.isPending}
                disabled={!userId}
                onConfirm={() =>
                  cabinetSync.run(
                    '/admin/rztk-cabinet/sync',
                    {
                      userId: Number(userId),
                      ...(cabinetId ? { cabinetId: Number(cabinetId) } : {}),
                    },
                    'Синхронизация кабинета запущена',
                    `userId ${userId}`,
                  )
                }
              />
            </div>
            <LastRunLine lastRun={cabinetSync.lastRun} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Экспорт заказов кабинетов</CardTitle>
            <CardDescription>Экспортирует заказы за период по всем валидным кабинетам Rozetka.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-2.5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>С даты</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>По дату</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <ConfirmActionButton
                label="Экспортировать"
                confirmDescription={`Запустит экспорт заказов по всем кабинетам за период ${dateFrom || '?'} — ${dateTo || '?'}.`}
                pending={ordersExport.isPending}
                disabled={!dateFrom || !dateTo}
                onConfirm={() =>
                  ordersExport.run(
                    '/admin/rztk-cabinet/orders-export',
                    { dateFrom, dateTo },
                    'Экспорт заказов запущен',
                  )
                }
              />
            </div>
            <LastRunLine lastRun={ordersExport.lastRun} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
