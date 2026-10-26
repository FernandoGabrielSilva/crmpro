'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, dataTableFeatures } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SelectField } from '@/components/shared/select-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CustomerFormSheet } from '@/components/customers/customer-form-sheet';
import { useDebounce } from '@/hooks/use-debounce';
import {
  assignCustomersOwner,
  deleteCustomer,
  deleteCustomers,
  permanentlyDeleteCustomer,
  permanentlyDeleteCustomers,
} from '@/actions/customers';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_CLASSES,
  CUSTOMER_STATUS_LABELS,
} from '@/lib/crm';
import { downloadCSV, formatDate, initials } from '@/lib/format';
import type { CustomerRow, TagOption, UserOption } from '@/types/crm';
import type { RowSelectionState } from '@tanstack/react-table';

const helper = createColumnHelper<typeof dataTableFeatures, CustomerRow>();

type Props = {
  customers: CustomerRow[];
  users: UserOption[];
  tags: TagOption[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; status: string; ownerId: string; tag: string; sort: string };
  canManage: boolean;
};

export function CustomersView({ customers, users, tags, total, page, pageSize, filters, canManage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebounce(search, 400);
  const [selected, setSelected] = useState<RowSelectionState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState<CustomerRow | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<CustomerRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPermanentOpen, setBulkPermanentOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (resetPage) params.delete('page');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      updateParams({ q: debouncedSearch || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const ownerOptions = users.map((u) => ({ value: u.id, label: u.name }));

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCustomer(deleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Cliente movido para a lixeira');
      setDeleting(null);
    });
  }

  function handlePermanentDelete() {
    if (!permanentDeleting) return;
    startTransition(async () => {
      const result = await permanentlyDeleteCustomer(permanentDeleting.id);
      if (result.error) toast.error(result.error);
      else toast.success('Cliente excluído permanentemente');
      setPermanentDeleting(null);
    });
  }

  function handleBulkDelete() {
    startTransition(async () => {
      const result = await deleteCustomers(selectedIds);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${selectedIds.length} cliente(s) movido(s) para a lixeira`);
        setSelected({});
      }
      setBulkDeleteOpen(false);
    });
  }

  function handleBulkPermanentDelete() {
    startTransition(async () => {
      const result = await permanentlyDeleteCustomers(selectedIds);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${selectedIds.length} cliente(s) excluído(s) permanentemente`);
        setSelected({});
      }
      setBulkPermanentOpen(false);
    });
  }

  function handleBulkAssign(ownerId: string) {
    startTransition(async () => {
      const result = await assignCustomersOwner(selectedIds, ownerId === 'none' ? null : ownerId);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Responsável atualizado');
        setSelected({});
      }
    });
  }

  const columns = [
    helper.accessor('name', {
      header: 'Cliente',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials(row.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.company ?? row.email ?? '—'}
              </p>
            </div>
          </div>
        );
      },
    }),
    helper.accessor('email', {
      header: 'Email',
      cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>,
    }),
    helper.accessor('phone', {
      header: 'Telefone',
      cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>,
    }),
    helper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const value = info.getValue();
        return (
          <Badge variant="outline" className={CUSTOMER_STATUS_CLASSES[value]}>
            {CUSTOMER_STATUS_LABELS[value]}
          </Badge>
        );
      },
    }),
    helper.accessor('ownerName', {
      header: 'Responsável',
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>
      ),
    }),
    helper.accessor('createdAt', {
      header: 'Criado em',
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
            <Button variant="ghost" size="icon-sm" aria-label="Detalhes" nativeButton={false} render={<Link href={`/customers/${row.id}`} />}>
              <ExternalLink className="size-4" />
            </Button>
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description={`${total} cliente(s) cadastrado(s)`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCSV(
                  'clientes.csv',
                  customers.map((c) => ({
                    Nome: c.name,
                    Email: c.email,
                    Telefone: c.phone,
                    Empresa: c.company,
                    Cargo: c.position,
                    Status: CUSTOMER_STATUS_LABELS[c.status],
                    Responsavel: c.ownerName,
                    Tags: c.tags.join(', '),
                  }))
                )
              }
            >
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-4" /> Novo cliente
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, email ou empresa..."
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <SelectField
                value={filters.status || 'all'}
                onValueChange={(v) => updateParams({ status: v === 'all' ? null : v })}
                options={[{ value: 'all', label: 'Todos os status' }, ...CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
                className="w-[160px]"
              />
              <SelectField
                value={filters.ownerId || 'all'}
                onValueChange={(v) => updateParams({ ownerId: v === 'all' ? null : v })}
                options={[{ value: 'all', label: 'Todos os responsáveis' }, ...ownerOptions]}
                className="w-[180px]"
              />
              <SelectField
                value={filters.tag || 'all'}
                onValueChange={(v) => updateParams({ tag: v === 'all' ? null : v })}
                options={[{ value: 'all', label: 'Todas as tags' }, ...tags.map((t) => ({ value: t.name, label: t.name }))]}
                className="w-[150px]"
              />
              <SelectField
                value={filters.sort || 'createdAt:desc'}
                onValueChange={(v) => updateParams({ sort: v })}
                options={[
                  { value: 'createdAt:desc', label: 'Mais recentes' },
                  { value: 'createdAt:asc', label: 'Mais antigos' },
                  { value: 'name:asc', label: 'Nome A-Z' },
                  { value: 'name:desc', label: 'Nome Z-A' },
                ]}
                className="w-[150px]"
              />
            </div>
          </div>

          {canManage && selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium">{selectedIds.length} selecionado(s)</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <SelectField
                  value=""
                  onValueChange={handleBulkAssign}
                  placeholder="Atribuir responsável"
                  options={ownerOptions}
                  className="w-[180px]"
                />
                <Button variant="outline" size="sm" onClick={() => {
                  const rows = customers.filter((c) => selectedIds.includes(c.id));
                  downloadCSV('clientes-selecionados.csv', rows.map((c) => ({ Nome: c.name, Email: c.email, Empresa: c.company, Status: c.status })));
                }}>
                  <Download className="size-4" /> Exportar
                </Button>
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
            data={customers}
            columns={columns}
            getRowId={(row) => row.id}
            selected={canManage ? selected : undefined}
            onSelectedChange={canManage ? setSelected : undefined}
            emptyState={
              <EmptyState
                title="Nenhum cliente encontrado"
                description="Ajuste os filtros ou cadastre um novo cliente."
                action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> Novo cliente</Button>}
              />
            }
          />

          <div className="flex flex-col items-center justify-between gap-2 border-t pt-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} • {total} registro(s)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) }, false)}
              >
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) }, false)}
              >
                Próxima <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CustomerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        users={users}
        tags={tags}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Mover cliente para a lixeira"
        description={`Mover "${deleting?.name}" para a lixeira? Os negócios, contatos e atividades vinculados também vão para a lixeira e poderão ser restaurados.`}
        onConfirm={handleDelete}
        loading={isPending}
      />

      <ConfirmDialog
        open={!!permanentDeleting}
        onOpenChange={(open) => !open && setPermanentDeleting(null)}
        title="Excluir cliente permanentemente"
        description={`Excluir "${permanentDeleting?.name}" permanentemente? Negócios, contatos e atividades vinculados também serão apagados. Esta ação não pode ser desfeita.`}
        onConfirm={handlePermanentDelete}
        loading={isPending}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Mover clientes para a lixeira"
        description={`Mover ${selectedIds.length} cliente(s) selecionado(s) para a lixeira? Eles poderão ser restaurados.`}
        onConfirm={handleBulkDelete}
        loading={isPending}
      />

      <ConfirmDialog
        open={bulkPermanentOpen}
        onOpenChange={setBulkPermanentOpen}
        title="Excluir clientes permanentemente"
        description={`Excluir ${selectedIds.length} cliente(s) selecionado(s) permanentemente? Esta ação não pode ser desfeita.`}
        onConfirm={handleBulkPermanentDelete}
        loading={isPending}
      />
    </div>
  );
}
