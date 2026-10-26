'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2, Save, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { changePassword, updateProfile } from '@/actions/users';
import { ROLE_LABELS } from '@/lib/crm';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { initials } from '@/lib/format';

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

export function ProfileView({ user }: { user: ProfileUser }) {
  const [form, setForm] = useState({ name: user.name, avatarUrl: user.avatarUrl ?? '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, startProfile] = useTransition();
  const [savingPassword, startPassword] = useTransition();
  const roleInfo = ROLE_PERMISSIONS.find((item) => item.role === user.role);

  function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    startProfile(async () => {
      const result = await updateProfile({ name: form.name, avatarUrl: form.avatarUrl || null });
      if (result.error) toast.error(result.error);
      else toast.success('Perfil atualizado');
    });
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('A confirmação da nova senha não confere');
      return;
    }
    startPassword(async () => {
      const result = await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Senha alterada com sucesso');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Meu perfil"
        description="Atualize seus dados pessoais e a senha de acesso."
        actions={<ThemeToggle />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
            <CardDescription>Essas informações aparecem para o restante da sua equipe.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {initials(form.name || 'U')}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-1">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">URL do avatar</Label>
                <Input id="avatar" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://..." />
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar perfil
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" /> Sua função
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{roleInfo?.label ?? ROLE_LABELS[user.role] ?? user.role}</p>
            <p className="text-sm text-muted-foreground">{roleInfo?.description}</p>
            <ul className="space-y-1.5 pt-2">
              {roleInfo?.permissions.map((permission) => (
                <li key={permission} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  {permission}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" /> Segurança
          </CardTitle>
          <CardDescription>Altere a senha usada para entrar no CRM.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="max-w-lg space-y-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  minLength={6}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  minLength={6}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
