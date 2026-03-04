
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

interface UserNavProps {
    showName?: boolean;
}

export function UserNav({ showName }: UserNavProps) {
    const { data: session } = useSession();

    if (!session?.user) return null;

    const initials = session.user.name
        ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
        : "U";

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-gray-700">
                    {session.user.image && <AvatarImage src={session.user.image} alt={session.user.name || ""} />}
                    <AvatarFallback className="bg-indigo-600 text-white font-medium text-xs">{initials}</AvatarFallback>
                </Avatar>
                {showName && (
                    <div className="hidden md:flex flex-col">
                        <span className="text-sm font-medium text-white leading-none">{session.user.name}</span>
                    </div>
                )}
            </div>
            <UserProfileDialog />
            <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => signOut()}
                title="Sign out"
            >
                <LogOut className="h-4 w-4" />
                {showName && <span className="ml-2">Sign out</span>}
            </Button>
        </div>
    );
}
