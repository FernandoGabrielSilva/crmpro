'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SelectField } from '@/components/shared/select-field';
import { createActivity } from '@/actions/activities';
import { ACTIVITY_TYPES } from '@/lib/crm';

export function ActivityComposer({
  customerId,
  deals,
  label = 'Registrar atividade',
}: {
  customerId?: string;
  deals?: { id: string; title: string }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'CALL',
    content: '',
    dealId: '',
    dueDate: '',
  });
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createActivity({
        type: form.type,
        content: form.content,
        customerId: customerId ?? null,
        dealId: form.dealId || null,
        dueDate: form.dueDate || null,
        completed: false,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success('Atividade registrada');
        setForm({ type: 'CALL', content: '', dealId: '', dueDate: '' });
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova atividade</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <SelectField
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
                options={ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                rows={3}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
            </div>
            {deals && deals.length > 0 && (
              <div className="space-y-2">
                <Label>Negócio relacionado</Label>
                <SelectField
                  value={form.dealId || 'none'}
                  onValueChange={(v) => setForm({ ...form, dealId: v === 'none' ? '' : v })}
                  options={[{ value: 'none', label: 'Nenhum' }, ...deals.map((d) => ({ value: d.id, label: d.title }))]}
                  className="w-full"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Data de vencimento</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
