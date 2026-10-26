'use client';

import { useMemo, useState, useTransition } from 'react';
import { ArchiveRestore, RotateCcw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SelectField } from '@/components/shared/select-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { emptyTrash, permanentlyDeleteFromTrash, restoreFromTrash } from '@/actions/trash';
import { formatDateTime } from '@/lib/format';

export type TrashRow = {
  id: string;
  entityType: string;
  label: string;
  deletedAt: string;
  deletedByName: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  DEAL: 'Negócio',
  TASK: 'Tarefa',
  CONTACT: 'Contato',
  ACTIVITY: 'Atividade',
  TAG: 'Tag',
  USER: 'Usuário',
};

type Props = {
  items: TrashRow[];
  retentionDays: number;
  isOwner: boolean;
};

export function TrashView({ items, retentionDays, isOwner }: Props) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [purging, setPurging] = useState<TrashRow | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (type !== 'all' && item.entityType !== type) return false;
        if (search && !item.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [items, search, type]
  );

  function restore(item: TrashRow) {
    startTransition(async () => {
      const result = await restoreFromTrash(item.id);
      if (result.error) toast.error(result.error);
      else toast.success(`"${item.label}" restaurado`);
    });
  }

  function purge() {
    if (!purging) return;
    startTransition(async () => {
      const result = await permanentlyDeleteFromTrash(purging.id);
      if (result.error) toast.error(result.error);
      else toast.success('Item excluído permanentemente');
      setPurging(null);
    });
  }

  function empty() {
    startTransition(async () => {
      const result = await emptyTrash();
      if (result.error) toast.error(result.error);
      else toast.success('Lixeira esvaziada');
      setEmptyOpen(false);
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lixeira"
        description={`Itens excluídos ficam disponíveis por ${retentionDays} dia(s) antes de serem removidos automaticamente.`}
        actions={
          items.length > 0 ? (
            <Button variant="destructive" onClick={() => setEmptyOpen(true)}>
              <Trash2 className="size-4" /> Esvaziar lixeira
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar na lixeira..."
                className="pl-8"
              />
            </div>
            <SelectField
              value={type}
              onValueChange={setType}
              options={[
                { value: 'all', label: 'Todos os tipos' },
                ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              className="w-[180px]"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Lixeira vazia"
              description={items.length === 0 ? 'Nenhum item excluído no momento.' : 'Ajuste a busca ou o filtro de tipo.'}
            />
          ) : (
            <ul className="divide-y">
              {filtered.map((item) => {
                const expiresAt = new Date(
                  new Date(item.deletedAt).getTime() + retentionDays * 24 * 60 * 60 * 1000
                );
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <ArchiveRestore className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <Badge variant="secondary">{TYPE_LABELS[item.entityType] ?? item.entityType}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Excluído em {formatDateTime(item.deletedAt)}
                        {item.deletedByName ? ` por ${item.deletedByName}` : ''} • expira em {expiresAt.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => restore(item)} disabled={isPending}>
                        <RotateCcw className="size-4" /> Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir permanentemente"
                        onClick={() => setPurging(item)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!purging}
        onOpenChange={(open) => !open && setPurging(null)}
        title="Excluir permanentemente"
        description={`Excluir "${purging?.label}" permanentemente? Esta ação não pode ser desfeita.`}
        onConfirm={purge}
        loading={isPending}
      />

      <ConfirmDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title="Esvaziar lixeira"
        description={`Excluir permanentemente ${isOwner ? 'todos os itens' : 'todos os itens visíveis'} da lixeira? Esta ação não pode ser desfeita.`}
        onConfirm={empty}
        loading={isPending}
      />
    </div>
  );
}
