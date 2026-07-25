'use client';

import React, { useState, useRef } from 'react';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import { copyTextToClipboard } from '../../utils/copyTextToClipboard';

const colorMap: { [key: string]: string } = {
    black: '#000000',
    dark_blue: '#0000AA',
    dark_green: '#00AA00',
    dark_aqua: '#00AAAA',
    dark_red: '#AA0000',
    dark_purple: '#AA00AA',
    gold: '#FFAA00',
    gray: '#AAAAAA',
    dark_gray: '#555555',
    blue: '#5555FF',
    green: '#55FF55',
    aqua: '#55FFFF',
    red: '#FF5555',
    light_purple: '#FF55FF',
    yellow: '#FFFF55',
    white: '#FFFFFF',
};

const decorations = [
    { tag: 'bold', label: 'Bold', style: { fontWeight: 'bold' } },
    { tag: 'italic', label: 'Italic', style: { fontStyle: 'italic' } },
    { tag: 'underlined', label: 'Underline', style: { textDecoration: 'underline' } },
    { tag: 'strikethrough', label: 'Strikethrough', style: { textDecoration: 'line-through' } },
    { tag: 'obfuscated', label: 'Obfuscated', style: { opacity: 0.5 } },
];

interface ParsedPart {
    text: string;
    style: React.CSSProperties;
}

const parseMiniMessage = (message: string): ParsedPart[] => {
    const parts: ParsedPart[] = [];
    const tagStack: string[] = [];
    let currentText = '';
    const currentStyle: React.CSSProperties = {};

    const pushCurrentPart = () => {
        if (currentText) {
            parts.push({ text: currentText, style: { ...currentStyle } });
            currentText = '';
        }
    };

    const applyTag = (tag: string, close: boolean) => {
        switch (tag) {
            case 'bold':
                currentStyle.fontWeight = close ? undefined : 'bold';
                break;
            case 'italic':
                currentStyle.fontStyle = close ? undefined : 'italic';
                break;
            case 'underlined':
                currentStyle.textDecoration = close ? undefined : 'underline';
                break;
            case 'strikethrough':
                currentStyle.textDecoration = close ? undefined : 'line-through';
                break;
            case 'obfuscated':
                currentStyle.opacity = close ? undefined : 0.5;
                break;
            default:
                if (colorMap[tag] && !close) {
                    currentStyle.color = colorMap[tag];
                }
                break;
        }
    };

    for (let i = 0; i < message.length; i++) {
        if (message[i] === '<') {
            const closeTag = message[i + 1] === '/';
            const endIndex = message.indexOf('>', i);
            if (endIndex !== -1) {
                pushCurrentPart();
                const tag = message.slice(i + (closeTag ? 2 : 1), endIndex).toLowerCase();
                if (closeTag) {
                    const lastOpenTag = tagStack.pop();
                    if (lastOpenTag) {
                        applyTag(lastOpenTag, true);
                    }
                } else {
                    applyTag(tag, false);
                    tagStack.push(tag);
                }
                i = endIndex;
                continue;
            }
        }
        currentText += message[i];
    }

    pushCurrentPart();
    return parts;
};

export default function MiniMessageBuilder() {
    const [input, setInput] = useState('');
    const [copyStatus, setCopyStatus] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (tag: string) => {
        if (inputRef.current) {
            const start = inputRef.current.selectionStart;
            const end = inputRef.current.selectionEnd;
            const selectedText = input.substring(start ?? 0, end ?? input.length);
            const newText = `<${tag}>${selectedText}</${tag}>`;
            const newValue = input.substring(0, start ?? 0) + newText + input.substring(end ?? input.length);
            setInput(newValue);

            window.setTimeout(() => {
                const element = inputRef.current;
                if (!element) return;
                if (start !== null && end !== null) {
                    element.selectionStart = start + tag.length + 2;
                    element.selectionEnd = start + newText.length - tag.length - 3;
                }
                element.focus();
            }, 0);
        }
    };

    const copyToClipboard = async () => {
        const copied = await copyTextToClipboard(input);
        setCopyStatus(copied ? 'Copied to clipboard!' : 'Failed to copy');
        window.setTimeout(() => setCopyStatus(''), 2000);
    };

    return (
        <div className='p-0 md:p-4 text-gray-200 w-full max-w-full min-w-0'>
            <Label htmlFor='input'>Text:</Label>
            <div className='mb-4'>
                <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='Enter your MiniMessage text here...'
                    className='w-full max-w-full bg-gray-700 border border-gray-600 rounded-md text-gray-200 font-mono text-sm p-2 resize-y focus:outline-none focus:border-blue-500'
                />
            </div>

            <div className='mb-4'>
                <div className='flex flex-wrap gap-2 mb-2'>
                    {Object.entries(colorMap).map(([color, hex]) => (
                        <button
                            type='button'
                            key={color}
                            onClick={() => addTag(color)}
                            className='hoskt-mcutils-safe-button w-6 h-6 rounded-md border border-gray-600'
                            style={{ backgroundColor: hex }}
                            title={color}
                        />
                    ))}
                </div>
                <div className='flex flex-wrap gap-2'>
                    {decorations.map((dec) => (
                        <button
                            type='button'
                            key={dec.tag}
                            onClick={() => addTag(dec.tag)}
                            className='hoskt-mcutils-safe-button bg-gray-700 border border-gray-600 rounded-md text-gray-200 px-2 py-1 text-xs hover:bg-gray-600 hover:border-blue-500 transition-all duration-200'
                            style={dec.style as React.CSSProperties}
                        >
                            {dec.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className='mb-4'>
                <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2'>
                    <Label>Preview</Label>
                    <button
                        type='button'
                        onClick={copyToClipboard}
                        className='hoskt-mcutils-safe-button inline-flex items-center gap-2 border border-gray-600 rounded-md text-gray-200 px-2 py-1 text-xs hover:bg-gray-600 hover:border-blue-500 transition-all duration-200'
                    >
                        <svg
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
                            <rect x='9' y='9' width='13' height='13' rx='2' ry='2'></rect>
                            <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>
                        </svg>
                        Copy
                    </button>
                </div>
                {copyStatus && <div className='text-green-500 text-sm mb-2'>{copyStatus}</div>}
                <div className='bg-gray-700 border border-gray-600 rounded-md p-2 font-mono text-sm min-h-[2.5rem] break-words'>
                    {parseMiniMessage(input).map((part, index) => (
                        <span key={index} style={part.style}>
                            {part.text}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
