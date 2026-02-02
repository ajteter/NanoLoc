import { NextResponse } from "next/server";
import { BRClient } from "@/lib/ai/br-client";
import { getProjectAIConfig } from "@/lib/ai/config";

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

        const config = await getProjectAIConfig(projectId);
        const client = new BRClient(config);

        const translations = await client.translateBatch(texts, targetLang);

        return NextResponse.json({ translations });
    } catch (error: any) {
        console.error("Translation API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
