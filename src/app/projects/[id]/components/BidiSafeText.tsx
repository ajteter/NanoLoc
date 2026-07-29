'use client';

import Highlighter from 'react-highlight-words';
import { cn } from '@/lib/utils';
import { isRtlLanguage } from '@/lib/language-utils';
import { isPlaceholderSegment, splitPlaceholderSegments } from '@/lib/placeholder-utils';

interface BidiSafeTextProps {
    text: string;
    languageCode: string;
    searchQuery?: string;
    className?: string;
}

const HIGHLIGHT_CLASS_NAME = 'bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5';

export function BidiSafeText({ text, languageCode, searchQuery, className }: BidiSafeTextProps) {
    const isRtl = isRtlLanguage(languageCode);
    const segments = splitPlaceholderSegments(text);

    return (
        <span
            dir={isRtl ? 'rtl' : 'ltr'}
            className={cn('block whitespace-pre-wrap', isRtl ? 'text-right' : 'text-left', className)}
        >
            {segments.map((segment, index) => {
                const content = searchQuery ? (
                    <Highlighter
                        searchWords={[searchQuery]}
                        autoEscape
                        textToHighlight={segment}
                        highlightClassName={HIGHLIGHT_CLASS_NAME}
                    />
                ) : segment;

                if (isPlaceholderSegment(segment)) {
                    return (
                        <bdi key={`${index}-${segment}`} dir="ltr">
                            {content}
                        </bdi>
                    );
                }

                return <span key={`${index}-${segment}`}>{content}</span>;
            })}
        </span>
    );
}
