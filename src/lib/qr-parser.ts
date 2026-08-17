export interface ParseResult {
    type: 'sku';
    identifier: string;
}

export function parseQRContent(scannedText: string, customPattern?: string): ParseResult {
    // Pattern 1: Text mode → "QRPOS::LUX-100::Lux Soap::50"
    if (scannedText.startsWith('QRPOS::')) {
        const sku = scannedText.split('::')[1];
        return { type: 'sku', identifier: sku };
    }

    // Pattern 2: App page URL → "https://qrpos.app/p/LUX-100"
    if (scannedText.includes('/p/')) {
        const identifier = scannedText.split('/p/')[1];
        return { type: 'sku', identifier };
    }

    // Pattern 3: Custom URL → extract SKU from URL pattern
    if (customPattern && customPattern.includes('{sku}')) {
        const regexPattern = customPattern.replace('{sku}', '(.+)').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\(\\.+\\)', '(.+)');
        const regex = new RegExp(regexPattern);
        const match = scannedText.match(regex);
        if (match && match[1]) {
            return { type: 'sku', identifier: match[1] };
        }
    }

    // Pattern 4: Plain SKU text
    return { type: 'sku', identifier: scannedText.trim() };
}
