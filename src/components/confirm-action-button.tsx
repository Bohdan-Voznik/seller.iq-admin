'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Общая обёртка "кнопка → диалог подтверждения → mutate()" для операций,
// которые дёргают продовые сканеры/синки и дорого откатить случайным кликом.
export function ConfirmActionButton({
  label,
  confirmDescription,
  onConfirm,
  pending,
  disabled,
  variant,
}: {
  label: string;
  confirmDescription: string;
  onConfirm: () => void;
  pending: boolean;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="w-[155px]" disabled={disabled || pending}>
          {pending ? 'Выполняется…' : label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подтвердите действие</DialogTitle>
          <DialogDescription>{confirmDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
