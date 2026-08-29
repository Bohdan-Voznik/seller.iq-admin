'use client';

import { useState } from 'react';
import { useCustom, useCustomMutation, useInvalidate } from '@refinedev/core';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { JsonSearchDialog } from '@/components/json-search-dialog';

type PlanOption = { key: string; label: string };
type AddonOption = { key: string; label: string };
type RozetkaCabinet = { id: number; name: string | null; marketTitle: string | null };
// provider — по факту 'salesdrive' | 'keycrm', держим строкой на случай нового
// провайдера на бэке (см. common/crmAccountModel в rztk_backend)
type CrmAccount = { id: number; provider: string; label: string | null; isActive: boolean };

const ALL_CABINETS = 'all';

function cabinetLabel(cabinet: RozetkaCabinet) {
  return cabinet.marketTitle || cabinet.name || `Кабинет #${cabinet.id}`;
}

function crmProviderLabel(provider: string) {
  if (provider === 'salesdrive') return 'SalesDrive';
  if (provider === 'keycrm') return 'KeyCRM';
  return provider;
}

function crmAccountLabel(account: CrmAccount) {
  const name = account.label || `#${account.id}`;
  const suffix = account.isActive ? '' : ' (отключён)';
  return `${crmProviderLabel(account.provider)} — ${name}${suffix}`;
}

// datetime-local отдаёт "YYYY-MM-DDTHH:mm" целиком при каждом изменении —
// когда юзер только что выбрал НОВУЮ дату (время ещё не трогал), подставляем
// дефолтное время сами; если он потом руками меняет только время (дата та
// же), его выбор не перетираем.
function withDefaultTime(newValue: string, oldValue: string, defaultTime: string) {
  if (!newValue) return newValue;
  const newDate = newValue.slice(0, 10);
  const oldDate = oldValue.slice(0, 10);
  return newDate === oldDate ? newValue : `${newDate}T${defaultTime}`;
}

function todayAt(time: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T${time}`;
}

function ActionRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-2.5 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div>
        <div className="text-[12.5px] font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{children}</div>
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-4 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase first:mt-0">
      {children}
    </div>
  );
}

export function UserActions({
  userId,
  rozetkaCabinets,
  crmAccounts,
}: {
  userId: number;
  rozetkaCabinets: RozetkaCabinet[];
  crmAccounts: CrmAccount[];
}) {
  const hasCabinets = rozetkaCabinets.length > 0;
  const hasCrmAccounts = crmAccounts.length > 0;
  const invalidate = useInvalidate();
  const refresh = () => invalidate({ resource: 'users', invalidates: ['detail'], id: userId });

  // result.data — не undefined, пока запрос не завершился, а замороженный {}
  // (см. useCustom в @refinedev/core) — .map упадёт на нём, поэтому явно
  // проверяем Array.isArray вместо просто plans?.data?.map(...).
  const { result: plansResult } = useCustom<PlanOption[]>({ url: '/admin/plans', method: 'get' });
  const { result: addonsResult } = useCustom<AddonOption[]>({ url: '/admin/addons', method: 'get' });
  const plans = Array.isArray(plansResult.data) ? plansResult.data : [];
  const addons = Array.isArray(addonsResult.data) ? addonsResult.data : [];

  const [planKey, setPlanKey] = useState('');
  const [months, setMonths] = useState('1');
  const [addonKey, setAddonKey] = useState('');
  const [cabinetId, setCabinetId] = useState(ALL_CABINETS);
  // Дефолт — первый аккаунт юзера, если он есть; выбор не привязан к "all",
  // в отличие от Rozetka-кабинетов — синк за период всегда идёт по ОДНОМУ
  // конкретному crm_accounts.id (см. controllers/admin/crmAccountOrderSync.js
  // в rztk_backend — там нет понятия "все CRM-аккаунты сразу").
  const [crmAccountId, setCrmAccountId] = useState(() => (crmAccounts[0] ? String(crmAccounts[0].id) : ''));
  const [crmDateFrom, setCrmDateFrom] = useState(() => todayAt('00:00'));
  const [crmDateTo, setCrmDateTo] = useState(() => todayAt('23:59'));
  const [crmOrderId, setCrmOrderId] = useState('');
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [crmSyncResult, setCrmSyncResult] = useState<Record<string, unknown> | null>(null);

  const { mutate: grantSubscription, mutation: grantSubscriptionMutation } = useCustomMutation();
  const { mutate: grantAddon, mutation: grantAddonMutation } = useCustomMutation();
  const { mutate: syncCabinet, mutation } = useCustomMutation();
  const { mutate: scanPositions, mutation: scanPositionsMutation } = useCustomMutation();
  const { mutate: syncCrmAccountNow, mutation: syncCrmAccountNowMutation } = useCustomMutation();
  const { mutate: syncCrmAccountRange, mutation: syncCrmAccountRangeMutation } = useCustomMutation();
  const { mutate: syncCrmOrder, mutation: syncCrmOrderMutation } = useCustomMutation();
  const { mutate: generateLoginCode, mutation: generateLoginCodeMutation } = useCustomMutation();
  const { mutate: logoutEverywhere, mutation: logoutEverywhereMutation } = useCustomMutation();

  const onGrantSubscription = () => {
    if (!planKey) return;
    grantSubscription(
      {
        url: '/admin/user/subscription',
        method: 'post',
        values: { userId, planKey, months: Number(months) || 1 },
      },
      {
        onSuccess: () => {
          toast.success('Подписка выдана');
          refresh();
        },
        onError: (err) => toast.error(err.message || 'Не удалось выдать подписку'),
      },
    );
  };

  const onGrantAddon = () => {
    if (!addonKey) return;
    grantAddon(
      {
        url: '/admin/user/addon',
        method: 'post',
        values: { userId, addonKey },
      },
      {
        onSuccess: () => {
          toast.success('Аддон выдан');
          refresh();
        },
        onError: (err) => toast.error(err.message || 'Не удалось выдать аддон'),
      },
    );
  };

  const onSyncCabinet = () => {
    syncCabinet(
      {
        url: '/admin/rztk-cabinet/sync',
        method: 'post',
        values: { userId, ...(cabinetId !== ALL_CABINETS ? { cabinetId: Number(cabinetId) } : {}) },
      },
      {
        onSuccess: () => toast.success('Синхронизация кабинета запущена'),
        onError: (err) => toast.error(err.message || 'Не удалось запустить синхронизацию'),
      },
    );
  };

  const onScanPositions = () => {
    scanPositions(
      { url: '/admin/user/position/scan', method: 'post', values: { userId } },
      {
        onSuccess: () => toast.success('Позиции поставлены в очередь — подхватит ближайший тик сканера'),
        onError: (err) => toast.error(err.message || 'Не удалось поставить в очередь'),
      },
    );
  };

  const onSyncCrmAccount = () => {
    if (!crmAccountId) return;
    syncCrmAccountNow(
      { url: '/admin/crm-account/sync', method: 'post', values: { crmAccountId: Number(crmAccountId) } },
      {
        onSuccess: () => toast.success('Синк поставлен в очередь — подхватит ближайший тик автосинка'),
        onError: (err) => toast.error(err.message || 'Не удалось поставить в очередь'),
      },
    );
  };

  // datetime-local отдаёт "YYYY-MM-DDTHH:mm" (без секунд) — бэку нужен формат
  // "YYYY-MM-DD HH:mm:ss" (см. controllers/admin/crmAccountOrderSync.js).
  // Часовой пояс, в котором бэк это трактует, зависит от provider выбранного
  // аккаунта (SalesDrive — киевское, KeyCRM — UTC) — сам бэк это решает по
  // crmAccountId, тут просто передаём строку как есть.
  const toCrmDateTime = (value: string) => (value ? `${value.replace('T', ' ')}:00` : '');

  const onSyncCrmAccountRange = () => {
    if (!crmAccountId || !crmDateFrom || !crmDateTo) return;
    syncCrmAccountRange(
      {
        url: '/admin/crm-account/orders',
        method: 'post',
        values: {
          crmAccountId: Number(crmAccountId),
          dateFrom: toCrmDateTime(crmDateFrom),
          dateTo: toCrmDateTime(crmDateTo),
        },
      },
      {
        onSuccess: (data) => {
          const payload = (data?.data as Record<string, unknown> | undefined) ?? null;
          const sentItems = payload?.sent_items;
          toast.success(
            `Синхронизация за период выполнена${typeof sentItems === 'number' ? ` — отправлено позиций: ${sentItems}` : ''}`,
          );
          setCrmSyncResult(payload);
        },
        onError: (err) => toast.error(err.message || 'Не удалось синхронизировать за период'),
      },
    );
  };

  // Точечный синк одного заказа по его CRM id (order_internal_id) — тот же эндпоинт, что и
  // синк за период, но {crmAccountId, orderId} вместо диапазона дат (см.
  // controllers/admin/crmAccountOrderSync.js в rztk_backend). Для этого режима бэк игнорирует
  // тарифное 'closed'-ограничение — раз админ целится в конкретный заказ явно, он должен его
  // получить, а не молча пропустить.
  const onSyncCrmOrder = () => {
    if (!crmAccountId || !crmOrderId.trim()) return;
    syncCrmOrder(
      {
        url: '/admin/crm-account/orders',
        method: 'post',
        values: {
          crmAccountId: Number(crmAccountId),
          orderId: crmOrderId.trim(),
        },
      },
      {
        onSuccess: (data) => {
          const payload = (data?.data as Record<string, unknown> | undefined) ?? null;
          const sentItems = payload?.sent_items;
          toast.success(
            `Заказ синхронизирован${typeof sentItems === 'number' ? ` — отправлено позиций: ${sentItems}` : ''}`,
          );
          setCrmSyncResult(payload);
        },
        onError: (err) => toast.error(err.message || 'Не удалось синхронизировать заказ'),
      },
    );
  };

  const copyLoginToken = (token: string) => {
    navigator.clipboard
      .writeText(token)
      .then(() => toast.success('Токен скопирован'))
      .catch(() => toast.error('Не удалось скопировать токен'));
  };

  const onGenerateLoginCode = () => {
    generateLoginCode(
      { url: '/admin/user/login-code', method: 'post', values: { userId } },
      {
        onSuccess: (data) => {
          const token = (data?.data as { oneTimeToken?: string } | undefined)?.oneTimeToken;
          if (token) {
            setLoginCode(token);
            copyLoginToken(token);
          } else {
            toast.success('Токен сгенерирован');
          }
        },
        onError: (err) => toast.error(err.message || 'Не удалось сгенерировать токен'),
      },
    );
  };

  const onLogoutEverywhere = () => {
    logoutEverywhere(
      { url: '/admin/user/logout-all', method: 'post', values: { userId } },
      {
        onSuccess: () => toast.success('Юзер разлогинен со всех устройств'),
        onError: (err) => toast.error(err.message || 'Не удалось разлогинить'),
      },
    );
  };

  return (
    <div>
      <GroupLabel>Подписка</GroupLabel>
      <ActionRow title="Выдать подписку" desc="Назначить тариф на N месяцев">
        <Select value={planKey} onValueChange={setPlanKey}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="План" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.key} value={plan.key}>
                {plan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="sr-only">Месяцев</Label>
        <Input
          type="number"
          min={1}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-16"
        />
        <ConfirmActionButton
          label="Выдать"
          confirmDescription={`Выдаст пользователю тариф «${plans.find((p) => p.key === planKey)?.label ?? planKey}» на ${months || 1} мес.`}
          pending={grantSubscriptionMutation.isPending}
          disabled={!planKey}
          onConfirm={onGrantSubscription}
        />
      </ActionRow>
      <ActionRow title="Выдать аддон" desc="Разовая выдача аддона">
        <Select value={addonKey} onValueChange={setAddonKey}>
          <SelectTrigger className="w-[232px]">
            <SelectValue placeholder="Аддон" />
          </SelectTrigger>
          <SelectContent>
            {addons.map((addon) => (
              <SelectItem key={addon.key} value={addon.key}>
                {addon.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ConfirmActionButton
          label="Выдать"
          confirmDescription={`Выдаст пользователю аддон «${addons.find((a) => a.key === addonKey)?.label ?? addonKey}».`}
          pending={grantAddonMutation.isPending}
          disabled={!addonKey}
          onConfirm={onGrantAddon}
        />
      </ActionRow>

      <GroupLabel>Сканеры</GroupLabel>
      <ActionRow title="Сканер позиций" desc="Поставить позиции этого юзера в очередь на ближайший тик сканера">
        <ConfirmActionButton
          label="Запустить"
          confirmDescription="Откатит время следующего скана на «сейчас» для всех активных позиций этого пользователя — сам скан выполнит ближайший тик сканера, не прямо сейчас."
          pending={scanPositionsMutation.isPending}
          onConfirm={onScanPositions}
        />
      </ActionRow>

      <GroupLabel>CRM</GroupLabel>
      <ActionRow
        title="Аккаунт"
        desc={hasCrmAccounts ? 'CRM-аккаунт, с которым работают действия ниже' : 'У пользователя нет ни одного подключённого CRM-аккаунта'}
      >
        <Select value={crmAccountId} onValueChange={setCrmAccountId} disabled={!hasCrmAccounts}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="CRM-аккаунт" />
          </SelectTrigger>
          <SelectContent>
            {crmAccounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)}>
                {crmAccountLabel(account)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ActionRow>
      <ActionRow title="Синхронизация" desc="Поставить синк заказов выбранного CRM-аккаунта в очередь на ближайший тик">
        <ConfirmActionButton
          label="Запустить"
          confirmDescription={`Откатит время следующего синка на «сейчас» для аккаунта «${
            crmAccounts.find((a) => String(a.id) === crmAccountId) ? crmAccountLabel(crmAccounts.find((a) => String(a.id) === crmAccountId)!) : crmAccountId
          }» — сам синк выполнит ближайший тик автосинка, не прямо сейчас.`}
          pending={syncCrmAccountNowMutation.isPending}
          disabled={!crmAccountId}
          onConfirm={onSyncCrmAccount}
        />
      </ActionRow>
      <ActionRow title="Синхронизация за период" desc="Ручной синк заказов выбранного CRM-аккаунта за диапазон дат">
        <Label className="sr-only">С</Label>
        <Input
          type="datetime-local"
          value={crmDateFrom}
          onChange={(e) => setCrmDateFrom((prev) => withDefaultTime(e.target.value, prev, '00:00'))}
          className="w-44"
        />
        <Label className="sr-only">По</Label>
        <Input
          type="datetime-local"
          value={crmDateTo}
          onChange={(e) => setCrmDateTo((prev) => withDefaultTime(e.target.value, prev, '23:59'))}
          className="w-44"
        />
        <ConfirmActionButton
          label="Синхронизировать"
          confirmDescription="Синхронизирует заказы выбранного CRM-аккаунта за указанный диапазон прямо сейчас (не через тик). Диапазон трактуется в киевском времени для SalesDrive и в UTC для KeyCRM. Слишком большой диапазон бэк отклонит с подсказкой по безопасному размеру (только SalesDrive)."
          pending={syncCrmAccountRangeMutation.isPending}
          disabled={!crmAccountId || !crmDateFrom || !crmDateTo}
          onConfirm={onSyncCrmAccountRange}
        />
      </ActionRow>
      <ActionRow title="Синхронизация по ID заказа" desc="Точечный ручной синк одного заказа выбранного CRM-аккаунта по его номеру">
        <Label className="sr-only">ID заказа</Label>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="ID заказа в CRM"
          value={crmOrderId}
          onChange={(e) => setCrmOrderId(e.target.value)}
          className="w-44"
        />
        <ConfirmActionButton
          label="Синхронизировать"
          confirmDescription="Синхронизирует ОДИН конкретный заказ выбранного CRM-аккаунта по его номеру в CRM прямо сейчас, независимо от тарифного ограничения «только закрытые заказы» — точечная проверка/починка одного заказа, не диапазон."
          pending={syncCrmOrderMutation.isPending}
          disabled={!crmAccountId || !crmOrderId.trim()}
          onConfirm={onSyncCrmOrder}
        />
      </ActionRow>

      <GroupLabel>Rozetka Cabinet</GroupLabel>
      <ActionRow
        title="Синхронизировать кабинет"
        desc={hasCabinets ? 'Конкретный магазин или все кабинеты этого пользователя' : 'У пользователя нет ни одного кабинета Rozetka'}
      >
        <Select value={cabinetId} onValueChange={setCabinetId} disabled={!hasCabinets}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Кабинет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CABINETS}>Все</SelectItem>
            {rozetkaCabinets.map((cabinet) => (
              <SelectItem key={cabinet.id} value={String(cabinet.id)}>
                {cabinetLabel(cabinet)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ConfirmActionButton
          label="Синхронизировать"
          confirmDescription={
            cabinetId === ALL_CABINETS
              ? 'Запустит синхронизацию всех кабинетов Rozetka этого пользователя.'
              : `Запустит синхронизацию магазина «${cabinetLabel(
                  rozetkaCabinets.find((c) => String(c.id) === cabinetId) ?? { id: Number(cabinetId), name: null, marketTitle: null },
                )}».`
          }
          pending={mutation.isPending}
          disabled={!hasCabinets}
          onConfirm={onSyncCabinet}
        />
      </ActionRow>

      <GroupLabel>Сессия</GroupLabel>
      <ActionRow title="Новый токен входа" desc="Сгенерировать токен для ручного входа">
        {loginCode && (
          <Button variant="outline" size="icon" title="Скопировать ещё раз" onClick={() => copyLoginToken(loginCode)}>
            <Copy className="size-4" />
          </Button>
        )}
        <ConfirmActionButton
          label="Сгенерировать"
          confirmDescription="Сгенерирует новый одноразовый токен входа и сразу скопирует его в буфер обмена. Предыдущий код этого пользователя перестанет действовать."
          pending={generateLoginCodeMutation.isPending}
          onConfirm={onGenerateLoginCode}
        />
      </ActionRow>
      <ActionRow title="Разлогинить со всех устройств" desc="Инвалидирует все текущие токены юзера — понадобится новый вход">
        <ConfirmActionButton
          variant="destructive"
          label="Разлогинить"
          confirmDescription="Все текущие сессии этого пользователя (на всех устройствах) станут невалидными — для входа понадобится новый код/токен."
          pending={logoutEverywhereMutation.isPending}
          onConfirm={onLogoutEverywhere}
        />
      </ActionRow>

      <JsonSearchDialog
        open={crmSyncResult !== null}
        onOpenChange={(next) => !next && setCrmSyncResult(null)}
        title="Результат синхронизации CRM"
        description="Полный ответ бэка — reconciliationDetails.toUpsert/toRemove содержит позиции, которые реально отправились в Mixpanel. Найдите нужный заказ поиском ниже, чтобы проверить, что он обновился."
        data={crmSyncResult}
      />
    </div>
  );
}
