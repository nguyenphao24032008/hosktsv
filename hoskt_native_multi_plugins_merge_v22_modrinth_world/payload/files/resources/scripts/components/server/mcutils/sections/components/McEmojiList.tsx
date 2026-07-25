'use client';

import SafeButton from '../../ui/SafeButton';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import React, { useState, useEffect } from 'react';
import { copyTextToClipboard } from '../../utils/copyTextToClipboard';

const emojiCategories = {
    Misc: '✣✤✥✲❈☄✦❉✧♱♰๑♂♀☿⋄⋅⋆⋇☼*✖✗✘✕✓✔ღ✄✂☎☏✆✉♪♩♫♬♭❝❞‘ﾟ.･‖﹉﹊﹍﹎︱︳︴﹏﹋﹌ ┠┨┯┷┏┓﹃﹄┗┛┳⊥╝╚╔╗╬═╓╩▪▫□〓≡▬▂▃▄■▀▢▅▆▇▌▐█▓▒░┇┅✚▣▧▨▤▥▦▩回ஐ⋖⋗▲△▼♢♦▽Δ►◄⇨◈◆◇◊⋘⋙⋚⋛⋜⋝⋞⋟⋠⋡⋢⋣⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋈⋉⋊⋋⋌⋍⋎⋏⋐⋑⋒⋓⋔⋕∵∴⋮⋯⋰⋱⋲⋳⋴⋵⋶⋷⋸⋹⋺⋻⋼≈⋽⋾⋿⌀⌁ϟ⌂⌃⌄⌅⌆⌇⌈⌉⌊⌋⊮⊯⊰⊱⊲⊳⊴⊵【】⊶⊷⊸⊹⊺⊻⊼⊽⊾⊿⋀⋁⋂⋃╯ぃ↔↕↑↓→←↘↙➹ψ♆◠◡┌┐└┘∟「」◯●◕◐◑○◔⊙◎㊚㊛¤㊣∞☾☽◘◙の➀➁➂➃➄➅➆➇➈➉ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅺⅻ∃∧∠∨∩⊂⊃∪∀ΞΓɐəɘεβɟɥɯɔи๏ɹʁяʌʍλчΣΠ℘ℑ￡あℜℵηαʊїз¢℃№¿¡Ƹ̵̡Ӝ̨̄ƷξЖЗж½⅓⅔¼¾⅛⅜⅝⅞℅',
    Smileys: '☻☺ツ',
    Hands: '☚☛☜☝☞☟✍✎✌',
    Hearts: '❤❥♥♡❣',
    Symbols: '♨☠☮☯☪☀☣☢☭♏♒♈',
    Weather: '☂☃☁',
    Chess: '♔♕♚♛',
    Flowers: '✿❀❃❂❁',
    Stars: '★☆✮✯✪',
};
export default function EmojiGenerator() {
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof emojiCategories>('Misc');
    const [searchTerm, setSearchTerm] = useState('');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedRecentEmojis = localStorage.getItem('recentEmojis');
            if (!savedRecentEmojis) return;
            const parsed = JSON.parse(savedRecentEmojis);
            if (Array.isArray(parsed)) {
                setRecentEmojis(parsed.filter((value): value is string => typeof value === 'string').slice(0, 20));
            }
        } catch (error) {
            console.error('Failed to restore recent emojis:', error);
        }
    }, []);

    const handleEmojiClick = async (emoji: string) => {
        const copied = await copyTextToClipboard(emoji);
        const updatedRecentEmojis = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 20);
        setRecentEmojis(updatedRecentEmojis);
        try {
            localStorage.setItem('recentEmojis', JSON.stringify(updatedRecentEmojis));
        } catch (error) {
            console.error('Failed to save recent emojis:', error);
        }
        setNotification(copied ? `${emoji} copied to clipboard` : 'Failed to copy');
        window.setTimeout(() => setNotification(null), 2000);
    };

    const filteredEmojis = searchTerm
        ? Object.values(emojiCategories)
              .join('')
              .split('')
              .filter((emoji) => emoji.includes(searchTerm))
        : emojiCategories[selectedCategory].split('');

    return (
        <div className='mb-4 w-full max-w-full min-w-0'>
            <Label>Search</Label>
            <div className='mb-4 w-full max-w-full min-w-0'>
                <Input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search emojis...'
                    className='w-full max-w-full'
                />
            </div>
            <Label>Categories</Label>
            <div className='flex flex-wrap gap-2 mb-4'>
                {Object.keys(emojiCategories).map((category) => (
                    <SafeButton
                        key={category}
                        onClick={() => setSelectedCategory(category as keyof typeof emojiCategories)}
                        className={selectedCategory === category ? 'border-primary-400 text-lg' : 'bg-neutral-700 border-neutral-600 text-neutral-100 text-lg'}
                        style={
                            selectedCategory === category
                                ? {
                                      color: '#ffffff',
                                      backgroundColor: 'rgba(13, 148, 136, 0.45)',
                                      borderColor: '#2dd4bf',
                                      boxShadow: 'inset 0 0 0 1px rgba(45, 212, 191, 0.35)',
                                  }
                                : undefined
                        }
                        aria-pressed={selectedCategory === category}
                        size='small'
                    >
                        {category}
                    </SafeButton>
                ))}
            </div>
            <Label>Emoji List</Label>
            <div className='grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4'>
                {filteredEmojis.map((emoji, index) => (
                    <SafeButton
                        key={index}
                        className='text-2xl sm:text-3xl aspect-square min-w-0 p-0 bg-neutral-700 border-neutral-600'
                        onClick={() => handleEmojiClick(emoji)}
                    >
                        {emoji}
                    </SafeButton>
                ))}
            </div>
            <div className='mt-8'>
                <Label>Recent Emojis</Label>
                <div className='grid grid-cols-4 sm:grid-cols-8 gap-2'>
                    {recentEmojis.slice(0, 16).map((emoji, index) => (
                        <SafeButton key={index} className='text-2xl sm:text-3xl aspect-square min-w-0 p-0 bg-neutral-700 border-neutral-600' onClick={() => handleEmojiClick(emoji)}>
                            {emoji}
                        </SafeButton>
                    ))}
                </div>
            </div>

            {notification && (
                <div className='mt-4 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg text-center z-50'>
                    {notification}
                </div>
            )}
        </div>
    );
}
