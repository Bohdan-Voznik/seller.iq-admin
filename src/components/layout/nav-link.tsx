'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors',
        active
          ? 'bg-brand text-brand-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent',
      )}
    >
      <span className={cn('flex shrink-0 [&>svg]:size-[17px]', active ? 'opacity-100' : 'opacity-60')}>
        {icon}
      </span>
      {children}
    </Link>
  );
}
