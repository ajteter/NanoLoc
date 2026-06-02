'use client';

import { Pin } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface BaseLanguageColumnHeadProps {
    displayStr: string;
    isPinned: boolean;
}

export function BaseLanguageColumnHead({ displayStr, isPinned }: BaseLanguageColumnHeadProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const togglePinned = () => {
        const params = new URLSearchParams(searchParams);

        if (isPinned) {
            params.delete('pinBase');
        } else {
            params.set('pinBase', '1');
        }

        router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    };

    return (
        <TableHead
            className={cn(
                "text-zinc-300 w-64 min-w-[16rem]",
                isPinned && "sticky left-[500px] z-20 bg-zinc-900 border-r border-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
            )}
        >
            <div className="flex items-center gap-2">
                <span className="truncate" title={displayStr}>
                    {displayStr}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePinned}
                    className={cn(
                        "h-6 w-6 transition-colors",
                        isPinned
                            ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                    )}
                    title={isPinned ? 'Unpin base language column' : 'Pin base language column'}
                    aria-pressed={isPinned}
                >
                    <Pin className="h-3.5 w-3.5" />
                </Button>
            </div>
        </TableHead>
    );
}
