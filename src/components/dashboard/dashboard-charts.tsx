'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import { DEAL_STAGES } from '@/lib/crm';

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
};

export function RevenueAreaChart({ data }: { data: { month: string; vendas: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={64} />
        <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Vendas']} contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="vendas" stroke="var(--primary)" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PipelineDonut({ data }: { data: { stage: string; label: string; total: number; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const colors = Object.fromEntries(DEAL_STAGES.map((stage) => [stage.value, stage.color]));
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={colors[entry.stage] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [`${Number(value ?? 0)} negócio(s)`, item?.payload?.label]}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">negócios</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((item) => (
          <div key={item.stage} className="flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: colors[item.stage] ?? '#94a3b8' }} />
            <span className="flex-1 truncate text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
