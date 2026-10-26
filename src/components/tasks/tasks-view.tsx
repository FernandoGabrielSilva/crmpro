'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Archive, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { SelectField } from '@/components/shared/select-field';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { deleteTask, deleteTasks, permanentlyDeleteTask, permanentlyDeleteTasks, toggleTaskComplete } from '@/actions/tasks';
import { TASK_PRIORITIES, TASK_PRIORITY_CLASSES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from '@/lib/crm';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TaskRow, UserOption } from '@/types/crm';

export function TasksView({ tasks, users, canManage }: { tasks: TaskRow[]; users: UserOption[]; canManage: boolean }) {
  const [items, setItems] = useState(tasks);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<TaskRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPermanentOpen, setBulkPermanentOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState(() => new Date());
  const [isPending, startTransition] = useTransition();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setItems(tasks), [tasks]);

  const filtered = useMemo(
    () =>
      items.filter((task) => {
        if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (status !== 'all' && task.status !== status) return false;
        if (priority !== 'all' && task.priority !== priority) return false;
        if (assignee !== 'all' && task.assignedTo !== assignee) return false;
        return true;
      }),
    [items, search, status, priority, assignee]
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = filtered.length > 0 && filtered.every((task) => selectedSet.has(task.id));

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : filtered.map((task) => task.id));
  }

  function toggle(task: TaskRow, checked: boolean) {
    setItems((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: checked ? 'COMPLETED' : 'PENDING' } : t
      )
    );
    startTransition(async () => {
      const result = await toggleTaskComplete(task.id, checked);
      if (result.error) {
        toast.error(result.error);
        setItems(tasks);
      }
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteTask(deleting.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Tarefa movida para a lixeira');
        setItems((prev) => prev.filter((item) => item.id !== deleting.id));
      }
      setDeleting(null);
    });
  }

  function removePermanent() {
    if (!permanentDeleting) return;
    startTransition(async () => {
      const result = await permanentlyDeleteTask(permanentDeleting.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Tarefa excluída permanentemente');
        setItems((prev) => prev.filter((item) => item.id !== permanentDeleting.id));
      }
      setPermanentDeleting(null);
    });
  }

  function removeSelected() {
    startTransition(async () => {
      const result = await deleteTasks(selected);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${selected.length} tarefa(s) movida(s) para a lixeira`);
        setItems((prev) => prev.filter((item) => !selected.includes(item.id)));
        setSelected([]);
      }
      setBulkDeleteOpen(false);
    });
  }

  function removeSelectedPermanently() {
    startTransition(async () => {
      const result = await permanentlyDeleteTasks(selected);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${selected.length} tarefa(s) excluída(s) permanentemente`);
        setItems((prev) => prev.filter((item) => !selected.includes(item.id)));
        setSelected([]);
      }
      setBulkPermanentOpen(false);
    });
  }

  const overdue = filtered.filter(
    (t) => t.dueDate && t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date()
  ).length;
  const pending = filtered.filter((t) => t.status !== 'COMPLETED').length;
  const done = filtered.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tarefas e Atividades"
        description={`${pending} pendente(s) • ${overdue} atrasada(s) • ${done} concluída(s)`}
        actions={
          <Button onClick={() => { setEditing(null); setDefaultDate(undefined); setFormOpen(true); }}>
            <Plus className="size-4" /> Nova tarefa
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pendentes" value={String(pending)} icon={<Circle className="size-4 text-amber-500" />} />
        <StatCard label="Atrasadas" value={String(overdue)} icon={<CalendarDays className="size-4 text-red-500" />} />
        <StatCard label="Concluídas" value={String(done)} icon={<CheckCircle2 className="size-4 text-emerald-500" />} />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="list"><CheckCircle2 className="size-4" /> Lista</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="size-4" /> Calendário</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefa..." className="w-[200px] pl-8" />
            </div>
            <SelectField
              value={status}
              onValueChange={setStatus}
              options={[{ value: 'all', label: 'Todos os status' }, ...TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
              className="w-[160px]"
            />
            <SelectField
              value={priority}
              onValueChange={setPriority}
              options={[{ value: 'all', label: 'Todas as prioridades' }, ...TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))]}
              className="w-[170px]"
            />
            <SelectField
              value={assignee}
              onValueChange={setAssignee}
              options={[{ value: 'all', label: 'Todos os responsáveis' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
              className="w-[190px]"
            />
          </div>
        </div>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              {canManage && selected.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                  <span className="text-sm font-medium">{selected.length} selecionada(s)</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                      <Archive className="size-4" /> Excluir
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setBulkPermanentOpen(true)}>
                      <Trash2 className="size-4" /> Excluir permanente
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setSelected([])} aria-label="Limpar seleção">
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
              {canManage && filtered.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todas as tarefas" />
                  <button type="button" onClick={toggleAll} className="hover:text-foreground">
                    Selecionar todas
                  </button>
                </div>
              )}
              {filtered.length === 0 ? (
                <EmptyState
                  title="Nenhuma tarefa encontrada"
                  description="Crie uma tarefa ou ajuste os filtros."
                  action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> Nova tarefa</Button>}
                />
              ) : (
                <ul className="divide-y">
                  {filtered.map((task) => {
                    const isDone = task.status === 'COMPLETED';
                    const isOverdue = !!task.dueDate && !isDone && new Date(task.dueDate) < new Date();
                    return (
                      <li key={task.id} className="flex items-start gap-3 py-3">
                        {canManage && (
                          <Checkbox
                            checked={selectedSet.has(task.id)}
                            onCheckedChange={() => toggleSelected(task.id)}
                            className="mt-1"
                            aria-label="Selecionar tarefa"
                          />
                        )}
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={(value) => toggle(task, !!value)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={cn('text-sm font-medium', isDone && 'line-through text-muted-foreground')}>
                              {task.title}
                            </p>
                            <Badge variant="outline" className={TASK_PRIORITY_CLASSES[task.priority]}>
                              {TASK_PRIORITY_LABELS[task.priority]}
                            </Badge>
                            <Badge variant="secondary" className="h-5">{TASK_STATUS_LABELS[task.status]}</Badge>
                          </div>
                          {task.description && <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {task.dueDate && (
                              <span className={cn(isOverdue && 'font-medium text-destructive')}>
                                Vence {formatDate(task.dueDate)}{isOverdue ? ' (atrasada)' : ''}
                              </span>
                            )}
                            {task.assigneeName && <span>• {task.assigneeName}</span>}
                            {task.relatedTo && <span>• {task.relatedTo}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => { setEditing(task); setFormOpen(true); }}>
                            <Pencil className="size-4" />
                          </Button>
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon-sm" aria-label="Mover para a lixeira" onClick={() => setDeleting(task)}>
                                <Archive className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" aria-label="Excluir permanentemente" onClick={() => setPermanentDeleting(task)}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setMonth(subMonths(month, 1))} aria-label="Mês anterior">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-[160px] text-center text-sm font-semibold capitalize">
                    {format(month, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <Button variant="outline" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Hoje</Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays(month).map((day) => {
                  const dayTasks = filtered.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
                  const inMonth = isSameMonth(day, month);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-[92px] rounded-md border p-1 text-left',
                        !inMonth && 'bg-muted/30 text-muted-foreground',
                        isSameDay(day, new Date()) && 'border-primary/50 ring-1 ring-primary/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs font-medium', isSameDay(day, new Date()) && 'text-primary')}>
                          {format(day, 'd')}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Nova tarefa neste dia"
                          onClick={() => { setEditing(null); setDefaultDate(format(day, 'yyyy-MM-dd')); setFormOpen(true); }}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {dayTasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => { setEditing(task); setFormOpen(true); }}
                            className={cn(
                              'block w-full truncate rounded px-1 py-0.5 text-left text-[11px]',
                              task.status === 'COMPLETED'
                                ? 'bg-muted text-muted-foreground line-through'
                                : task.priority === 'HIGH'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-primary/10 text-primary'
                            )}
                            title={task.title}
                          >
                            {task.title}
                          </button>
                        ))}
                        {dayTasks.length > 3 && (
                          <p className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} mais</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} users={users} defaultDate={defaultDate} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Mover tarefa para a lixeira"
        description={`Mover "${deleting?.title}" para a lixeira? Você poderá restaurá-la depois.`}
        onConfirm={remove}
        loading={isPending}
      />

      <ConfirmDialog
        open={!!permanentDeleting}
        onOpenChange={(open) => !open && setPermanentDeleting(null)}
        title="Excluir tarefa permanentemente"
        description={`Excluir "${permanentDeleting?.title}" permanentemente? Esta ação não pode ser desfeita.`}
        onConfirm={removePermanent}
        loading={isPending}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Mover tarefas para a lixeira"
        description={`Mover ${selected.length} tarefa(s) selecionada(s) para a lixeira? Você poderá restaurá-las depois.`}
        onConfirm={removeSelected}
        loading={isPending}
      />

      <ConfirmDialog
        open={bulkPermanentOpen}
        onOpenChange={setBulkPermanentOpen}
        title="Excluir tarefas permanentemente"
        description={`Excluir ${selected.length} tarefa(s) selecionada(s) permanentemente? Esta ação não pode ser desfeita.`}
        onConfirm={removeSelectedPermanently}
        loading={isPending}
      />
    </div>
  );
}

function getCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
