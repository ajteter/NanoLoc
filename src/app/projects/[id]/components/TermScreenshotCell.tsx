'use client';

import { useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SCREENSHOT_COLUMN_WIDTH_CLASS, SCREENSHOT_STICKY_CLASS } from './stickyColumnClasses';
import { useI18n } from '@/lib/i18n/client';
import { getLocalizedApiError, readApiErrorBody } from '@/lib/api/errors';

interface TermScreenshotCellProps {
    projectId: string;
    termId: string;
    termName: string;
    hasScreenshot: boolean;
    screenshotUpdatedAt?: string | Date | null;
}

export function TermScreenshotCell({
    projectId,
    termId,
    termName,
    hasScreenshot,
    screenshotUpdatedAt,
}: TermScreenshotCellProps) {
    const { t } = useI18n();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const pasteAreaRef = useRef<HTMLDivElement>(null);
    const uploadInFlightRef = useRef(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const version = screenshotUpdatedAt ? new Date(screenshotUpdatedAt).getTime() : '';
    const imageUrl = `/api/projects/${projectId}/terms/${termId}/screenshot${version ? `?v=${version}` : ''}`;
    const isBusy = isUploading || isDeleting;

    const openFilePicker = () => {
        if (isBusy) return;
        inputRef.current?.click();
    };

    const uploadFile = async (file: File) => {
        if (isBusy || uploadInFlightRef.current) return;
        uploadInFlightRef.current = true;
        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);

        try {
            const response = await fetch(`/api/projects/${projectId}/terms/${termId}/screenshot`, {
                method: 'PUT',
                body: formData,
            });

            if (!response.ok) {
                const data = await readApiErrorBody(response);
                throw new Error(getLocalizedApiError(data, t, t('screenshot.uploadFailed')));
            }

            toast.success(t('screenshot.updated'));
            setIsPreviewOpen(false);
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : t('screenshot.uploadFailed');
            toast.error(message);
        } finally {
            uploadInFlightRef.current = false;
            setIsUploading(false);
        }
    };

    const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void uploadFile(file);
    };

    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
        const image = Array.from(event.clipboardData.items).find(
            (item) => item.kind === 'file' && item.type.startsWith('image/'),
        );
        const file = image?.getAsFile();
        if (!file) return;

        event.preventDefault();
        void uploadFile(file);
    };

    const handleDelete = async () => {
        if (!hasScreenshot || isBusy) return;
        if (!window.confirm(t('screenshot.deleteConfirm'))) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/terms/${termId}/screenshot`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await readApiErrorBody(response);
                throw new Error(getLocalizedApiError(data, t, t('screenshot.deleteFailed')));
            }

            toast.success(t('screenshot.deleted'));
            setIsPreviewOpen(false);
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : t('screenshot.deleteFailed');
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <td className={cn('px-2 py-4 align-top text-center', SCREENSHOT_COLUMN_WIDTH_CLASS, SCREENSHOT_STICKY_CLASS)}>
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleUpload}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isBusy}
                onClick={() => setIsPreviewOpen(true)}
                className={cn(
                    'h-8 w-8 text-zinc-400 hover:bg-zinc-800',
                    hasScreenshot ? 'hover:text-emerald-300' : 'hover:text-zinc-200'
                )}
                title={hasScreenshot ? t('screenshot.preview') : t('screenshot.upload')}
            >
                {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : hasScreenshot ? (
                    <ImageIcon className="h-4 w-4 text-emerald-400" />
                ) : (
                    <ImagePlus className="h-4 w-4" />
                )}
            </Button>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent
                    closeLabel={t('common.close')}
                    className="max-w-3xl bg-zinc-950 border-zinc-800 text-white"
                    onPaste={handlePaste}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        pasteAreaRef.current?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{t('projectDetail.termScreenshot')}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {termName}
                        </DialogDescription>
                    </DialogHeader>
                    <div
                        ref={pasteAreaRef}
                        tabIndex={0}
                        role="region"
                        aria-label={t('screenshot.pasteHint')}
                        aria-busy={isUploading}
                        className="rounded-lg border border-dashed border-zinc-700 bg-black/40 p-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                        <p className="py-4 text-center text-sm text-zinc-400">{t('screenshot.pasteHint')}</p>
                        {isUploading ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                            </div>
                        ) : hasScreenshot ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={imageUrl}
                                alt={t('screenshot.alt').replace('{name}', termName)}
                                className="max-h-[60vh] w-full object-contain"
                            />
                        ) : null}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={openFilePicker}
                            disabled={isBusy}
                            className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {hasScreenshot ? t('common.replace') : t('screenshot.upload')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDelete}
                            disabled={isBusy || !hasScreenshot}
                            className="border-red-900/70 bg-red-950/30 text-red-300 hover:bg-red-950 hover:text-red-200"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {t('common.delete')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </td>
    );
}
