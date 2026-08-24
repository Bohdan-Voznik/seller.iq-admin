'use client';

import { useState } from 'react';
import { useCustomMutation, useInvalidate } from '@refinedev/core';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Статические ссылки шаблона — одинаковые для всех новых юзеров, поэтому
// захардкожены тут, а не приходят с бэка.
const DOCS_URL = 'https://seller-iq.app/docs/about';
const TELEGRAM_CHANNEL_URL = 'https://t.me/+s12ojAlI15A5MDUy';
const TELEGRAM_GROUP_URL = 'https://t.me/+QJcy7Vnxahw5NmMy';

type CreateUserResult = {
  userId: number;
  name: string;
  oneTimeToken: string;
  trialEndsAt: string | null;
  alreadyExisted: boolean;
};

function formatDDMMYYYY(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// Telegram-клиенты (Desktop/mobile) сами парсят classic-Markdown прямо в поле
// ввода при вставке текста — *bold*, `code` — рендерится сразу, без ручного
// выделения получателем. `code` дополнительно даёт тап-копирование на
// мобильном, поэтому ник и токен (их реально нужно скопировать) — в
// бэктиках, а не просто жирным.
function buildTemplate(result: CreateUserResult) {
  const trialLine = result.trialEndsAt ? formatDDMMYYYY(result.trialEndsAt) : '—';
  return `Вот доступ для сервиса

Ник:
\`${result.name}\`

Токен доступа:
\`${result.oneTimeToken}\`

Пробная подписка до:
\`${trialLine}\`

Документация
${DOCS_URL}

Канал (тут я публикую обновления и новости)
${TELEGRAM_CHANNEL_URL}

Группа (тут обсуждаем новый функционал и доработки)
${TELEGRAM_GROUP_URL}`;
}

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [result, setResult] = useState<CreateUserResult | null>(null);
  const invalidate = useInvalidate();
  const { mutate, mutation } = useCustomMutation();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Сбрасываем форму только после закрытия — чтобы результат не мигал
      // пустым состоянием во время closing-анимации диалога.
      setTimeout(() => {
        setName('');
        setResult(null);
      }, 150);
    }
  };

  const onSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    mutate(
      { url: '/admin/user/create', method: 'post', values: { name: trimmed } },
      {
        onSuccess: (data) => {
          const payload = data?.data as
            | { userId: number; name: string; oneTimeToken: string; trialEndsAt: string | null; alreadyExisted: boolean }
            | undefined;
          if (!payload) return;
          setResult(payload);
          invalidate({ resource: 'users', invalidates: ['list'] });
        },
        onError: (err) => toast.error(err.message || 'Не удалось создать пользователя'),
      },
    );
  };

  const copyTemplate = () => {
    if (!result) return;
    navigator.clipboard
      .writeText(buildTemplate(result))
      .then(() => toast.success('Шаблон скопирован'))
      .catch(() => toast.error('Не удалось скопировать'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="shrink-0">
          <UserPlus data-icon="inline-start" />
          Создать пользователя
        </Button>
      </DialogTrigger>
      <DialogContent>
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Новый пользователь</DialogTitle>
              <DialogDescription>Создаст юзера с 7-дневным триалом и сгенерирует токен для входа.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Ник</Label>
              <Input
                id="new-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button onClick={onSubmit} disabled={!name.trim() || mutation.isPending}>
                {mutation.isPending ? 'Создаём…' : 'Создать'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Готово</DialogTitle>
              {result.alreadyExisted ? (
                <DialogDescription className="text-destructive">
                  Пользователь с ником «{result.name}» уже существовал — токен сгенерирован для него (старый токен
                  входа перестанет действовать).
                </DialogDescription>
              ) : (
                <DialogDescription>Юзер создан. Шаблон ниже — можно сразу скопировать и отправить.</DialogDescription>
              )}
            </DialogHeader>
            <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
              {buildTemplate(result)}
            </pre>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
              <Button onClick={copyTemplate}>Скопировать</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
