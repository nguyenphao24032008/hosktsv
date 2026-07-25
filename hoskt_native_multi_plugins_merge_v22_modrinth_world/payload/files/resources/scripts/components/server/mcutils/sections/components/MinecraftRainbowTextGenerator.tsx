'use client';

import React, { useState } from 'react';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import Select from '@/components/elements/Select';
import { copyTextToClipboard } from '../../utils/copyTextToClipboard';

const colorCodes: { [key: string]: string } = {
    '0': '#000000',
    '1': '#0000AA',
    '2': '#00AA00',
    '3': '#00AAAA',
    '4': '#AA0000',
    '5': '#AA00AA',
    '6': '#FFAA00',
    '7': '#AAAAAA',
    '8': '#555555',
    '9': '#5555FF',
    a: '#55FF55',
    b: '#55FFFF',
    c: '#FF5555',
    d: '#FF55FF',
    e: '#FFFF55',
    f: '#FFFFFF',
};

const formatCodes: { [key: string]: { label: string; style: React.CSSProperties } } = {
    l: { label: 'Bold', style: { fontWeight: 700 } },
    m: { label: 'Strikethrough', style: { textDecoration: 'line-through' } },
    n: { label: 'Underline', style: { textDecoration: 'underline' } },
    o: { label: 'Italic', style: { fontStyle: 'italic' } },
    k: { label: 'Obfuscated', style: { opacity: 0.7 } },
};

const presets: { [key: string]: string } = {
    'Smoother Rainbow': 'c6ea395',
    'Bright Rainbow': 'c6ea9b5',
    Chrome: 'f787',
    Christmas: '42',
    'Deep Rainbow': '4c6ea219bd5',
    Winter: '3bf',
    Fire: '44cc66ee',
    Tropical: 'c6b3b6c',
    Waves: '119bf',
    'Sunset Vibe': 'd6e5d6',
    Leaf: '2a',
    'Sunset 2.0': '9b6e6',
    'Candy Cane': 'fc',
    Bubblegum: 'bd',
    'Hardened Steel Waves': '7819bf',
    Patriotic: 'cf9fc',
    'Candy Corn': 'fe6cd',
    Lavender: '95d',
    MLM: '2af91',
    'Unicorn Rainbow': 'd6eabf',
    NiceFallBreeze: 'ffee6c4c6eef',
    '3D System Glitch': 'c40130',
    'Hotdog Boss': 'ec46ce',
    'Tis the Season': 'f4cfa2',
    'Hardened Magma': 'e6c47800',
    'The Matrix': 'a2278008722',
    'Pink Dragonfruit': '7dd5dd7f',
    Halloween: 're6',
};

export default function MinecraftRainbowTextGenerator() {
    const [input, setInput] = useState('Sample Text');
    const [colorOrder, setColorOrder] = useState('c6ea395');
    const [separator, setSeparator] = useState('§');
    const [formats, setFormats] = useState<string[]>([]);
    const [repeatCode, setRepeatCode] = useState(true);
    const [copyStatus, setCopyStatus] = useState('');

    const applyRainbowText = (text: string) => {
        if (!colorOrder.length) return text;

        let result = '';
        const currentFormatting = formats.map((format) => `${separator}${format}`).join('');

        for (let index = 0; index < text.length; index++) {
            const colorCode = colorOrder[index % colorOrder.length];
            if (text[index] !== ' ' || formats.includes('m') || formats.includes('n')) {
                result += `${separator}${colorCode}${repeatCode ? currentFormatting : ''}${text[index]}`;
            } else {
                result += ' ';
            }
        }

        return result;
    };

    const handleFormatToggle = (format: string) => {
        setFormats((previous) =>
            previous.includes(format) ? previous.filter((value) => value !== format) : [...previous, format]
        );
    };

    const copyToClipboard = async () => {
        const copied = await copyTextToClipboard(applyRainbowText(input));
        setCopyStatus(copied ? 'Copied to clipboard!' : 'Failed to copy');
        window.setTimeout(() => setCopyStatus(''), 2000);
    };

    return (
        <div className='hoskt-rainbow-root p-0 md:p-4 text-gray-200 font-mono w-full max-w-full min-w-0'>
            <style>{`
                .hoskt-rainbow-root {
                    width: 100%;
                    min-width: 0;
                    max-width: 100%;
                    overflow: visible;
                }

                .hoskt-rainbow-control {
                    position: relative;
                    width: 100%;
                    min-width: 0;
                    overflow: visible;
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
                    user-select: none;
                    cursor: pointer;
                }

                .hoskt-rainbow-control::before,
                .hoskt-rainbow-control::after,
                .hoskt-rainbow-check::before,
                .hoskt-rainbow-check::after {
                    content: none !important;
                    display: none !important;
                }

                .hoskt-rainbow-control:focus-visible {
                    outline: 2px solid rgba(45, 212, 191, 0.95);
                    outline-offset: 2px;
                }

                .hoskt-rainbow-check {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 1.4rem;
                    height: 1.4rem;
                    min-width: 1.4rem;
                    border: 1px solid rgb(82, 82, 91);
                    border-radius: 0.3rem;
                    color: white;
                    background: rgb(38, 38, 38);
                    font-family: Arial, sans-serif;
                    font-size: 0.95rem;
                    font-weight: 700;
                    line-height: 1;
                }

                .hoskt-rainbow-check[data-checked='true'] {
                    border-color: rgb(20, 184, 166);
                    background: rgb(13, 148, 136);
                }

                .hoskt-rainbow-radio {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 1.25rem;
                    height: 1.25rem;
                    min-width: 1.25rem;
                    border: 2px solid rgb(161, 161, 170);
                    border-radius: 9999px;
                    background: rgb(39, 39, 42);
                }

                .hoskt-rainbow-radio[data-checked='true']::after {
                    content: '';
                    display: block;
                    width: 0.58rem;
                    height: 0.58rem;
                    border-radius: 9999px;
                    background: rgb(45, 212, 191);
                }

                .hoskt-rainbow-dots {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-items: center;
                    gap: 0.2rem;
                    min-width: 0;
                }


                .hoskt-rainbow-preset-label {
                    color: rgb(244, 244, 245) !important;
                    -webkit-text-fill-color: rgb(244, 244, 245) !important;
                    opacity: 1 !important;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                }

                .hoskt-rainbow-preset[data-selected='true'] .hoskt-rainbow-preset-label {
                    color: rgb(255, 255, 255) !important;
                    -webkit-text-fill-color: rgb(255, 255, 255) !important;
                    font-weight: 700;
                }
            `}</style>

            <div className='mb-4'>
                <Label htmlFor='rainbow-input'>Your Message:</Label>
                <Input
                    id='rainbow-input'
                    type='text'
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    className='w-full max-w-full p-2 bg-gray-700 border border-gray-600 rounded text-white'
                />
            </div>

            <div className='mb-4'>
                <Label>Formatted Text:</Label>
                <div className='bg-gray-700 border border-gray-600 rounded p-2 min-h-[50px] mb-2 break-words'>
                    {input.split('').map((character, index) => (
                        <span
                            key={`${character}-${index}`}
                            style={{ color: colorCodes[colorOrder[index % Math.max(colorOrder.length, 1)]] }}
                            className={`${formats.includes('l') ? 'font-bold' : ''} ${
                                formats.includes('m') ? 'line-through' : ''
                            } ${formats.includes('n') ? 'underline' : ''} ${formats.includes('o') ? 'italic' : ''} ${
                                formats.includes('k') ? 'opacity-70' : ''
                            }`}
                        >
                            {character}
                        </span>
                    ))}
                </div>
                <button
                    type='button'
                    onClick={copyToClipboard}
                    className='inline-flex items-center justify-center gap-2 border bg-neutral-600 border-neutral-500 text-neutral-100 rounded-md px-3 py-2 text-sm hover:bg-neutral-500'
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
                    <span>Copy</span>
                </button>
                {copyStatus && <p className='mt-2 text-green-400'>{copyStatus}</p>}
            </div>

            <div className='mb-4'>
                <div className='mb-2'>
                    <Label htmlFor='rainbow-separator'>Separator:</Label>
                    <Select
                        id='rainbow-separator'
                        value={separator}
                        onChange={(event) => setSeparator(event.target.value)}
                        className='p-2 bg-gray-700 border border-gray-600 rounded text-white'
                    >
                        <option value='&'>Classic (&amp;)</option>
                        <option value='§'>Vanilla (§)</option>
                    </Select>
                </div>
                <div className='mb-2'>
                    <Label htmlFor='rainbow-color-order'>Color Order:</Label>
                    <Input
                        id='rainbow-color-order'
                        type='text'
                        value={colorOrder}
                        onChange={(event) => setColorOrder(event.target.value.replace(/[^0-9a-f]/gi, ''))}
                        className='w-full max-w-full p-2 bg-gray-700 border border-gray-600 rounded text-white'
                    />
                </div>

                <div className='mb-3'>
                    <Label>Formatting Codes</Label>
                    <div className='space-y-2' role='group' aria-label='Formatting codes'>
                        {Object.entries(formatCodes).map(([code, format]) => {
                            const checked = formats.includes(code);
                            return (
                                <button
                                    type='button'
                                    key={code}
                                    role='checkbox'
                                    aria-checked={checked}
                                    onClick={() => handleFormatToggle(code)}
                                    className='hoskt-rainbow-control flex items-center gap-3 rounded-md border border-neutral-600 bg-neutral-700 px-3 py-3 text-left text-neutral-100'
                                >
                                    <span className='hoskt-rainbow-check' data-checked={checked ? 'true' : 'false'}>
                                        {checked ? '✓' : ''}
                                    </span>
                                    <span className='min-w-0 break-words' style={format.style}>
                                        {format.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className='mb-2'>
                    <Label>Options</Label>
                    <button
                        type='button'
                        role='checkbox'
                        aria-checked={repeatCode}
                        onClick={() => setRepeatCode((value) => !value)}
                        className='hoskt-rainbow-control flex items-start gap-3 rounded-md border border-neutral-600 bg-neutral-700 px-3 py-3 text-left text-neutral-100'
                    >
                        <span className='hoskt-rainbow-check mt-0.5' data-checked={repeatCode ? 'true' : 'false'}>
                            {repeatCode ? '✓' : ''}
                        </span>
                        <span className='min-w-0 break-words'>Repeat formatting code after each color</span>
                    </button>
                </div>
            </div>

            <Label>Presets</Label>
            <div className='mb-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2'>
                    {Object.entries(presets).map(([label, colors]) => {
                        const selected = colorOrder === colors;
                        return (
                            <button
                                type='button'
                                key={label}
                                aria-pressed={selected}
                                onClick={() => setColorOrder(colors)}
                                data-selected={selected ? 'true' : 'false'}
                                className={`hoskt-rainbow-control hoskt-rainbow-preset flex items-center gap-3 rounded-md border p-3 text-neutral-100 ${
                                    selected
                                        ? 'border-primary-400 bg-primary-700'
                                        : 'border-neutral-600 bg-neutral-700 hover:bg-neutral-600'
                                }`}
                            >
                                <span className='hoskt-rainbow-radio' data-checked={selected ? 'true' : 'false'} />
                                <span className='flex min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center'>
                                    <span className='hoskt-rainbow-preset-label block w-full break-words font-medium'>{label}</span>
                                    <span className='hoskt-rainbow-dots' aria-hidden='true'>
                                        {colors.split('').map((color, index) => (
                                            <span
                                                key={`${label}-${color}-${index}`}
                                                className='w-4 h-4 flex-shrink-0 rounded-full border border-black border-opacity-10'
                                                style={{ backgroundColor: colorCodes[color] || '#777777' }}
                                            />
                                        ))}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <Label>Color Codes</Label>
                <div className='grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2'>
                    {Object.entries(colorCodes).map(([code, color]) => (
                        <div key={code} className='flex items-center min-w-0'>
                            <span className='w-6 h-6 flex-shrink-0 rounded mr-2' style={{ backgroundColor: color }} />
                            <span>&amp;{code}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
