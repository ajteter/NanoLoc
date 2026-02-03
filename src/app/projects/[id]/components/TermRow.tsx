'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2, Save, X, Check, Wand2, Copy } from 'lucide-react';
import { useParams } from 'next/navigation';

interface TermRowProps {
    term: {
        id: string;
        stringName: string;
        remarks: string | null;
        values: { languageCode: string; content: string }[];
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
            if (!newValues[lang]) {
                newValues[lang] = base;
            }
        });
        setFormData(p => ({ ...p, values: newValues }));
    };

    const baseValue = term.values.find(v => v.languageCode === baseLanguage)?.content;

    if (isEditing) {
        return (
            <tr className="bg-gray-800/50">
                <td className="p-4 align-top">
                    <input
                        type="text"
                        value={formData.stringName}
                        onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 truncate"
                    />
                </td>
                <td className="p-4 align-top relative group/base">
                    <textarea
                        value={formData.values[baseLanguage] || ''}
                        onChange={(e) => handleValueChange(baseLanguage, e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 min-h-[4rem]"
                    />
                    <button
                        onClick={handleCopyToAll}
                        className="absolute bottom-5 right-5 p-1 bg-gray-800 rounded-md text-gray-400 hover:text-white opacity-0 group-hover/base:opacity-100 transition-opacity"
                        title="Copy to all empty"
                        type="button"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </td>
                {targetLanguages.map(lang => (
                    <td key={lang} className="p-4 align-top hidden xl:table-cell relative group/cell">
                        <textarea
                            value={formData.values[lang] || ''}
                            onChange={(e) => handleValueChange(lang, e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 min-h-[4rem]"
                        />
                        <button
                            onClick={() => handleTranslate(lang)}
                            disabled={translating === lang}
                            className="absolute bottom-5 right-5 p-1 bg-gray-800 rounded-md text-indigo-400 hover:text-indigo-300 opacity-0 group-hover/cell:opacity-100 transition-opacity disabled:opacity-50"
                            title="AI Translate"
                            type="button"
                        >
                            <Wand2 className={`w-4 h-4 ${translating === lang ? 'animate-pulse' : ''}`} />
                        </button>
                    </td>
                ))}
                <td className="p-4 align-top hidden md:table-cell">
                    <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-400 focus:ring-1 focus:ring-indigo-500 min-h-[4rem]"
                    />
                </td>
                <td className="p-4 text-right align-top">
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="text-green-400 hover:text-green-300 p-1"
                            title="Save"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-gray-400 hover:text-gray-300 p-1"
                            title="Cancel"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <tr className="hover:bg-gray-800/50 transition-colors group">
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 max-w-xs break-all truncate align-top">
                <div className="truncate" title={term.stringName}>{term.stringName}</div>
            </td>
            <td className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-300 max-w-xs align-top">
                {baseValue || <span className="text-gray-600 italic">Empty</span>}
            </td>
            {targetLanguages.map((lang: string) => {
                const val = term.values.find(v => v.languageCode === lang)?.content;
                return (
                    <td key={lang} className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-300 max-w-xs hidden xl:table-cell align-top">
                        {val || <span className="text-gray-600 italic">Empty</span>}
                    </td>
                );
            })}
            <td className="px-3 py-4 text-sm text-gray-400 hidden md:table-cell max-w-xs truncate align-top">
                {term.remarks}
            </td>
            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 align-top opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setIsEditing(true)}
                    className="text-indigo-400 hover:text-indigo-300 mr-2"
                    title="Edit"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => {
                        if (confirm('Delete this term?')) deleteMutation.mutate();
                    }}
                    className="text-red-400 hover:text-red-300"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}
