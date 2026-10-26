'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { CalendarClock, GripVertical, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SelectField } from '@/components/shared/select-field';
import { DealFormDialog } from '@/components/deals/deal-form-dialog';
import { moveDealStage } from '@/actions/deals';
import { DEAL_STAGES } from '@/lib/crm';
import { formatCurrency, initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DealRow, TagOption, UserOption } from '@/types/crm';

const ALL_STAGES = DEAL_STAGES.map((s) => s.value);

type Columns = Record<string, DealRow[]>;

function groupDeals(deals: DealRow[]): Columns {
  const grouped: Columns = {};
  for (const stage of ALL_STAGES) {
    grouped[stage] = deals
      .filter((d) => d.stage === stage)
      .sort((a, b) => a.order - b.order);
  }
  return grouped;
}

function findContainer(columns: Columns, id: string): string | undefined {
  if (id.startsWith('col:')) return id.slice(4);
  return ALL_STAGES.find((stage) => columns[stage]?.some((d) => d.id === id));
}

export function PipelineBoard({
  deals,
  users,
  customers,
  tags,
  stageLabels,
}: {
  deals: DealRow[];
  users: UserOption[];
  customers: { id: string; name: string }[];
  tags: TagOption[];
  stageLabels?: Record<string, string>;
}) {
  const [columns, setColumns] = useState<Columns>(() => groupDeals(deals));
  const [activeDeal, setActiveDeal] = useState<DealRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DealRow | null>(null);
  const [defaultStage, setDefaultStage] = useState('LEAD');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [, startTransition] = useTransition();
  const snapshot = useRef<Columns | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumns(groupDeals(deals));
  }, [deals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filtered = Object.fromEntries(
    ALL_STAGES.map((stage) => [
      stage,
      (columns[stage] ?? []).filter((deal) => {
        if (ownerFilter !== 'all' && deal.ownerId !== ownerFilter) return false;
        if (tagFilter !== 'all' && !deal.customerTags.includes(tagFilter)) return false;
        if (search) {
          const term = search.toLowerCase();
          if (
            !deal.title.toLowerCase().includes(term) &&
            !deal.customerName.toLowerCase().includes(term)
          )
            return false;
        }
        if (period !== 'all') {
          if (!deal.expectedCloseDate) return false;
          const days = differenceInDays(new Date(deal.expectedCloseDate), new Date());
          if (days < 0 || days > Number(period)) return false;
        }
        return true;
      }),
    ])
  ) as Columns;

  function onDragStart(event: DragStartEvent) {
    snapshot.current = columns;
    const id = String(event.active.id);
    const stage = findContainer(columns, id);
    if (stage) setActiveDeal(columns[stage].find((d) => d.id === id) ?? null);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(columns, activeId);
    const to = overId.startsWith('col:') ? overId.slice(4) : findContainer(columns, overId);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const fromItems = prev[from] ?? [];
      const toItems = prev[to] ?? [];
      const deal = fromItems.find((d) => d.id === activeId);
      if (!deal) return prev;
      const overIndex = toItems.findIndex((d) => d.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : toItems.length;
      const nextTo = [...toItems];
      nextTo.splice(insertIndex, 0, { ...deal, stage: to as DealRow['stage'] });
      return {
        ...prev,
        [from]: fromItems.filter((d) => d.id !== activeId),
        [to]: nextTo,
      };
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const stage = findContainer(columns, activeId);
    if (!stage) return;

    let items = columns[stage] ?? [];
    const oldIndex = items.findIndex((d) => d.id === activeId);
    if (oldIndex === -1) return;
    let newIndex = overId.startsWith('col:')
      ? items.length - 1
      : items.findIndex((d) => d.id === overId);
    if (newIndex === -1) newIndex = items.length - 1;

    if (oldIndex !== newIndex) {
      items = arrayMove(items, oldIndex, newIndex);
      setColumns((prev) => ({ ...prev, [stage]: items }));
    }

    startTransition(async () => {
      const result = await moveDealStage(activeId, stage, newIndex);
      if (result.error) {
        toast.error(result.error);
        if (snapshot.current) setColumns(snapshot.current);
      }
    });
  }

  const totalValue = Object.values(filtered).flat().reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Funil de Vendas"
        description="Arraste os cartões para atualizar o estágio de cada negócio."
        actions={
          <Button onClick={() => { setEditing(null); setDefaultStage('LEAD'); setFormOpen(true); }} disabled={customers.length === 0}>
            <Plus className="size-4" /> Novo negócio
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-2 pt-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar negócio ou cliente..." className="pl-8" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SelectField
              value={ownerFilter}
              onValueChange={setOwnerFilter}
              options={[{ value: 'all', label: 'Todos os responsáveis' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
              className="w-[190px]"
            />
            <SelectField
              value={tagFilter}
              onValueChange={setTagFilter}
              options={[{ value: 'all', label: 'Todas as tags' }, ...tags.map((t) => ({ value: t.name, label: t.name }))]}
              className="w-[150px]"
            />
            <SelectField
              value={period}
              onValueChange={setPeriod}
              options={[
                { value: 'all', label: 'Todo o período' },
                { value: '7', label: 'Próximos 7 dias' },
                { value: '30', label: 'Próximos 30 dias' },
                { value: '90', label: 'Próximos 90 dias' },
              ]}
              className="w-[170px]"
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {Object.values(filtered).flat().length} negócio(s) • {formatCurrency(totalValue)} em pipeline
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${(() => {
                const won = (filtered['WON'] ?? []).reduce((s, d) => s + d.value, 0);
                return totalValue > 0 ? Math.round((won / totalValue) * 100) : 0;
              })()}%`,
            }}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.value}
              stage={{ ...stage, label: stageLabels?.[stage.value] ?? stage.label }}
              deals={filtered[stage.value] ?? []}
              onAdd={() => { setEditing(null); setDefaultStage(stage.value); setFormOpen(true); }}
              onOpen={(deal) => { setEditing(deal); setFormOpen(true); }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? <DealCardContent deal={activeDeal} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deal={editing}
        customers={customers}
        users={users}
        defaultStage={defaultStage}
      />
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
  onAdd,
  onOpen,
}: {
  stage: { value: string; label: string; color: string };
  deals: DealRow[];
  onAdd: () => void;
  onOpen: (deal: DealRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage.value}`, data: { stage: stage.value } });
  const total = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[290px] shrink-0 flex-col rounded-xl border bg-muted/30',
        isOver && 'ring-2 ring-primary/40'
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold">{stage.label}</span>
          <Badge variant="secondary" className="h-5">{deals.length}</Badge>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onAdd} aria-label={`Novo em ${stage.label}`}>
          <Plus className="size-3.5" />
        </Button>
      </div>
      <div className="px-3 py-1 text-xs text-muted-foreground">{formatCurrency(total)}</div>
      <SortableContext id={`sort:${stage.value}`} items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
          {deals.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-6 text-xs text-muted-foreground">
              Solte um negócio aqui
            </div>
          ) : (
            deals.map((deal) => <SortableDealCard key={deal.id} deal={deal} onOpen={onOpen} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableDealCard({ deal, onOpen }: { deal: DealRow; onOpen: (deal: DealRow) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
  });

  const dragged = useRef(false);
  useEffect(() => {
    if (isDragging) {
      dragged.current = true;
      return;
    }
    const timer = setTimeout(() => {
      dragged.current = false;
    }, 150);
    return () => clearTimeout(timer);
  }, [isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className="group cursor-grab rounded-lg border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md"
        {...listeners}
        onClick={() => { if (dragged.current) return; onOpen(deal); }}
      >
        <DealCardContent deal={deal} />
      </div>
    </div>
  );
}

function DealCardContent({ deal, overlay }: { deal: DealRow; overlay?: boolean }) {
  const days = differenceInDays(new Date(), new Date(deal.updatedAt));
  return (
    <div className={cn('space-y-2', overlay && 'w-[270px] rounded-lg border bg-card p-2.5 shadow-lg')}>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium">{deal.title}</p>
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground">{deal.customerName}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{formatCurrency(deal.value, deal.currency)}</span>
        <span className="text-xs text-muted-foreground">{deal.probability}%</span>
      </div>
      <div className="flex items-center justify-between border-t pt-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarClock className="size-3" /> {days <= 0 ? 'hoje' : `${days}d`}
        </span>
        <span className="flex items-center gap-1">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {initials(deal.ownerName ?? 'SR')}
          </span>
        </span>
      </div>
    </div>
  );
}
