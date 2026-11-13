export type TermMetadata = {
    developerOwner: string;
    requestNote?: string;
};

export function metadataRemarks(metadata: TermMetadata): string[] {
    return [
        `[Developer]: ${metadata.developerOwner}`,
        ...(metadata.requestNote ? [`[Request / Issue]: ${metadata.requestNote}`] : []),
    ];
}

/** Append whole notes once, retaining the original remarks verbatim. */
export function appendRemarks(existing: string | null | undefined, additions: (string | null | undefined)[]): string | null {
    let result = existing ?? '';
    for (const addition of additions) {
        if (!addition || `\n${result}\n`.includes(`\n${addition}\n`)) continue;
        result += `${result && !result.endsWith('\n') ? '\n' : ''}${addition}`;
    }
    return result || null;
}
