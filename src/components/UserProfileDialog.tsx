'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, UserCog } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/client';
import { getLocalizedApiError, readApiErrorBody } from '@/lib/api/errors';

type SessionUserWithUsername = {
    name?: string | null;
    username?: string;
};

export function UserProfileDialog() {
    const { data: session, update: updateSession } = useSession();
    const { t } = useI18n();
    const sessionUser = session?.user as SessionUserWithUsername | undefined;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const handleOpen = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            setName(session?.user?.name || '');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const handleSave = async () => {
        const payload: Record<string, string> = {};

        // Name change
        if (name && name !== session?.user?.name) {
            payload.name = name;
        }

        // Password change
        if (newPassword || currentPassword) {
            if (!currentPassword) {
                toast.error(t('profile.currentPasswordRequired'));
                return;
            }
            if (newPassword.length < 6) {
                toast.error(t('profile.newPasswordTooShort'));
                return;
            }
            if (newPassword !== confirmPassword) {
                toast.error(t('profile.passwordsMismatch'));
                return;
            }
            payload.currentPassword = currentPassword;
            payload.newPassword = newPassword;
        }

        if (Object.keys(payload).length === 0) {
            toast.info(t('profile.noChanges'));
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await readApiErrorBody(res);
                toast.error(getLocalizedApiError(data, t, t('profile.updateFailed')));
                return;
            }

            toast.success(t('profile.updated'));

            // Update session if name changed
            if (payload.name) {
                await updateSession({ name: payload.name });
            }

            setOpen(false);
        } catch {
            toast.error(t('profile.failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button
                    id="profile-trigger"
                    variant="ghost"
                    size="sm"
                    className="hidden"
                    title={t('profile.title')}
                >
                    <UserCog className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-white">{t('profile.title')}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {t('profile.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Username (read-only) */}
                    <div className="space-y-1.5">
                        <Label className="text-zinc-400">{t('profile.username')}</Label>
                        <Input
                            value={sessionUser?.username || sessionUser?.name || ''}
                            disabled
                            className="bg-zinc-800 border-zinc-700 text-zinc-400"
                        />
                        <p className="text-xs text-zinc-500">{t('profile.usernameReadonly')}</p>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="profile-name">{t('profile.displayName')}</Label>
                        <Input
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-zinc-800 border-zinc-700"
                            placeholder={t('profile.displayNamePlaceholder')}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            {t('profile.displayNameHint')}
                        </p>
                    </div>

                    {/* Password Section */}
                    <div className="border-t border-zinc-700 pt-4 space-y-3">
                        <h4 className="text-sm font-medium text-zinc-300">{t('profile.changePassword')}</h4>

                        <div className="space-y-1.5">
                            <Label htmlFor="current-pw">{t('profile.currentPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="current-pw"
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 pr-10"
                                    placeholder={t('profile.currentPasswordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="new-pw">{t('profile.newPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="new-pw"
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 pr-10"
                                    placeholder={t('profile.newPasswordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-pw">{t('profile.confirmNewPassword')}</Label>
                            <Input
                                id="confirm-pw"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                                placeholder={t('profile.confirmNewPasswordPlaceholder')}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-zinc-100 hover:bg-white text-zinc-900"
                    >
                        {loading ? t('common.saving') : t('common.saveChanges')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
