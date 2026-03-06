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

export function UserProfileDialog() {
    const { data: session, update: updateSession } = useSession();
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
                toast.error('Please enter your current password');
                return;
            }
            if (newPassword.length < 6) {
                toast.error('New password must be at least 6 characters');
                return;
            }
            if (newPassword !== confirmPassword) {
                toast.error('New passwords do not match');
                return;
            }
            payload.currentPassword = currentPassword;
            payload.newPassword = newPassword;
        }

        if (Object.keys(payload).length === 0) {
            toast.info('No changes to save');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Update failed');
                return;
            }

            toast.success('Profile updated successfully');

            // Update session if name changed
            if (payload.name) {
                await updateSession({ name: payload.name });
            }

            setOpen(false);
        } catch (err) {
            toast.error('Failed to update profile');
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
                    title="Profile Settings"
                >
                    <UserCog className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-white">Profile Settings</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update your display name or password.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Username (read-only) */}
                    <div className="space-y-1.5">
                        <Label className="text-zinc-400">Username</Label>
                        <Input
                            value={(session?.user as any)?.username || session?.user?.name || ''}
                            disabled
                            className="bg-zinc-800 border-zinc-700 text-zinc-400"
                        />
                        <p className="text-xs text-zinc-500">Username cannot be changed.</p>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="profile-name">Display Name</Label>
                        <Input
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-zinc-800 border-zinc-700"
                            placeholder="Your display name"
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            Your Profile Settings Display Name changes how you appear visually. You will still use your original Username to log in.
                        </p>
                    </div>

                    {/* Password Section */}
                    <div className="border-t border-zinc-700 pt-4 space-y-3">
                        <h4 className="text-sm font-medium text-zinc-300">Change Password</h4>

                        <div className="space-y-1.5">
                            <Label htmlFor="current-pw">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="current-pw"
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 pr-10"
                                    placeholder="Enter current password"
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
                            <Label htmlFor="new-pw">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="new-pw"
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 pr-10"
                                    placeholder="At least 6 characters"
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
                            <Label htmlFor="confirm-pw">Confirm New Password</Label>
                            <Input
                                id="confirm-pw"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                                placeholder="Repeat new password"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-zinc-100 hover:bg-white text-zinc-900"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
