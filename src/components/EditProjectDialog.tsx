'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { Project } from '@/types';
import { toast } from "sonner";
import { LanguageSelector } from './LanguageSelector';

interface EditProjectDialogProps {
    project: Project;
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        name: project.name,
        description: project.description || '',
        baseLanguage: project.baseLanguage,
        targetLanguages: JSON.parse(project.targetLanguages || '[]'),
        aiBaseUrl: project.aiBaseUrl || '',
        aiApiKey: '', // Don't show actual key for security usually, but for simple edit we might need to handle "leave blank to keep"
        aiModelId: project.aiModelId || '',
        systemPrompt: project.systemPrompt || '',
    });

    // Reset form when project changes or dialog opens
    useEffect(() => {
        if (open) {
            setFormData({
                name: project.name,
                description: project.description || '',
                baseLanguage: project.baseLanguage,
                targetLanguages: JSON.parse(project.targetLanguages || '[]'),
                aiBaseUrl: project.aiBaseUrl || '',
                aiApiKey: '', // Reset to empty for security, user re-enters if they want to change
                aiModelId: project.aiModelId || '',
                systemPrompt: project.systemPrompt || '',
            });
        }
    }, [project, open]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    // targetLanguages is already an array from the selector
                    targetLanguages: data.targetLanguages,
                    // Only send api key if it has value (to update)
                    aiApiKey: data.aiApiKey || undefined,
                }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(JSON.stringify(json.error) || 'Failed to update project');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project.id] });
            setOpen(false);
            toast.success("Project updated successfully");
        },
        onError: (err) => {
            toast.error("Failed to update project: " + err.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Project Settings</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Update project details and configuration.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="bg-gray-800 border-gray-700" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} className="bg-gray-800 border-gray-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="baseLanguage">Base Language</Label>
                            <Input id="baseLanguage" name="baseLanguage" value={formData.baseLanguage} onChange={handleChange} className="bg-gray-800 border-gray-700" />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <LanguageSelector
                            value={formData.targetLanguages}
                            onChange={(vals) => setFormData(prev => ({ ...prev, targetLanguages: vals }))}
                        />
                    </div>

                    <div className="border-t border-gray-800 pt-4 mt-2">
                        <h4 className="text-sm font-medium mb-3">AI Configuration</h4>
                        <div className="grid gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="aiBaseUrl">Base URL</Label>
                                <Input id="aiBaseUrl" name="aiBaseUrl" value={formData.aiBaseUrl} onChange={handleChange} className="bg-gray-800 border-gray-700" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="aiModelId">Model ID</Label>
                                <Input id="aiModelId" name="aiModelId" value={formData.aiModelId} onChange={handleChange} className="bg-gray-800 border-gray-700" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="aiApiKey">API Key (Leave blank to keep unchanged)</Label>
                                <Input id="aiApiKey" name="aiApiKey" type="password" value={formData.aiApiKey} onChange={handleChange} placeholder="••••••••" className="bg-gray-800 border-gray-700" />
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
                    </div>
                </form>

                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-500">
                        {mutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
