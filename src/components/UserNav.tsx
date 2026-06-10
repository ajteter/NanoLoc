
'use client';

import { useSession, signOut } from "next-auth/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as UserIcon } from "lucide-react";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { useI18n } from "@/lib/i18n/client";

interface UserNavProps {
    showName?: boolean;
}

export function UserNav({ showName }: UserNavProps) {
    const { data: session } = useSession();
    const { t } = useI18n();

    if (!session?.user) return null;

    const initials = session.user.name
        ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
        : "U";

    return (
        <div className="flex items-center gap-2">
            {showName && (
                <span className="hidden text-sm text-zinc-300 sm:inline">
                    {session.user.name}
                </span>
            )}
            <UserProfileDialog />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-zinc-700">
                        <Avatar className="h-8 w-8">
                            {session.user.image && <AvatarImage src={session.user.image} alt={session.user.name || ""} />}
                            <AvatarFallback className="bg-zinc-100 text-zinc-900 font-medium text-xs dark:bg-zinc-800 dark:text-zinc-100">{initials}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-white" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem className="cursor-pointer focus:bg-zinc-800 focus:text-white" onClick={() => document.getElementById('profile-trigger')?.click()}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>{t('common.profileSettings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500" onClick={() => signOut()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t('common.signOut')}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
