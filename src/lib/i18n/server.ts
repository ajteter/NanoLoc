import { cookies, headers } from 'next/headers';
import {
    localeCookieName,
    resolveLocale,
    translate,
    type Locale,
    type TranslationKey,
} from '@/lib/i18n/dictionaries';

export async function getServerLocale(): Promise<Locale> {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(localeCookieName)?.value;
    if (cookieLocale) return resolveLocale(cookieLocale);

    const headerStore = await headers();
    return resolveLocale(headerStore.get('accept-language'));
}

export async function getServerTranslator() {
    const locale = await getServerLocale();

    return {
        locale,
        t: (key: TranslationKey) => translate(locale, key),
    };
}
