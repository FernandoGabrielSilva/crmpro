'use client';

import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCSV } from '@/lib/format';

export function ReportActions({ ranking }: { ranking: { name: string; won: number; total: number; count: number; conversion: number }[] }) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" /> Exportar PDF
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          downloadCSV(
            'relatorio-vendedores.csv',
            ranking.map((r) => ({
              Vendedor: r.name,
              'Ganhos (R$)': r.won,
              'Em pipeline (R$)': r.total,
              'Negócios ganhos': r.count,
              'Conversao (%)': r.conversion,
            }))
          )
        }
      >
        <Download className="size-4" /> Exportar CSV
      </Button>
    </div>
  );
}
