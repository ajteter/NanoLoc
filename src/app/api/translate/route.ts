import { NextResponse } from "next/server";
import { translateTexts } from "@/lib/services/translate.service";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, texts, targetLang } = body;

        if (!projectId || !texts || !targetLang) {
            return NextResponse.json(
                { error: "Missing required fields: projectId, texts, targetLang" },
                { status: 400 }
            );
        }

        if (!Array.isArray(texts)) {
            return NextResponse.json(
                { error: "texts must be an array" },
                { status: 400 }
            );
        }

        const translations = await translateTexts(projectId, texts, targetLang);
        return NextResponse.json({ translations });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Translation API Error:", error);
        return NextResponse.json(
            { error: message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
