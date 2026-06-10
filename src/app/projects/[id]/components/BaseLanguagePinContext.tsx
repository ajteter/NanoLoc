'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

interface BaseLanguagePinContextValue {
    isBaseLanguagePinned: boolean;
    toggleBaseLanguagePin: () => void;
}

const BaseLanguagePinContext = createContext<BaseLanguagePinContextValue>({
    isBaseLanguagePinned: false,
    toggleBaseLanguagePin: () => { },
});

const PIN_CHANGE_EVENT = 'nanoloc-base-language-pin-change';

function subscribeToPinChanges(onStoreChange: () => void) {
    window.addEventListener('storage', onStoreChange);
    window.addEventListener(PIN_CHANGE_EVENT, onStoreChange);

    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(PIN_CHANGE_EVENT, onStoreChange);
    };
}

export function BaseLanguagePinProvider({
    projectId,
    children,
}: {
    projectId: string;
    children: ReactNode;
}) {
    const storageKey = `nanoloc:project:${projectId}:pinBaseLanguage`;

    const getSnapshot = useCallback(() => {
        try {
            return localStorage.getItem(storageKey) === 'true';
        } catch {
            return false;
        }
    }, [storageKey]);

    const isBaseLanguagePinned = useSyncExternalStore(
        subscribeToPinChanges,
        getSnapshot,
        () => false
    );

    const value = useMemo<BaseLanguagePinContextValue>(() => ({
        isBaseLanguagePinned,
        toggleBaseLanguagePin: () => {
            try {
                localStorage.setItem(storageKey, String(!isBaseLanguagePinned));
                window.dispatchEvent(new Event(PIN_CHANGE_EVENT));
            } catch { }
        },
    }), [isBaseLanguagePinned, storageKey]);

    return (
        <BaseLanguagePinContext.Provider value={value}>
            {children}
        </BaseLanguagePinContext.Provider>
    );
}

export function useBaseLanguagePin() {
    return useContext(BaseLanguagePinContext);
}
