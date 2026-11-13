'use client';

import type { ReactNode, UIEvent } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SynchronizedStickyTableProps {
    header: ReactNode;
    body: ReactNode;
    className?: string;
}

export function SynchronizedStickyTable({ header, body, className }: SynchronizedStickyTableProps) {
    const headerViewportRef = useRef<HTMLDivElement>(null);
    const bodyViewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const headerViewport = headerViewportRef.current;
        const bodyViewport = bodyViewportRef.current;
        if (!headerViewport || !bodyViewport) return;

        // A language selection or window resize can clamp scrollLeft without a
        // matching user scroll. Keep both viewports aligned in that case too.
        const synchronize = () => {
            const scrollLeft = Math.min(
                bodyViewport.scrollLeft,
                headerViewport.scrollWidth - headerViewport.clientWidth,
            );
            bodyViewport.scrollLeft = Math.max(0, scrollLeft);
            headerViewport.scrollLeft = bodyViewport.scrollLeft;
        };
        const observer = new ResizeObserver(synchronize);
        observer.observe(bodyViewport);
        const table = bodyViewport.querySelector('table');
        if (table) observer.observe(table);
        synchronize();

        return () => observer.disconnect();
    }, [header, body]);

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
