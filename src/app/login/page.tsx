'use client';

import { useState, type FormEvent } from 'react';
import { useLogin } from '@refinedev/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';

export default function LoginPage() {
  const [name, setName] = useState('');
  const { mutate: login, isPending, error } = useLogin<{ name: string }>();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    login({ name: name.trim() });
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo className="mb-2 size-10 rounded-lg" />
          <CardTitle>SellerIQ Admin</CardTitle>
          <CardDescription>
            Введите имя вашей учётной записи SellerIQ с правами администратора.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя учётки</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={isPending || !name.trim()}
            >
              {isPending ? 'Вход…' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
