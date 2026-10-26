'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, CheckSquare, Loader2, Search, User } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { globalSearch, type SearchResult } from '@/actions/search';
import { navItems } from '@/lib/nav';
import { useDebounce } from '@/hooks/use-debounce';

const quickActions = [
  { label: 'Novo cliente', href: '/customers', icon: User },
  { label: 'Novo negócio', href: '/deals', icon: Briefcase },
  { label: 'Nova tarefa', href: '/tasks', icon: CheckSquare },
];

const typeIcons = {
  customer: User,
  deal: Briefcase,
  task: CheckSquare,
};

export function CommandPalette({ open, onOpenChange, canManage }: { open: boolean; onOpenChange: (open: boolean) => void; canManage: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 250);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery('');
      setResults([]);
      setLoading(false);
    }
    onOpenChange(next);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (debounced.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const found = await globalSearch(debounced);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const term = query.trim().toLowerCase();
  const navs = navItems.filter((item) => !item.manageOnly || canManage);
  const matchingNav = term ? navs.filter((item) => item.label.toLowerCase().includes(term)) : navs;
  const matchingActions = term ? quickActions.filter((action) => action.label.toLowerCase().includes(term)) : quickActions;

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Busca rápida"
      description="Busque clientes, negócios, tarefas ou navegue pelo sistema."
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar clientes, negócios, tarefas..." value={query} onValueChange={setQuery} />
        <CommandList>
          {matchingNav.length > 0 && (
            <CommandGroup heading="Navegação">
              {matchingNav.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.href} value={`nav-${item.href}`} onSelect={() => go(item.href)}>
                    <Icon />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {matchingActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ações rápidas">
                {matchingActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem key={action.label} value={`action-${action.label}`} onSelect={() => go(action.href)}>
                      <Icon />
                      {action.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {term.length >= 2 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={loading ? 'Buscando...' : 'Resultados'}>
                {loading && (
                  <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Buscando...
                  </div>
                )}
                {!loading &&
                  results.map((result) => {
                    const Icon = typeIcons[result.type];
                    return (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}`}
                        onSelect={() => go(result.href)}
                      >
                        <Icon />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{result.title}</span>
                          {result.subtitle && <span className="truncate text-xs text-muted-foreground">{result.subtitle}</span>}
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground capitalize">{result.type}</span>
                      </CommandItem>
                    );
                  })}
                {!loading && results.length === 0 && (
                  <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                    <Search className="size-4" /> Nenhum resultado encontrado.
                  </div>
                )}
              </CommandGroup>
            </>
          )}

          {!term && <CommandEmpty>Digite para buscar...</CommandEmpty>}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
