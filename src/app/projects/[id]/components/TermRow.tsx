'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2, Save, X, Check, Wand2, Copy, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TranslationKey } from '@/types'; // Import from central types

interface TermRowProps {
    term: TranslationKey;
    projectId: string;
    baseLanguage: string;
    targetLanguages: string[];
    /** When false, hide edit/delete and single-term translate (view-only) */
    canEdit?: boolean;
}

export function TermRow({ term, projectId, baseLanguage, targetLanguages, canEdit = true }: TermRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        stringName: term.stringName,
        remarks: term.remarks || '',
        values: term.values.reduce((acc, v) => ({ ...acc, [v.languageCode]: v.content || '' }), {} as Record<string, string>),
    });
    const [translating, setTranslating] = useState<string[]>([]); // Array of lang codes

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/projects/${projectId}/terms/${term.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update term');
            return res.json();
        },
        onSuccess: () => {
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
        },
        onError: (err) => {
            alert('Update failed: ' + err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/terms/${term.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete term');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
        },
        onError: (err) => {
            alert('Delete failed: ' + err.message);
        }
    });

    const translateMutation = useMutation({
        mutationFn: async ({ lang, text }: { lang: string; text: string }) => {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    texts: [text],
                    targetLang: lang
                })
            });
            if (!res.ok) throw new Error('Translation failed');
            return res.json();
        },
        onSuccess: (data, variables) => {
            if (data.translations && data.translations[0]) {
                handleValueChange(variables.lang, data.translations[0]);
                // Auto-save? Not yet, user must click save.
                // Wait, if not editing (view mode), we should auto-save?
                // The current logic only updates formData. If in view mode, this does nothing persistent until "Save" is clicked... 
                // BUT wait! The row "Translate" button is in View Mode.
                // If I'm in View Mode and click Translate, it updates formData, but doesn't persist to DB automatically? 
                // Ah! The original code didn't persist either! It just updated formData.
                // But in View mode, formData IS NOT VISIBLE. `term` props are used for display in View mode (lines 277).
                // SO THE TRANSLATION WAS HAPPENING BUT NOT SHOWING UP!
                // FIX: We need to persist the translation immediately if we are in View Mode.

                if (!isEditing) {
                    // If in view mode, save immediately
                    updateMutation.mutate({
                        values: { ...formData.values, [variables.lang]: data.translations[0] }
                    });
                }
            }
        },
        onError: (err) => {
            alert('Translate error: ' + err.message);
        },
        onSettled: (data, error, variables) => {
            setTranslating(prev => prev.filter(l => l !== variables.lang));
        }
    });

    const handleSave = () => {
        updateMutation.mutate({
            stringName: formData.stringName,
            remarks: formData.remarks,
            values: formData.values
        });
    };

    const handleValueChange = (lang: string, val: string) => {
        setFormData(prev => ({
            ...prev,
            values: { ...prev.values, [lang]: val }
        }));
    };

    const handleTranslate = (lang: string) => {
        // Use term values if not in edit mode to get the latest source
        const currentBaseValue = isEditing ? formData.values[baseLanguage] : term.values.find(v => v.languageCode === baseLanguage)?.content;
        const currentStringName = isEditing ? formData.stringName : term.stringName;

        if (!currentStringName && !currentBaseValue) {
            alert("Please enter a key name or base value request translation.");
            return;
        }

        setTranslating(prev => [...prev, lang]);
        const sourceText = currentBaseValue || currentStringName;
        translateMutation.mutate({ lang, text: sourceText });
    };

    const handleCopyToAll = () => {
        const base = formData.values[baseLanguage];
        if (!base) return;

        const newValues = { ...formData.values };
        targetLanguages.forEach(lang => {
            // Overwrite all values
            newValues[lang] = base;
        });
        setFormData(p => ({ ...p, values: newValues }));
    };

    const baseValue = term.values.find(v => v.languageCode === baseLanguage)?.content;
    // Basic timestamp formatting
    const lastUpdated = term.updatedAt ? new Date(term.updatedAt).toLocaleString() : '';

    if (isEditing) {
        return (
            <tr className="bg-gray-800/50 hover:bg-gray-800/70 transition-colors">
                <td className="p-4 align-top border-r border-gray-800 bg-gray-900 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <div className="flex gap-1">
                        <Button
                            variant="ghost" size="icon"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                            title="Save"
                        >
                            <Check className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setIsEditing(false)}
                            className="text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </td>
                <td className="p-4 align-top border-r border-gray-800 bg-gray-900 sticky left-[100px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <Input
                        value={formData.stringName}
                        onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                        className="bg-gray-900 border-gray-700 text-white h-auto py-2 w-full"
                    />
                </td>
                <td className="p-4 align-top border-r border-gray-800 bg-gray-900 sticky left-[300px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <Textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                        className="bg-gray-900 border-gray-700 text-gray-400 min-h-[4rem] w-full"
                    />
                </td>
                <td className="p-4 align-top relative group/base">
                    <Textarea
                        value={formData.values[baseLanguage] || ''}
                        onChange={(e) => handleValueChange(baseLanguage, e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white min-h-[4rem]"
                    />
                    <Button
                        variant="ghost" size="icon"
                        onClick={handleCopyToAll}
                        className="absolute bottom-5 right-5 h-6 w-6 text-gray-400 hover:text-white opacity-0 group-hover/base:opacity-100 transition-opacity"
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
                            className="bg-gray-900 border-gray-700 text-white min-h-[4rem]"
                        />
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => handleTranslate(lang)}
                            disabled={translating.includes(lang)}
                            className="absolute bottom-5 right-5 h-6 w-6 text-indigo-400 hover:text-indigo-300 opacity-0 group-hover/cell:opacity-100 transition-opacity disabled:opacity-50"
                            title="AI Translate"
                            type="button"
                        >
                            <Wand2 className={`w-3 h-3 ${translating.includes(lang) ? 'animate-pulse' : ''}`} />
                        </Button>
                    </td>
                ))}
            </tr>
        );
    }

    return (
        <tr className="hover:bg-gray-800/50 transition-colors group border-b border-gray-800 last:border-0 relative">
            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 align-top border-r border-gray-800 bg-gray-900 group-hover:bg-gray-800 transition-colors sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[100px] min-w-[100px]">
                {canEdit ? (
                    <div className="flex gap-1 opacity-100 transition-opacity">
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setIsEditing(true)}
                            className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => {
                                if (confirm('Translate this row? This will translate all empty fields.')) {
                                    targetLanguages.forEach(lang => {
                                        const val = term.values.find(v => v.languageCode === lang)?.content;
                                        if (!val) handleTranslate(lang);
                                    });
                                }
                            }}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            title="Translate Row"
                        >
                            <Wand2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => {
                                if (confirm('Delete this term?')) deleteMutation.mutate();
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <span className="text-gray-500">—</span>
                )}
            </td>
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 max-w-xs break-all truncate align-top border-r border-gray-800 bg-gray-900 group-hover:bg-gray-800 transition-colors sticky left-[100px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[200px] min-w-[200px]">
                <div className="truncate" title={term.stringName}>{term.stringName}</div>
                <div className="text-xs text-gray-600 mt-1 font-mono">{lastUpdated}</div>
            </td>
            <td className="px-3 py-4 text-sm text-gray-400 max-w-xs truncate align-top border-r border-gray-800 bg-gray-900 group-hover:bg-gray-800 transition-colors sticky left-[300px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[200px] min-w-[200px]">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="truncate cursor-help">
                                {term.remarks || <span className="text-gray-600 italic">No remarks</span>}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs whitespace-pre-wrap">{term.remarks || "No remarks"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </td>
            <td className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-300 max-w-xs align-top">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-help decoration-dashed decoration-gray-600 underline-offset-4">
                                {baseValue || <span className="text-gray-600 italic">Empty</span>}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {term.values.find(v => v.languageCode === baseLanguage)?.lastModifiedBy ? (
                                <p>Updated by {term.values.find(v => v.languageCode === baseLanguage)?.lastModifiedBy?.name || term.values.find(v => v.languageCode === baseLanguage)?.lastModifiedBy?.email}</p>
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
                return (
                    <td key={lang} className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-300 max-w-xs align-top">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                        {val || <span className="text-gray-600 italic">Empty</span>}
                                    </div>
                                </TooltipTrigger>
                                {valObj?.lastModifiedBy && (
                                    <TooltipContent>
                                        <p>Updated by {valObj.lastModifiedBy.name || valObj.lastModifiedBy.email}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </td>
                );
            })}
        </tr>
    );
}
