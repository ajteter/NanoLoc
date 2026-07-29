'use client';

import type { ReactNode, UIEvent } from 'react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface SynchronizedStickyTableProps {
    header: ReactNode;
    body: ReactNode;
    className?: string;
}

export function SynchronizedStickyTable({ header, body, className }: SynchronizedStickyTableProps) {
    const headerViewportRef = useRef<HTMLDivElement>(null);
    const bodyViewportRef = useRef<HTMLDivElement>(null);

    const syncHorizontalScroll = (
        event: UIEvent<HTMLDivElement>,
        target: 'header' | 'body'
    ) => {
        const targetElement = target === 'header'
            ? headerViewportRef.current
            : bodyViewportRef.current;

        if (targetElement && targetElement.scrollLeft !== event.currentTarget.scrollLeft) {
            targetElement.scrollLeft = event.currentTarget.scrollLeft;
        }
    };

    return (
        <div className={cn('relative rounded-md border border-zinc-700 bg-zinc-900/50', className)}>
            <div
                ref={headerViewportRef}
                className="sticky top-14 z-40 overflow-x-auto rounded-t-md bg-zinc-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(event) => syncHorizontalScroll(event, 'body')}
            >
                {header}
            </div>
            <div
                ref={bodyViewportRef}
                className="overflow-x-auto rounded-b-md"
                onScroll={(event) => syncHorizontalScroll(event, 'header')}
            >
                {body}
            </div>
        </div>
    );
}
