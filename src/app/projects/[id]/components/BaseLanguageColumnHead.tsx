'use client';

import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useBaseLanguagePin } from './BaseLanguagePinContext';
import { BASE_LANGUAGE_STICKY_CLASS } from './stickyColumnClasses';

interface BaseLanguageColumnHeadProps {
    displayStr: string;
}

export function BaseLanguageColumnHead({ displayStr }: BaseLanguageColumnHeadProps) {
    const { isBaseLanguagePinned, toggleBaseLanguagePin } = useBaseLanguagePin();
    const Icon = isBaseLanguagePinned ? PinOff : Pin;

    return (
        <TableHead
            className={cn(
                'text-zinc-300 w-64 min-w-[16rem]',
                isBaseLanguagePinned && BASE_LANGUAGE_STICKY_CLASS.replace('z-20', 'z-30')
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="truncate" title={displayStr}>{displayStr}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-pressed={isBaseLanguagePinned}
                    onClick={toggleBaseLanguagePin}
                    className="h-7 w-7 shrink-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    title={isBaseLanguagePinned ? 'Unpin base language column' : 'Pin base language column'}
                >
                    <Icon className="h-3.5 w-3.5" />
                </Button>
            </div>
        </TableHead>
    );
}
