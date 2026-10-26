'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SelectField } from '@/components/shared/select-field';
import { createDeal, updateDeal } from '@/actions/deals';
import { DEAL_STAGES } from '@/lib/crm';
import { formatCurrency } from '@/lib/format';
import type { DealRow, UserOption } from '@/types/crm';

type CustomerOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: DealRow | null;
  customers: CustomerOption[];
  users: UserOption[];
  defaultStage?: string;
};

export function DealFormDialog({ open, onOpenChange, deal, customers, users, defaultStage }: Props) {
  const [form, setForm] = useState({
    title: '',
    value: '0',
    stage: defaultStage ?? 'LEAD',
    probability: '10',
    customerId: '',
    ownerId: '',
    expectedCloseDate: '',
    description: '',
    lostReason: '',
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (deal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        title: deal.title,
        value: String(deal.value),
        stage: deal.stage,
        probability: String(deal.probability),
        customerId: deal.customerId,
        ownerId: deal.ownerId ?? '',
        expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '',
        description: deal.description ?? '',
        lostReason: deal.lostReason ?? '',
      });
    } else {
      const stage = defaultStage ?? 'LEAD';
      const preset = DEAL_STAGES.find((s) => s.value === stage);
      setForm({
        title: '',
        value: '0',
        stage,
        probability: String(preset?.probability ?? 10),
        customerId: customers[0]?.id ?? '',
        ownerId: '',
        expectedCloseDate: '',
        description: '',
        lostReason: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal, defaultStage]);

  function changeStage(stage: string) {
    const preset = DEAL_STAGES.find((s) => s.value === stage);
    setForm((prev) => ({ ...prev, stage, probability: String(preset?.probability ?? prev.probability) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      toast.error('Selecione um cliente');
      return;
    }
    startTransition(async () => {
      const payload = {
        title: form.title,
        value: Number(form.value) || 0,
        currency: 'BRL',
        stage: form.stage,
        probability: Number(form.probability) || 0,
        customerId: form.customerId,
        ownerId: form.ownerId || null,
        expectedCloseDate: form.expectedCloseDate || null,
        description: form.description || null,
        lostReason: form.stage === 'LOST' ? form.lostReason || null : null,
      };
      const result = deal ? await updateDeal(deal.id, payload) : await createDeal(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(deal ? 'Negócio atualizado' : 'Negócio criado');
      onOpenChange(false);
    });
  }

  const weighted = (Number(form.value) || 0) * ((Number(form.probability) || 0) / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? 'Editar negócio' : 'Novo negócio'}</DialogTitle>
          <DialogDescription>
            {deal ? 'Atualize os dados do negócio.' : 'Cadastre uma nova oportunidade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" type="number" min="0" step="100" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <Input id="probability" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Valor ponderado: <span className="font-medium text-foreground">{formatCurrency(weighted)}</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estágio</Label>
              <SelectField value={form.stage} onValueChange={changeStage} options={DEAL_STAGES.map((s) => ({ value: s.value, label: s.label }))} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <SelectField
                value={form.ownerId || 'none'}
                onValueChange={(v) => setForm({ ...form, ownerId: v === 'none' ? '' : v })}
                options={[{ value: 'none', label: 'Sem responsável' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre um cliente primeiro.</p>
            ) : (
              <SelectField
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v })}
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
                className="w-full"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Fechamento esperado</Label>
            <Input id="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
          </div>
          {form.stage === 'LOST' && (
            <div className="space-y-2">
              <Label htmlFor="lostReason">Motivo da perda</Label>
              <Input id="lostReason" value={form.lostReason} onChange={(e) => setForm({ ...form, lostReason: e.target.value })} placeholder="Ex.: Preço, concorrência..." />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending || customers.length === 0}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {deal ? 'Salvar' : 'Criar negócio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
