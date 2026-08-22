'use client';

import { use } from 'react';
import Link from 'next/link';
import { useOne } from '@refinedev/core';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanBadge, StatusBadge } from '@/components/users/badges';
import { SubscriptionTimeline } from '@/components/users/subscription-timeline';
import { UserActions } from '@/components/users/user-actions';

type Subscription = {
  id: number;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  source: string;
};

// currentSubscription приходит только когда подписка реально валидна прямо
// сейчас (модель уже фильтрует по статусу и current_period_end на бэке) —
// label с бэка (getPlanLabel), поэтому в отличие от списка пользователей тут
// isActive не нужен, статус всегда "active".
type CurrentSubscription = Subscription & { label: string };
// История — все подписки юзера, любого статуса; isActive считаем по дате
// (см. getUser.js), а не по сырому status из БД.
type SubscriptionHistoryItem = Subscription & { label: string; isActive: boolean };

type Addon = { id: number; addonKey: string; source: string };
type FamilyMember = { id: number; name: string; status: string; tokenVersion: number };
type Payment = {
  id: number;
  planKey: string;
  label: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
};

type UserDetail = {
  user: {
    id: number;
    name: string;
    isAdmin: boolean;
    createdAt: string;
    mixpanelToken: string | null;
    mixpanelProjectId: string | null;
    salesDriveApiKey: string | null;
  };
  currentSubscription: CurrentSubscription | null;
  addons: Addon[];
  subscriptionHistory: SubscriptionHistoryItem[];
  familyMembers: FamilyMember[];
  payments: Payment[];
  rozetkaCabinets: RozetkaCabinet[];
  telegramSettings: TelegramSettings;
};

type RozetkaCabinet = {
  id: number;
  name: string | null;
  isValid: boolean;
  isEnabled: boolean;
  marketTitle: string | null;
};
type TelegramSettings = { telegramChatId: string | null; enabled: boolean } | null;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('ru-RU') : '—';
}

function ConnectionStatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-medium text-success-fg">
      подключено
    </span>
  ) : (
    <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      не подключено
    </span>
  );
}

export default function UserShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);

  const { query, result: detail } = useOne<UserDetail>({ resource: 'users', id: userId });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">Пользователь не найден.</p>;
  }

  const salesDriveConnected = !!detail.user.salesDriveApiKey;
  const mixpanelConnected = !!(detail.user.mixpanelToken || detail.user.mixpanelProjectId);
  const rozetkaConnected = detail.rozetkaCabinets.some((c) => c.isValid && c.isEnabled);
  const telegramConnected = !!(detail.telegramSettings?.enabled && detail.telegramSettings?.telegramChatId);

  return (
    <div>
      <Link
        href="/users"
        className="mb-3.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Пользователи
      </Link>
      <h1 className="flex items-center gap-2 text-[21px] font-semibold tracking-tight">
        {detail.user.name}
        {detail.user.isAdmin && <Badge>admin</Badge>}
      </h1>
      <p className="mb-5 mt-0.5 text-[12.5px] text-muted-foreground">
        ID {detail.user.id} · зарегистрирован {formatDate(detail.user.createdAt)}
      </p>

      <div className="grid grid-cols-[min(450px,50%)_minmax(0,1fr)] items-start gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Текущая подписка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {detail.currentSubscription ? (
                <>
                  <p className="flex items-center gap-2">
                    План: <PlanBadge plan={detail.currentSubscription.plan} label={detail.currentSubscription.label} />
                    статус: <StatusBadge status="active" />
                  </p>
                  <p className="flex items-center gap-1.5">
                    Период: {formatDate(detail.currentSubscription.currentPeriodStart)}
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    {formatDate(detail.currentSubscription.currentPeriodEnd)}
                  </p>
                  <p className="text-muted-foreground">Источник: {detail.currentSubscription.source}</p>
                  {detail.addons.length > 0 && (
                    <p>
                      Аддоны:{' '}
                      {detail.addons.map((a) => (
                        <Badge key={a.id} variant="outline" className="mr-1">
                          {a.addonKey}
                        </Badge>
                      ))}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Активной подписки нет.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Интеграции</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span>SalesDrive</span>
                <ConnectionStatusBadge connected={salesDriveConnected} />
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span>Mixpanel</span>
                <ConnectionStatusBadge connected={mixpanelConnected} />
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span>Rozetka</span>
                <ConnectionStatusBadge connected={rozetkaConnected} />
              </div>
              <div className="flex items-center justify-between">
                <span>Telegram</span>
                <ConnectionStatusBadge connected={telegramConnected} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Участники команды</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.familyMembers.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">Нет участников.</p>
              ) : (
                <div className="space-y-1">
                  {detail.familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between border-b border-border py-2 last:border-0 last:pb-0"
                    >
                      <span className="text-[12.5px] font-medium">{member.name}</span>
                      <StatusBadge status={member.tokenVersion > 0 ? 'active' : 'pending'} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История платежей</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.payments.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">Платежей ещё не было.</p>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-muted-foreground">
                      <th className="pb-2 font-medium">Дата</th>
                      <th className="pb-2 font-medium">План</th>
                      <th className="pb-2 font-medium">Сумма</th>
                      <th className="pb-2 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.payments.slice(0, 6).map((payment) => (
                      <tr key={payment.id} className="border-t border-border">
                        <td className="py-1.5">{formatDate(payment.createdAt)}</td>
                        <td className="py-1.5">{payment.label}</td>
                        <td className="py-1.5">
                          {payment.amount} {payment.currency}
                        </td>
                        <td className="py-1.5">
                          <StatusBadge status={payment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История подписок</CardTitle>
            </CardHeader>
            <CardContent>
              <SubscriptionTimeline items={detail.subscriptionHistory} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Действия</CardTitle>
            </CardHeader>
            <CardContent>
              <UserActions userId={userId} rozetkaCabinets={detail.rozetkaCabinets} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
