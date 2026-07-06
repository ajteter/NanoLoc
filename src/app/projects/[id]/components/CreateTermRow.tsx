'use client';

import { useState, useTransition } from 'react';
import { X, Check, ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTermAction } from '@/lib/actions/term.actions';
import { toast } from 'sonner';
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
    SCREENSHOT_COLUMN_WIDTH_CLASS,
    SCREENSHOT_STICKY_CLASS,
} from './stickyColumnClasses';
import { useI18n } from '@/lib/i18n/client';
import { getLocalizedApiError } from '@/lib/api/errors';

interface CreateTermRowProps {
    projectId: string;
    baseLanguage: string;
    targetLanguages: string[];
    onCancel: () => void;
    onSuccess: () => void;
}

export function CreateTermRow({ projectId, baseLanguage, targetLanguages, onCancel, onSuccess }: CreateTermRowProps) {
    const { t } = useI18n();
    const { isBaseLanguagePinned } = useBaseLanguagePin();
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        stringName: '',
        remarks: '',
        values: {} as Record<string, string>,
    });

    const handleSave = () => {
        if (!formData.stringName) {
            toast.error(t('term.keyRequired'));
            return;
        }
        startTransition(async () => {
            const res = await createTermAction(projectId, {
                stringName: formData.stringName,
                remarks: formData.remarks,
                values: formData.values
            });
            if (res.success) {
                toast.success(t('term.created'));
                onSuccess();
            } else {
                toast.error(getLocalizedApiError(res, t, t('term.createFailed')));
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
        <tr className="bg-zinc-900 border-b border-zinc-400/30">
            <td className={cn("p-4 align-top", ACTIONS_COLUMN_WIDTH_CLASS, ACTIONS_STICKY_CLASS)}>
                <div className="flex gap-1 opacity-100">
                    <Button
                        variant="ghost" size="icon"
                        onClick={handleSave}
                        disabled={isPending}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                        title={t('term.create')}
                    >
                        <Check className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        onClick={onCancel}
                        className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700"
                        title={t('common.cancel')}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </td>
            <td className={cn("p-4 align-top", KEY_COLUMN_WIDTH_CLASS, KEY_STICKY_CLASS)}>
                <Input
                    type="text"
                    value={formData.stringName}
                    onChange={(e) => setFormData(p => ({ ...p, stringName: e.target.value }))}
                    placeholder={t('term.keyNamePlaceholder')}
                    className="bg-zinc-900 border-zinc-600 text-white h-auto py-2"
                    autoFocus
                />
            </td>
            <td className={cn("p-4 align-top", REMARKS_COLUMN_WIDTH_CLASS, REMARKS_STICKY_CLASS)}>
                <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                    placeholder={t('common.remarks')}
                    className="bg-zinc-900 border-zinc-600 text-zinc-400 min-h-[4rem]"
                />
            </td>
            <td className={cn("px-2 py-4 align-top text-center", SCREENSHOT_COLUMN_WIDTH_CLASS, SCREENSHOT_STICKY_CLASS)}>
                <ImageIcon className="mx-auto mt-2 h-4 w-4 text-zinc-700" />
            </td>
            <td className={cn("p-4 align-top w-64 min-w-[16rem]", isBaseLanguagePinned && BASE_LANGUAGE_STICKY_CLASS)}>
                <Textarea
                    value={formData.values[baseLanguage] || ''}
                    onChange={(e) => handleValueChange(baseLanguage, e.target.value)}
                    placeholder={t('term.baseValuePlaceholder')}
                    className="bg-zinc-900 border-zinc-600 text-white min-h-[4rem]"
                />
            </td>
            {targetLanguages.map(lang => (
                <td key={lang} className="p-4 align-top">
                    <Textarea
                        value={formData.values[lang] || ''}
                        onChange={(e) => handleValueChange(lang, e.target.value)}
                        placeholder={lang}
                        className="bg-zinc-900 border-zinc-600 text-white min-h-[4rem]"
                    />
                </td>
            ))}
        </tr>
    );
}
