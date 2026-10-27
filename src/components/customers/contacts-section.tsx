'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { createContact, deleteContact } from '@/actions/customers';
import { formatPhone } from '@/lib/utils';

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
};

export function ContactsSection({ customerId, contacts }: { customerId: string; contacts: Contact[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', position: '' });
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createContact({ customerId, ...form });
      if (result.error) toast.error(result.error);
      else {
        toast.success('Contato adicionado');
        setForm({ name: '', email: '', phone: '', position: '' });
        setOpen(false);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteContact(id, customerId);
      if (result.error) toast.error(result.error);
      else toast.success('Contato movido para a lixeira');
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contatos</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <EmptyState title="Nenhum contato" description="Adicione contatos secundários deste cliente." icon={<UserRound className="size-6" />} />
        ) : (
          <div className="divide-y">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[contact.position, contact.email, contact.phone].filter(Boolean).join(' • ') || '—'}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Remover contato" onClick={() => remove(contact.id)} disabled={isPending}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} onKeyDown={(e) => { if (/\d/.test(e.key) && form.phone.replace(/\D/g, '').length >= 11) e.preventDefault(); }} inputMode="tel" maxLength={15} placeholder="(11) 99999-9999" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
