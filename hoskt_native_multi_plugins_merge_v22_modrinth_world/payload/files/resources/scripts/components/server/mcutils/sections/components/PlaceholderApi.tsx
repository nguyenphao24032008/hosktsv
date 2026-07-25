'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Input from '@/components/elements/Input';
import { copyTextToClipboard } from '../../utils/copyTextToClipboard';

interface Placeholder {
    description: string;
    placeholders: string[];
}

interface PlaceholderCategories {
    [key: string]: Placeholder[];
}

export default function PlaceholderApi() {
    const [categories, setCategories] = useState<PlaceholderCategories>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState('');
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const copyToClipboard = async (text: string) => {
        const success = await copyTextToClipboard(text);
        setCopied(success ? `Copied: ${text}` : 'Failed to copy');
        window.setTimeout(() => setCopied(''), 1600);
    };

    useEffect(() => {
        let mounted = true;

        const fetchPlaceholders = async () => {
            try {
                const response = await fetch('/extensions/mcutils/placeholderapi.json');
                if (!response.ok) throw new Error(`Placeholder API returned ${response.status}`);
                const data = (await response.json()) as PlaceholderCategories;
                if (mounted) setCategories(data);
            } catch (error) {
                console.error('Failed to load placeholders:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchPlaceholders();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredCategories = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return Object.entries(categories);

        return Object.entries(categories)
            .map(([category, items]) => {
                const categoryMatches = category.toLowerCase().includes(query);
                const matchingItems = items
                    .map((item) => {
                        const descriptionMatches = item.description.toLowerCase().includes(query);
                        const matchingPlaceholders = item.placeholders.filter((placeholder) =>
                            placeholder.toLowerCase().includes(query)
                        );

                        if (categoryMatches || descriptionMatches) return item;
                        if (matchingPlaceholders.length > 0) return { ...item, placeholders: matchingPlaceholders };
                        return null;
                    })
                    .filter((item): item is Placeholder => item !== null);

                return matchingItems.length > 0 ? ([category, matchingItems] as [string, Placeholder[]]) : null;
            })
            .filter((entry): entry is [string, Placeholder[]] => entry !== null);
    }, [categories, searchTerm]);

    useEffect(() => {
        if (expandedCategory && !filteredCategories.some(([category]) => category === expandedCategory)) {
            setExpandedCategory(null);
        }
    }, [expandedCategory, filteredCategories]);

    if (loading) {
        return (
            <div className='flex items-center justify-center py-8 w-full max-w-full min-w-0'>
                <span className='text-gray-400'>Loading placeholders...</span>
            </div>
        );
    }

    return (
        <div className='hoskt-placeholder-root text-gray-200 w-full max-w-full min-w-0'>
            <style>{`
                .hoskt-placeholder-root {
                    width: 100%;
                    min-width: 0;
                    max-width: 100%;
                    overflow: visible;
                }

                .hoskt-placeholder-row {
                    position: relative;
                    width: 100%;
                    min-width: 0;
                    overflow: visible;
                    border-radius: 0.65rem;
                    background: rgb(38, 38, 38);
                    background-image: none !important;
                    transform: none !important;
                    filter: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    contain: none !important;
                    will-change: auto !important;
                }

                .hoskt-placeholder-toggle,
                .hoskt-placeholder-copy {
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

                .hoskt-placeholder-toggle::before,
                .hoskt-placeholder-toggle::after,
                .hoskt-placeholder-copy::before,
                .hoskt-placeholder-copy::after {
                    content: none !important;
                    display: none !important;
                }
            `}</style>

            <div className='max-w-7xl mx-auto px-0 md:px-4 py-4 md:py-8 w-full min-w-0'>
                {copied && (
                    <div className='mb-4 bg-green-600 text-white py-2 px-4 rounded break-words'>
                        {copied}
                    </div>
                )}

                <div className='mb-5'>
                    <Input
                        type='text'
                        placeholder='Search placeholders...'
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className='w-full max-w-full px-4 py-3 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500'
                    />
                </div>

                <div className='mb-4 text-sm text-neutral-400'>
                    {filteredCategories.length} categories. Open only the category you need for smoother scrolling.
                </div>

                <div className='space-y-3'>
                    {filteredCategories.map(([category, items]) => {
                        const expanded = expandedCategory === category;
                        const placeholderCount = items.reduce((total, item) => total + item.placeholders.length, 0);

                        return (
                            <section
                                key={category}
                                className='hoskt-placeholder-row border border-neutral-600 bg-neutral-800'
                            >
                                <button
                                    type='button'
                                    aria-expanded={expanded}
                                    onClick={() => setExpandedCategory((current) => (current === category ? null : category))}
                                    className='hoskt-placeholder-toggle w-full flex items-center justify-between gap-3 px-4 py-4 cursor-pointer bg-neutral-700 hover:bg-neutral-600 text-neutral-100 text-left'
                                >
                                    <span className='min-w-0 break-words font-medium'>{category}</span>
                                    <span className='flex items-center gap-2 flex-shrink-0 text-xs text-neutral-300'>
                                        <span>{placeholderCount}</span>
                                        <span aria-hidden='true' className='text-lg leading-none'>
                                            {expanded ? '−' : '+'}
                                        </span>
                                    </span>
                                </button>

                                {expanded && (
                                    <div className='p-3 md:p-4 space-y-5'>
                                        {items.map((item, itemIndex) => (
                                            <div
                                                key={`${category}-${itemIndex}`}
                                                className={itemIndex !== 0 ? 'pt-5 border-t border-neutral-600' : ''}
                                            >
                                                {item.description && (
                                                    <p className='text-neutral-300 mb-3 text-sm break-words'>{item.description}</p>
                                                )}
                                                <div className='space-y-2'>
                                                    {item.placeholders.map((placeholder, placeholderIndex) => (
                                                        <div
                                                            key={`${placeholder}-${placeholderIndex}`}
                                                            className='flex flex-col sm:flex-row sm:items-center gap-2 min-w-0'
                                                        >
                                                            <code className='block flex-1 min-w-0 whitespace-pre-wrap break-all text-sm font-mono bg-neutral-900 text-blue-400 px-3 py-3 rounded select-all'>
                                                                {placeholder}
                                                            </code>
                                                            <button
                                                                type='button'
                                                                onClick={() => copyToClipboard(placeholder)}
                                                                className='hoskt-placeholder-copy flex-shrink-0 inline-flex items-center justify-center px-3 py-2 border border-neutral-600 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-neutral-100'
                                                                aria-label={`Copy ${placeholder}`}
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>

                {filteredCategories.length === 0 && (
                    <div className='text-center py-12 bg-gray-700 rounded-lg'>
                        <p className='text-gray-400'>No placeholders found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
