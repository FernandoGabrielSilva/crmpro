'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { CommandPalette } from '@/components/layout/command-palette';
import { navItems } from '@/lib/nav';
import { canManage } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/crm';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

export function AppHeader({ user }: { user: { name: string; email: string; role: string; avatarUrl: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const manage = canManage(user.role);
  const items = navItems.filter((item) => !item.manageOnly || manage);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}>
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Olá, {user.name.split(' ')[0]}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:flex">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar size="sm">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{user.name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="size-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="size-4" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: '/login' })}>
                  <LogOut className="size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b p-5">
            <SheetTitle>CRM Pro</SheetTitle>
            <SheetDescription className="truncate">{user.name}</SheetDescription>
          </SheetHeader>
          <nav className="flex-1 space-y-1 p-3">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
                    isActive && 'bg-muted font-semibold'
                  )}
                >
                  <Icon className="size-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t p-3">
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} canManage={manage} />
    </>
  );
}
