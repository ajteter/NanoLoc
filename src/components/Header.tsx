'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LogoIcon } from '@/components/LogoIcon';

export function Header() {
    return (
        <header className="bg-zinc-900 border-b border-zinc-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/projects" className="flex items-center space-x-2 flex-shrink-0">
                            <LogoIcon className="w-7 h-7" />
                            <span className="text-xl font-bold text-zinc-50 tracking-tight">
                                NanoLoc
                            </span>
                        </Link>
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link
                                    href="/projects"
                                    className="bg-zinc-800 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    Projects
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
