'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerFormSheet } from '@/components/customers/customer-form-sheet';
import type { CustomerRow, TagOption, UserOption } from '@/types/crm';

export function CustomerEditButton({
  customer,
  users,
  tags,
}: {
  customer: CustomerRow;
  users: UserOption[];
  tags: TagOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Editar
      </Button>
      <CustomerFormSheet open={open} onOpenChange={setOpen} customer={customer} users={users} tags={tags} />
    </>
  );
}
