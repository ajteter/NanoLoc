'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/client';

export default function ProjectError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useI18n();

    useEffect(() => {
        console.error('Project error:', error);
    }, [error]);

    return (
        <main className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">{t('error.projectTitle')}</h2>
                <p className="text-zinc-400 mb-6 max-w-md">
                    {error.message || t('error.projectFallback')}
                </p>
                <div className="flex gap-3">
                    <Button onClick={reset} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        {t('common.retry')}
                    </Button>
                    <Button variant="secondary" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('common.backToDashboard')}
                        </Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
