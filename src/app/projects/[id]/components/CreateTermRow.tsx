'use client';

import { useState, useTransition } from 'react';
import { Save, X, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTermAction } from '@/lib/actions/term.actions';
import { toast } from 'sonner';

interface CreateTermRowProps {
    projectId: string;
    baseLanguage: string;
    targetLanguages: string[];
    onCancel: () => void;
    onSuccess: () => void;
}

export function CreateTermRow({ projectId, baseLanguage, targetLanguages, onCancel, onSuccess }: CreateTermRowProps) {
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        stringName: '',
        remarks: '',
        values: {} as Record<string, string>,
    });

    const handleSave = () => {
        if (!formData.stringName) {
            toast.error("Key name is required");
            return;
        }
        startTransition(async () => {
            const res = await createTermAction(projectId, {
                stringName: formData.stringName,
                remarks: formData.remarks,
                values: formData.values
            });
            if (res.success) {
                toast.success('Term created');
                onSuccess();
            } else {
                toast.error(res.error || 'Create failed');
            }
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
            <td className="p-4 align-top border-r border-gray-800 bg-gray-900 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                <div className="flex gap-1 opacity-100">
                    <Button
                        variant="ghost" size="icon"
                        onClick={handleSave}
                        disabled={isPending}
                        className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                        title="Create"
                    >
                        <Check className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </td>
            <td className="p-4 align-top border-r border-gray-800 bg-gray-900 sticky left-[100px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                <Input
                    type="text"
                    value={formData.stringName}
                    onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                    placeholder="Key Name"
                    className="bg-gray-900 border-gray-600 text-white h-auto py-2"
                    autoFocus
                />
            </td>
            <td className="p-4 align-top border-r border-gray-800 bg-gray-900 sticky left-[300px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                    placeholder="Remarks"
                    className="bg-gray-900 border-gray-600 text-gray-400 min-h-[4rem]"
                />
            </td>
            <td className="p-4 align-top">
                <Textarea
                    value={formData.values[baseLanguage] || ''}
                    onChange={(e) => handleValueChange(baseLanguage, e.target.value)}
                    placeholder="Base Value"
                    className="bg-gray-900 border-gray-600 text-white min-h-[4rem]"
                />
            </td>
            {targetLanguages.map(lang => (
                <td key={lang} className="p-4 align-top">
                    <Textarea
                        value={formData.values[lang] || ''}
                        onChange={(e) => handleValueChange(lang, e.target.value)}
                        placeholder={lang}
                        className="bg-gray-900 border-gray-600 text-white min-h-[4rem]"
                    />
                </td>
            ))}
        </tr>
    );
}
