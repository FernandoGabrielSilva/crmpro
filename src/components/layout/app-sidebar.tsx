'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { navItems } from '@/lib/nav';

export function AppSidebar({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.manageOnly || canManage);

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-xl font-bold">CRM Pro</h2>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-2', isActive && 'font-semibold')}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
