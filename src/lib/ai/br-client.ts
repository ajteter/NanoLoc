export interface AIConfig {
    baseUrl: string;
    apiKey: string;
    modelId: string;
    systemPrompt?: string;
}

export class BRClient {
    private config: AIConfig;

    constructor(config: AIConfig) {
        this.config = config;
    }

    private get defaultSystemPrompt() {
        return this.config.systemPrompt || `你是一个专业的多语言翻译专家。在处理批量翻译时请注意：
1. 每个文本都必须翻译，保持原有顺序
2. 占位符（如 {name}, %s, %1$s 等）和换行符(\\n)保持原样不翻译
3. 标点符号要符合目标语言的使用习惯和位置
4. 保持简洁准确，不要添加任何额外的解释或标记
5. 使用 ### 分隔每个翻译结果
6. 只输出翻译后的文本，不要添加 markdown 格式、代码块、反引号、前言、解释、对话或任何额外内容
7. 不要重复源文本或语言名称`;
    }

    /**
     * Clean raw AI response content before splitting.
     * Strips markdown code fences, conversational preamble, and other formatting artifacts.
     */
    private cleanResponse(raw: string): string {
        let cleaned = raw;

        // 1. Remove markdown code fences: ```...``` or ```lang\n...\n```
        cleaned = cleaned.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

        // 2. Remove leading conversational preamble before the first actual translation
        //    Heuristic: if the first ### appears, everything before it is likely preamble
        const firstSep = cleaned.indexOf('###');
        if (firstSep > 0) {
            const before = cleaned.substring(0, firstSep).trim();
            // If the preamble contains sentence-like text (> 20 chars, no ###), discard it
            if (before.length > 20) {
                cleaned = cleaned.substring(firstSep);
            }
        }

        // 3. If no ### separators exist (single item), try to extract just the translation
        //    by stripping common preamble patterns
        if (!cleaned.includes('###')) {
            // Remove lines that look like AI preamble (contains ：or : followed by newline, then the actual translation)
            const lines = cleaned.split('\n').filter(l => l.trim().length > 0);
            if (lines.length > 1) {
                // Check if first line looks like preamble (contains language descriptors or role statements)
                const preamblePatterns = [
                    /ローカライゼーション/,  // Japanese localization talk
                    /翻訳を提供/,              // Japanese "providing translation"
                    /यहाँ.*अनुवाद/,            // Hindi "here is the translation"
                    /बिल्कुल/,                 // Hindi "absolutely"
                    /here (?:is|are) the/i,    // English preamble
                    /voici la traduction/i,    // French preamble
                    /aquí está la traducción/i, // Spanish preamble
                    /翻译如下/,                // Chinese preamble
                    /以下是.*翻译/,            // Chinese "below is translation"
                ];
                // Keep removing leading preamble lines
                while (lines.length > 1 && preamblePatterns.some(p => p.test(lines[0]))) {
                    lines.shift();
                }
            }
            cleaned = lines.join('\n');
        }

        return cleaned.trim();
    }

    async translateBatch(texts: string[], targetLang: string): Promise<string[]> {
        if (texts.length === 0) return [];

        // Filter non-empty texts for the prompt logic to match python script behavior
        const nonEmptyItems = texts
            .map((text, index) => ({ text, index }))
            .filter((item) => item.text && item.text.trim().length > 0);

        if (nonEmptyItems.length === 0) {
            return texts.map(() => "");
        }

        let prompt = `请将以下文本翻译成${targetLang}。注意事项：
1. 每个翻译后的文本用 ### 分隔
2. 按顺序翻译每个文本
3. 不要在翻译结果中包含序号
4. 不要遗漏任何文本
5. 不要合并或拆分文本
6. 只输出翻译结果，不要添加任何 markdown 格式、代码块(\`\`\`)、反引号、前言或解释

需要翻译的文本：

`;

        nonEmptyItems.forEach((item, i) => {
            prompt += `[${i + 1}] ${item.text}\n`;
        });

        try {
            const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.modelId,
                    messages: [
                        { role: 'system', content: this.defaultSystemPrompt },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            const rawContent = data.choices[0]?.message?.content?.trim() || '';

            // Run cleaning pipeline before splitting
            const content = this.cleanResponse(rawContent);

            // Post-processing
            // 1. Split by ###
            let parts = content.split('###').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

            // 2. Cleanup indices like "[1] " or "1. "
            parts = parts.map((t: string) => {
                return t.replace(/^\[?\d+\]?\.?\s*/, '').trim();
            });

            // 3. Remove any remaining backtick wrapping on individual parts
            parts = parts.map((t: string) => {
                return t.replace(/^`+/, '').replace(/`+$/, '').trim();
            });

            // 4. Map back to original array
            const results: string[] = new Array(texts.length).fill("");

            let partIndex = 0;
            for (const item of nonEmptyItems) {
                if (partIndex < parts.length) {
                    results[item.index] = parts[partIndex];
                    partIndex++;
                } else {
                    console.warn(`Missing translation for item ${item.index} ("${item.text}")`);
                    results[item.index] = "[Translation Error]";
                }
            }

            return results;

        } catch (error) {
            console.error("Translation error:", error);
            throw error;
        }
    }
}
