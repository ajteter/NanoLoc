'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';

import { Session } from 'next-auth';
import { I18nProvider } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/dictionaries';

export default function Providers({
    children,
    session,
    locale,
}: {
    children: React.ReactNode;
    session?: Session | null;
    locale: Locale;
}) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <SessionProvider session={session}>
            <I18nProvider initialLocale={locale}>
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            </I18nProvider>
        </SessionProvider>
    );
}
