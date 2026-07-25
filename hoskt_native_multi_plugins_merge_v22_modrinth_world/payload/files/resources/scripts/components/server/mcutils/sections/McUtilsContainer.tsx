'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { Alert } from '@/components/elements/alert';
import SmallCapsGenerator from './components/small-caps-generator';
import MinecraftColorCodeGenerator from './components/minecraft-color-code-generator';
import EmojiGenerator from './components/McEmojiList';
import MiniMessageBuilder from './components/MiniMessageBuilder';
import RainbowBuilder from './components/MinecraftRainbowTextGenerator';
import PlaceholderApi from './components/PlaceholderApi';
import ColorPicker from './components/ColorPicker';
import MOTDCreator from './components/MOTDCreator';

const tabs = [
    {
        id: 'smallCaps',
        label: 'Font Builder',
        version: '1.16+',
        recommended: true,
        description: 'Create custom font styles for your server',
        Component: SmallCapsGenerator,
    },
    {
        id: 'minecraftColor',
        label: 'Classic Colors',
        version: '1.8.x',
        recommended: false,
        description: 'Use traditional Minecraft color codes',
        Component: MinecraftColorCodeGenerator,
    },
    {
        id: 'emoji',
        label: 'Custom Emojis',
        version: '1.8.x',
        recommended: false,
        description: 'Add custom emojis to your messages',
        Component: EmojiGenerator,
    },
    {
        id: 'miniMessage',
        label: 'Custom Colors',
        version: '1.13+',
        recommended: true,
        description: 'Create custom colored text with MiniMessage format',
        Component: MiniMessageBuilder,
    },
    {
        id: 'rainbow',
        label: 'Rainbow Builder',
        recommended: false,
        version: '1.8.x',
        description: 'Generate rainbow-colored text effects',
        Component: RainbowBuilder,
    },
    {
        id: 'placeholderppi',
        label: 'Placeholder API',
        version: 'All',
        recommended: false,
        description: 'Work with PlaceholderAPI variables',
        Component: PlaceholderApi,
    },
    {
        id: 'colorPicker',
        label: 'Gradient Builder',
        version: '1.16+',
        recommended: true,
        description: 'Create smooth color gradients',
        Component: ColorPicker,
    },
    {
        id: 'motdCreator',
        label: 'MOTD Creator',
        version: 'All',
        recommended: true,
        description: 'Generate custom server MOTDs',
        Component: MOTDCreator,
    },
] as const;

type TabId = typeof tabs[number]['id'];

/**
 * V14 renderer notes
 * ------------------
 * The real HOSKT app shell is deliberately left mounted. The portal host is
 * inserted as a direct child of the existing HOSKT <main> element, while only
 * the empty React content wrapper containing this component is hidden.
 *
 * This means the mobile header, hamburger, configured logo, original HOSKT
 * sidebar, admin/addon links, user footer and theme controls are the exact
 * components from the installed theme rather than a hand-built copy.
 *
 * Repaint hardening is scoped only to the Minecraft Utilities content. The
 * actual theme sidebar/header is outside this safe zone, so its transforms,
 * gradients and logo are not flattened and cannot be copied into tool cards by
 * the previous standalone renderer.
 */
const INLINE_STYLES = `
    .hoskt-mcutils-inline-host-v14 {
        display: block !important;
        position: relative !important;
        z-index: auto !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: transparent !important;
        background-image: none !important;
        transform: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        perspective: none !important;
        contain: none !important;
        content-visibility: visible !important;
        will-change: auto !important;
        isolation: auto !important;
        mix-blend-mode: normal !important;
        opacity: 1 !important;
    }

    .hoskt-mcutils-inline-host-v14,
    .hoskt-mcutils-inline-host-v14 * {
        box-sizing: border-box;
    }

    .hoskt-mcutils-safe-zone-v14,
    .hoskt-mcutils-safe-zone-v14 * {
        min-width: 0;
        max-width: 100%;
        transform: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        perspective: none !important;
        contain: none !important;
        content-visibility: visible !important;
        will-change: auto !important;
        backface-visibility: visible !important;
        isolation: auto !important;
        mix-blend-mode: normal !important;
    }

    .hoskt-mcutils-safe-zone-v14 button,
    .hoskt-mcutils-safe-zone-v14 [role='button'],
    .hoskt-mcutils-safe-zone-v14 [role='checkbox'],
    .hoskt-mcutils-safe-zone-v14 [role='tab'] {
        appearance: none !important;
        -webkit-appearance: none !important;
        -webkit-tap-highlight-color: transparent;
    }

    .hoskt-mcutils-safe-zone-v14 .hoskt-v14-no-generated-layer::before,
    .hoskt-mcutils-safe-zone-v14 .hoskt-v14-no-generated-layer::after,
    .hoskt-mcutils-safe-zone-v14 .hoskt-mcutils-card::before,
    .hoskt-mcutils-safe-zone-v14 .hoskt-mcutils-card::after,
    .hoskt-mcutils-safe-zone-v14 .hoskt-classic-control::before,
    .hoskt-mcutils-safe-zone-v14 .hoskt-classic-control::after,
    .hoskt-mcutils-safe-zone-v14 .hoskt-rainbow-control::before,
    .hoskt-mcutils-safe-zone-v14 .hoskt-rainbow-control::after,
    .hoskt-mcutils-safe-zone-v14 .hoskt-placeholder-row::before,
    .hoskt-mcutils-safe-zone-v14 .hoskt-placeholder-row::after,
    .hoskt-mcutils-safe-zone-v14 .hoskt-placeholder-toggle::before,
    .hoskt-mcutils-safe-zone-v14 .hoskt-placeholder-toggle::after,
    .hoskt-mcutils-safe-zone-v14 .hoskt-mcutils-safe-button::before,
    .hoskt-mcutils-safe-zone-v14 .hoskt-mcutils-safe-button::after {
        content: none !important;
        display: none !important;
    }

    .hoskt-mcutils-page-v14 {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        margin: 0;
        padding: 0.75rem;
        overflow: visible;
        background: transparent;
        background-image: none;
        color: rgb(229, 231, 235);
    }

    .hoskt-mcutils-content-v14 {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 1120px;
        margin: 0 auto;
        padding: 0;
        overflow: visible;
    }

    .hoskt-mcutils-shell-v14 {
        display: block;
        position: static !important;
        z-index: auto !important;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        overflow: visible;
        border: 1px solid rgb(63, 63, 70);
        border-radius: 0.75rem;
        background-color: rgb(24, 24, 27) !important;
        background-image: none !important;
        -webkit-mask-image: none !important;
        mask-image: none !important;
    }

    .hoskt-mcutils-shell-title-v14 {
        display: block !important;
        position: static !important;
        z-index: auto !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0.85rem 1rem !important;
        overflow: visible !important;
        border: 0 !important;
        border-bottom: 1px solid rgb(63, 63, 70) !important;
        border-radius: 0.75rem 0.75rem 0 0 !important;
        background-color: rgb(39, 39, 42) !important;
        background-image: none !important;
        -webkit-mask-image: none !important;
        mask-image: none !important;
        color: rgb(244, 244, 245) !important;
        font-family: inherit !important;
        font-size: 0.875rem !important;
        font-style: normal !important;
        font-weight: 600 !important;
        line-height: 1.35 !important;
        text-align: left !important;
        text-indent: 0 !important;
        white-space: normal !important;
        opacity: 1 !important;
    }

    .hoskt-mcutils-grid-v14,
    .hoskt-mcutils-active-tool-v14 {
        width: 100%;
        min-width: 0;
        max-width: 100%;
    }

    .hoskt-mcutils-card {
        display: flex;
        position: static !important;
        z-index: auto !important;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        overflow: visible;
        text-align: left;
        cursor: pointer;
        background-image: none !important;
        -webkit-mask-image: none !important;
        mask-image: none !important;
        opacity: 1 !important;
    }

    .hoskt-mcutils-title-v14,
    .hoskt-mcutils-description-v14,
    .hoskt-mcutils-safe-zone-v14 :where(p, span, label, strong, code, pre, h1, h2, h3, h4, h5, h6) {
        min-width: 0;
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
    }

    .hoskt-mcutils-safe-zone-v14 :where(code, pre) {
        white-space: pre-wrap;
    }

    .hoskt-mcutils-badge-v14 {
        max-width: 42%;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .hoskt-mcutils-footer-v14 {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 1120px;
        margin: 0 auto;
        padding: 1.5rem 1rem 2rem;
        color: var(--color-inverted, rgb(100, 116, 139));
        font-size: 0.75rem;
        font-weight: 400;
        line-height: 1.4;
        text-align: center;
        opacity: 0.4;
        background: transparent !important;
        background-image: none !important;
    }

    @media (min-width: 768px) {
        .hoskt-mcutils-page-v14 {
            padding: 1rem;
        }
    }

    @media (max-width: 767px) {
        .hoskt-mcutils-safe-zone-v14 *,
        .hoskt-mcutils-safe-zone-v14 *::before,
        .hoskt-mcutils-safe-zone-v14 *::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
        }

        .hoskt-mcutils-card {
            min-height: 104px;
        }
    }
`;

const restoreAttribute = (element: Element, attribute: string, value: string | null) => {
    if (value === null) {
        element.removeAttribute(attribute);
    } else {
        element.setAttribute(attribute, value);
    }
};

const directChildOf = (element: HTMLElement, ancestor: HTMLElement): HTMLElement | null => {
    let current: HTMLElement | null = element;
    while (current && current.parentElement && current.parentElement !== ancestor) {
        current = current.parentElement;
    }
    return current && current.parentElement === ancestor ? current : null;
};

export default function McUtilsContainer() {
    const markerRef = useRef<HTMLDivElement>(null);
    const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id);
    const active = useMemo(() => tabs.find((tab) => tab.id === activeTab) || tabs[0], [activeTab]);
    const ActiveComponent = active.Component;
    const copyrightText = useStoreState((state: ApplicationStore) => state.settings.data?.copyrightText);

    useEffect(() => {
        const marker = markerRef.current;
        if (!marker) return;

        const previousTitle = document.title;
        const main = marker.closest('main') as HTMLElement | null;
        const mountParent = main || document.body;
        const hiddenWrapper = main ? directChildOf(marker, main) : null;
        const previousWrapperStyle = hiddenWrapper?.getAttribute('style') ?? null;
        const previousMainClass = main?.getAttribute('class') ?? null;
        const previousMainStyle = main?.getAttribute('style') ?? null;
        const previousMainScrollTop = main?.scrollTop ?? 0;
        const previousMainScrollLeft = main?.scrollLeft ?? 0;
        const previousWindowX = window.scrollX;
        const previousWindowY = window.scrollY;

        const host = document.createElement('div');
        host.className = 'hoskt-mcutils-inline-host-v14';
        host.setAttribute('data-hoskt-scroll-fix', 'v9-preserved-v14');
        host.setAttribute('data-hoskt-renderer', 'original-theme-main-portal');
        host.setAttribute('data-hoskt-sidebar', 'native-theme-sidebar');
        mountParent.appendChild(host);

        if (hiddenWrapper) {
            hiddenWrapper.style.setProperty('display', 'none', 'important');
        }

        if (main) {
            main.classList.add('hoskt-mcutils-main-v14');
            main.style.setProperty('overflow-x', 'hidden', 'important');
        }

        document.title = 'Minecraft Utilities';
        setPortalHost(host);

        const frame = window.requestAnimationFrame(() => {
            if (main) {
                main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            } else {
                window.scrollTo(0, 0);
            }
        });

        return () => {
            window.cancelAnimationFrame(frame);
            host.remove();
            document.title = previousTitle;

            if (hiddenWrapper) {
                restoreAttribute(hiddenWrapper, 'style', previousWrapperStyle);
            }

            if (main) {
                restoreAttribute(main, 'class', previousMainClass);
                restoreAttribute(main, 'style', previousMainStyle);
                window.requestAnimationFrame(() => {
                    main.scrollTo({ top: previousMainScrollTop, left: previousMainScrollLeft, behavior: 'auto' });
                });
            } else {
                window.requestAnimationFrame(() => window.scrollTo(previousWindowX, previousWindowY));
            }
        };
    }, []);

    const page = (
        <div className='hoskt-mcutils-page-v14 hoskt-mcutils-safe-zone-v14' data-hoskt-page='minecraft-utils-v14'>
            <style>{INLINE_STYLES}</style>

            <div className='hoskt-mcutils-content-v14'>
                <Alert type='warning' className='mb-4'>
                    These tools may not work with all versions of Minecraft. Please check version compatibility before
                    using them.
                </Alert>

                <section className='hoskt-mcutils-shell-v14 mb-6 hoskt-v14-no-generated-layer'>
                    <div className='hoskt-mcutils-shell-title-v14 hoskt-v14-no-generated-layer'>
                        Minecraft Server Utilities
                    </div>
                    <div className='p-4 md:p-6 w-full max-w-full min-w-0'>
                        <h2 className='text-2xl text-neutral-50 font-medium mb-2 break-words'>
                            Minecraft Server Utilities
                        </h2>
                        <p className='text-sm text-neutral-300 mb-6 break-words'>
                            A comprehensive toolkit for server customization. Select a tool below to begin crafting your
                            server&apos;s unique appearance.
                        </p>

                        <div
                            className='hoskt-mcutils-grid-v14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                            role='tablist'
                            aria-label='Minecraft utility tools'
                        >
                            {tabs.map((tab) => (
                                <button
                                    type='button'
                                    id={`tab-${tab.id}`}
                                    key={`mcutils-tab-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`hoskt-mcutils-card hoskt-v14-no-generated-layer flex flex-col items-start p-4 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                        activeTab === tab.id
                                            ? 'bg-primary-700 border-primary-500'
                                            : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600'
                                    }`}
                                    role='tab'
                                    aria-selected={activeTab === tab.id}
                                    aria-controls={`panel-${tab.id}`}
                                >
                                    <span className='flex w-full items-start justify-between gap-3 mb-2'>
                                        <strong className='hoskt-mcutils-title-v14 min-w-0 text-sm font-medium text-neutral-50'>
                                            {tab.label}
                                        </strong>
                                        <span
                                            className={`hoskt-mcutils-badge-v14 flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold leading-none ${
                                                tab.recommended
                                                    ? 'bg-primary-500 text-neutral-50'
                                                    : 'bg-neutral-600 text-neutral-50'
                                            }`}
                                        >
                                            {tab.version}
                                        </span>
                                    </span>
                                    <span className='hoskt-mcutils-description-v14 w-full text-xs text-neutral-300 break-words'>
                                        {tab.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className='hoskt-mcutils-shell-v14 hoskt-v14-no-generated-layer'>
                    <div className='hoskt-mcutils-shell-title-v14 hoskt-v14-no-generated-layer'>Selected Tool</div>
                    <div className='p-4 md:p-6 w-full max-w-full min-w-0'>
                        <div
                            role='tabpanel'
                            id={`panel-${active.id}`}
                            aria-labelledby={`tab-${active.id}`}
                            className='hoskt-mcutils-active-tool-v14'
                        >
                            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 min-w-0'>
                                <div className='min-w-0'>
                                    <h3 className='text-xl text-neutral-50 font-medium break-words'>{active.label}</h3>
                                    <p className='text-sm text-neutral-300 break-words'>{active.description}</p>
                                </div>
                                <span
                                    className={`self-start md:self-center flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold leading-none ${
                                        active.recommended
                                            ? 'bg-primary-500 text-neutral-50'
                                            : 'bg-neutral-600 text-neutral-50'
                                    }`}
                                >
                                    {active.version}
                                </span>
                            </div>
                            <div className='w-full max-w-full min-w-0'>
                                <ActiveComponent key={active.id} />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <footer className='hoskt-mcutils-footer-v14 hoskt-v14-no-generated-layer'>
                {copyrightText || `Pterodactyl® © 2015 - ${new Date().getFullYear()}`}
            </footer>
        </div>
    );

    return (
        <>
            <div ref={markerRef} data-hoskt-mcutils-marker='v14' style={{ display: 'none' }} />
            {portalHost ? createPortal(page, portalHost) : null}
        </>
    );
}
