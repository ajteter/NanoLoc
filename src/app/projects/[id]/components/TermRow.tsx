'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2, Save, X, Check, Wand2, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TermRowProps {
    term: {
        id: string;
        stringName: string;
        remarks: string | null;
        values: { languageCode: string; content: string }[];
        updatedAt: string;
    };
    projectId: string;
    baseLanguage: string;
    targetLanguages: string[];
}

export function TermRow({ term, projectId, baseLanguage, targetLanguages }: TermRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        stringName: term.stringName,
        remarks: term.remarks || '',
        values: term.values.reduce((acc, v) => ({ ...acc, [v.languageCode]: v.content }), {} as Record<string, string>),
    });
    const [translating, setTranslating] = useState<string | null>(null);

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
            }
        },
        onError: (err) => {
            alert('Translate error: ' + err.message);
        },
        onSettled: () => {
            setTranslating(null);
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
        if (!formData.stringName && !formData.values[baseLanguage]) {
            alert("Please enter a key name or base value request translation.");
            return;
        }
        setTranslating(lang);
        const sourceText = formData.values[baseLanguage] || formData.stringName;
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
                <td className="p-4 align-top border-r border-gray-800 bg-gray-900 sticky left-0 z-10">
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
                <td className="p-4 align-top">
                    <Input
                        value={formData.stringName}
                        onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                        className="bg-gray-900 border-gray-700 text-white h-auto py-2"
                    />
                </td>
                <td className="p-4 align-top">
                    <Textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                        className="bg-gray-900 border-gray-700 text-gray-400 min-h-[4rem]"
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
                            disabled={translating === lang}
                            className="absolute bottom-5 right-5 h-6 w-6 text-indigo-400 hover:text-indigo-300 opacity-0 group-hover/cell:opacity-100 transition-opacity disabled:opacity-50"
                            title="AI Translate"
                            type="button"
                        >
                            <Wand2 className={`w-3 h-3 ${translating === lang ? 'animate-pulse' : ''}`} />
                        </Button>
                    </td>
                ))}
            </tr>
        );
    }

    return (
        <tr className="hover:bg-gray-800/50 transition-colors group border-b border-gray-800 last:border-0">
            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 align-top border-r border-gray-800 bg-gray-900/50 sticky left-0 z-10">
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
            </td>
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 max-w-xs break-all truncate align-top">
                <div className="truncate" title={term.stringName}>{term.stringName}</div>
                <div className="text-xs text-gray-600 mt-1 font-mono">{lastUpdated}</div>
            </td>
            <td className="px-3 py-4 text-sm text-gray-400 max-w-xs truncate align-top">
                {term.remarks}
            </td>
            <td className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-300 max-w-xs align-top">
                {baseValue || <span className="text-gray-600 italic">Empty</span>}
            </td>
            {targetLanguages.map((lang: string) => {
                const val = term.values.find(v => v.languageCode === lang)?.content;
                return (
                    <td key={lang} className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-300 max-w-xs align-top">
                        {val || <span className="text-gray-600 italic">Empty</span>}
                    </td>
                );
            })}
        </tr>
    );
}
