export const instant = false;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, CalendarDays, Mail, Phone, UserRound } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ActivityIcon } from '@/components/shared/activity-icon';
import { ActivityComposer } from '@/components/shared/activity-composer';
import { CustomerEditButton } from '@/components/customers/customer-edit-button';
import { ContactsSection } from '@/components/customers/contacts-section';
import { CUSTOMER_STATUS_CLASSES, CUSTOMER_STATUS_LABELS, DEAL_STAGE_COLORS, DEAL_STAGE_LABELS } from '@/lib/crm';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import type { CustomerRow, TagOption, UserOption } from '@/types/crm';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [customer, users, tags] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        contacts: { orderBy: { name: 'asc' } },
        deals: { orderBy: { updatedAt: 'desc' }, include: { owner: { select: { name: true } } } },
        activities: { orderBy: { createdAt: 'desc' }, take: 30, include: { user: { select: { name: true } }, deal: { select: { title: true } } } },
        _count: { select: { deals: true, activities: true } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ]);

  if (!customer) notFound();

  const customerRow: CustomerRow = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    position: customer.position,
    status: customer.status,
    ownerId: customer.ownerId,
    ownerName: customer.owner?.name ?? null,
    tags: customer.tags,
    notes: customer.notes,
    dealsCount: customer._count.deals,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };

  const userOptions: UserOption[] = users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl }));
  const tagOptions: TagOption[] = tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  const openDeals = customer.deals.filter((d) => d.stage !== 'WON' && d.stage !== 'LOST');
  const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = customer.deals.filter((d) => d.stage === 'WON').reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/customers" />} aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
              <Badge variant="outline" className={CUSTOMER_STATUS_CLASSES[customer.status]}>
                {CUSTOMER_STATUS_LABELS[customer.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {[customer.position, customer.company].filter(Boolean).join(' • ') || 'Cliente'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ActivityComposer customerId={customer.id} deals={customer.deals.map((d) => ({ id: d.id, title: d.title }))} />
          <CustomerEditButton customer={customerRow} users={userOptions} tags={tagOptions} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem icon={<Mail className="size-4" />} label="Email" value={customer.email} />
              <InfoItem icon={<Phone className="size-4" />} label="Telefone" value={customer.phone} />
              <InfoItem icon={<Building2 className="size-4" />} label="Empresa" value={customer.company} />
              <InfoItem icon={<UserRound className="size-4" />} label="Responsável" value={customer.owner?.name} />
              <InfoItem icon={<CalendarDays className="size-4" />} label="Criado em" value={formatDate(customer.createdAt)} />
              <InfoItem icon={<CalendarDays className="size-4" />} label="Atualizado em" value={formatDate(customer.updatedAt)} />
            </div>
            {customer.tags.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </>
            )}
            {customer.notes && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-sm font-medium">Notas</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{customer.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Negócios abertos" value={String(openDeals.length)} />
              <SummaryRow label="Valor em pipeline" value={formatCurrency(pipelineValue)} />
              <SummaryRow label="Total ganho" value={formatCurrency(wonValue)} />
              <SummaryRow label="Atividades" value={String(customer._count.activities)} />
            </CardContent>
          </Card>
          <ContactsSection
            customerId={customer.id}
            contacts={customer.contacts.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, position: c.position }))}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Negócios vinculados</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.deals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum negócio vinculado.</p>
            ) : (
              <div className="divide-y">
                {customer.deals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.owner?.name ?? 'Sem responsável'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(deal.value, deal.currency)}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs text-white"
                        style={{ backgroundColor: DEAL_STAGE_COLORS[deal.stage] }}
                      >
                        {DEAL_STAGE_LABELS[deal.stage]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma interação registrada.</p>
            ) : (
              <ol className="space-y-4">
                {customer.activities.map((activity) => (
                  <li key={activity.id} className="flex gap-3">
                    <ActivityIcon type={activity.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{activity.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user?.name ?? 'Sistema'} • {formatDateTime(activity.createdAt)}
                        {activity.deal ? ` • ${activity.deal.title}` : ''}
                      </p>
                    </div>
                    {activity.completed && (
                      <Badge variant="secondary" className="h-fit">Concluída</Badge>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value || '—'}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
