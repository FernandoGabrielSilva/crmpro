'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createColumnHelper, type RowSelectionState } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Archive, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, dataTableFeatures } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SelectField } from '@/components/shared/select-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DealFormDialog } from '@/components/deals/deal-form-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { deleteDeal, deleteDeals, permanentlyDeleteDeal, permanentlyDeleteDeals } from '@/actions/deals';
import { DEAL_STAGES, DEAL_STAGE_LABELS } from '@/lib/crm';
import { formatCurrency, formatDate } from '@/lib/format';
import type { DealRow, UserOption } from '@/types/crm';

const helper = createColumnHelper<typeof dataTableFeatures, DealRow>();

type Props = {
  deals: DealRow[];
  customers: { id: string; name: string }[];
  users: UserOption[];
  summary: { openValue: number; weighted: number; wonValue: number; openCount: number; wonCount: number };
  filters: { q: string; stage: string; ownerId: string };
  canManage: boolean;
};

export function DealsView({ deals, customers, users, summary, filters, canManage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.q);
  const debounced = useDebounce(search, 400);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DealRow | null>(null);
  const [deleting, setDeleting] = useState<DealRow | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<DealRow | null>(null);
  const [selected, setSelected] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPermanentOpen, setBulkPermanentOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  useEffect(() => {
    if (debounced !== filters.q) {
      updateParams({ q: debounced || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteDeal(deleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Negócio movido para a lixeira');
      setDeleting(null);
    });
  }

  function handlePermanentDelete() {
    if (!permanentDeleting) return;
    startTransition(async () => {
      const result = await permanentlyDeleteDeal(permanentDeleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Negócio excluído permanentemente');
      setPermanentDeleting(null);
    });
  }

  function handleBulkDelete() {
    startTransition(async () => {
      const result = await deleteDeals(selectedIds);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${selectedIds.length} negócio(s) movido(s) para a lixeira`);
        setSelected({});
      }
      setBulkDeleteOpen(false);
    });
  }

  function handleBulkPermanentDelete() {
    startTransition(async () => {
      const result = await permanentlyDeleteDeals(selectedIds);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${selectedIds.length} negócio(s) excluído(s) permanentemente`);
        setSelected({});
      }
      setBulkPermanentOpen(false);
    });
  }

  const columns = [
    helper.accessor('title', {
      header: 'Negócio',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.customerName}</p>
          </div>
        );
      },
    }),
    helper.accessor('value', {
      header: 'Valor',
      cell: (info) => <span className="font-medium">{formatCurrency(info.getValue())}</span>,
    }),
    helper.display({
      id: 'weighted',
      header: 'Ponderado',
      cell: (info) => {
        const row = info.row.original;
        return <span className="text-sm text-muted-foreground">{formatCurrency(row.value * (row.probability / 100))}</span>;
      },
    }),
    helper.accessor('stage', {
      header: 'Estágio',
      cell: (info) => <Badge variant="outline">{DEAL_STAGE_LABELS[info.getValue()]}</Badge>,
    }),
    helper.accessor('ownerName', {
      header: 'Responsável',
      cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>,
    }),
    helper.accessor('expectedCloseDate', {
      header: 'Fechamento',
      cell: (info) => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
    helper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => { setEditing(row); setFormOpen(true); }}>
              <Pencil className="size-4" />
            </Button>
            {canManage && (
              <>
                <Button variant="ghost" size="icon-sm" aria-label="Mover para a lixeira" onClick={() => setDeleting(row)}>
                  <Archive className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Excluir permanentemente" onClick={() => setPermanentDeleting(row)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Negócios"
        description={`${deals.length} negócio(s) listado(s)`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={customers.length === 0}>
            <Plus className="size-4" /> Novo negócio
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Em pipeline" value={formatCurrency(summary.openValue)} hint={`${summary.openCount} abertos`} />
        <SummaryCard label="Valor ponderado" value={formatCurrency(summary.weighted)} hint="Aberto ponderado" />
        <SummaryCard label="Ganhos" value={formatCurrency(summary.wonValue)} hint={`${summary.wonCount} fechados`} />
        <SummaryCard label="Ticket médio" value={formatCurrency(summary.openCount ? summary.openValue / summary.openCount : 0)} hint="Pipeline aberto" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar negócio ou cliente..." className="pl-8" />
            </div>
            <div className="flex flex-wrap gap-2">
              <SelectField
                value={filters.stage || 'all'}
                onValueChange={(v) => updateParams({ stage: v === 'all' ? null : v })}
                options={[{ value: 'all', label: 'Todos os estágios' }, ...DEAL_STAGES.map((s) => ({ value: s.value, label: s.label }))]}
                className="w-[170px]"
              />
              <SelectField
                value={filters.ownerId || 'all'}
                onValueChange={(v) => updateParams({ ownerId: v === 'all' ? null : v })}
                options={[{ value: 'all', label: 'Todos os responsáveis' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                className="w-[190px]"
              />
            </div>
          </div>

          {canManage && selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium">{selectedIds.length} selecionado(s)</span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Archive className="size-4" /> Excluir
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkPermanentOpen(true)}>
                  <Trash2 className="size-4" /> Excluir permanente
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setSelected({})} aria-label="Limpar seleção">
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          )}

          <DataTable
            data={deals}
            columns={columns}
            getRowId={(row) => row.id}
            selected={canManage ? selected : undefined}
            onSelectedChange={canManage ? setSelected : undefined}
            emptyState={
              <EmptyState
                title="Nenhum negócio encontrado"
                description="Ajuste os filtros ou crie um novo negócio."
                action={<Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={customers.length === 0}><Plus className="size-4" /> Novo negócio</Button>}
              />
            }
          />
        </CardContent>
      </Card>

      <DealFormDialog open={formOpen} onOpenChange={setFormOpen} deal={editing} customers={customers} users={users} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Mover negócio para a lixeira"
        description={`Mover "${deleting?.title}" para a lixeira? As atividades vinculadas também vão para a lixeira e poderão ser restauradas.`}
        onConfirm={handleDelete}
        loading={isPending}
      />

      <ConfirmDialog
        open={!!permanentDeleting}
        onOpenChange={(open) => !open && setPermanentDeleting(null)}
        title="Excluir negócio permanentemente"
        description={`Excluir "${permanentDeleting?.title}" permanentemente? As atividades vinculadas também serão apagadas. Esta ação não pode ser desfeita.`}
        onConfirm={handlePermanentDelete}
        loading={isPending}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Mover negócios para a lixeira"
        description={`Mover ${selectedIds.length} negócio(s) selecionado(s) para a lixeira? Eles poderão ser restaurados.`}
        onConfirm={handleBulkDelete}
        loading={isPending}
      />

      <ConfirmDialog
        open={bulkPermanentOpen}
        onOpenChange={setBulkPermanentOpen}
        title="Excluir negócios permanentemente"
        description={`Excluir ${selectedIds.length} negócio(s) selecionado(s) permanentemente? Esta ação não pode ser desfeita.`}
        onConfirm={handleBulkPermanentDelete}
        loading={isPending}
      />
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
