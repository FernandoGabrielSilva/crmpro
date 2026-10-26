'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';

export function SalesLineChart({ data }: { data: { month: string; vendas: number; negocios: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={70} />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Vendas']}
          contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)' }}
        />
        <Line type="monotone" dataKey="vendas" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StageBarChart({ data }: { data: { stage: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} width={30} />
        <Tooltip
          formatter={(value) => [Number(value ?? 0), 'Negócios']}
          contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)' }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="var(--primary)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LostReasonChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#64748b'];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${Number(value ?? 0)} negócio(s)`, 'Perdas']}
          contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
