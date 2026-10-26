'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SelectField } from '@/components/shared/select-field';
import { createCustomer, updateCustomer } from '@/actions/customers';
import { CUSTOMER_STATUSES } from '@/lib/crm';
import { cn } from '@/lib/utils';
import type { CustomerRow, TagOption, UserOption } from '@/types/crm';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerRow | null;
  users: UserOption[];
  tags: TagOption[];
};

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  position: '',
  status: 'LEAD',
  ownerId: '',
  tags: [] as string[],
  notes: '',
};

export function CustomerFormSheet({ open, onOpenChange, customer, users, tags }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(
        customer
          ? {
              name: customer.name,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
              company: customer.company ?? '',
              position: customer.position ?? '',
              status: customer.status,
              ownerId: customer.ownerId ?? '',
              tags: customer.tags ?? [],
              notes: customer.notes ?? '',
            }
          : emptyForm
      );
    }
  }, [open, customer]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function toggleTag(name: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(name) ? prev.tags.filter((t) => t !== name) : [...prev.tags, name],
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = { ...form, ownerId: form.ownerId || null };
      const result = customer
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(customer ? 'Cliente atualizado' : 'Cliente criado');
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{customer ? 'Editar cliente' : 'Novo cliente'}</SheetTitle>
          <SheetDescription>
            {customer ? 'Atualize as informações do cliente.' : 'Cadastre um novo lead ou cliente.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input id="position" value={form.position} onChange={(e) => set('position', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <SelectField
                value={form.status}
                onValueChange={(v) => set('status', v)}
                options={CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <SelectField
                value={form.ownerId || 'none'}
                onValueChange={(v) => set('ownerId', v === 'none' ? '' : v)}
                options={[
                  { value: 'none', label: 'Sem responsável' },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tag cadastrada nas configurações.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = form.tags.includes(tag.name);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag.name)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        active ? 'border-transparent text-white' : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                      style={active ? { backgroundColor: tag.color } : undefined}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              rows={4}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Observações sobre o cliente..."
            />
          </div>
          <SheetFooter className="px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {customer ? 'Salvar alterações' : 'Criar cliente'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
