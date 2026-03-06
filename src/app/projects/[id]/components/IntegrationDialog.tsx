'use client';

import { useState } from 'react';
import { Copy, Check, Code, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface IntegrationDialogProps {
    projectId: string;
    projectName: string;
    baseLanguage: string;
    targetLanguages: string[];
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-6 w-6 text-zinc-400 hover:text-white shrink-0"
            title="Copy"
        >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </Button>
    );
}

export function IntegrationDialog({ projectId, projectName, baseLanguage, targetLanguages }: IntegrationDialogProps) {
    const host = typeof window !== 'undefined' ? window.location.origin : 'https://YOUR_HOST';

    const curlJsonAll = `curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "${host}/api/projects/${projectId}/pull?format=json" \\
     -o translations.json`;

    const curlJsonLang = `curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "${host}/api/projects/${projectId}/pull?format=json&lang=${targetLanguages[0] || 'zh-CN'}" \\
     -o strings_${targetLanguages[0] || 'zh-CN'}.json`;

    const curlXml = `curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "${host}/api/projects/${projectId}/pull?format=xml&lang=${targetLanguages[0] || 'zh-CN'}" \\
     -o strings.xml`;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="secondary"
                    className="gap-2"
                >
                    <Terminal className="h-4 w-4" />
                    API
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-zinc-900 border-zinc-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Code className="h-5 w-5 text-zinc-300" />
                        Developer API — {projectName}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Use these commands in your CI/CD pipeline or build scripts to pull translations directly.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Project ID */}
                    <div>
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Project ID</label>
                        <div className="mt-1 flex items-center gap-2 bg-zinc-800 rounded-md px-3 py-2 border border-zinc-700">
                            <code className="text-sm text-zinc-200 font-mono flex-1 select-all">{projectId}</code>
                            <CopyButton text={projectId} />
                        </div>
                    </div>

                    {/* Auth Note */}
                    <div className="bg-amber-950/30 border border-amber-800/50 rounded-md px-3 py-2">
                        <p className="text-xs text-amber-300">
                            <strong>Authentication:</strong> Replace <code className="text-amber-200">YOUR_API_TOKEN</code> with the <code className="text-amber-200">API_ACCESS_TOKEN</code> from the server&apos;s <code className="text-amber-200">.env</code> file. Ask your admin if you don&apos;t have it.
                        </p>
                    </div>

                    {/* Full JSON Dump */}
                    <div>
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            Full JSON Dump (all languages)
                        </label>
                        <div className="mt-1 relative">
                            <pre className="bg-zinc-800 rounded-md px-3 py-2 border border-zinc-700 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">{curlJsonAll}</pre>
                            <div className="absolute top-1 right-1">
                                <CopyButton text={curlJsonAll} />
                            </div>
                        </div>
                    </div>

                    {/* Single Language JSON */}
                    <div>
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            Single Language (JSON)
                        </label>
                        <div className="mt-1 relative">
                            <pre className="bg-zinc-800 rounded-md px-3 py-2 border border-zinc-700 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">{curlJsonLang}</pre>
                            <div className="absolute top-1 right-1">
                                <CopyButton text={curlJsonLang} />
                            </div>
                        </div>
                    </div>

                    {/* Android XML */}
                    <div>
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            Android XML
                        </label>
                        <div className="mt-1 relative">
                            <pre className="bg-zinc-800 rounded-md px-3 py-2 border border-zinc-700 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">{curlXml}</pre>
                            <div className="absolute top-1 right-1">
                                <CopyButton text={curlXml} />
                            </div>
                        </div>
                    </div>

                    {/* Available Languages */}
                    <div>
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Available Languages</label>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 bg-zinc-100/30 text-zinc-200 rounded text-xs font-mono">{baseLanguage} (base)</span>
                            {targetLanguages.map(l => (
                                <span key={l} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-mono border border-zinc-700">{l}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
