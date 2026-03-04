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
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gray-800 gap-2"
                    title="Profile Settings"
                >
                    <UserCog className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-white">Profile Settings</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Update your display name or password.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Username (read-only) */}
                    <div className="space-y-1.5">
                        <Label className="text-gray-400">Username</Label>
                        <Input
                            value={session?.user?.name || ''}
                            disabled
                            className="bg-gray-800 border-gray-700 text-gray-400"
                        />
                        <p className="text-xs text-gray-500">Username cannot be changed.</p>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="profile-name">Display Name</Label>
                        <Input
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-gray-800 border-gray-700"
                            placeholder="Your display name"
                        />
                    </div>

                    {/* Password Section */}
                    <div className="border-t border-gray-700 pt-4 space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Change Password</h4>

                        <div className="space-y-1.5">
                            <Label htmlFor="current-pw">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="current-pw"
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="bg-gray-800 border-gray-700 pr-10"
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                                    className="bg-gray-800 border-gray-700 pr-10"
                                    placeholder="At least 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                                className="bg-gray-800 border-gray-700"
                                placeholder="Repeat new password"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
