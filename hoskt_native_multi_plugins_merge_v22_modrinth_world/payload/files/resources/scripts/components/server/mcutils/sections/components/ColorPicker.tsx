'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import SafeButton from '../../ui/SafeButton';
import Select from '@/components/elements/Select';
import { copyTextToClipboard } from '../../utils/copyTextToClipboard';

interface Mode {
    label: string;
    inputId: string;
}

const ColorPicker: React.FC = () => {
    const [colors, setColors] = useState<string[]>(['C00BD6', 'FD2177']);
    const [numColors, setNumColors] = useState<number>(2);
    const [outputText, setOutputText] = useState<string>('');
    const [displayMode, setDisplayMode] = useState<number>(1);
    const [bold, setBold] = useState<boolean>(false);
    const [italic, setItalic] = useState<boolean>(false);
    const [underline, setUnderline] = useState<boolean>(false);
    const [strike, setStrike] = useState<boolean>(false);
    const [inputText, setInputText] = useState<string>('mythical.systems');
    const [format, setFormat] = useState<string>('default');

    const modes: Record<number, Mode> = {
        1: { label: 'Text Mode 🔖', inputId: 'nickname' },
        2: { label: 'Lore Mode 💎', inputId: 'lore-input' },
        3: { label: 'MOTD Mode 🎀', inputId: 'motd-input' },
    };

    const hexToRgb = (hex: string): [number, number, number] => {
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r, g, b];
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const interpolateColor = (color1: string, color2: string, factor: number): string => {
        const [r1, g1, b1] = hexToRgb(color1);
        const [r2, g2, b2] = hexToRgb(color2);
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        return rgbToHex(r, g, b);
    };

    const updateOutputText = useCallback(() => {
        let output = '';
        const chars = inputText.split('');
        chars.forEach((char, index) => {
            const progress = index / (chars.length - 1);
            const colorIndex = Math.floor(progress * (colors.length - 1));
            const colorFactor = progress * (colors.length - 1) - colorIndex;
            const color = interpolateColor(
                colors[colorIndex],
                colors[colorIndex + 1] || colors[colorIndex],
                colorFactor
            );

            let formattedChar = char;
            if (format === 'default') {
                formattedChar = `&#${color}${char}`;
            } else if (format === 'chat') {
                formattedChar = `<#${color}>${char}`;
            } else if (format === 'minimessage') {
                formattedChar = `<color:#${color}>${char}</color>`;
            } else if (format === 'legacy') {
                formattedChar = `§x§${color[0]}§${color[1]}§${color[2]}§${color[3]}§${color[4]}§${color[5]}${char}`;
            } else if (format === 'ampersand') {
                formattedChar = `&x&${color[0]}&${color[1]}&${color[2]}&${color[3]}&${color[4]}&${color[5]}${char}`;
            } else if (format === 'doublechat') {
                formattedChar = `<##${color}>${char}`;
            } else if (format === 'bbcode') {
                formattedChar = `[COLOR=#${color}]${char}[/COLOR]`;
            }

            if (bold) formattedChar = `&l${formattedChar}`;
            if (italic) formattedChar = `&o${formattedChar}`;
            if (underline) formattedChar = `&n${formattedChar}`;
            if (strike) formattedChar = `&m${formattedChar}`;

            output += formattedChar;
        });
        setOutputText(output);
    }, [colors, inputText, bold, italic, underline, strike, format]);

    useEffect(() => {
        updateOutputText();
    }, [colors, numColors, inputText, bold, italic, underline, strike, displayMode, format, updateOutputText]);

    const handleColorChange = (index: number, value: string) => {
        const newColors = [...colors];
        const validColor = value
            .replace(/[^0-9A-Fa-f]/g, '')
            .slice(0, 6)
            .padEnd(6, '0');
        newColors[index] = validColor;
        setColors(newColors);
    };

    const getRandomHexColor = (): string => {
        return Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0');
    };

    const handleNumColorsChange = (value: string) => {
        const num = parseInt(value, 10);
        const validNum = isNaN(num) ? 2 : Math.max(2, Math.min(20, num));
        setNumColors(validNum);
        if (validNum > colors.length) {
            setColors([...colors, ...Array(validNum - colors.length).fill(getRandomHexColor())]);
        } else {
            setColors(colors.slice(0, validNum));
        }
    };

    const renderPreview = () => {
        return inputText.split('').map((char, index) => {
            const progress = index / (inputText.length - 1);
            const colorIndex = Math.floor(progress * (colors.length - 1));
            const colorFactor = progress * (colors.length - 1) - colorIndex;
            const color = interpolateColor(
                colors[colorIndex],
                colors[colorIndex + 1] || colors[colorIndex],
                colorFactor
            );

            const style: React.CSSProperties = { color: `#${color}` };
            if (bold) style.fontWeight = 'bold';
            if (italic) style.fontStyle = 'italic';
            if (underline) style.textDecoration = 'underline';
            if (strike) style.textDecoration = (style.textDecoration || '') + ' line-through';

            return (
                <span key={index} style={style}>
                    {char}
                </span>
            );
        });
    };

    return (
        <div className='p-0 md:p-6 w-full max-w-4xl mx-auto text-white min-w-0'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full max-w-full'>
                <div>
                    <Label htmlFor='numColors'>Number of Colors</Label>
                    <Input
                        id='numColors'
                        type='number'
                        min={2}
                        max={20}
                        value={numColors.toString()}
                        onChange={(e) => handleNumColorsChange(e.target.value)}
                    />
                    <div className='flex flex-wrap gap-2 mt-2'>
                        <SafeButton
                            onClick={() => handleNumColorsChange((numColors + 1).toString())}
                            disabled={numColors >= 20}
                        >
                            Add Color
                        </SafeButton>
                        <SafeButton
                            onClick={() => handleNumColorsChange((numColors - 1).toString())}
                            disabled={numColors <= 2}
                        >
                            Remove Color
                        </SafeButton>
                    </div>
                </div>

                <div>
                    <Label htmlFor='inputText'>Input Text</Label>
                    <Input id='inputText' value={inputText} onChange={(e) => setInputText(e.target.value)} />
                </div>
            </div>

            <div className='grid grid-cols-1 gap-4 mb-6 w-full max-w-full'>
                {colors.map((color, index) => (
                    <div key={index}>
                        <Label htmlFor={`color-${index}`}>Color {index + 1}</Label>
                        <div className='flex items-center gap-3 min-w-0'>
                            <input
                                id={`color-${index}`}
                                type='color'
                                value={`#${color}`}
                                onChange={(e) => handleColorChange(index, e.target.value.slice(1))}
                                className='w-12 h-12 flex-shrink-0 rounded-md cursor-pointer border-0 bg-transparent p-0'
                            />
                            <Input
                                type='text'
                                value={color}
                                onChange={(e) => handleColorChange(index, e.target.value)}
                                placeholder='Enter hex color...'
                                className='min-w-0 flex-1'
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className='mb-6'>
                <Label>Text Style</Label>
                <div className='flex flex-wrap gap-4'>
                    {[
                        { id: 'bold', label: 'Bold', state: bold, setState: setBold },
                        { id: 'italic', label: 'Italic', state: italic, setState: setItalic },
                        { id: 'underline', label: 'Underline', state: underline, setState: setUnderline },
                        { id: 'strike', label: 'Strikethrough', state: strike, setState: setStrike },
                    ].map(({ id, label, state, setState }) => (
                        <label key={id} className='inline-flex items-center'>
                            <input
                                type='checkbox'
                                id={id}
                                checked={state}
                                onChange={(e) => setState(e.target.checked)}
                                className='rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-opacity-50 mr-2'
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full max-w-full'>
                <div>
                    <Label htmlFor='displayMode'>Display Mode</Label>
                    <Select
                        id='displayMode'
                        value={displayMode}
                        onChange={(e) => setDisplayMode(parseInt(e.target.value))}
                        className='w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50'
                    >
                        {Object.entries(modes).map(([key, value]) => (
                            <option key={key} value={key}>
                                {value.label}
                            </option>
                        ))}
                    </Select>
                </div>

                <div>
                    <Label htmlFor='format'>Format</Label>
                    <Select
                        id='format'
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        className='w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50'
                    >
                        <option value='default'>Default (&#rrggbb)</option>
                        <option value='chat'>Chat (&lt;#rrggbb&gt;)</option>
                        <option value='minimessage'>MiniMessage</option>
                        <option value='legacy'>Legacy (§x§r§r§g§g§b§b)</option>
                        <option value='ampersand'>Ampersand (&amp;x&amp;r&amp;r&amp;g&amp;g&amp;b&amp;b)</option>
                        <option value='doublechat'>&lt;##rrggbb&gt;</option>
                        <option value='bbcode'>BBCode ([COLOR=#rrggbb][/COLOR])</option>
                        <option value='custom'>Custom</option>
                    </Select>
                </div>
            </div>

            <div className='mb-6'>
                <Label htmlFor='outputText'>Output:</Label>
                <div
                    id='outputText'
                    className='p-4 border rounded-lg whitespace-pre-wrap break-words cursor-pointer bg-gray-800 border-gray-700 break-all text-sm'
                    onClick={async () => {
                        const copied = await copyTextToClipboard(outputText);
                        alert(copied ? 'Copied to clipboard!' : 'Failed to copy');
                    }}
                >
                    {outputText}
                </div>
            </div>

            <div>
                <Label>Preview:</Label>
                <div
                    className={`p-4 border rounded-lg min-w-0 break-words text-xl md:text-2xl ${
                        displayMode === 2 ? 'bg-gray-800' : displayMode === 3 ? 'bg-gray-700' : 'bg-gray-800'
                    }`}
                >
                    {renderPreview()}
                </div>
            </div>
        </div>
    );
};
export default ColorPicker;
