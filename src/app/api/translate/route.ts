import { NextResponse } from "next/server";
import { translateTexts } from "@/lib/services/translate.service";
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, texts, targetLang, translationKeyId, keyName, source } = body;

        if (!projectId || !texts || !targetLang) {
            return jsonError('MISSING_TRANSLATION_FIELDS');
        }

        if (!Array.isArray(texts)) {
            return jsonError('TEXTS_MUST_BE_ARRAY');
        }

        const translations = await translateTexts(projectId, texts, targetLang, {
            translationKeyId,
            keyName,
            source,
        });
        return NextResponse.json({ translations });
    } catch (error: unknown) {
        console.error("Translation API Error:", error);
        return jsonErrorFromUnknown(error, 'TRANSLATION_FAILED');
    }
}
