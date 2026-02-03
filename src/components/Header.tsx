'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function Header() {
    return (
        <header className="bg-gray-900 border-b border-gray-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/projects" className="flex-shrink-0">
                            <span className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                                NanoLoc
                            </span>
                        </Link>
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link
                                    href="/projects"
                                    className="bg-gray-800 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
                                >
                                    Projects
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
