'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, X, Check } from 'lucide-react';

interface CreateTermRowProps {
    projectId: string;
    baseLanguage: string;
    targetLanguages: string[];
    onCancel: () => void;
    onSuccess: () => void;
}

export function CreateTermRow({ projectId, baseLanguage, targetLanguages, onCancel, onSuccess }: CreateTermRowProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        stringName: '',
        remarks: '',
        values: {} as Record<string, string>,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/projects/${projectId}/terms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(JSON.stringify(json.error) || 'Failed to create term');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
            onSuccess();
        },
        onError: (err) => {
            alert('Create failed: ' + err.message);
        }
    });

    const handleSave = () => {
        if (!formData.stringName) {
            alert("Key name is required");
            return;
        }
        createMutation.mutate({
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

    return (
        <tr className="bg-indigo-900/20 border-b border-indigo-500/30">
            <td className="p-4 align-top">
                <input
                    type="text"
                    value={formData.stringName}
                    onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                    placeholder="Key Name"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                />
            </td>
            <td className="p-4 align-top">
                <textarea
                    value={formData.values[baseLanguage] || ''}
                    onChange={(e) => handleValueChange(baseLanguage, e.target.value)}
                    placeholder="Base Value"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 min-h-[4rem]"
                />
            </td>
            {targetLanguages.map(lang => (
                <td key={lang} className="p-4 align-top hidden xl:table-cell">
                    <textarea
                        value={formData.values[lang] || ''}
                        onChange={(e) => handleValueChange(lang, e.target.value)}
                        placeholder={lang}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 min-h-[4rem]"
                    />
                </td>
            ))}
            <td className="p-4 align-top hidden md:table-cell">
                <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                    placeholder="Remarks"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-gray-400 focus:ring-1 focus:ring-indigo-500 min-h-[4rem]"
                />
            </td>
            <td className="p-4 text-right align-top">
                <div className="flex justify-end gap-2">
                    <button
                        onClick={handleSave}
                        disabled={createMutation.isPending}
                        className="text-green-400 hover:text-green-300 p-1 bg-gray-800 rounded shadow-sm"
                        title="Create"
                    >
                        <Check className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-300 p-1 bg-gray-800 rounded shadow-sm"
                        title="Cancel"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
