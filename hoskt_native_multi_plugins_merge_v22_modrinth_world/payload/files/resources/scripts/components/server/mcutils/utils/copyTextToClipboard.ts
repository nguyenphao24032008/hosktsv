/**
 * Copy text on both secure HTTPS panels and plain-HTTP test panels.
 *
 * navigator.clipboard is intentionally unavailable on many Android browsers
 * when the panel is opened through http://IP:PORT. The legacy textarea path is
 * therefore executed synchronously while the click still has user activation.
 */
const legacyCopyText = (text: string): boolean => {
    if (typeof document === 'undefined' || !document.body) return false;

    const activeElement = document.activeElement as HTMLElement | null;
    const inputElement =
        activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
            ? activeElement
            : null;
    const selectionStart = inputElement?.selectionStart ?? null;
    const selectionEnd = inputElement?.selectionEnd ?? null;
    const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.padding = '0';
    textarea.style.border = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.fontSize = '16px';

    document.body.appendChild(textarea);

    let copied = false;
    try {
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        copied = document.execCommand('copy');
    } catch (error) {
        console.error('Legacy clipboard copy failed:', error);
    } finally {
        textarea.remove();

        try {
            activeElement?.focus();
            if (inputElement && selectionStart !== null && selectionEnd !== null) {
                inputElement.setSelectionRange(selectionStart, selectionEnd);
            }
        } catch (_) {
            // Restoring focus is best-effort only.
        }

        if (typeof window !== 'undefined') {
            window.scrollTo(scrollX, scrollY);
        }
    }

    return copied;
};

export const copyTextToClipboard = async (value: string): Promise<boolean> => {
    const text = String(value ?? '');

    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    // Plain HTTP on an IP address is not a secure context. Run the fallback
    // immediately, before any await can consume the mobile click activation.
    if (!window.isSecureContext || !navigator.clipboard?.writeText) {
        return legacyCopyText(text);
    }

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Clipboard API copy failed, trying fallback:', error);
        return legacyCopyText(text);
    }
};
