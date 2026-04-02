export interface AIConfig {
    baseUrl: string;
    apiKey: string;
    modelId: string;
    systemPrompt?: string;
}

export const TRANSLATION_ERROR_PLACEHOLDER = "[Translation Error]";

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
5. 每个翻译结果前必须带上对应的锚点标记 <<数字>>，如 <<1>> 翻译内容
6. 只输出翻译后的文本，不要添加 markdown 格式、代码块、反引号、前言、解释、对话或任何额外内容
7. 不要重复源文本或语言名称`;
    }

    /**
     * Clean raw AI response content before parsing.
     * Strips markdown code fences, conversational preamble, and other formatting artifacts.
     */
    private cleanResponse(raw: string): string {
        let cleaned = raw;

        // 1. Remove markdown code fences
        cleaned = cleaned.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

        // 2. Remove leading conversational preamble before the first anchor <<1>>
        const firstAnchor = cleaned.search(/<<\d+>>/);
        if (firstAnchor > 0) {
            const before = cleaned.substring(0, firstAnchor).trim();
            if (before.length > 10) {
                cleaned = cleaned.substring(firstAnchor);
            }
        }

        // 3. Remove backtick wrapping
        cleaned = cleaned.replace(/^`+/, '').replace(/`+$/, '');

        return cleaned.trim();
    }

    /**
     * Parse AI response using anchor markers <<N>>.
     * Returns a map of anchor index -> translated text.
     */
    private parseAnchored(content: string, count: number): Map<number, string> {
        const result = new Map<number, string>();

        // Match patterns like <<1>> translated text (until next <<N>> or end of string)
        const anchorRegex = /<<(\d+)>>\s*([\s\S]*?)(?=<<\d+>>|$)/g;
        let match;

        while ((match = anchorRegex.exec(content)) !== null) {
            const index = parseInt(match[1], 10);
            let text = match[2].trim();

            // Clean up any residual formatting on individual items
            text = text.replace(/^\[?\d+\]?\.?\s*/, '').trim();
            text = text.replace(/^`+/, '').replace(/`+$/, '').trim();
            // Remove trailing ### separators if AI still added them
            text = text.replace(/\s*###\s*$/, '').trim();

            if (index >= 1 && index <= count && text.length > 0) {
                result.set(index, text);
            }
        }

        return result;
    }

    /**
     * Fallback: parse by ### separator (legacy method) when anchors are not present.
     * Returns ordered array of translated parts.
     */
    private parseBySeparator(content: string): string[] {
        let parts = content.split('###').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

        // Cleanup indices like "[1] " or "1. "
        parts = parts.map((t: string) => t.replace(/^\[?\d+\]?\.?\s*/, '').trim());

        // Remove any remaining backtick wrapping
        parts = parts.map((t: string) => t.replace(/^`+/, '').replace(/`+$/, '').trim());

        return parts;
    }

    /**
     * Translate a single text (used for retry fallback).
     */
    private async translateSingle(text: string, targetLang: string): Promise<string> {
        const prompt = `请将以下文本翻译成${targetLang}，只输出翻译结果，不要添加任何额外内容：\n\n${text}`;

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
            throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        let result = data.choices[0]?.message?.content?.trim() || '';

        // Basic cleanup
        result = result.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
        result = result.replace(/^`+/, '').replace(/`+$/, '').trim();

        return result;
    }

    async translateBatch(texts: string[], targetLang: string): Promise<string[]> {
        if (texts.length === 0) return [];

        // Filter non-empty texts
        const nonEmptyItems = texts
            .map((text, index) => ({ text, index }))
            .filter((item) => item.text && item.text.trim().length > 0);

        if (nonEmptyItems.length === 0) {
            return texts.map(() => "");
        }

        // Build prompt with anchor markers <<N>>
        let prompt = `请将以下文本翻译成${targetLang}。注意事项：
1. 每个翻译结果前必须带上对应的锚点标记，如 <<1>> 翻译内容
2. 按顺序翻译每个文本，不要遗漏
3. 不要合并或拆分文本
4. 只输出翻译结果，不要添加任何 markdown 格式、代码块(\`\`\`)、反引号、前言或解释

需要翻译的文本：

`;

        nonEmptyItems.forEach((item, i) => {
            prompt += `<<${i + 1}>> ${item.text}\n`;
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

            // Run cleaning pipeline
            const content = this.cleanResponse(rawContent);

            // Try anchor-based parsing first
            const anchorMap = this.parseAnchored(content, nonEmptyItems.length);

            // Map results back to original array
            const results: string[] = new Array(texts.length).fill("");
            const unmatchedItems: { text: string; index: number; anchorIndex: number }[] = [];

            if (anchorMap.size > 0) {
                // Anchor-based matching
                for (let i = 0; i < nonEmptyItems.length; i++) {
                    const item = nonEmptyItems[i];
                    const anchorIndex = i + 1;
                    const translated = anchorMap.get(anchorIndex);
                    if (translated) {
                        results[item.index] = translated;
                    } else {
                        unmatchedItems.push({ text: item.text, index: item.index, anchorIndex });
                    }
                }
            } else {
                // Fallback: split by ### separator (legacy)
                console.warn('No anchor markers found in AI response, falling back to ### separator parsing');
                const parts = this.parseBySeparator(content);

                let partIndex = 0;
                for (const item of nonEmptyItems) {
                    if (partIndex < parts.length) {
                        results[item.index] = parts[partIndex];
                        partIndex++;
                    } else {
                        unmatchedItems.push({ text: item.text, index: item.index, anchorIndex: 0 });
                    }
                }
            }

            // Retry unmatched items one-by-one
            if (unmatchedItems.length > 0) {
                console.warn(`${unmatchedItems.length} items unmatched, retrying individually...`);
                for (const item of unmatchedItems) {
                    try {
                        const singleResult = await this.translateSingle(item.text, targetLang);
                        if (singleResult) {
                            results[item.index] = singleResult;
                        } else {
                            results[item.index] = TRANSLATION_ERROR_PLACEHOLDER;
                        }
                    } catch (err) {
                        console.error(`Single retry failed for "${item.text}":`, err);
                        results[item.index] = TRANSLATION_ERROR_PLACEHOLDER;
                    }
                }
            }

            return results;

        } catch (error) {
            console.error("Translation error:", error);
            throw error;
        }
    }
}
