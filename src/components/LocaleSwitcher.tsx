'use client';

import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { locales, type Locale } from '@/lib/i18n/dictionaries';
import { useI18n } from '@/lib/i18n/client';

export function LocaleSwitcher() {
    const router = useRouter();
    const { locale, setLocale, t } = useI18n();

    const handleLocaleChange = (nextLocale: Locale) => {
        setLocale(nextLocale);
        router.refresh();
    };

    return (
        <label className="flex items-center gap-2 text-sm text-zinc-400">
            <Languages className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t('locale.label')}</span>
            <select
                aria-label={t('locale.label')}
                value={locale}
                onChange={(event) => handleLocaleChange(event.target.value as Locale)}
                className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none transition-colors hover:border-zinc-500 focus:border-zinc-400"
            >
                {locales.map((item) => (
                    <option key={item} value={item}>
                        {t(`locale.${item}`)}
                    </option>
                ))}
            </select>
        </label>
    );
}
