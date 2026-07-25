'use client';

import React, { useRef, useState } from 'react';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import { copyTextToClipboard } from '../../utils/copyTextToClipboard';

const colorCodes: { [key: string]: { color: string; name: string } } = {
    '0': { color: '#000000', name: 'Black' },
    '1': { color: '#0000AA', name: 'Dark Blue' },
    '2': { color: '#00AA00', name: 'Dark Green' },
    '3': { color: '#00AAAA', name: 'Dark Aqua' },
    '4': { color: '#AA0000', name: 'Dark Red' },
    '5': { color: '#AA00AA', name: 'Dark Purple' },
    '6': { color: '#FFAA00', name: 'Gold' },
    '7': { color: '#AAAAAA', name: 'Gray' },
    '8': { color: '#555555', name: 'Dark Gray' },
    '9': { color: '#5555FF', name: 'Blue' },
    a: { color: '#55FF55', name: 'Green' },
    b: { color: '#55FFFF', name: 'Aqua' },
    c: { color: '#FF5555', name: 'Red' },
    d: { color: '#FF55FF', name: 'Light Purple' },
    e: { color: '#FFFF55', name: 'Yellow' },
    f: { color: '#FFFFFF', name: 'White' },
};

const formatCodes: { [key: string]: { name: string; style: React.CSSProperties } } = {
    l: { name: 'Bold', style: { fontWeight: 700 } },
    n: { name: 'Underline', style: { textDecoration: 'underline' } },
    o: { name: 'Italic', style: { fontStyle: 'italic' } },
    m: { name: 'Strikethrough', style: { textDecoration: 'line-through' } },
    k: { name: 'Obfuscated', style: { opacity: 0.7 } },
    r: { name: 'Reset', style: {} },
};

const parseMinecraftText = (text: string) => {
    const parts: { text: string; color: string; style: React.CSSProperties }[] = [];
    let currentColor = 'inherit';
    let currentStyle: React.CSSProperties = {};
    let buffer = '';

    for (let index = 0; index < text.length; index++) {
        if (text[index] === '&' && index + 1 < text.length) {
            if (buffer) {
                parts.push({ text: buffer, color: currentColor, style: currentStyle });
                buffer = '';
            }

            const code = text[index + 1].toLowerCase();
            if (code in colorCodes) {
                currentColor = colorCodes[code].color;
                currentStyle = {};
            } else if (code in formatCodes) {
                if (code === 'r') {
                    currentColor = 'inherit';
                    currentStyle = {};
                } else {
                    currentStyle = { ...currentStyle, ...formatCodes[code].style };
                }
            }
            index++;
        } else {
            buffer += text[index];
        }
    }

    if (buffer) parts.push({ text: buffer, color: currentColor, style: currentStyle });
    return parts;
};

export default function MinecraftColorCodeGenerator() {
    const [input, setInput] = useState('&aHello &cMinecraft &bWorld!');
    const [copyStatus, setCopyStatus] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addCode = (code: string) => {
        if (!inputRef.current) return;

        const start = inputRef.current.selectionStart;
        const end = inputRef.current.selectionEnd;
        const newValue = input.substring(0, start ?? 0) + `&${code}` + input.substring(end ?? input.length);
        setInput(newValue);

        setTimeout(() => {
            if (!inputRef.current) return;
            if (start !== null) inputRef.current.selectionStart = inputRef.current.selectionEnd = start + 2;
            inputRef.current.focus();
        }, 0);
    };

    const copyToClipboard = async () => {
        const copied = await copyTextToClipboard(input);
        setCopyStatus(copied ? 'Copied to clipboard!' : 'Failed to copy');
        window.setTimeout(() => setCopyStatus(''), 2000);
    };

    return (
        <div className='hoskt-classic-colors p-0 md:p-4 text-gray-200 w-full max-w-full min-w-0'>
            <style>{`
                .hoskt-classic-control {
                    appearance: none;
                    -webkit-appearance: none;
                    background-image: none !important;
                    transform: none !important;
                    filter: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    contain: none !important;
                    will-change: auto !important;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: auto !important;
                }

                .hoskt-classic-control::before,
                .hoskt-classic-control::after {
                    content: none !important;
                    display: none !important;
                }
            `}</style>

            <Label>Text</Label>
            <div className='mb-4'>
                <Input
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder='Enter text with color codes (e.g., &aHello &cMinecraft)'
                    className='w-full max-w-full bg-gray-700 border border-gray-600 rounded-md text-gray-200 font-mono text-sm p-2 resize-y focus:outline-none focus:border-blue-500'
                />
            </div>

            <div className='mb-4'>
                <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2'>
                    <Label>Preview</Label>
                    <button
                        type='button'
                        onClick={copyToClipboard}
                        className='hoskt-classic-control inline-flex items-center justify-center gap-2 border bg-neutral-600 border-neutral-500 text-neutral-200 rounded-md px-3 py-2 text-xs hover:bg-gray-600'
                    >
                        <svg
                            aria-hidden='true'
                            xmlns='http://www.w3.org/2000/svg'
                            width='14'
                            height='14'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
                            <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
                        </svg>
                        Copy
                    </button>
                </div>
                {copyStatus && <div className='text-green-500 text-sm mb-2'>{copyStatus}</div>}
                <div className='bg-gray-700 border border-gray-600 rounded-md p-2 font-mono text-sm min-h-[2.5rem] break-words'>
                    {parseMinecraftText(input).map((part, index) => (
                        <span key={index} style={{ color: part.color, ...part.style }}>
                            {part.text}
                        </span>
                    ))}
                </div>
            </div>

            <div className='mb-4'>
                <Label>Format Options</Label>
                <div className='flex flex-wrap gap-2'>
                    {Object.entries(formatCodes).map(([code, format]) => (
                        <button
                            type='button'
                            key={code}
                            onClick={() => addCode(code)}
                            className='hoskt-classic-control bg-gray-700 border border-gray-600 rounded-md text-gray-200 px-3 py-2 text-xs hover:bg-gray-600 hover:border-blue-500'
                            style={format.style}
                        >
                            {format.name} [&amp;{code}]
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <Label>Colors</Label>
                <div className='grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2'>
                    {Object.entries(colorCodes).map(([code, color]) => (
                        <button
                            type='button'
                            key={code}
                            onClick={() => addCode(code)}
                            className='hoskt-classic-control flex min-w-0 w-full items-center justify-center gap-2 border border-neutral-500 bg-neutral-700 rounded-md px-2 py-3 text-xs text-gray-200 hover:bg-neutral-600'
                        >
                            <span
                                className='w-4 h-4 flex-shrink-0 rounded-full border border-gray-500'
                                style={{ backgroundColor: color.color }}
                            />
                            <span className='min-w-0 break-words'>
                                {color.name} [&amp;{code}]
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
