'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LANGUAGES } from '@/lib/constants/languages';
import { Search, Eye, EyeOff } from 'lucide-react';

interface ProjectFormData {
    name: string;
    description: string;
    baseLanguage: string;
    targetLanguages: string[];
    aiBaseUrl: string;
    aiApiKey: string;
    aiModelId: string;
    systemPrompt: string;
}

interface ProjectFormProps {
    initialData?: ProjectFormData;
    onSubmit: (data: ProjectFormData) => void;
    isSubmitting: boolean;
    submitLabel: string;
}

export function ProjectForm({ initialData, onSubmit, isSubmitting, submitLabel }: ProjectFormProps) {
    const [formData, setFormData] = useState<ProjectFormData>({
        name: '',
        description: '',
        baseLanguage: 'en-US',
        targetLanguages: [],
        aiBaseUrl: 'https://d106f995v5mndm.cloudfront.net', // Default
        aiApiKey: '',
        aiModelId: 'claude-4-5-sonnet', // Default
        systemPrompt: '',
        ...initialData
    });

    const [languageSearch, setLanguageSearch] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleLanguage = (code: string) => {
        setFormData(prev => {
            const current = prev.targetLanguages;
            if (current.includes(code)) {
                return { ...prev, targetLanguages: current.filter(c => c !== code) };
            } else {
                return { ...prev, targetLanguages: [...current, code] };
            }
        });
    };

    const filteredLanguages = LANGUAGES.filter(l =>
        l.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
        l.code.toLowerCase().includes(languageSearch.toLowerCase())
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-gray-800 pb-2">General Information</h3>

                <div className="grid gap-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="bg-gray-800 border-gray-700" placeholder="e.g. My Website" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" value={formData.description} onChange={handleChange} className="bg-gray-800 border-gray-700" placeholder="Briefly describe your project..." />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-gray-800 pb-2">Localization Settings</h3>

                <div className="grid gap-2 max-w-sm">
                    <Label htmlFor="baseLanguage">Base Language</Label>
                    <Input id="baseLanguage" name="baseLanguage" value={formData.baseLanguage} onChange={handleChange} className="bg-gray-800 border-gray-700" />
                    <p className="text-xs text-gray-400">The primary language of your application (usually en-US).</p>
                </div>

                <div className="grid gap-2">
                    <Label>Target Languages</Label>
                    <div className="bg-gray-800 border-gray-700 rounded-md p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2 pb-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search languages..."
                                    value={languageSearch}
                                    onChange={(e) => setLanguageSearch(e.target.value)}
                                    className="pl-9 bg-gray-900 border-gray-600"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const commonCodes = LANGUAGES
                                            .filter(l => l.isCommon && l.code !== formData.baseLanguage)
                                            .map(l => l.code);

                                        const allCommonSelected = commonCodes.every(code =>
                                            formData.targetLanguages.includes(code)
                                        );

                                        if (allCommonSelected) {
                                            // Deselect all common languages
                                            setFormData(prev => ({
                                                ...prev,
                                                targetLanguages: prev.targetLanguages.filter(
                                                    code => !commonCodes.includes(code)
                                                )
                                            }));
                                        } else {
                                            // Select all common languages
                                            setFormData(prev => ({
                                                ...prev,
                                                targetLanguages: Array.from(new Set([...prev.targetLanguages, ...commonCodes]))
                                                    .filter(code => code !== prev.baseLanguage)
                                            }));
                                        }
                                    }}
                                    className="whitespace-nowrap border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200"
                                >
                                    {LANGUAGES
                                        .filter(l => l.isCommon && l.code !== formData.baseLanguage)
                                        .every(l => formData.targetLanguages.includes(l.code))
                                        ? 'Deselect Common'
                                        : 'Select Common'
                                    }
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFormData(prev => ({ ...prev, targetLanguages: [] }))}
                                    className="whitespace-nowrap border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800"
                                >
                                    Deselect All
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                            {filteredLanguages.map((lang) => {
                                const isBase = lang.code === formData.baseLanguage;
                                return (
                                    <div key={lang.code} className={`flex items-start space-x-2 p-2 rounded transition-colors ${isBase ? 'opacity-50 cursor-not-allowed bg-gray-800/50' : 'hover:bg-gray-700/50'}`}>
                                        <Checkbox
                                            id={`lang-${lang.code}`}
                                            checked={isBase || formData.targetLanguages.includes(lang.code)}
                                            onCheckedChange={() => !isBase && toggleLanguage(lang.code)}
                                            disabled={isBase}
                                            className="mt-1"
                                        />
                                        <div className="grid gap-0.5 leading-none">
                                            <label
                                                htmlFor={`lang-${lang.code}`}
                                                className={`text-sm font-medium leading-none ${isBase ? 'text-gray-400' : 'cursor-pointer text-white'}`}
                                            >
                                                {lang.name} {isBase && '(Base)'}
                                            </label>
                                            <span className="text-xs text-gray-400">
                                                {lang.localName} - {lang.code}
                                                {lang.isCommon && <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1 bg-blue-500/20 text-blue-300 pointer-events-none">Common</Badge>}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                            {filteredLanguages.length === 0 && (
                                <p className="text-sm text-gray-400 col-span-full py-4 text-center">No languages found.</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
                            <span className="text-sm text-gray-400 mr-2 self-center">Selected ({formData.targetLanguages.length}):</span>
                            {formData.targetLanguages.length === 0 && (
                                <span className="text-sm text-gray-500 italic self-center">None</span>
                            )}
                            {formData.targetLanguages.map(code => (
                                <Badge key={code} variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20">
                                    {LANGUAGES.find(l => l.code === code)?.name || code}
                                    <button
                                        type="button"
                                        onClick={() => toggleLanguage(code)}
                                        className="ml-1 hover:text-white"
                                    >×</button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-gray-800 pb-2">AI Configuration (Optional)</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="aiBaseUrl">Base URL</Label>
                        <Input id="aiBaseUrl" name="aiBaseUrl" value={formData.aiBaseUrl} onChange={handleChange} className="bg-gray-800 border-gray-700" placeholder="https://api.openai.com/v1" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="aiModelId">Model ID</Label>
                        <Input id="aiModelId" name="aiModelId" value={formData.aiModelId} onChange={handleChange} className="bg-gray-800 border-gray-700" placeholder="gpt-4" />
                    </div>
                </div>

                <div className="grid gap-2 ml-1">
                    <Label htmlFor="aiApiKey">API Key</Label>
                    <div className="relative">
                        <Input
                            id="aiApiKey"
                            name="aiApiKey"
                            type={showApiKey ? "text" : "password"}
                            value={formData.aiApiKey}
                            onChange={handleChange}
                            className="bg-gray-800 border-gray-700 pr-10"
                            placeholder="sk-..."
                        />
                        <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">Leave blank to keep existing key (if editing).</p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Textarea
                        id="systemPrompt"
                        name="systemPrompt"
                        value={formData.systemPrompt}
                        onChange={handleChange}
                        placeholder="Customize the system prompt for AI translation..."
                        className="bg-gray-800 border-gray-700 min-h-[100px]"
                    />
                </div>
            </div>

            <div className="pt-4 pb-12">
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white min-w-[150px]">
                    {isSubmitting ? 'Saving...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
