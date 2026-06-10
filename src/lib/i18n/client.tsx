'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    defaultLocale,
    localeCookieName,
    resolveLocale,
    translate,
    type Locale,
    type TranslationKey,
} from '@/lib/i18n/dictionaries';

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
    children,
    initialLocale = defaultLocale,
}: {
    children: React.ReactNode;
    initialLocale?: Locale;
}) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLocale = (nextLocale: Locale) => {
        const resolvedLocale = resolveLocale(nextLocale);
        document.cookie = `${localeCookieName}=${resolvedLocale}; path=/; max-age=31536000; SameSite=Lax`;
        window.localStorage.setItem(localeCookieName, resolvedLocale);
        setLocaleState(resolvedLocale);
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t: (key) => translate(locale, key) }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within I18nProvider');
    }

    return context;
}
