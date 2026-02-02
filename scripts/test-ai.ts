import { BRClient } from "../src/lib/ai/br-client";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    const apiKey = process.env.bedrock_secret;
    const baseUrl = process.env.bedrock_base_url;
    const modelId = process.env.bedrock_model_id;

    if (!apiKey || !baseUrl || !modelId) {
        console.error("Missing environment variables: bedrock_secret, bedrock_base_url, bedrock_model_id");
        process.exit(1);
    }

    const client = new BRClient({
        apiKey,
        baseUrl,
        modelId,
    });

    const texts = [
        "Hello",
        "World",
        "Welcome to %s application",
        "Please click button: %1$s",
        "ignored_placeholder {name}"
    ];
    const targetLang = "zh-CN";

    console.log("Input:", texts);
    console.log(`Translating to ${targetLang}...`);

    try {
        const results = await client.translateBatch(texts, targetLang);
        console.log("Results:");
        results.forEach((res, i) => {
            console.log(`[${i}] ${texts[i]} => ${res}`);
        });
    } catch (e) {
        console.error("Test failed:", e);
    }
}

main();
