'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Edit2, Trash2, Save, X, Check, Wand2, Copy, Info, MoreHorizontal, Eraser } from 'lucide-react';
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

interface TermRowProps {
    term: TranslationKey;
    projectId: string;
    baseLanguage: string;
    baseLanguageDisplay: string;
    targetLanguages: string[];
    searchQuery?: string;
}

export function TermRow({ term, projectId, baseLanguage, baseLanguageDisplay, targetLanguages, searchQuery }: TermRowProps) {
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

    const doUpdate = (data: any, onSuccessCb?: () => void) => {
        startUpdate(async () => {
            const res = await updateTermAction(projectId, term.id, data);
            if (res.success) {
                if (onSuccessCb) onSuccessCb();
            } else {
                toast.error(res.error || 'Update failed');
            }
        });
    };

    const doDelete = () => {
        startDelete(async () => {
            const res = await deleteTermAction(projectId, term.id);
            if (res.success) {
                toast.success('Term deleted');
            } else {
                toast.error(res.error || 'Delete failed');
            }
        });
    };

    const doClear = () => {
        startClear(async () => {
            const res = await clearTermTranslationsAction(projectId, term.id, baseLanguage);
            if (res.success) {
                toast.success('Term row cleared (kept key & base language)');
                setClearConfirm(false);
            } else {
                toast.error(res.error || 'Clear failed');
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
            toast.success('Term saved');
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
            toast.error("Please enter a key name or base value before translating.");
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
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Translation failed');
            }

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
                        toast.success(`Row translated: ${Object.keys(pendingRowTranslations.current).length} languages`);
                        pendingRowTranslations.current = {};
                        expectedRowLangs.current = [];
                    }
                } else {
                    doUpdate({ values: { ...formData.values, [lang]: translated } });
                }
            }
        } catch (err: any) {
            if (expectedRowLangs.current.length > 0) {
                pendingRowTranslations.current[lang] = formData.values[lang] || '';
                const allDone = expectedRowLangs.current.every(l => l in pendingRowTranslations.current);
                if (allDone) {
                    const populated = Object.entries(pendingRowTranslations.current).filter(([, v]) => v);
                    if (populated.length > 0) {
                        doUpdate({ values: Object.fromEntries(populated) });
                    }
                    toast.warning(`Row translate completed with errors for ${lang}`);
                    pendingRowTranslations.current = {};
                    expectedRowLangs.current = [];
                }
            } else {
                toast.error('Translate error: ' + err.message);
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
            toast.info('All languages already have translations.');
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
        return modifiedBy.name || modifiedBy.username || 'Unknown';
    };

    const baseValue = term.values.find(v => v.languageCode === baseLanguage)?.content;
    const lastUpdated = term.updatedAt ? new Date(term.updatedAt).toLocaleString() : '';

    if (isEditing) {
        return (
            <tr className="bg-zinc-800/50 hover:bg-zinc-800/70 transition-colors">
                <td className="p-4 align-top border-r border-zinc-800 bg-zinc-900 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <div className="flex gap-1">
                        <Button
                            variant="ghost" size="icon"
                            onClick={handleSave}
                            disabled={isPendingUpdate}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                            title="Save"
                        >
                            <Check className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => { setIsEditing(false); setFocusLang(null); }}
                            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </td>
                <td className="p-4 align-top border-r border-zinc-800 bg-zinc-900 sticky left-[100px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <Input
                        value={formData.stringName}
                        onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                        className="bg-zinc-900 border-zinc-700 text-white h-auto py-2 w-full"
                    />
                </td>
                <td className="p-4 align-top border-r border-zinc-800 bg-zinc-900 sticky left-[300px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <Textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                        className="bg-zinc-900 border-zinc-700 text-zinc-400 min-h-[4rem] w-full"
                    />
                </td>
                <td className="p-4 align-top relative group/base">
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
                        title="Copy to all (Overwrite)"
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
                            title="AI Translate"
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
            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 align-top border-r border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800 transition-colors sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[100px] min-w-[100px]">
                {deleteConfirm ? (
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <p className="text-xs text-red-400">Type <span className="font-mono font-bold">{term.stringName}</span> to confirm:</p>
                        <Input
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="bg-zinc-900 border-red-700 text-white h-7 text-xs"
                            autoFocus
                            placeholder="Type key name..."
                        />
                        <div className="flex gap-1">
                            <Button
                                variant="destructive" size="sm"
                                onClick={doDelete}
                                disabled={deleteInput !== term.stringName || isPendingDelete}
                                className="h-6 text-xs flex-1"
                            >
                                {isPendingDelete ? '...' : 'Delete'}
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                                className="h-6 text-xs text-zinc-400"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : clearConfirm ? (
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <p className="text-xs text-amber-400">Clear row?</p>
                        <div className="flex gap-1 mt-1">
                            <Button
                                variant="outline" size="sm"
                                onClick={doClear}
                                disabled={isPendingClear}
                                className="h-6 text-xs flex-1 bg-amber-900/20 text-amber-400 border-amber-800 hover:bg-amber-900/50 hover:text-amber-300"
                            >
                                {isPendingClear ? '...' : 'Clear Row'}
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setClearConfirm(false)}
                                className="h-6 text-xs text-zinc-400"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-1 opacity-100 transition-opacity">
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => enterEditMode()}
                            className="text-zinc-300 hover:text-zinc-200 hover:bg-white/10"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setConfirmTranslate({ type: 'row' })}
                            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                            title="Translate Row"
                        >
                            <Wand2 className="w-4 h-4 text-emerald-400" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost" size="icon"
                                    className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                                    title="More actions"
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
                                    Clear Row
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="hover:bg-red-900/50 text-red-400 focus:bg-red-900/50 focus:text-red-300 cursor-pointer"
                                    onClick={() => setDeleteConfirm(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Term
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </td>
            <td className={cn("whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 max-w-xs break-all truncate align-top border-r border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800 transition-colors sticky left-[100px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[200px] min-w-[200px]", isMatch(term.stringName) && "bg-emerald-500/10 group-hover:bg-emerald-500/20")}>
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
            <td className={cn("px-3 py-4 text-sm text-zinc-400 max-w-xs truncate align-top border-r border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800 transition-colors sticky left-[300px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[200px] min-w-[200px]", isMatch(term.remarks) && "bg-emerald-500/10 group-hover:bg-emerald-500/20")}>
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
                                ) : <span className="text-zinc-600 italic">No remarks</span>}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs whitespace-pre-wrap">{term.remarks || "No remarks"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </td>
            <td
                className={cn("whitespace-pre-wrap px-3 py-4 text-sm text-zinc-300 max-w-xs align-top cursor-pointer hover:bg-zinc-700/30 transition-colors", isMatch(baseValue) && "bg-emerald-500/10 hover:bg-emerald-500/20")}
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
                                ) : <span className="text-zinc-600 italic">Empty</span>}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {getModifiedByDisplay(term.values.find(v => v.languageCode === baseLanguage)?.lastModifiedBy) ? (
                                <p>Updated by {getModifiedByDisplay(term.values.find(v => v.languageCode === baseLanguage)?.lastModifiedBy)}</p>
                            ) : (
                                <p>No audit info</p>
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
                                        ) : <span className="text-zinc-600 italic">Empty</span>}
                                    </div>
                                </TooltipTrigger>
                                {modBy && (
                                    <TooltipContent>
                                        <p>Updated by {modBy}</p>
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
                        <DialogTitle>Translating {translating.length > 1 ? 'Row' : 'Term'}</DialogTitle>
                        <DialogDescription className="text-amber-400">
                            ⚠️ Please do not close the browser. Translating using AI... This may take a while.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-4" />
                        <p className="text-sm text-zinc-400">
                            {translating.length === 1 ? 'Translating definition into target language...' : `Translating ${translating.length} missing languages in row...`}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmTranslate} onOpenChange={(val) => { if (!val) setConfirmTranslate(null); }}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Confirm Translation</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Please confirm before proceeding.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-emerald-400 font-medium mb-2">
                            请检查 {baseLanguageDisplay} 的文案内容是否正确
                        </p>
                        <p className="text-sm text-zinc-400">
                            Please review the {baseLanguageDisplay} text content before translating to ensure accuracy.
                        </p>
                    </div>
                    {/* <DialogFooter> is normally flex row, let's keep it standard */}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setConfirmTranslate(null)} className="text-zinc-400">Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => {
                            if (confirmTranslate?.type === 'row') {
                                handleTranslateRow();
                            } else if (confirmTranslate?.type === 'cell' && confirmTranslate.lang) {
                                handleTranslate(confirmTranslate.lang);
                            }
                            setConfirmTranslate(null);
                        }}>Confirm Translate</Button>
                    </div>
                </DialogContent>
            </Dialog>

        </tr>
    );
}
