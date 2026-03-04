'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface PaginationProps {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function PaginationControls({ total, page, limit, totalPages }: PaginationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const updatePage = (newPage: number) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            params.set('page', newPage.toString());
            router.push(`?${params.toString()}`);
        });
    };

    if (total <= 0) return null;

    return (
        <div className={`flex items-center gap-4 bg-gray-900 p-2 rounded-md border border-gray-700 shadow-sm shrink-0 ${isPending ? 'opacity-70' : ''}`}>
            <span className="text-sm text-gray-400 hidden lg:inline-block">
                {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </span>

            <div className="flex items-center gap-2">
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updatePage(1)}
                        disabled={page === 1 || isPending}
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        title="First Page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updatePage(Math.max(1, page - 1))}
                        disabled={page === 1 || isPending}
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        title="Previous Page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-2 text-gray-300 text-sm font-medium min-w-[3rem] justify-center">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updatePage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages || isPending}
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        title="Next Page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updatePage(totalPages)}
                        disabled={page === totalPages || isPending}
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        title="Last Page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
