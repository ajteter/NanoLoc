import React, { useMemo, useState } from 'react';
import { LANGUAGES } from '@/lib/constants/languages';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface LanguageSelectorProps {
    value: string[];
    onChange: (value: string[]) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
    const [search, setSearch] = useState('');

    const commonLanguages = useMemo(() => LANGUAGES.filter(l => l.isCommon), []);

    // Filter languages based on search
    const filteredLanguages = useMemo(() => {
        if (!search) return LANGUAGES;
        const lower = search.toLowerCase();
        return LANGUAGES.filter(l =>
            l.name.toLowerCase().includes(lower) ||
            l.localName.toLowerCase().includes(lower) ||
            l.code.toLowerCase().includes(lower)
        );
    }, [search]);

    const handleToggle = (code: string) => {
        if (value.includes(code)) {
            onChange(value.filter(c => c !== code));
        } else {
            onChange([...value, code]);
        }
    };

    const handleSelectCommon = () => {
        // Merge common languages with existing selection, avoiding duplicates
        const commonCodes = commonLanguages.map(l => l.code);
        const unique = Array.from(new Set([...value, ...commonCodes]));
        onChange(unique);
    };

    const isSelected = (code: string) => value.includes(code);

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-1">
                <Label>Target Languages</Label>
                <span className="text-xs text-muted-foreground">Select languages to translate into.</span>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search languages..."
                        className="pl-9 bg-gray-900 border-gray-700 h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectCommon}
                    className="whitespace-nowrap"
                >
                    + Select Common
                </Button>
            </div>

            <div className="rounded-md border border-gray-700 bg-gray-900/50">
                <ScrollArea className="h-[300px] w-full p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredLanguages.length === 0 ? (
                            <div className="col-span-2 text-center text-sm text-gray-500 py-4">
                                No languages found.
                            </div>
                        ) : (
                            filteredLanguages.map((lang) => (
                                <div key={lang.code} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`lang-${lang.code}`}
                                        checked={isSelected(lang.code)}
                                        onCheckedChange={() => handleToggle(lang.code)}
                                        className="border-gray-500"
                                    />
                                    <Label
                                        htmlFor={`lang-${lang.code}`}
                                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-200"
                                    >
                                        <span className="font-medium text-white">{lang.name}</span> <span className="text-gray-400">({lang.localName})</span>
                                        {lang.isCommon && <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-400/10 px-1 rounded">Common</span>}
                                    </Label>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="p-2 border-t border-gray-700 bg-gray-900/80 text-xs text-gray-400 flex justify-between items-center">
                    <span>{value.length} selected</span>
                    {value.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-red-400 hover:text-red-300 hover:bg-transparent"
                            onClick={() => onChange([])}
                        >
                            Clear all
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
