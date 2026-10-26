'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SelectField } from '@/components/shared/select-field';
import { createTask, updateTask } from '@/actions/tasks';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/crm';
import type { TaskRow, UserOption } from '@/types/crm';

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  users,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow | null;
  users: UserOption[];
  defaultDate?: string;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    assignedTo: '',
    relatedTo: '',
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        title: task.title,
        description: task.description ?? '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        priority: task.priority,
        status: task.status,
        assignedTo: task.assignedTo ?? '',
        relatedTo: task.relatedTo ?? '',
      });
    } else {
      setForm({
        title: '',
        description: '',
        dueDate: defaultDate ?? '',
        priority: 'MEDIUM',
        status: 'PENDING',
        assignedTo: '',
        relatedTo: '',
      });
    }
  }, [open, task, defaultDate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        dueDate: form.dueDate || null,
        priority: form.priority,
        status: form.status,
        assignedTo: form.assignedTo || null,
        relatedTo: form.relatedTo || null,
      };
      const result = task ? await updateTask(task.id, payload) : await createTask(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(task ? 'Tarefa atualizada' : 'Tarefa criada');
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <SelectField
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
                options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SelectField
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
                options={TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <SelectField
                value={form.assignedTo || 'none'}
                onValueChange={(v) => setForm({ ...form, assignedTo: v === 'none' ? '' : v })}
                options={[{ value: 'none', label: 'Sem responsável' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="relatedTo">Relacionado a</Label>
            <Input id="relatedTo" value={form.relatedTo} onChange={(e) => setForm({ ...form, relatedTo: e.target.value })} placeholder="Cliente, negócio..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {task ? 'Salvar' : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
