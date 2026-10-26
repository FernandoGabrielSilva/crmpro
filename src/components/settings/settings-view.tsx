'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Archive, Check, Loader2, Plus, Save, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SelectField } from '@/components/shared/select-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { createUser, deleteUser, permanentlyDeleteUser, updateUser } from '@/actions/users';
import { createTag, deleteTag, permanentlyDeleteTag, savePipelineStages, saveTrashRetention } from '@/actions/settings';
import { DEAL_STAGES, ROLES, ROLE_LABELS } from '@/lib/crm';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { formatDate, initials } from '@/lib/format';
import type { TagOption, UserOption } from '@/types/crm';

type SettingsUser = UserOption & { createdAt: string };

export function SettingsView({
  currentUser,
  users,
  tags,
  stages,
  retentionDays,
  isOwner,
  canManage,
}: {
  currentUser: { id: string; name: string; email: string; role: string; avatarUrl: string | null };
  users: SettingsUser[];
  tags: TagOption[];
  stages: string[];
  retentionDays: number;
  isOwner: boolean;
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Configurações"
        description="Gerencie sua equipe, o funil de vendas, tags e permissões."
        actions={<ThemeToggle />}
      />

      <Tabs defaultValue={isOwner ? 'users' : canManage ? 'pipeline' : 'permissions'}>
        <TabsList>
          {isOwner && <TabsTrigger value="users">Equipe</TabsTrigger>}
          {canManage && <TabsTrigger value="pipeline">Funil</TabsTrigger>}
          {canManage && <TabsTrigger value="tags">Tags</TabsTrigger>}
          {canManage && <TabsTrigger value="trash">Lixeira</TabsTrigger>}
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>

        {isOwner && (
          <TabsContent value="users" className="mt-4">
            <UsersTab users={users} currentUserId={currentUser.id} />
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="pipeline" className="mt-4">
            <PipelineTab stages={stages} />
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="tags" className="mt-4">
            <TagsTab tags={tags} />
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="trash" className="mt-4">
            <TrashTab retentionDays={retentionDays} />
          </TabsContent>
        )}

        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab currentRole={currentUser.role} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab({ users, currentUserId }: { users: SettingsUser[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SettingsUser | null>(null);
  const [deleting, setDeleting] = useState<SettingsUser | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<SettingsUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SALES_REP', avatarUrl: '' });
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'SALES_REP', avatarUrl: '' });
    setOpen(true);
  }

  function openEdit(user: SettingsUser) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, avatarUrl: user.avatarUrl ?? '' });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateUser(editing.id, {
            name: form.name,
            email: form.email,
            role: form.role,
            password: form.password,
            avatarUrl: form.avatarUrl || null,
          })
        : await createUser({ name: form.name, email: form.email, password: form.password, role: form.role });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? 'Usuário atualizado' : 'Usuário criado');
      setOpen(false);
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteUser(deleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Usuário movido para a lixeira');
      setDeleting(null);
    });
  }

  function removePermanently() {
    if (!permanentDeleting) return;
    startTransition(async () => {
      const result = await permanentlyDeleteUser(permanentDeleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Usuário excluído permanentemente');
      setPermanentDeleting(null);
    });
  }

  const selectedRole = ROLE_PERMISSIONS.find((item) => item.role === form.role);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Equipe ({users.length})</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie contas para seus funcionários e defina o que cada um pode acessar.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <UserPlus className="size-4" /> Nova conta
        </Button>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {initials(user.name)}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name} {user.id === currentUserId && <span className="text-xs text-muted-foreground">(você)</span>}</p>
                  <p className="text-xs text-muted-foreground">{user.email} • desde {formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>Editar</Button>
                <Button variant="ghost" size="icon-sm" aria-label="Mover para a lixeira" onClick={() => setDeleting(user)} disabled={user.id === currentUserId}>
                  <Archive className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Excluir permanentemente" onClick={() => setPermanentDeleting(user)} disabled={user.id === currentUserId}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar conta' : 'Nova conta de funcionário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{editing ? 'Nova senha (opcional)' : 'Senha *'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <SelectField
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
                options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
                className="w-full"
              />
              {selectedRole && <p className="text-xs text-muted-foreground">{selectedRole.description}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {editing ? 'Salvar' : 'Criar usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Mover usuário para a lixeira"
        description={`Mover "${deleting?.name}" para a lixeira? As atividades e vínculos serão preservados e poderão ser restaurados.`}
        onConfirm={remove}
        loading={isPending}
      />

      <ConfirmDialog
        open={!!permanentDeleting}
        onOpenChange={(open) => !open && setPermanentDeleting(null)}
        title="Excluir usuário permanentemente"
        description={`Excluir "${permanentDeleting?.name}" permanentemente? As atividades dele serão transferidas para você. Esta ação não pode ser desfeita.`}
        onConfirm={removePermanently}
        loading={isPending}
      />
    </Card>
  );
}

function TrashTab({ retentionDays }: { retentionDays: number }) {
  const [days, setDays] = useState(String(retentionDays));
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveTrashRetention(Number(days));
      if (result.error) toast.error(result.error);
      else toast.success('Prazo da lixeira atualizado');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trash2 className="size-4" /> Retenção da lixeira
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Escolha por quantos dias os itens excluídos ficam disponíveis antes de serem removidos automaticamente.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="retentionDays">Dias de retenção</Label>
            <Input
              id="retentionDays"
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-32"
              required
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Itens expirados são removidos automaticamente quando a lixeira é aberta ou uma exclusão é feita.{' '}
          <Link href="/trash" className="font-medium text-primary underline underline-offset-4">
            Abrir lixeira
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function PermissionsTab({ currentRole }: { currentRole: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Funções e permissões
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada funcionário acessa o mesmo CRM da empresa, mas as ações disponíveis dependem da função da conta.
          </p>
        </CardHeader>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {ROLE_PERMISSIONS.map((role) => (
          <Card key={role.role} className={role.role === currentRole ? 'ring-2 ring-primary/30' : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{role.label}</CardTitle>
                {role.role === currentRole && <Badge variant="secondary">Sua função</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {role.permissions.map((permission) => {
                  const denied = permission.startsWith('Não pode');
                  return (
                    <li key={permission} className="flex items-start gap-2 text-sm">
                      {denied ? (
                        <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                      ) : (
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      )}
                      <span className={denied ? 'text-muted-foreground' : undefined}>{permission}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PipelineTab({ stages }: { stages: string[] }) {
  const [labels, setLabels] = useState<string[]>(
    stages.length === DEAL_STAGES.length ? stages : DEAL_STAGES.map((s) => s.label)
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await savePipelineStages(labels);
      if (result.error) toast.error(result.error);
      else toast.success('Estágios atualizados');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estágios do funil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Personalize os nomes dos estágios. A ordem e os estágios base (Lead, Qualificado, Proposta, Negociação, Ganho, Perdido) são fixos.
        </p>
        {DEAL_STAGES.map((stage, index) => (
          <div key={stage.value} className="flex items-center gap-3">
            <span className="size-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="w-24 text-xs text-muted-foreground">{stage.value}</span>
            <Input
              value={labels[index] ?? stage.label}
              onChange={(e) => {
                const next = [...labels];
                next[index] = e.target.value;
                setLabels(next);
              }}
            />
          </div>
        ))}
        <Button onClick={save} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar estágios
        </Button>
      </CardContent>
    </Card>
  );
}

function TagsTab({ tags }: { tags: TagOption[] }) {
  const [form, setForm] = useState({ name: '', color: '#6366f1' });
  const [deleting, setDeleting] = useState<TagOption | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<TagOption | null>(null);
  const [isPending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createTag(form);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Tag salva');
        setForm({ name: '', color: '#6366f1' });
      }
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteTag(deleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Tag movida para a lixeira');
      setDeleting(null);
    });
  }

  function removePermanently() {
    if (!permanentDeleting) return;
    startTransition(async () => {
      const result = await permanentlyDeleteTag(permanentDeleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Tag excluída permanentemente');
      setPermanentDeleting(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="tagName">Nome</Label>
            <Input id="tagName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagColor">Cor</Label>
            <Input id="tagColor" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-16 p-1" />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Adicionar
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p>
          ) : (
            tags.map((tag) => (
              <span key={tag.id} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
                <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <button type="button" aria-label={`Mover ${tag.name} para a lixeira`} onClick={() => setDeleting(tag)} className="text-muted-foreground hover:text-foreground">
                  <Archive className="size-3" />
                </button>
                <button type="button" aria-label={`Excluir ${tag.name} permanentemente`} onClick={() => setPermanentDeleting(tag)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Mover tag para a lixeira"
        description={`Mover a tag "${deleting?.name}" para a lixeira? Você poderá restaurá-la depois.`}
        onConfirm={remove}
        loading={isPending}
      />

      <ConfirmDialog
        open={!!permanentDeleting}
        onOpenChange={(open) => !open && setPermanentDeleting(null)}
        title="Excluir tag permanentemente"
        description={`Excluir a tag "${permanentDeleting?.name}" permanentemente? Esta ação não pode ser desfeita.`}
        onConfirm={removePermanently}
        loading={isPending}
      />
    </Card>
  );
}
