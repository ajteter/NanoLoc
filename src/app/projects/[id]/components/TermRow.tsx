'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Edit2, Trash2, X, Check, Wand2, Copy, MoreHorizontal, Eraser } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Highlighter from 'react-highlight-words';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { TranslationKey } from '@/types';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateTermAction, deleteTermAction, clearTermTranslationsAction } from '@/lib/actions/term.actions';
import { cn } from '@/lib/utils';
import { useBaseLanguagePin } from './BaseLanguagePinContext';
import {
    ACTIONS_COLUMN_WIDTH_CLASS,
    ACTIONS_STICKY_CLASS,
    BASE_LANGUAGE_STICKY_CLASS,
    KEY_COLUMN_WIDTH_CLASS,
    KEY_STICKY_CLASS,
    REMARKS_COLUMN_WIDTH_CLASS,
    REMARKS_STICKY_CLASS,
    STICKY_SEARCH_MATCH_CLASS,
} from './stickyColumnClasses';
import { TermScreenshotCell } from './TermScreenshotCell';
import { useI18n } from '@/lib/i18n/client';
import { getLocalizedApiError, readApiErrorBody } from '@/lib/api/errors';
import type { TranslationKey as I18nKey } from '@/lib/i18n/dictionaries';

interface TermRowProps {
    term: TranslationKey;
    projectId: string;
    baseLanguage: string;
    baseLanguageDisplay: string;
    targetLanguages: string[];
    searchQuery?: string;
}

type TermUpdateInput = {
    stringName?: string;
    remarks?: string | null;
    values?: Record<string, string>;
};

export function TermRow({ term, projectId, baseLanguage, baseLanguageDisplay, targetLanguages, searchQuery }: TermRowProps) {
    const { t } = useI18n();
    const { isBaseLanguagePinned } = useBaseLanguagePin();
    const [isEditing, setIsEditing] = useState(false);
    const [focusLang, setFocusLang] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [clearConfirm, setClearConfirm] = useState(false);
    const [confirmTranslate, setConfirmTranslate] = useState<{ type: 'row' | 'cell', lang?: string } | null>(null);

    const [isPendingUpdate, startUpdate] = useTransition();
    const [isPendingDelete, startDelete] = useTransition();
    const [isPendingClear, startClear] = useTransition();

    const isMatch = (text?: string | null) => {
        if (!searchQuery || !text) return false;
        return text.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const formatMessage = (key: I18nKey, values: Record<string, string | number>) => {
        let message = t(key);
        for (const [name, value] of Object.entries(values)) {
            message = message.replace(`{${name}}`, String(value));
        }
        return message;
    };

    const [formData, setFormData] = useState({
        stringName: term.stringName,
        remarks: term.remarks || '',
        values: term.values.reduce((acc, v) => ({ ...acc, [v.languageCode]: v.content || '' }), {} as Record<string, string>),
    });
    const [translating, setTranslating] = useState<string[]>([]);

    // Track pending row translations for batch save
    const pendingRowTranslations = useRef<Record<string, string>>({});
    const expectedRowLangs = useRef<string[]>([]);

    // Reset form data when term changes (e.g. after save/refetch)
    useEffect(() => {
        if (!isEditing) {
            setFormData({
                stringName: term.stringName,
                remarks: term.remarks || '',
                values: term.values.reduce((acc, v) => ({ ...acc, [v.languageCode]: v.content || '' }), {} as Record<string, string>),
            });
        }
    }, [term, isEditing]);

    const doUpdate = (data: TermUpdateInput, onSuccessCb?: () => void) => {
        startUpdate(async () => {
            const res = await updateTermAction(projectId, term.id, data);
            if (res.success) {
                if (onSuccessCb) onSuccessCb();
            } else {
                toast.error(getLocalizedApiError(res, t, t('term.updateFailed')));
            }
        });
    };

    const doDelete = () => {
        startDelete(async () => {
            const res = await deleteTermAction(projectId, term.id);
            if (res.success) {
                toast.success(t('term.deleted'));
            } else {
                toast.error(getLocalizedApiError(res, t, t('term.deleteFailed')));
            }
        });
    };

    const doClear = () => {
        startClear(async () => {
            const res = await clearTermTranslationsAction(projectId, term.id, baseLanguage);
            if (res.success) {
                toast.success(t('term.clearSuccess'));
                setClearConfirm(false);
            } else {
                toast.error(getLocalizedApiError(res, t, t('term.clearFailed')));
            }
        });
    };

    const handleSave = () => {
        doUpdate({
            stringName: formData.stringName,
            remarks: formData.remarks,
            values: formData.values
        }, () => {
            setIsEditing(false);
            setFocusLang(null);
            toast.success(t('term.saved'));
        });
    };

    const handleValueChange = (lang: string, val: string) => {
        setFormData(prev => ({
            ...prev,
            values: { ...prev.values, [lang]: val }
        }));
    };

    const handleTranslate = async (lang: string) => {
        const currentBaseValue = isEditing ? formData.values[baseLanguage] : term.values.find(v => v.languageCode === baseLanguage)?.content;
        const currentStringName = isEditing ? formData.stringName : term.stringName;

        if (!currentStringName && !currentBaseValue) {
            toast.error(t('term.sourceRequired'));
            return;
        }

        setTranslating(prev => [...prev, lang]);
        const sourceText = currentBaseValue || currentStringName;

        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    texts: [sourceText],
                    targetLang: lang,
                    translationKeyId: term.id,
                    keyName: currentStringName,
                    source: expectedRowLangs.current.length > 0 ? 'row' : 'single',
                })
            });
            if (!res.ok) {
                const data = await readApiErrorBody(res);
                throw new Error(getLocalizedApiError(data, t, t('term.translationFailed')));
            }

            const data = await res.json();
            if (data.translations && data.translations[0]) {
                const translated = data.translations[0];
                handleValueChange(lang, translated);

                if (isEditing) {
                    // user saves manually
                } else if (expectedRowLangs.current.length > 0) {
                    pendingRowTranslations.current[lang] = translated;
                    const allDone = expectedRowLangs.current.every(l => l in pendingRowTranslations.current);
                    if (allDone) {
                        const allValues = { ...formData.values, ...pendingRowTranslations.current };
                        doUpdate({ values: allValues });
                        toast.success(formatMessage('term.rowTranslated', { count: Object.keys(pendingRowTranslations.current).length }));
                        pendingRowTranslations.current = {};
                        expectedRowLangs.current = [];
                    }
                } else {
                    doUpdate({ values: { ...formData.values, [lang]: translated } });
                }
            }
        } catch (err: unknown) {
            if (expectedRowLangs.current.length > 0) {
                pendingRowTranslations.current[lang] = formData.values[lang] || '';
                const allDone = expectedRowLangs.current.every(l => l in pendingRowTranslations.current);
                if (allDone) {
                    const populated = Object.entries(pendingRowTranslations.current).filter(([, v]) => v);
                    if (populated.length > 0) {
                        doUpdate({ values: Object.fromEntries(populated) });
                    }
                    toast.warning(formatMessage('term.rowTranslateError', { language: lang }));
                    pendingRowTranslations.current = {};
                    expectedRowLangs.current = [];
                }
            } else {
                const message = err instanceof Error ? err.message : t('common.unknown');
                toast.error(formatMessage('term.translateError', { message }));
            }
        } finally {
            setTranslating(prev => prev.filter(l => l !== lang));
        }
    };

    const handleTranslateRow = () => {
        const langsToTranslate = targetLanguages.filter(lang => {
            const val = term.values.find(v => v.languageCode === lang)?.content;
            return !val || !val.trim();
        });

        if (langsToTranslate.length === 0) {
            toast.info(t('term.allTranslated'));
            return;
        }

        // Setup batch tracking
        pendingRowTranslations.current = {};
        expectedRowLangs.current = [...langsToTranslate];

        langsToTranslate.forEach(lang => handleTranslate(lang));
    };

    const handleCopyToAll = () => {
        const base = formData.values[baseLanguage];
        if (!base) return;

        const newValues = { ...formData.values };
        targetLanguages.forEach(lang => {
            newValues[lang] = base;
        });
        setFormData(p => ({ ...p, values: newValues }));
    };

    const enterEditMode = (lang?: string) => {
        setFocusLang(lang || null);
        setIsEditing(true);
    };

    const getModifiedByDisplay = (modifiedBy?: { name: string | null; username?: string } | null) => {
        if (!modifiedBy) return null;
        return modifiedBy.name || modifiedBy.username || t('common.unknown');
    };

    const baseValue = term.values.find(v => v.languageCode === baseLanguage)?.content;
    const baseValueMatchesSearch = isMatch(baseValue);
    const baseLanguageCellClassName = cn(
        "whitespace-pre-wrap px-3 py-4 text-sm text-zinc-300 max-w-xs w-64 min-w-[16rem] align-top cursor-pointer transition-colors",
        isBaseLanguagePinned ? [BASE_LANGUAGE_STICKY_CLASS, "hover:bg-zinc-800"] : "hover:bg-zinc-700/30",
        baseValueMatchesSearch && (isBaseLanguagePinned ? STICKY_SEARCH_MATCH_CLASS : "bg-emerald-500/10 hover:bg-emerald-500/20")
    );
    const lastUpdated = term.updatedAt ? new Date(term.updatedAt).toLocaleString() : '';

    if (isEditing) {
        return (
            <tr className="bg-zinc-800/50 hover:bg-zinc-800/70 transition-colors">
                <td className={cn("p-4 align-top", ACTIONS_COLUMN_WIDTH_CLASS, ACTIONS_STICKY_CLASS)}>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost" size="icon"
                            onClick={handleSave}
                            disabled={isPendingUpdate}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                            title={t('term.save')}
                        >
                            <Check className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => { setIsEditing(false); setFocusLang(null); }}
                            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700"
                            title={t('common.cancel')}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </td>
                <td className={cn("p-4 align-top", KEY_COLUMN_WIDTH_CLASS, KEY_STICKY_CLASS)}>
                    <Input
                        value={formData.stringName}
                        onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                        className="bg-zinc-900 border-zinc-700 text-white h-auto py-2 w-full"
                    />
                </td>
                <td className={cn("p-4 align-top", REMARKS_COLUMN_WIDTH_CLASS, REMARKS_STICKY_CLASS)}>
                    <Textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                        className="bg-zinc-900 border-zinc-700 text-zinc-400 min-h-[4rem] w-full"
                    />
                </td>
                <TermScreenshotCell
                    projectId={projectId}
                    termId={term.id}
                    termName={formData.stringName || term.stringName}
                    hasScreenshot={Boolean(term.screenshotPath)}
                    screenshotUpdatedAt={term.screenshotUpdatedAt}
                />
                <td className={cn("p-4 align-top group/base w-64 min-w-[16rem]", isBaseLanguagePinned ? BASE_LANGUAGE_STICKY_CLASS : "relative")}>
                    <Textarea
                        value={formData.values[baseLanguage] || ''}
                        onChange={(e) => handleValueChange(baseLanguage, e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white min-h-[4rem]"
                        autoFocus={focusLang === baseLanguage}
                    />
                    <Button
                        variant="ghost" size="icon"
                        onClick={handleCopyToAll}
                        className="absolute bottom-5 right-5 h-6 w-6 text-zinc-400 hover:text-white opacity-0 group-hover/base:opacity-100 transition-opacity"
                        title={t('term.copyToAll')}
                        type="button"
                    >
                        <Copy className="w-3 h-3" />
                    </Button>
                </td>
                {targetLanguages.map(lang => (
                    <td key={lang} className="p-4 align-top relative group/cell">
                        <Textarea
                            value={formData.values[lang] || ''}
                            onChange={(e) => handleValueChange(lang, e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-white min-h-[4rem]"
                            autoFocus={focusLang === lang}
                        />
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => handleTranslate(lang)}
                            disabled={translating.includes(lang)}
                            className="absolute bottom-5 right-5 h-6 w-6 text-zinc-300 hover:text-zinc-200 opacity-0 group-hover/cell:opacity-100 transition-opacity disabled:opacity-50"
                            title={t('term.aiTranslate')}
                            type="button"
                        >
                            <Wand2 className={cn("w-3 h-3 text-emerald-400", translating.includes(lang) && "animate-pulse")} />
                        </Button>
                    </td>
                ))}
            </tr>
        );
    }

    return (
        <tr className="hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800 last:border-0 relative">
            <td className={cn("relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 align-top group-hover:bg-zinc-800 transition-colors", ACTIONS_COLUMN_WIDTH_CLASS, ACTIONS_STICKY_CLASS)}>
                {deleteConfirm ? (
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <p className="text-xs text-red-400">
                            {t('term.deleteConfirmPrompt').split('{name}')[0]}
                            <span className="font-mono font-bold">{term.stringName}</span>
                            {t('term.deleteConfirmPrompt').split('{name}')[1] || ''}
                        </p>
                        <Input
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="bg-zinc-900 border-red-700 text-white h-7 text-xs"
                            autoFocus
                            placeholder={t('term.deletePlaceholder')}
                        />
                        <div className="flex gap-1">
                            <Button
                                variant="destructive" size="sm"
                                onClick={doDelete}
                                disabled={deleteInput !== term.stringName || isPendingDelete}
                                className="h-6 text-xs flex-1"
                            >
                                {isPendingDelete ? '...' : t('common.delete')}
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                                className="h-6 text-xs text-zinc-400"
                            >
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </div>
                ) : clearConfirm ? (
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <p className="text-xs text-amber-400">{t('term.clearConfirm')}</p>
                        <div className="flex gap-1 mt-1">
                            <Button
                                variant="outline" size="sm"
                                onClick={doClear}
                                disabled={isPendingClear}
                                className="h-6 text-xs flex-1 bg-amber-900/20 text-amber-400 border-amber-800 hover:bg-amber-900/50 hover:text-amber-300"
                            >
                                {isPendingClear ? '...' : t('term.clearRow')}
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setClearConfirm(false)}
                                className="h-6 text-xs text-zinc-400"
                            >
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-1 opacity-100 transition-opacity">
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => enterEditMode()}
                            className="text-zinc-300 hover:text-zinc-200 hover:bg-white/10"
                            title={t('term.edit')}
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setConfirmTranslate({ type: 'row' })}
                            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                            title={t('term.translateRow')}
                        >
                            <Wand2 className="w-4 h-4 text-emerald-400" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost" size="icon"
                                    className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                                    title={t('term.moreActions')}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                <DropdownMenuItem
                                    className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white cursor-pointer"
                                    onClick={() => setClearConfirm(true)}
                                >
                                    <Eraser className="w-4 h-4 mr-2" />
                                    {t('term.clearRow')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="hover:bg-red-900/50 text-red-400 focus:bg-red-900/50 focus:text-red-300 cursor-pointer"
                                    onClick={() => setDeleteConfirm(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('term.deleteTerm')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </td>
            <td className={cn("whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 break-all truncate align-top group-hover:bg-zinc-800 transition-colors", KEY_COLUMN_WIDTH_CLASS, KEY_STICKY_CLASS, isMatch(term.stringName) && STICKY_SEARCH_MATCH_CLASS)}>
                <div className="truncate" title={term.stringName}>
                    {searchQuery ? (
                        <Highlighter
                            searchWords={[searchQuery]}
                            autoEscape={true}
                            textToHighlight={term.stringName}
                            highlightClassName="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5"
                        />
                    ) : term.stringName}
                </div>
                <div className="text-xs text-zinc-600 mt-1 font-mono">{lastUpdated}</div>
            </td>
            <td className={cn("px-3 py-4 text-sm text-zinc-400 truncate align-top group-hover:bg-zinc-800 transition-colors", REMARKS_COLUMN_WIDTH_CLASS, REMARKS_STICKY_CLASS, isMatch(term.remarks) && STICKY_SEARCH_MATCH_CLASS)}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="truncate cursor-help">
                                {term.remarks ? (
                                    searchQuery ? (
                                        <Highlighter
                                            searchWords={[searchQuery]}
                                            autoEscape={true}
                                            textToHighlight={term.remarks}
                                            highlightClassName="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5"
                                        />
                                    ) : term.remarks
                                ) : <span className="text-zinc-600 italic">{t('term.noRemarks')}</span>}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs whitespace-pre-wrap">{term.remarks || t('term.noRemarks')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </td>
            <TermScreenshotCell
                projectId={projectId}
                termId={term.id}
                termName={term.stringName}
                hasScreenshot={Boolean(term.screenshotPath)}
                screenshotUpdatedAt={term.screenshotUpdatedAt}
            />
            <td
                className={baseLanguageCellClassName}
                onClick={() => enterEditMode(baseLanguage)}
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-help decoration-dashed decoration-zinc-600 underline-offset-4">
                                {baseValue ? (
                                    searchQuery ? (
                                        <Highlighter
                                            searchWords={[searchQuery]}
                                            autoEscape={true}
                                            textToHighlight={baseValue}
                                            highlightClassName="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5"
                                        />
                                    ) : baseValue
                                ) : <span className="text-zinc-600 italic">{t('term.emptyValue')}</span>}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {getModifiedByDisplay(term.values.find(v => v.languageCode === baseLanguage)?.lastModifiedBy) ? (
                                <p>{formatMessage('term.updatedBy', { name: getModifiedByDisplay(term.values.find(v => v.languageCode === baseLanguage)?.lastModifiedBy) || '' })}</p>
                            ) : (
                                <p>{t('term.noAuditInfo')}</p>
                            )}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </td>
            {targetLanguages.map((lang: string) => {
                const valObj = term.values.find(v => v.languageCode === lang);
                const val = valObj?.content;
                const modBy = getModifiedByDisplay(valObj?.lastModifiedBy);
                return (
                    <td
                        key={lang}
                        className={cn("whitespace-pre-wrap px-3 py-4 text-sm text-zinc-300 max-w-xs align-top cursor-pointer hover:bg-zinc-700/30 transition-colors", isMatch(val) && "bg-emerald-500/10 hover:bg-emerald-500/20")}
                        onClick={() => enterEditMode(lang)}
                    >
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                        {val ? (
                                            searchQuery ? (
                                                <Highlighter
                                                    searchWords={[searchQuery]}
                                                    autoEscape={true}
                                                    textToHighlight={val}
                                                    highlightClassName="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5"
                                                />
                                            ) : val
                                        ) : <span className="text-zinc-600 italic">{t('term.emptyValue')}</span>}
                                    </div>
                                </TooltipTrigger>
                                {modBy && (
                                    <TooltipContent>
                                        <p>{formatMessage('term.updatedBy', { name: modBy })}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </td>
                );
            })}

            <Dialog open={translating.length > 0} onOpenChange={() => { }}>
                <DialogContent showCloseButton={false} className="bg-zinc-900 border-zinc-800 text-white [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {formatMessage('term.translatingTitle', {
                                target: translating.length > 1 ? t('term.rowLabel') : t('term.termLabel'),
                            })}
                        </DialogTitle>
                        <DialogDescription className="text-amber-400">
                            {t('term.translatingWarning')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-4" />
                        <p className="text-sm text-zinc-400">
                            {translating.length === 1
                                ? t('term.translatingSingle')
                                : formatMessage('term.translatingMultiple', { count: translating.length })}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmTranslate} onOpenChange={(val) => { if (!val) setConfirmTranslate(null); }}>
                <DialogContent closeLabel={t('common.close')} className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>{t('term.confirmTranslationTitle')}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {t('term.confirmTranslationDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-emerald-400 font-medium mb-2">
                            {t('batch.reviewTitle').replace('{language}', baseLanguageDisplay)}
                        </p>
                        <p className="text-sm text-zinc-400">
                            {t('batch.reviewDescription').replace('{language}', baseLanguageDisplay)}
                        </p>
                    </div>
                    {/* <DialogFooter> is normally flex row, let's keep it standard */}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setConfirmTranslate(null)} className="text-zinc-400">{t('common.cancel')}</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => {
                            if (confirmTranslate?.type === 'row') {
                                handleTranslateRow();
                            } else if (confirmTranslate?.type === 'cell' && confirmTranslate.lang) {
                                handleTranslate(confirmTranslate.lang);
                            }
                            setConfirmTranslate(null);
                        }}>{t('batch.confirmButton')}</Button>
                    </div>
                </DialogContent>
            </Dialog>

        </tr>
    );
}
