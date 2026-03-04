'use client';

import Link from 'next/link';
import { UserNav } from '@/components/UserNav';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/LogoIcon';

export function SiteHeader() {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login' || pathname === '/register';

    if (isLoginPage) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
            <div className="container flex h-14 items-center mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
                <div className="mr-4 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <LogoIcon className="w-7 h-7" />
                        <span className="hidden font-bold sm:inline-block bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent text-xl">
                            NanoLoc
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link
                            href="/"
                            className={cn(
                                "transition-colors hover:text-foreground/80",
                                pathname === "/" ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            Projects
                        </Link>
                    </nav>
                </div>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        {/* Search or other global items could go here */}
                    </div>
                    <UserNav showName />
                </div>
            </div>
        </header>
    );
}
