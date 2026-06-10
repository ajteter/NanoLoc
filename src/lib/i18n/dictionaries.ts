export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';
export const localeCookieName = 'nanoloc:locale';

const en = {
    'common.activityLog': 'Activity Log',
    'common.createProject': 'Create Project',
    'common.newProject': 'New Project',
    'common.noDescription': 'No description',
    'common.profileSettings': 'Profile Settings',
    'common.projects': 'Projects',
    'common.signOut': 'Sign out',
    'common.updated': 'Updated',
    'common.never': 'Never',
    'locale.label': 'Language',
    'locale.en': 'English',
    'locale.zh-CN': '简体中文',
    'projects.emptyTitle': 'No projects found',
    'projects.emptySearch': 'Try adjusting your search query.',
    'projects.emptyCreate': 'Get started by creating a new project.',
};

export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const zhCN: Dictionary = {
    'common.activityLog': '活动日志',
    'common.createProject': '创建项目',
    'common.newProject': '新建项目',
    'common.noDescription': '暂无描述',
    'common.profileSettings': '个人设置',
    'common.projects': '项目',
    'common.signOut': '退出登录',
    'common.updated': '更新于',
    'common.never': '从未',
    'locale.label': '语言',
    'locale.en': 'English',
    'locale.zh-CN': '简体中文',
    'projects.emptyTitle': '未找到项目',
    'projects.emptySearch': '请尝试调整搜索条件。',
    'projects.emptyCreate': '创建一个新项目开始使用。',
};

export const dictionaries: Record<Locale, Dictionary> = {
    en,
    'zh-CN': zhCN,
};

export function isLocale(value: string | undefined | null): value is Locale {
    return locales.some((locale) => locale === value);
}

export function resolveLocale(value: string | undefined | null): Locale {
    if (isLocale(value)) return value;
    if (value?.toLowerCase().startsWith('zh')) return 'zh-CN';
    return defaultLocale;
}

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function translate(locale: Locale, key: TranslationKey): string {
    return getDictionary(locale)[key] ?? dictionaries[defaultLocale][key];
}
