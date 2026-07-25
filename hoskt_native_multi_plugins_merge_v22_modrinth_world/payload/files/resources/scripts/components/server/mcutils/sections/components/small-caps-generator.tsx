'use client';

import Select from '@/components/elements/Select';
import React, { useState, useRef } from 'react';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import { copyTextToClipboard } from '../../utils/copyTextToClipboard';

const fontMaps = {
    normal: {},
    'small-caps': {
        a: 'ᴀ',
        b: 'ʙ',
        c: 'ᴄ',
        d: 'ᴅ',
        e: 'ᴇ',
        f: 'ꜰ',
        g: 'ɢ',
        h: 'ʜ',
        i: 'ɪ',
        j: 'ᴊ',
        k: 'ᴋ',
        l: 'ʟ',
        m: 'ᴍ',
        n: 'ɴ',
        o: 'ᴏ',
        p: 'ᴘ',
        q: 'ǫ',
        r: 'ʀ',
        s: 'ѕ',
        t: 'ᴛ',
        u: 'ᴜ',
        v: 'ᴠ',
        w: 'ᴡ',
        x: 'x',
        y: 'ʏ',
        z: 'ᴢ',
    },
    'mathematical-bold': {
        a: '𝐚',
        b: '𝐛',
        c: '𝐜',
        d: '𝐝',
        e: '𝐞',
        f: '𝐟',
        g: '𝐠',
        h: '𝐡',
        i: '𝐢',
        j: '𝐣',
        k: '𝐤',
        l: '𝐥',
        m: '𝐦',
        n: '𝐧',
        o: '𝐨',
        p: '𝐩',
        q: '𝐪',
        r: '𝐫',
        s: '𝐬',
        t: '𝐭',
        u: '𝐮',
        v: '𝐯',
        w: '𝐰',
        x: '𝐱',
        y: '𝐲',
        z: '𝐳',
        A: '𝐀',
        B: '𝐁',
        C: '𝐂',
        D: '𝐃',
        E: '𝐄',
        F: '𝐅',
        G: '𝐆',
        H: '𝐇',
        I: '𝐈',
        J: '𝐉',
        K: '𝐊',
        L: '𝐋',
        M: '𝐌',
        N: '𝐍',
        O: '𝐎',
        P: '𝐏',
        Q: '𝐐',
        R: '𝐑',
        S: '𝐒',
        T: '𝐓',
        U: '𝐔',
        V: '𝐕',
        W: '𝐖',
        X: '𝐗',
        Y: '𝐘',
        Z: '𝐙',
    },
    'mathematical-script': {
        a: '𝒶',
        b: '𝒷',
        c: '𝒸',
        d: '𝒹',
        e: '𝑒',
        f: '𝒻',
        g: '𝑔',
        h: '𝒽',
        i: '𝒾',
        j: '𝒿',
        k: '𝓀',
        l: '𝓁',
        m: '𝓂',
        n: '𝓃',
        o: '𝑜',
        p: '𝓅',
        q: '𝓆',
        r: '𝓇',
        s: '𝓈',
        t: '𝓉',
        u: '𝓊',
        v: '𝓋',
        w: '𝓌',
        x: '𝓍',
        y: '𝓎',
        z: '𝓏',
        A: '𝒜',
        B: 'ℬ',
        C: '𝒞',
        D: '𝒟',
        E: 'ℰ',
        F: 'ℱ',
        G: '𝒢',
        H: 'ℋ',
        I: 'ℐ',
        J: '𝒥',
        K: '𝒦',
        L: 'ℒ',
        M: 'ℳ',
        N: '𝒩',
        O: '𝒪',
        P: '𝒫',
        Q: '𝒬',
        R: 'ℛ',
        S: '𝒮',
        T: '𝒯',
        U: '𝒰',
        V: '𝒱',
        W: '𝒲',
        X: '𝒳',
        Y: '𝒴',
        Z: '𝒵',
    },
    fraktur: {
        a: '𝔞',
        b: '𝔟',
        c: '𝔠',
        d: '𝔡',
        e: '𝔢',
        f: '𝔣',
        g: '𝔤',
        h: '𝔥',
        i: '𝔦',
        j: '𝔧',
        k: '𝔨',
        l: '𝔩',
        m: '𝔪',
        n: '𝔫',
        o: '𝔬',
        p: '𝔭',
        q: '𝔮',
        r: '𝔯',
        s: '𝔰',
        t: '𝔱',
        u: '𝔲',
        v: '𝔳',
        w: '𝔴',
        x: '𝔵',
        y: '𝔶',
        z: '𝔷',
        A: '𝔄',
        B: '𝔅',
        C: 'ℭ',
        D: '𝔇',
        E: '𝔈',
        F: '𝔉',
        G: '𝔊',
        H: 'ℌ',
        I: 'ℑ',
        J: '𝔍',
        K: '𝔎',
        L: '𝔏',
        M: '𝔐',
        N: '𝔑',
        O: '𝔒',
        P: '𝔓',
        Q: '𝔔',
        R: 'ℜ',
        S: '𝔖',
        T: '𝔗',
        U: '𝔘',
        V: '𝔙',
        W: '𝔚',
        X: '𝔛',
        Y: '𝔜',
        Z: 'ℨ',
    },
};

const fontStyles = [
    { id: 'normal', name: 'Normal' },
    { id: 'small-caps', name: 'Small Caps' },
    { id: 'mathematical-bold', name: 'Mathematical Bold' },
    { id: 'mathematical-script', name: 'Script' },
    { id: 'fraktur', name: 'Fraktur' },
];

const convertText = (text: string, fontStyle: string): string => {
    if (fontStyle === 'normal') return text;

    const map = fontMaps[fontStyle as keyof typeof fontMaps];
    return text
        .split('')
        .map((char) => map[char.toLowerCase() as keyof typeof map] || char)
        .join('');
};

export default function TextStyleGenerator() {
    const [input, setInput] = useState('Hello World');
    const [selectedFont, setSelectedFont] = useState('normal');
    const [output, setOutput] = useState(input);
    const outputRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newInput = e.target.value;
        setInput(newInput);
        setOutput(convertText(newInput, selectedFont));
    };

    const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newFont = e.target.value;
        setSelectedFont(newFont);
        setOutput(convertText(input, newFont));
    };

    const copyToClipboard = async () => {
        await copyTextToClipboard(output);
    };

    return (
        <div className='p-0 md:p-4 text-gray-200 w-full max-w-full min-w-0'>
            <div className='mb-4'>
                <Label>Font</Label>
                <Select
                    value={selectedFont}
                    onChange={handleFontChange}
                    className='w-full max-w-full bg-gray-700 border border-gray-600 rounded-md text-gray-200 p-2'
                >
                    {fontStyles.map((style) => (
                        <option key={style.id} value={style.id}>
                            {style.name}
                        </option>
                    ))}
                </Select>
            </div>
            <Label>Text</Label>

            <div className='mb-4'>
                <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder='Enter your text here...'
                    className='w-full max-w-full bg-gray-700 border border-gray-600 rounded-md text-gray-200 p-2 resize-y'
                />
            </div>

            <div className='mb-4'>
                <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2'>
                    <Label>Preview</Label>
                    <button
                        type='button'
                        onClick={copyToClipboard}
                        className='hoskt-mcutils-safe-button inline-flex items-center gap-2 border border-gray-600 rounded-md text-gray-200 px-2 py-1 text-xs hover:bg-gray-600 transition-all duration-200'
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
                <div className='bg-gray-700 border border-gray-600 rounded-md p-2 min-h-[2.5rem]'>
                    <div className='text-sm whitespace-pre-wrap break-words' ref={outputRef}>
                        {output}
                    </div>
                </div>
            </div>
        </div>
    );
}
