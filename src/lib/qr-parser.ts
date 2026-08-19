export interface ParseResult {
    type: 'sku';
    identifier: string;
}

export function parseQRContent(scannedText: string, customPattern?: string): ParseResult {
    const text = scannedText ? scannedText.trim() : '';
    if (!text) return { type: 'sku', identifier: '' };

    // Pattern 1: QRPOS prefix → "QRPOS::LUX-100" or "QRPOS::LUX-100::..."
    if (text.startsWith('QRPOS::')) {
        const parts = text.split('::');
        return { type: 'sku', identifier: parts[1] || text };
    }

    // Pattern 2: Query param sku → "http://localhost:3000/p?sku=PRD-001"
    if (text.includes('sku=')) {
        try {
            const urlObj = new URL(text);
            const skuParam = urlObj.searchParams.get('sku');
            if (skuParam) return { type: 'sku', identifier: skuParam };
        } catch (e) {
            const match = text.match(/[?&]sku=([^&]+)/);
            if (match && match[1]) return { type: 'sku', identifier: decodeURIComponent(match[1]) };
        }
    }

    // Pattern 3: Path parameter /p/SKU → "https://qrpos.app/p/LUX-100"
    if (text.includes('/p/')) {
        const identifier = text.split('/p/')[1]?.split('?')[0]?.split('/')[0];
        if (identifier) return { type: 'sku', identifier };
    }

    // Pattern 4: Custom URL pattern extraction
    if (customPattern && customPattern.includes('{sku}')) {
        const prefix = customPattern.split('{sku}')[0];
        const suffix = customPattern.split('{sku}')[1] || '';
        if (text.startsWith(prefix)) {
            let extracted = text.substring(prefix.length);
            if (suffix && extracted.endsWith(suffix)) {
                extracted = extracted.substring(0, extracted.length - suffix.length);
            }
            if (extracted) return { type: 'sku', identifier: extracted };
        }
    }

    // Fallback: Plain SKU text
    return { type: 'sku', identifier: text };
}
