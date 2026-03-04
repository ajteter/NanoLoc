'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreateTermRow } from './CreateTermRow';

interface WrapperProps {
    projectId: string;
    baseLanguage: string;
    targetLanguages: string[];
}

export function CreateTermRowWrapper({ projectId, baseLanguage, targetLanguages }: WrapperProps) {
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
            targetLanguages={targetLanguages}
            onCancel={closeRow}
            onSuccess={closeRow}
        />
    );
}
