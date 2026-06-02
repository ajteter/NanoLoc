'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreateTermRow } from './CreateTermRow';

interface WrapperProps {
    projectId: string;
    baseLanguage: string;
    isBasePinned?: boolean;
    targetLanguages: string[];
}

export function CreateTermRowWrapper({ projectId, baseLanguage, isBasePinned = false, targetLanguages }: WrapperProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const closeRow = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('create');
        router.push(`?${params.toString()}`);
    };

    return (
        <CreateTermRow
            projectId={projectId}
            baseLanguage={baseLanguage}
            isBasePinned={isBasePinned}
            targetLanguages={targetLanguages}
            onCancel={closeRow}
            onSuccess={closeRow}
        />
    );
}
