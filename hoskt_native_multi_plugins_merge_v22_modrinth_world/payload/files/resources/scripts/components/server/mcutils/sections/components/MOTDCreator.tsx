'use client';

import SafeButton from '../../ui/SafeButton';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import React, { useEffect, useRef, useState } from 'react';

const colorMap: { [key: string]: string } = {
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

const formattingMap: { [key: string]: string } = {
    l: 'font-bold',
    n: 'underline',
    o: 'italic',
    m: 'line-through',
    k: 'minecraft-obfuscated',
};

const getReadableTextColor = (hexColor: string): string => {
    const normalized = hexColor.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#FFFFFF';

    const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
    );
    const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    const contrastWithBlack = (luminance + 0.05) / 0.05;
    const contrastWithWhite = 1.05 / (luminance + 0.05);

    return contrastWithBlack >= contrastWithWhite ? '#111827' : '#FFFFFF';
};

const MOTDCreator: React.FC = () => {
    const [motd, setMotd] = useState('A Minecraft Server\n&4Here is another line');
    const [preview, setPreview] = useState<React.ReactNode[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const parseMOTD = (text: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        let currentColor = '';
        let currentFormatting: string[] = [];
        let buffer = '';
        let partIndex = 0;

        const flushBuffer = () => {
            if (!buffer) return;
            parts.push(
                <span
                    key={partIndex++}
                    style={{ color: colorMap[currentColor] || undefined }}
                    className={currentFormatting.join(' ')}
                >
                    {buffer}
                </span>
            );
            buffer = '';
        };

        for (let index = 0; index < text.length; index++) {
            const character = text[index];
            const next = index + 1 < text.length ? text[index + 1].toLowerCase() : '';
            const isCode =
                character === '&' &&
                !!next &&
                (next === 'r' || Object.prototype.hasOwnProperty.call(colorMap, next) || Object.prototype.hasOwnProperty.call(formattingMap, next));

            if (!isCode) {
                buffer += character;
                continue;
            }

            flushBuffer();
            if (next === 'r') {
                currentColor = '';
                currentFormatting = [];
            } else if (Object.prototype.hasOwnProperty.call(colorMap, next)) {
                currentColor = next;
            } else {
                const formattingClass = formattingMap[next];
                if (formattingClass && !currentFormatting.includes(formattingClass)) {
                    currentFormatting = [...currentFormatting, formattingClass];
                }
            }
            index++;
        }

        flushBuffer();
        return parts;
    };
    const updatePreview = () => {
        const lines = motd.split('\n');
        const formattedLines = lines.map((line, index) => <div key={index}>{parseMOTD(line)}</div>);
        setPreview(formattedLines);
    };

    useEffect(() => {
        updatePreview();
    }, [motd]);

    const restoreSelection = (start: number, end: number) => {
        window.requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const max = textarea.value.length;
            textarea.focus();
            textarea.setSelectionRange(Math.min(start, max), Math.min(end, max));
        });
    };

    const handleColorClick = (color: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart ?? motd.length;
        const end = textarea.selectionEnd ?? start;
        const newMotd = motd.substring(0, start) + `&${color}` + motd.substring(end);
        setMotd(newMotd);
        restoreSelection(start + 2, start + 2);
    };

    const handleFormattingClick = (format: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart ?? motd.length;
        const end = textarea.selectionEnd ?? start;

        if (format === 'r') {
            setMotd(motd.substring(0, start) + '&r' + motd.substring(end));
            restoreSelection(start + 2, start + 2);
            return;
        }

        const selectedText = motd.substring(start, end);
        const newMotd = motd.substring(0, start) + `&${format}` + selectedText + '&r' + motd.substring(end);
        setMotd(newMotd);
        restoreSelection(start + 2, end + 2);
    };

    const getVanillaMotd = () => {
        return motd.replace(/&/g, '\\u00A7');
    };

    const getBungeeCordMotd = () => {
        return `"${motd.replace(/\n/g, '\\n')}"`;
    };

    const getServerListPlusMotd = () => {
        return `- |-\n  ${motd.replace(/\n/g, '\n  ')}`;
    };

    return (
        <div className='mb-4'>
            <Label className='block mb-2'>Aspects:</Label>
            <div className='flex flex-wrap gap-2 my-2'>
                {Object.entries(colorMap).map(([code, color]) => (
                    <button
                        type='button'
                        key={code}
                        className='hoskt-mcutils-safe-button w-6 h-6 rounded flex items-center justify-center'
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorClick(code)}
                        title={`Color: &${code}`}
                        aria-label={`Insert Minecraft color code &${code}`}
                    >
                        <span
                            className='text-xs font-bold'
                            style={{
                                color: getReadableTextColor(color),
                                WebkitTextFillColor: getReadableTextColor(color),
                                textShadow:
                                    getReadableTextColor(color) === '#FFFFFF'
                                        ? '0 1px 2px rgba(0, 0, 0, 0.95)'
                                        : '0 1px 1px rgba(255, 255, 255, 0.45)',
                            }}
                        >
                            {`&${code}`}
                        </span>
                    </button>
                ))}
            </div>
            <div className='flex flex-wrap gap-2 mb-2'>
                <SafeButton onClick={() => handleFormattingClick('l')} className='px-2 py-1 bg-gray-700 rounded font-bold'>
                    Bold
                </SafeButton>
                <SafeButton
                    onClick={() => handleFormattingClick('n')}
                    className='px-2 py-1 bg-gray-700 rounded'
                    style={{ textDecoration: 'underline' }}
                >
                    Underline
                </SafeButton>
                <SafeButton onClick={() => handleFormattingClick('o')} className='px-2 py-1 bg-gray-700 rounded italic'>
                    Italic
                </SafeButton>
                <SafeButton
                    onClick={() => handleFormattingClick('m')}
                    className='px-2 py-1 bg-gray-700 rounded line-through'
                >
                    Strikethrough
                </SafeButton>
                <SafeButton onClick={() => handleFormattingClick('k')} className='px-2 py-1 bg-gray-700 rounded'>
                    Obfuscated
                </SafeButton>
                <SafeButton onClick={() => handleFormattingClick('r')} className='px-2 py-1 bg-gray-700 rounded'>
                    Reset
                </SafeButton>
            </div>
            <Label htmlFor='motd-input' className='block mb-2'>
                Type your MOTD here:
            </Label>
            <textarea
                ref={textareaRef}
                id='motd-input'
                value={motd}
                onChange={(e) => setMotd(e.target.value)}
                rows={2}
                className='w-full max-w-full p-2 bg-gray-800 text-white font-mono rounded'
            />
            <br></br>
            <div className='mb-4'>
                <Label>Preview:</Label>
                <div className='bg-gray-800 p-2 rounded minecraft break-words'>{preview}</div>
            </div>

            <div className='mb-4'>
                <Label>For server.properties:</Label>
                <Input
                    id='vanilla-motd'
                    value={getVanillaMotd()}
                    readOnly
                    className='w-full max-w-full p-2 bg-gray-800 text-white rounded'
                />
            </div>

            <div className='mb-4'>
                <label htmlFor='spigot-motd' className='block mb-2'>
                    For Spigot server.properties file:
                </label>
                <Input
                    id='spigot-motd'
                    value={getVanillaMotd()}
                    readOnly
                    className='w-full max-w-full p-2 bg-gray-800 text-white rounded'
                />
            </div>

            <div className='mb-4'>
                <label htmlFor='bungeecord-motd' className='block mb-2'>
                    For BungeeCord&apos;s config.yml file:
                </label>
                <Input
                    id='bungeecord-motd'
                    value={getBungeeCordMotd()}
                    readOnly
                    className='w-full max-w-full p-2 bg-gray-800 text-white rounded'
                />
            </div>

            <div className='mb-4'>
                <label htmlFor='serverlistplus-motd' className='block mb-2'>
                    For ServerListPlus&apos; ServerListPlus.yml file:
                </label>
                <textarea
                    id='serverlistplus-motd'
                    value={getServerListPlusMotd()}
                    readOnly
                    rows={3}
                    className='w-full max-w-full p-2 bg-gray-800 text-white rounded'
                />
            </div>
        </div>
    );
};

export default MOTDCreator;
