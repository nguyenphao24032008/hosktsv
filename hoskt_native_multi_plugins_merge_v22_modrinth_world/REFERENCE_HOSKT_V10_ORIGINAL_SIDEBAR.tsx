import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useHistory, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library, findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import {
    faBars,
    faSignOutAlt,
    faHome,
    faToolbox,
    faFolderOpen,
    faTable,
    faCalendarAlt,
    faUserFriends,
    faCloudUploadAlt,
    faGlobe,
    faRocket,
    faSlidersH,
    faChartLine,
    faUserCircle,
    faLock,
    faShieldAlt,
    faListAlt,
    faServer,
    faTerminal,
    faCopy,
    faTachometerAlt,
    faCircle,
    faChevronDown,
    faChevronLeft,
    faChevronUp,
    faSearch,
    faExchangeAlt,
    faPalette,
    faMoon,
    faSun,
    faDesktop,
    faLink,
    faColumns,
    faCube,
    faKey,
    faGift,
} from '@fortawesome/free-solid-svg-icons';
import getServers from '@/api/getServers';
import { Server } from '@/api/server/getServer';
import { ip } from '@/lib/formatters';
import PrivacyServerHostBlur from '@/components/elements/PrivacyServerHostBlur';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';

library.add(fas);
import { useStoreState } from '@/state/hooks';
import { ApplicationStore } from '@/state';
import http from '@/api/http';
import CopyOnClick from '@/components/elements/CopyOnClick';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { ThemePreference, updateThemePreference, getStoredTheme } from '@/api/account/updateThemePreference';
import Can from '@/components/elements/Can';
import Avatar from '@/components/Avatar';
import styled, { keyframes, css } from 'styled-components/macro';
import { usePanels } from '@/state/panels';
import tw from 'twin.macro';
import AnnouncementBar from '../server/AnnouncementBar';
import { SidebarPowerControls } from '@/components/server/PowerDock';
import { useTranslation } from 'react-i18next';

const DiscordIcon = () => <FontAwesomeIcon icon={faDiscord} />;

type RenderNavItem = {
    key: string;
    label: string;
    icon: any;
    permission?: string | string[] | null;
    exact?: boolean;
    external?: boolean;
    href?: string;
    to?: string;
};

type NavCategory = { category: string; items: RenderNavItem[] };

interface SidebarProps {
    children: React.ReactNode;
    serverName?: string;
    serverId?: string;
    internalId?: number;
    serverStatus?: string;
    connectionAddress?: string | null;
    blurConnectionAddress?: boolean;
    eggId?: number;
    serverRoutes?: Array<{
        path: string;
        name: string;
        permission?: string | string[] | null;
        icon?: any;
    }>;
    accountRoutes?: Array<{
        path: string;
        name: string;
        icon?: any;
    }>;
    showServerNav?: boolean;
    showAccountNav?: boolean;
    consoleSidebarOpen?: boolean;
}

type SidebarItemStateVariant = 'default' | 'solid' | 'gradient' | 'gradient_no_border';

interface SidebarItemStyleProps {
    $navbar?: boolean;
    $sidebarItemStyle?: SidebarItemStateVariant;
}

const getSidebarItemRadius = (variant: SidebarItemStateVariant, collapsed = false) =>
    collapsed
        ? '18px'
        : variant === 'solid' || variant === 'gradient_no_border'
            ? '22px'
            : '999px';

const getSidebarItemBaseStyles = (variant: SidebarItemStateVariant, collapsed = false) => {
    switch (variant) {
        case 'solid':
            return css`
                border-radius: ${getSidebarItemRadius(variant, collapsed)};
                border: 1px solid transparent;
            `;
        case 'gradient_no_border':
            return css`
                border-radius: ${getSidebarItemRadius(variant, collapsed)};
                border: none;
            `;
        case 'gradient':
        case 'default':
        default:
            return css`
                border-radius: ${getSidebarItemRadius(variant, collapsed)};
                border: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
            `;
    }
};

const getSidebarItemHoverStyles = (variant: SidebarItemStateVariant, collapsed = false) => {
    switch (variant) {
        case 'solid':
            return css`
                background-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
                border-color: color-mix(in srgb, var(--color-primary) 34%, transparent);
                color: var(--color-base);
            `;
        case 'gradient':
            return css`
                background: linear-gradient(
                    to right,
                    color-mix(in srgb, var(--color-primary) 20%, transparent) 0%,
                    color-mix(in srgb, var(--color-primary) 100%, transparent) 100%
                );
                border-color: var(--color-neutral);
                ${!collapsed ? 'border-left-color: var(--color-neutral);' : ''}
                color: var(--color-base);
            `;
        case 'gradient_no_border':
            return css`
                background: linear-gradient(
                    to right,
                    color-mix(in srgb, var(--color-primary) 100%, transparent) 0%,
                    color-mix(in srgb, var(--color-primary) 20%, transparent) 100%
                );
                border-color: transparent;
                color: var(--color-base);
            `;
        case 'default':
        default:
            return css`
                background: linear-gradient(135deg,
                    color-mix(in srgb, var(--color-primary) 12%, transparent),
                    color-mix(in srgb, var(--color-secondary) 7%, transparent)
                );
                border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
                color: var(--color-base);
                transform: translateX(3px);
            `;
    }
};

const getSidebarItemActiveStyles = (variant: SidebarItemStateVariant, collapsed = false) => {
    switch (variant) {
        case 'solid':
            return css`
                background-color: var(--color-primary);
                border-color: var(--color-primary);
                color: #fff;
            `;
        case 'gradient':
            return css`
                background: linear-gradient(
                    to right,
                    color-mix(in srgb, var(--color-primary) 20%, transparent) 0%,
                    color-mix(in srgb, var(--color-primary) 100%, transparent) 100%
                );
                border-color: ${collapsed ? 'color-mix(in srgb, var(--color-primary) 32%, transparent)' : 'transparent'};
                ${!collapsed ? 'border-left-color: var(--color-primary);' : ''}
                color: var(--color-base);
            `;
        case 'gradient_no_border':
            return css`
                background: linear-gradient(
                    to right,
                    color-mix(in srgb, var(--color-primary) 100%, transparent) 0%,
                    color-mix(in srgb, var(--color-primary) 20%, transparent) 100%
                );
                border-color: transparent;
                color: var(--color-base);
            `;
        case 'default':
        default:
            return css`
                background:
                    radial-gradient(circle at 12% 50%, rgba(255,255,255,0.20), transparent 0.45rem),
                    linear-gradient(135deg, var(--color-primary), var(--color-secondary));
                border-color: color-mix(in srgb, var(--color-primary) 44%, rgba(255,255,255,0.12));
                color: #06111A;
                box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 24%, transparent), inset 0 1px 0 rgba(255,255,255,0.28);
            `;
    }
};

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
`;

const SidebarWrapper = styled.aside<{ $isOpen: boolean; $floating?: boolean; $mobileOnly?: boolean; $collapsed?: boolean }>`
    ${tw`fixed top-0 left-0 z-30`};
    width: ${(props) => (props.$collapsed ? '68px' : '260px')};
    transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms ease-in-out;
    top: var(--announcement-top-offset, 0px);
    height: calc(100vh - var(--announcement-top-offset, 0px));
    height: calc(100dvh - var(--announcement-top-offset, 0px));
    background:
        radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 19rem),
        linear-gradient(180deg,
            color-mix(in srgb, var(--color-background-secondary) 90%, var(--color-primary) 10%) 0%,
            color-mix(in srgb, var(--color-background-secondary) 82%, #000 18%) 100%);
    box-shadow: 18px 0 70px rgba(0, 0, 0, 0.28), inset -1px 0 0 color-mix(in srgb, var(--color-primary) 22%, transparent);
    border-right: ${(props) => (props.$floating ? 'none' : '1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-neutral))')};
    border: ${(props) => (props.$floating ? '1px solid var(--color-neutral)' : 'none')};
    border-right: ${(props) => (!props.$floating ? '1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-neutral))' : undefined)};
    transform: translateX(${(props) => (props.$isOpen ? '0' : '-100%')});
    flex-shrink: 0;
    overflow: hidden;
    backdrop-filter: blur(18px);

    @media (max-width: 1023px) {
        width: min(86vw, 360px);
        border-radius: 0 30px 30px 0;
        border-right: 1px solid color-mix(in srgb, var(--color-primary) 34%, transparent);
        box-shadow: 28px 0 90px rgba(0,0,0,0.42), inset -1px 0 0 rgba(255,255,255,0.04);
    }

    @media (max-width: 420px) {
        width: min(82vw, 330px);
    }

    @media (min-width: 1024px) {
        ${(props) => props.$mobileOnly ? tw`hidden` : tw`sticky`};
        z-index: 10;
        transform: translateX(0);
        ${(props) => props.$floating && !props.$mobileOnly && css`
            border-radius: calc(var(--border-radius, 12px) + 12px);
            height: calc(100% - var(--announcement-top-offset, 0px));
        `}
    }
`;

const SidebarOverlay = styled.div<{ $isOpen: boolean }>`
    ${tw`fixed inset-0 z-20 transition-opacity duration-300`};
    background-color: rgba(0, 0, 0, 0.6);
    opacity: ${(props) => (props.$isOpen ? '1' : '0')};
    pointer-events: ${(props) => (props.$isOpen ? 'auto' : 'none')};

    @media (min-width: 1024px) {
        ${tw`hidden`};
    }
`;

const MobileHeader = styled.div`
    ${tw`fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14`};
    top: var(--announcement-top-offset, 0px);
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-background-secondary) 92%, var(--color-primary) 8%), color-mix(in srgb, var(--color-background-secondary) 92%, var(--color-secondary) 8%));
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-neutral));
    box-shadow: 0 14px 40px rgba(0,0,0,0.22);

    @media (min-width: 1024px) {
        ${tw`hidden`};
    }
`;

const MobileBurger = styled.button`
    ${tw`flex items-center justify-center p-2 rounded-lg mr-3`};
    color: var(--color-muted);
    transition: all 150ms ease;

    &:hover {
        color: var(--color-base);
        background-color: var(--color-neutral);
    }

    @media (min-width: 1024px) {
        ${tw`hidden`};
    }
`;

const MainContent = styled.main<{ $navbarLayout?: boolean; $floatingLayout?: boolean; $consoleSidebarOpen?: boolean; $bgImage?: string; $bgOverlay?: number; $hasPanels?: boolean }>`
    ${tw`flex-1 relative`};
    background:
        radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 26rem),
        radial-gradient(circle at 92% 2%, color-mix(in srgb, var(--color-secondary) 12%, transparent), transparent 28rem),
        var(--color-background);
    padding-top: ${(props) => (props.$navbarLayout ? 'var(--announcement-top-offset, 0px)' : 'calc(3.5rem + var(--announcement-top-offset, 0px))')};
    height: 100vh;
    overflow-y: ${(props) => props.$hasPanels ? 'hidden' : 'auto'};
    margin-right: ${(props) => (props.$consoleSidebarOpen ? '380px' : '0')};
    transition: margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1);

    ${(props) => props.$bgImage && css`
        background-image: linear-gradient(rgba(0, 0, 0, ${(props.$bgOverlay || 50) / 100}), rgba(0, 0, 0, ${(props.$bgOverlay || 50) / 100})), url('${props.$bgImage}');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
    `}

    @media (min-width: 1024px) {
        padding-top: var(--announcement-top-offset, 0px);
    }

    @media (max-width: 1280px) {
        margin-right: ${(props) => (props.$consoleSidebarOpen ? '340px' : '0')};
    }

    @media (max-width: 1024px) {
        margin-right: 0;
    }
`;

const ContentWrapper = styled.div<{ $navbarLayout?: boolean; $fullWidth?: boolean; $maxWidth?: number }>`
    ${tw`w-full mx-auto`};
    max-width: ${(props) => props.$fullWidth ? '100%' : `${props.$maxWidth || 1360}px`};
    min-height: 100%;
    display: flex;
    flex-direction: column;
    padding: ${(props) => props.$fullWidth ? '1rem' : '1.5rem 0'};
    height: ${(props) => props.$fullWidth ? '100%' : 'auto'};
    overflow: ${(props) => props.$fullWidth ? 'hidden' : 'visible'};

    @media (min-width: 640px) {
        padding: ${(props) => props.$fullWidth ? '1rem' : '1.5rem'};
    }

    @media (min-width: 1024px) {
        padding: ${(props) => props.$fullWidth ? '1rem' : '2rem'};
    }
`;

const NavItem = styled(NavLink) <SidebarItemStyleProps>`
    ${tw`flex items-center no-underline transition-all duration-150`};
    ${(props) => props.$navbar ? css`
        padding: 0.5rem 1rem;
        margin: 0;
        border-radius: var(--border-radius, 8px);
        border: 1px solid transparent;
    ` : css`
        padding: 0.5rem 1rem;
        margin: 0 0.5rem 0.25rem;
        ${getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default')}
    `}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);

    &:hover {
        ${(props) => props.$navbar ? css`
            background-color: var(--color-background-secondary);
            border-color: var(--color-neutral);
            color: var(--color-base);
        ` : getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default')}
    }

    &.active {
        ${(props) => props.$navbar ? css`
            background-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
            border-color: var(--color-primary);
            color: var(--color-base);
        ` : getSidebarItemActiveStyles(props.$sidebarItemStyle || 'default')}
    }

    & svg {
        ${(props) => props.$navbar ? tw`mr-2 w-4` : tw`mr-3 w-5`};
    }
`;

const ExternalNavItem = styled.a<SidebarItemStyleProps>`
    ${tw`flex items-center no-underline transition-all duration-150`};
    ${(props) => props.$navbar ? css`
        padding: 0.5rem 1rem;
        margin: 0;
        border-radius: var(--border-radius, 8px);
        border: 1px solid transparent;
    ` : css`
        padding: 0.5rem 1rem;
        margin: 0 0.5rem 0.25rem;
        ${getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default')}
    `}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);

    &:hover {
        ${(props) => props.$navbar ? css`
            background-color: var(--color-background-secondary);
            border-color: var(--color-neutral);
            color: var(--color-base);
        ` : getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default')}
    }

    & svg {
        ${(props) => props.$navbar ? tw`mr-2 w-4` : tw`mr-3 w-5`};
    }
`;

const NavActionButton = styled.button<SidebarItemStyleProps>`
    ${tw`flex items-center transition-all duration-150`};
    width: calc(100% - 1rem);
    padding: 0.5rem 1rem;
    margin: 0 0.5rem 0.25rem;
    ${props => getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default')}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
        ${props => getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default')}
    }

    & svg {
        ${tw`mr-3 w-5`};
    }
`;

const NavItemWrapper = styled.div`
    ${tw`relative flex items-center`};
    margin: 0 0.5rem 0.25rem;

    &:hover .split-panel-btn {
        opacity: 1;
    }
`;

const SplitPanelButton = styled.button`
    ${tw`absolute flex items-center justify-center`};
    right: 0.5rem;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 4px;
    background: transparent;
    color: var(--color-muted);
    opacity: 0;
    transition: opacity 150ms ease, background-color 150ms ease, color 150ms ease;
    border: none;
    cursor: pointer;
    z-index: 5;

    &:hover {
        background-color: var(--color-primary);
        color: #fff;
    }

    svg {
        font-size: 0.625rem;
    }

    @media (max-width: 1024px) {
        display: none;
    }
`;

const NavItemInner = styled(NavLink)<SidebarItemStyleProps>`
    ${tw`flex items-center flex-1 no-underline transition-all duration-150`};
    padding: 0.5rem 2.25rem 0.5rem 1rem;
    ${(props) => getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default')}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);

    &:hover {
        ${(props) => getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default')}
    }

    &.active {
        ${(props) => getSidebarItemActiveStyles(props.$sidebarItemStyle || 'default')}
    }

    & svg {
        ${tw`mr-3 w-5`};
    }
`;

const ExternalNavItemInner = styled.a<SidebarItemStyleProps>`
    ${tw`flex items-center flex-1 no-underline transition-all duration-150`};
    padding: 0.5rem 2.25rem 0.5rem 1rem;
    ${(props) => getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default')}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);

    &:hover {
        ${(props) => getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default')}
    }

    & svg {
        ${tw`mr-3 w-5`};
    }
`;

const SectionTitle = styled.p`
    ${tw`text-xs uppercase tracking-wider px-4 py-2 mt-4 mb-1`};
    color: var(--color-inverted);
`;

const CollapsibleSectionHeader = styled.button<{ $isHovered?: boolean }>`
    ${tw`w-full flex items-center justify-between text-xs uppercase tracking-wider px-4 py-2 mt-4 mb-1`};
    color: var(--color-inverted);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 150ms ease;

    &:hover {
        color: var(--color-muted);
    }
`;

const SectionChevron = styled.span<{ $collapsed: boolean; $visible: boolean }>`
    display: flex;
    align-items: center;
    opacity: ${(props) => (props.$visible ? 1 : 0)};
    transform: rotate(${(props) => (props.$collapsed ? '-90deg' : '0deg')});
    transition: opacity 150ms ease, transform 200ms ease;

    svg {
        font-size: 0.6rem;
    }
`;

const CollapsibleNavGroup = styled.div<{ $collapsed: boolean; $itemCount: number }>`
    overflow: hidden;
    max-height: ${(props) => (props.$collapsed ? '0' : `${props.$itemCount * 48}px`)};
    opacity: ${(props) => (props.$collapsed ? 0 : 1)};
    transition: max-height 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease;
`;

const Logo = styled(Link)`
    ${tw`flex items-center px-4 py-4 no-underline`};
    color: var(--color-base);
    font-size: 1.25rem;
    font-weight: 600;

    &:hover {
    color: var(--color-base);}

    img {
        max-height: 32px;
        width: auto;
    }
`;

const UserSection = styled.div`
    ${tw`p-4 mt-auto flex-shrink-0`};
    border-top: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--color-background-secondary) 78%, transparent),
        color-mix(in srgb, var(--color-primary) 8%, transparent)
    );
`;

const UserProfileLink = styled(Link)`
    ${tw`flex items-center flex-1 min-w-0 rounded-lg mr-2 p-2 -m-2 no-underline`};
    transition: background-color 150ms ease;
`;

const iconButtonStyles = css`
    ${tw`inline-flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-lg`};
    color: var(--color-muted);
    background-color: transparent;
    border: 1px solid transparent;
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;

    &:hover {
        background-color: var(--color-neutral);
        border-color: var(--color-neutral);
        color: var(--color-base);
    }

    & svg {
        display: block;
    }
`;

const IconButton = styled.button`${iconButtonStyles}`;
const IconLink = styled.a`${iconButtonStyles}; ${tw`no-underline`};`;

const sidebarHeaderControlButtonStyles = css`
    ${tw`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg`};
    color: var(--color-muted);
    background-color: transparent;
    border: 1px solid transparent;
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    padding: 0;
    cursor: pointer;
    font: inherit;

    &:hover {
        background-color: var(--color-neutral);
        border-color: var(--color-neutral);
        color: var(--color-base);
    }

    & svg {
        display: block;
    }
`;

const SidebarHeaderTop = styled.div`
    ${tw`flex items-center gap-2 pr-4 flex-shrink-0`};
`;

const SidebarLogoBlock = styled.div`
    ${tw`flex-1 min-w-0 flex items-center`};
`;

const ServerSwitcherWrap = styled.div`
    ${tw`relative flex-shrink-0`};
`;

const SidebarHeaderActions = styled.div`
    ${tw`flex items-center gap-2 flex-shrink-0`};
`;

const FooterPopover = styled.div<{ $isOpen: boolean }>`
    ${tw`absolute py-1.5 rounded-md`};
    background-color: var(--color-background-secondary);
    border: 1px solid var(--color-neutral);
    min-width: 160px;
    bottom: calc(100% + 8px);
    right: 0;
    opacity: ${(props) => (props.$isOpen ? 1 : 0)};
    visibility: ${(props) => (props.$isOpen ? 'visible' : 'hidden')};
    transform: translateY(${(props) => (props.$isOpen ? '0' : '8px')});
    transition: all 150ms ease;
    z-index: 50;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
`;

const footerPopoverItemStyles = css`
    ${tw`flex items-center gap-2.5 px-3 py-2 w-full text-left`};
    font-size: 0.8125rem;
    color: var(--color-muted);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: all 150ms ease;

    &:hover {
        background-color: var(--color-neutral);
        color: var(--color-base);
    }

    &:visited, &:active, &:focus {
        color: var(--color-muted);
        text-decoration: none;
    }

    &:hover:visited {
        color: var(--color-base);
    }

    svg {
        font-size: 0.8125rem;
        width: 16px;
    }
`;

const FooterPopoverItem = styled.a`${footerPopoverItemStyles}`;
const FooterPopoverButton = styled.button`${footerPopoverItemStyles}`;
const FooterPopoverItemPrimary = styled.a`
    ${footerPopoverItemStyles};
    background-color: var(--color-primary);
    color: #fff;

    &:hover {
        background-color: color-mix(in srgb, var(--color-primary) 85%, #000);
        color: #fff;
    }

    &:visited, &:active, &:focus {
        color: #fff;
    }

    &:hover:visited {
        color: #fff;
    }
`;

const ServerSwitcherButton = styled.button`
    ${sidebarHeaderControlButtonStyles};

    & svg {
        font-size: 0.8125rem;
    }
`;

const ServerSwitcherPopover = styled.div<{ $isOpen: boolean }>`
    ${tw`absolute rounded-lg overflow-hidden`};
    top: calc(100% + 8px);
    right: 0;
    width: 280px;
    background-color: var(--color-background-secondary);
    border: 1px solid var(--color-neutral);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    opacity: ${(props) => (props.$isOpen ? 1 : 0)};
    visibility: ${(props) => (props.$isOpen ? 'visible' : 'hidden')};
    transform: translateX(calc(50% - 16px)) translateY(${(props) => (props.$isOpen ? '0' : '-8px')});
    transition: all 150ms ease;
    z-index: 100;
    max-height: 400px;
    display: flex;
    flex-direction: column;
`;

const ServerSwitcherSearch = styled.div`
    position: relative;
    border-bottom: 1px solid var(--color-neutral);
`;

const ServerSwitcherSearchIcon = styled.div`
    ${tw`absolute left-3 top-[35%] -translate-y-1/2 flex items-center justify-center`};
    color: var(--color-muted);
    pointer-events: none;

    svg {
        font-size: 0.75rem;
    }
`;

const ServerSwitcherInput = styled.input`
    ${tw`w-full py-2.5 text-sm`};
    padding-left: 2.25rem;
    padding-right: 0.75rem;
    background-color: var(--color-background);
    border-radius: var(--border-radius, 8px) var(--border-radius, 8px) 0 0;
    border: 1px solid var(--color-neutral);
    color: var(--color-base);
    outline: none;
    transition: border-color 150ms ease;

    &::placeholder {
        color: var(--color-muted);
    }

    &:focus {
        border-color: var(--color-primary);
    }
`;

const ServerSwitcherList = styled.div`
    ${tw`overflow-y-auto`};
    flex: 1;
    max-height: 320px;
`;

const ServerSwitcherItem = styled.button`
    ${tw`w-full flex items-center gap-3 px-3 py-2.5 text-left`};
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-neutral);
    cursor: pointer;
    transition: background-color 150ms ease;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: var(--color-neutral);
    }
`;

const ServerSwitcherItemIcon = styled.div`
    ${tw`flex-shrink-0`};
    color: var(--color-muted);

    svg {
        font-size: 0.875rem;
    }
`;

const ServerSwitcherItemInfo = styled.div`
    ${tw`flex-1 min-w-0`};
`;

const ServerSwitcherItemName = styled.p`
    ${tw`text-sm font-medium truncate`};
    color: var(--color-base);
`;

const ServerSwitcherItemMeta = styled.p`
    ${tw`text-xs truncate`};
    color: var(--color-muted);
`;

const ServerSwitcherEmpty = styled.div`
    ${tw`py-8 text-center text-sm`};
    color: var(--color-muted);
`;

const ServerSwitcherLoading = styled.div`
    ${tw`py-8 flex items-center justify-center`};
`;

const CollapseToggle = styled.button<{ $collapsed?: boolean }>`
    ${sidebarHeaderControlButtonStyles};

    & svg {
        font-size: 0.6875rem;
        transition: transform 200ms ease;
        transform: rotate(${(props) => (props.$collapsed ? '180deg' : '0deg')});
    }
`;


const CollapsedNavItem = styled(NavLink)<{ $sidebarItemStyle?: SidebarItemStateVariant }>`
    ${tw`flex items-center justify-center no-underline`};
    position: relative;
    width: 42px;
    height: 42px;
    margin: 0 auto 4px;
    ${(props) => getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default', true)}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);
    transition: all 150ms ease;

    &:hover {
        ${(props) => getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default', true)}
    }

    &.active {
        ${(props) => getSidebarItemActiveStyles(props.$sidebarItemStyle || 'default', true)}
    }

    svg {
        font-size: 1rem;
    }
`;

const CollapsedExternalNavItem = styled.a<{ $sidebarItemStyle?: SidebarItemStateVariant }>`
    ${tw`flex items-center justify-center no-underline`};
    position: relative;
    width: 42px;
    height: 42px;
    margin: 0 auto 4px;
    ${(props) => getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default', true)}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);
    transition: all 150ms ease;

    &:hover {
        ${(props) => getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default', true)}
    }

    svg {
        font-size: 1rem;
    }
`;

const CollapsedActionButton = styled.button<{ $sidebarItemStyle?: SidebarItemStateVariant }>`
    ${tw`flex items-center justify-center`};
    position: relative;
    width: 42px;
    height: 42px;
    margin: 0 auto 4px;
    ${(props) => getSidebarItemBaseStyles(props.$sidebarItemStyle || 'default', true)}
    color: color-mix(in srgb, var(--color-base) 70%, transparent);
    background: transparent;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
        ${(props) => getSidebarItemHoverStyles(props.$sidebarItemStyle || 'default', true)}
    }

    svg {
        font-size: 1rem;
    }
`;

const CollapsedNav = styled.nav`
    flex: 1;
    min-height: 0;
    padding: 0.5rem 0 1rem;
    overflow-y: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
`;

const SidebarTooltip = styled.div<{ $visible: boolean; $top: number; $left: number }>`
    position: fixed;
    top: ${(props) => props.$top}px;
    left: ${(props) => props.$left}px;
    transform: translateY(-50%);
    background: var(--color-background-secondary);
    border: 1px solid var(--color-neutral);
    color: var(--color-base);
    padding: 6px 10px;
    border-radius: var(--border-radius, 6px);
    font-size: 12px;
    white-space: nowrap;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    opacity: ${(props) => (props.$visible ? 1 : 0)};
    transition: opacity 100ms ease;
`;

const CollapsedSectionDivider = styled.div`
    width: 24px;
    height: 1px;
    background-color: var(--color-neutral);
    margin: 8px auto;
`;

const ServerIpRow = styled.div`
    ${tw`flex items-center gap-2 text-xs font-mono`};
    color: var(--color-muted);
    margin-top: 0.5rem;
    cursor: pointer;
`;

const ServerIpValue = styled.span`
    font-size: 0.875rem;
    color: var(--color-muted);
`;

const ServerIpIcon = styled(FontAwesomeIcon)`
    font-size: 0.75rem;
`;

const ServerHeader = styled.div`
    ${tw`px-4 pb-4 mb-2`};
    border-bottom: 1px solid var(--color-neutral);
`;

const MobilePowerControlsWrapper = styled.div`
    display: none;

    @media (max-width: 1023px) {
        display: block;
    }
`;

const ServerHeaderTop = styled.div`
    ${tw`flex items-center justify-between gap-2`};
`;

const ServerHeaderName = styled.h2`
    ${tw`text-lg font-semibold truncate flex-1 min-w-0`};
    color: var(--color-base);
`;

const ServerHeaderStatus = styled.div<{ $status?: string }>`
    ${tw`flex items-center gap-1.5 text-xs font-medium`};
    color: ${({ $status }) =>
        $status === 'offline' || !$status
            ? '#ef4444'
            : $status === 'running'
                ? '#22c55e'
                : '#eab308'};

    svg {
        font-size: 0.4rem;
        ${({ $status }) =>
        $status === 'running'
            ? css`
                      animation: ${pulse} 2s ease-in-out infinite;
                  `
            : 'animation: none;'}
    }
`;

const NavbarContainer = styled.header`
    ${tw`fixed top-0 left-0 right-0 z-30`};
    top: var(--announcement-top-offset, 0px);
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-background-secondary) 92%, var(--color-primary) 8%), color-mix(in srgb, var(--color-background-secondary) 92%, var(--color-secondary) 8%));
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-neutral));
    box-shadow: 0 14px 40px rgba(0,0,0,0.22);
`;

const NavbarInner = styled.div<{ $maxWidth?: number }>`
    ${tw`flex items-center justify-between h-16 px-4 lg:px-8`};
    max-width: ${(props) => `${props.$maxWidth || 1360}px`};
    margin: 0 auto;
`;

const NavbarLogo = styled(Link)`
    ${tw`hidden lg:flex items-center no-underline mr-6`};
    color: var(--color-base);
    font-size: 1.125rem;
    font-weight: 600;

    img {
        max-height: 32px;
        width: auto;
    }
`;

const NavbarTabs = styled.nav`
    ${tw`hidden lg:flex items-center h-full`};
    gap: 2px;
`;

const NavbarTab = styled(NavLink)`
    ${tw`flex items-center no-underline font-medium h-full relative`};
    padding: 0 1rem;
    font-size: 0.8125rem;
    color: var(--color-muted);
    transition: color 150ms ease;

    &:hover {
        color: var(--color-base);
    }

    &.active {
        color: var(--color-base);
    }

    &.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 1rem;
        right: 1rem;
        height: 2px;
        background-color: var(--color-primary);
        border-radius: 2px 2px 0 0;
    }

    svg {
        ${tw`mr-2`};
        font-size: 0.8125rem;
    }
`;

const NavbarTabExternal = styled.a`
    ${tw`flex items-center no-underline font-medium h-full relative`};
    padding: 0 1rem;
    font-size: 0.8125rem;
    color: var(--color-muted);
    transition: color 150ms ease;

    &:hover {
        color: var(--color-base);
    }

    svg {
        ${tw`mr-2`};
        font-size: 0.8125rem;
    }
`;

const dropdownTriggerStyles = css<{ $isOpen?: boolean }>`
    ${tw`flex items-center font-medium h-full`};
    font-size: 0.8125rem;
    color: ${(props) => (props.$isOpen ? 'var(--color-base)' : 'var(--color-muted)')};
    background: none;
    border: none;
    transition: color 150ms ease;
    cursor: pointer;

    &:hover {
        color: var(--color-base);
    }

    svg {
        ${tw`ml-1.5`};
        font-size: 0.65rem;
    }
`;

const NavbarDropdownTrigger = styled.button<{ $isOpen?: boolean }>`
    ${dropdownTriggerStyles};
    ${tw`relative`};
    padding: 0 1rem;
`;

const NavbarRight = styled.div`
    ${tw`flex items-center gap-1`};
`;

const barIconButtonStyles = css`
    ${tw`flex items-center justify-center w-9 h-9 rounded-md no-underline`};
    color: var(--color-muted);
    transition: all 150ms ease;

    &:hover {
        color: var(--color-base);
        background-color: var(--color-neutral);
    }

    svg {
        font-size: 1rem;
    }
`;

const barUserButtonStyles = css`
    ${tw`flex items-center gap-2 rounded-md px-2.5 py-2`};
    background-color: transparent;
    border: 1px solid transparent;
    color: var(--color-base);
    transition: all 150ms ease;

    &:hover {
        background-color: var(--color-neutral);
    }
`;

const NavbarIconButton = styled.a`${barIconButtonStyles}`;
const NavbarUserButton = styled.button`${barUserButtonStyles}; ${tw`ml-2`};`;

const dropdownBaseStyles = css`
    ${tw`absolute py-1.5 rounded-md`};
    background-color: var(--color-background-secondary);
    border: 1px solid var(--color-neutral);
    min-width: 180px;
    transition: all 150ms ease;
    z-index: 50;
`;

const NavbarDropdown = styled.div<{ $isOpen: boolean }>`
    ${dropdownBaseStyles};
    ${tw`top-full mt-1`};
    opacity: ${(props) => (props.$isOpen ? 1 : 0)};
    visibility: ${(props) => (props.$isOpen ? 'visible' : 'hidden')};
    transform: translateY(${(props) => (props.$isOpen ? '0' : '-8px')});
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
`;

const dropdownItemStyles = css`
    ${tw`flex items-center gap-2.5 px-3 py-2 no-underline`};
    font-size: 0.8125rem;
    color: var(--color-muted);
    transition: all 150ms ease;

    &:hover {
        background-color: var(--color-neutral);
        color: var(--color-base);
    }

    svg {
        font-size: 0.8125rem;
        width: 16px;
    }
`;

const NavbarDropdownItem = styled(NavLink)`
    ${dropdownItemStyles};
    &.active { color: var(--color-primary); }
`;

const NavbarDropdownLink = styled(Link)`${dropdownItemStyles}`;
const NavbarDropdownExternal = styled.a`${dropdownItemStyles}`;

const NavbarDropdownButton = styled.button`
    ${dropdownItemStyles};
    ${tw`w-full text-left`};
    background: none;
    border: none;
    cursor: pointer;
`;

const NavbarDropdownDivider = styled.div`
    ${tw`my-1.5`};
    border-top: 1px solid var(--color-neutral);
`;

const NavbarDropdownLabel = styled.div`
    ${tw`px-3 py-1 text-xs font-medium uppercase tracking-wider`};
    color: var(--color-inverted);
    font-size: 0.65rem;
`;

const NavbarServerInfo = styled.div`
    ${tw`flex items-center gap-2 ml-4 pl-4`};
    border-left: 1px solid var(--color-neutral);
`;

const NavbarServerName = styled.span`
    ${tw`font-medium text-sm`};
    color: var(--color-base);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const consoleSidebarMarginStyles = css<{ $consoleSidebarOpen?: boolean }>`
    margin-right: ${(props) => (props.$consoleSidebarOpen ? '380px' : '0')};
    transition: margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1);

    @media (max-width: 1280px) {
        margin-right: ${(props) => (props.$consoleSidebarOpen ? '340px' : '0')};
    }

    @media (max-width: 1024px) {
        margin-right: 0;
    }
`;

const NavbarMainContent = styled.main<{ $consoleSidebarOpen?: boolean; $bgImage?: string; $bgOverlay?: number; $hasPanels?: boolean }>`
    ${tw`flex-1 relative`};
    background-color: var(--color-background);
    padding-top: calc(4rem + var(--announcement-top-offset, 0px));
    ${(props) => props.$hasPanels ? css`height: 100vh; overflow: hidden;` : css`min-height: 100vh;`}
    ${consoleSidebarMarginStyles};

    ${(props) => props.$bgImage && css`
        background-image: linear-gradient(rgba(0, 0, 0, ${(props.$bgOverlay || 50) / 100}), rgba(0, 0, 0, ${(props.$bgOverlay || 50) / 100})), url('${props.$bgImage}');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
    `}
`;

const BottomBarContainer = styled.footer`
    ${tw`fixed bottom-0 left-0 right-0 z-30`};
    background-color: var(--color-background-secondary);
    border-top: 1px solid var(--color-neutral);
`;

const BottomBarInner = styled.div<{ $maxWidth?: number }>`
    ${tw`flex items-center justify-between h-16 px-4 lg:px-8`};
    max-width: ${(props) => `${props.$maxWidth || 1360}px`};
    margin: 0 auto;
`;

const BottomBarTabs = styled.nav`
    ${tw`hidden lg:flex items-center h-full`};
    gap: 2px;
`;

const bottomBarTabStyles = css`
    ${tw`flex items-center no-underline font-medium h-full`};
    padding: 0 0.75rem;
    font-size: 0.875rem;
    color: var(--color-muted);
    transition: color 150ms ease;

    &:hover {
        color: var(--color-base);
    }

    svg {
        ${tw`mr-2`};
        font-size: 0.875rem;
    }
`;

const BottomBarTab = styled(NavLink)`
    ${bottomBarTabStyles};
    &.active { color: var(--color-primary); }
`;

const BottomBarTabExternal = styled.a`
    ${bottomBarTabStyles};
    padding: 0 1rem;
    font-size: 0.8125rem;
    svg { font-size: 0.8125rem; }
`;

const BottomBarDropdownTrigger = styled.button<{ $isOpen?: boolean }>`
    ${dropdownTriggerStyles};
    padding: 0 0.75rem;
    font-size: 0.875rem;
    color: ${(props) => (props.$isOpen ? 'var(--color-primary)' : 'var(--color-muted)')};
`;

const BottomBarRight = styled.div`
    ${tw`flex items-center gap-1`};
`;

const BottomBarLeft = styled.div`
    ${tw`flex items-center gap-1`};
`;

const BottomBarIconButton = styled.a`${barIconButtonStyles}`;
const BottomBarUserButton = styled.button`${barUserButtonStyles}`;

const BottomBarDropdown = styled.div<{ $isOpen: boolean }>`
    ${dropdownBaseStyles};
    ${tw`bottom-full mb-1`};
    opacity: ${(props) => (props.$isOpen ? 1 : 0)};
    visibility: ${(props) => (props.$isOpen ? 'visible' : 'hidden')};
    transform: translateY(${(props) => (props.$isOpen ? '0' : '8px')});
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25);
`;

const BottomBarServerInfo = styled.div`
    ${tw`hidden lg:flex items-center gap-2 mr-4 pr-4`};
    border-right: 1px solid var(--color-neutral);
`;

const BottomBarMainContent = styled.main<{ $consoleSidebarOpen?: boolean; $bgImage?: string; $bgOverlay?: number; $hasPanels?: boolean }>`
    ${tw`flex-1 relative`};
    background-color: var(--color-background);
    padding-bottom: 4rem;
    padding-top: var(--announcement-top-offset, 0px);
    ${(props) => props.$hasPanels ? css`height: 100vh; overflow: hidden;` : css`min-height: 100vh;`}
    ${consoleSidebarMarginStyles};

    ${(props) => props.$bgImage && css`
        background-image: linear-gradient(rgba(0, 0, 0, ${(props.$bgOverlay || 50) / 100}), rgba(0, 0, 0, ${(props.$bgOverlay || 50) / 100})), url('${props.$bgImage}');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
    `}
`;

const serverIcons: Record<string, any> = {
    Dashboard: faTachometerAlt,
    Console: faTerminal,
    Files: faFolderOpen,
    Plugins: faCube,
    Mods: faCube,
    Subdomains: faLink,
    Properties: faToolbox,
    'Environment Variables': faKey,
    Databases: faTable,
    Schedules: faCalendarAlt,
    Users: faUserFriends,
    Backups: faCloudUploadAlt,
    Network: faGlobe,
    Startup: faRocket,
    Settings: faSlidersH,
    Activity: faChartLine,
};

const serverCategories: Record<string, string[]> = {
    'Overview': ['Dashboard', 'Console'],
    'Management': ['Files', 'Environment Variables', 'Databases', 'Backups'],
    'Configuration': ['Schedules', 'Network', 'Startup'],
    'Access & Logs': ['Users', 'Activity'],
    'Server': ['Settings'],
};

const routeTranslationKeys: Record<string, string> = {
    Dashboard: 'dashboard',
    Console: 'console',
    Files: 'files',
    Plugins: 'plugins',
    Mods: 'mods',
    Modpacks: 'modpacks',
    Versions: 'versions',
    Subdomains: 'subdomains',
    Properties: 'properties',
    'Reverse Proxies': 'reverse_proxies',
    'Environment Variables': 'environment_variables',
    Databases: 'databases',
    Schedules: 'schedules',
    Users: 'users',
    Backups: 'backups',
    Network: 'network',
    Startup: 'startup',
    Settings: 'settings',
    Activity: 'activity',
};

const categoryTranslationKeys: Record<string, string> = {
    Overview: 'overview',
    Management: 'management',
    Configuration: 'configuration',
    'Access & Logs': 'access_logs',
    Server: 'server',
};

const getStatusText = (status: string | undefined, t: (key: string, fallback: string) => string) => {
    if (!status || status === 'offline') return t('statuses.offline', 'Offline');
    if (status === 'running') return t('statuses.online', 'Online');
    if (status === 'starting') return t('statuses.starting', 'Starting');
    if (status === 'stopping') return t('statuses.stopping', 'Stopping');
    return t('unknown', 'Unknown');
};

const MobileUserSection: React.FC<{
    user: any;
    closeSidebar: () => void;
}> = ({ user, closeSidebar }) => {
    return (
        <UserSection>
            <div className="flex items-center gap-2">
                <UserProfileLink to="/account" onClick={closeSidebar}>
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Avatar.User />
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-base)' }}>
                            {user?.username}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                            {user?.email}
                        </p>
                    </div>
                </UserProfileLink>
            </div>
        </UserSection>
    );
};

const DropdownBackdrop: React.FC<{ isOpen: boolean; onClick: () => void }> = ({ isOpen, onClick }) =>
    isOpen ? <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={onClick} /> : null;

const UserDropdownContent: React.FC<{ onClose: () => void; onLogout: () => void }> = ({ onClose, onLogout }) => {
    const { t } = useTranslation('strings');

    return (
        <>
            <NavbarDropdownLabel>{t('account', 'Account')}</NavbarDropdownLabel>
            <NavbarDropdownLink to="/account" onClick={onClose}>
                <FontAwesomeIcon icon={faUserCircle} />
                {t('settings', 'Settings')}
            </NavbarDropdownLink>
            <NavbarDropdownDivider />
            <NavbarDropdownButton onClick={onLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} />
                {t('sign_out', 'Sign out')}
            </NavbarDropdownButton>
        </>
    );
};

const ServerSwitcherAddressMeta = ({ server }: { server: Server }) => {
    const alloc = server.allocations[0];
    const line =
        server.primarySubdomain ||
        (alloc ? (alloc.alias ? `${alloc.alias}:${alloc.port}` : `${ip(alloc.ip)}:${alloc.port}`) : server.node);
    const blur = !server.primarySubdomain && !!alloc && !alloc.alias;
    return <PrivacyServerHostBlur when={blur}>{line}</PrivacyServerHostBlur>;
};

const Sidebar: React.FC<SidebarProps> = ({
    children,
    serverName,
    serverId,
    internalId,
    serverStatus,
    connectionAddress,
    blurConnectionAddress,
    eggId,
    serverRoutes,
    accountRoutes,
    showServerNav,
    showAccountNav,
    consoleSidebarOpen,
}) => {
    const { t } = useTranslation(['strings', 'server', 'dashboard']);
    const isInPanel = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('_panel') === '1';

    if (isInPanel) {
        return (
            <div style={{ height: '100%', overflow: 'auto', backgroundColor: 'var(--color-background)' }}>
                <div style={{ padding: '1.5rem' }}>
                    {children}
                </div>
            </div>
        );
    }

    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [configDropdownOpen, setConfigDropdownOpen] = useState(false);
    const [footerPopoverOpen, setFooterPopoverOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<ThemePreference>(getStoredTheme());
    const [serverSwitcherOpen, setServerSwitcherOpen] = useState(false);
    const [serverSearch, setServerSearch] = useState('');
    const [servers, setServers] = useState<Server[]>([]);
    const [serversLoading, setServersLoading] = useState(false);
    const [serversLoaded, setServersLoaded] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

    useEffect(() => {
        try {
            localStorage.removeItem('sidebar_collapsed');
        } catch { }
    }, []);
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem('sidebar_collapsed_categories');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ text: string; top: number; left: number } | null>(null);
    const collapsedNavRef = useRef<HTMLElement>(null);
    const serverSwitcherRef = useRef<HTMLDivElement>(null);
    const footerPopoverRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const history = useHistory();
    const location = useLocation();

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('sidebar_collapsed', String(next));
            } catch { }
            return next;
        });
    };

    const toggleCategoryCollapse = (category: string) => {
        setCollapsedCategories((prev) => {
            const next = { ...prev, [category]: !prev[category] };
            try {
                localStorage.setItem('sidebar_collapsed_categories', JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);
    const logo = useStoreState((state: ApplicationStore) => state.settings.data?.logo);
    const logoDark = useStoreState((state: ApplicationStore) => state.settings.data?.logoDark);
    const logoLight = useStoreState((state: ApplicationStore) => state.settings.data?.logoLight);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);
    const user = useStoreState((state: ApplicationStore) => state.user.data);
    const canAccessThemeEditor = rootAdmin || (user?.themeEditorPermissions?.length ?? 0) > 0;
    const discordInviteLink = useStoreState((state: ApplicationStore) => state.settings.data?.discordInviteLink);
    const showDiscordNavbar = useStoreState((state: ApplicationStore) => state.settings.data?.showDiscordNavbar);
    const showDashboard = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.showDashboard ?? true);
    const layoutType = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.layoutType ?? 'floating');
    const navLinks = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.navLinks ?? null);
    const announcements = useStoreState((state: ApplicationStore) => state.settings.data?.announcements);
    const showClaim = useStoreState((state: ApplicationStore) => state.settings.data?.addons?.freeServers?.enabled ?? false);
    const powerDockLocation = useStoreState((state: ApplicationStore) => state.settings.data?.components?.powerDock ?? 'dock');
    const sidebarItemStyle = useStoreState((state: ApplicationStore) => state.settings.data?.components?.sidebarItemStyle ?? 'default');
    const serverBgType = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.serverBackgroundType ?? 'none');
    const serverBgSource = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.serverBackgroundSource ?? 'custom');
    const serverBgImage = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.serverBackgroundImage ?? '');
    const serverBgOverlay = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.serverBackgroundOverlay ?? 50);
    const dashboardBgImage = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.dashboardBackgroundImage ?? '');
    const dashboardBgOverlay = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.dashboardBackgroundOverlay ?? 35);
    const contentMaxWidth = useStoreState((state: ApplicationStore) => state.settings.data?.layout?.contentMaxWidth ?? 1200);
    const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(() =>
        document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    );
    const activeLogo = effectiveTheme === 'light'
        ? logoLight || logoDark || logo
        : logoDark || logoLight || logo;

    useEffect(() => {
        const resolveTheme = () => {
            setEffectiveTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
        };

        resolveTheme();
        const observer = new MutationObserver(resolveTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const onMediaChange = () => {
            if (getStoredTheme() === 'system') {
                resolveTheme();
            }
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === 'pterodactyl_theme') {
                resolveTheme();
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', onMediaChange);
        } else {
            mediaQuery.addListener(onMediaChange);
        }

        window.addEventListener('storage', onStorage);

        return () => {
            observer.disconnect();
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', onMediaChange);
            } else {
                mediaQuery.removeListener(onMediaChange);
            }
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    const eggImages = (window as any).SiteConfiguration?.eggImages || {};
    const getBackgroundImage = () => {
        if (!showServerNav && location.pathname === '/') return dashboardBgImage || undefined;
        if (!showServerNav || serverBgType !== 'image') return undefined;
        if (serverBgSource === 'egg' && eggId) {
            return eggImages[eggId] || undefined;
        }
        return serverBgImage || undefined;
    };
    const bgImage = getBackgroundImage();
    const bgOverlay = !showServerNav && location.pathname === '/' ? dashboardBgOverlay : serverBgOverlay;

    const translateRouteName = (routeName?: string) => {
        if (!routeName) return '';
        const key = routeTranslationKeys[routeName];
        return key ? t(`server:navigation.${key}`, routeName) : routeName;
    };

    const translateCategoryName = (category: string) => {
        const key = categoryTranslationKeys[category];
        return key ? t(`server:navigation_categories.${key}`, category) : category;
    };

    const normaliseIconKey = (value?: string) => (value || '').trim().toLowerCase();

    const iconAliases: Record<string, string> = {
        dashboard: 'tachometer-alt',
        tachometer: 'tachometer-alt',
        activity: 'chart-line',
        console: 'terminal',
        files: 'folder-open',
        backups: 'cloud-upload-alt',
        databases: 'table',
        schedules: 'calendar-alt',
        schedule: 'calendar-alt',
        network: 'globe',
        startup: 'rocket',
        settings: 'sliders-h',
        admin: 'toolbox',
        subdomains: 'link',
        gear: 'cog',

        'area-chart': 'chart-area',
        'bar-chart': 'chart-bar',
        'line-chart': 'chart-line',
        'pie-chart': 'chart-pie',
        'clock-o': 'clock',
        'cloud-download': 'cloud-download-alt',
        'cloud-upload': 'cloud-upload-alt',
        exchange: 'exchange-alt',
        'external-link': 'external-link-alt',
        'external-link-square': 'external-link-square-alt',
        'file-text': 'file-alt',
        'handshake-o': 'handshake',
        'hdd-o': 'hdd',
        'keyboard-o': 'keyboard',
        'lightbulb-o': 'lightbulb',
        'map-marker': 'map-marker-alt',
        mobile: 'mobile-alt',
        money: 'money-bill',
        'moon-o': 'moon',
        'newspaper-o': 'newspaper',
        pencil: 'pencil-alt',
        'pencil-square': 'pen-square',
        refresh: 'sync-alt',
        shield: 'shield-alt',
        sliders: 'sliders-h',
        'snowflake-o': 'snowflake',
        'star-half-o': 'star-half-alt',
        'sun-o': 'sun',
        tablet: 'tablet-alt',
        'user-circle-o': 'user-circle',
        'video-camera': 'video',
    };

    const resolveIcon = (key?: string) => {
        const k = normaliseIconKey(key);
        if (!k) return null;
        const resolvedName = iconAliases[k] || k;
        const found = findIconDefinition({ prefix: 'fas', iconName: resolvedName as any });
        return found || null;
    };

    const resolveLink = (raw?: string) => {
        const input = (raw || '').trim();
        if (!input) return null;

        const replaced = serverId ? input.replace(/\{serverId\}/g, String(serverId)) : input;
        if (/^https?:\/\//i.test(replaced)) return { external: true as const, href: replaced };

        const path = replaced.startsWith('/') ? replaced : `/${replaced}`;
        if (path.startsWith('/server/')) return { external: false as const, to: path };
        if (!serverId) return { external: false as const, to: path };
        return { external: false as const, to: `/server/${serverId}${path === '/' ? '' : path}` };
    };

    const getConfigCategories = () => {
        const cats = (navLinks as any)?.categories;
        if (!Array.isArray(cats)) return null;
        return cats as any[];
    };

    const buildConfiguredNav = (): NavCategory[] | null => {
        if (!serverRoutes || !serverId) return null;
        const cats = getConfigCategories();
        if (!cats) return null;

        const routeMap: Record<string, (typeof serverRoutes)[number]> = {};
        serverRoutes.forEach((r) => {
            if (r.name) {
                routeMap[r.name] = r;
                routeMap[r.name.toLowerCase()] = r;
            }
        });

        const orderedCats = [...cats]
            .filter((c) => c && c.enabled !== false)
            .sort((a, b) => (Number(a.order ?? 0) || 0) - (Number(b.order ?? 0) || 0));

        return orderedCats
            .map((cat, catIndex) => {
                const catLabel = (cat.label || `Category ${catIndex + 1}`).toString();
                const links = Array.isArray(cat.links) ? cat.links : [];

                const items: RenderNavItem[] = [...links]
                    .filter((l) => {
                        if (!l || l.enabled === false) return false;
                        const eggFilter = Array.isArray(l.egg_filter) ? l.egg_filter : [];
                        if (eggFilter.length > 0 && eggId) {
                            return eggFilter.includes(eggId);
                        }
                        return true;
                    })
                    .sort((a, b) => (Number(a.order ?? 0) || 0) - (Number(b.order ?? 0) || 0))
                    .map((l, linkIndex) => {
                        const label = (l.label || '').toString().trim();

                        const rawLink = (l.link || '').toString().trim();

                        const legacyRouteName = (l.route || '').toString().trim();
                        const legacyType = (l.type || '').toString().trim();

                        const isPanelRoute = !rawLink || legacyType === 'route' || !!legacyRouteName;

                        if (isPanelRoute) {
                            const routeName = (legacyRouteName || label).toString().trim();
                            const linkId = (l.id || '').toString().trim();
                            if (!routeName && !linkId) return null;
                            const route = routeMap[routeName] || routeMap[linkId];
                            if (!route) return null;
                            if (!showDashboard && route.name === 'Dashboard') return null;

                            const isConsole = route.name === 'Console';
                            const routePath =
                                isConsole && !showDashboard
                                    ? `/server/${serverId}`
                                    : `/server/${serverId}${route.path === '/' ? '' : route.path}`;

                            return {
                                key: `cfg:${catIndex}:${linkIndex}:route:${route.name}`,
                                label: label || translateRouteName(route.name),
                                icon: resolveIcon(l.icon) || serverIcons[route.name || ''] || faServer,
                                permission: l.permission ?? route.permission,
                                exact: route.path === '/' || (isConsole && !showDashboard),
                                external: false,
                                to: routePath,
                            } as RenderNavItem;
                        }

                        const resolved = resolveLink(rawLink);
                        if (!resolved) return null;

                        return {
                            key: `cfg:${catIndex}:${linkIndex}:link:${label || 'link'}`,
                            label: label || t('link', 'Link'),
                            icon: resolveIcon(l.icon) || faGlobe,
                            permission: l.permission ?? null,
                            external: resolved.external,
                            href: resolved.external ? resolved.href : undefined,
                            to: resolved.external ? undefined : resolved.to,
                        } as RenderNavItem;
                    })
                    .filter(Boolean) as RenderNavItem[];

                return { category: catLabel, items };
            })
            .filter((c) => c.items.length > 0);
    };

    const onTriggerLogout = () => {
        setIsLoggingOut(true);
        http.post('/auth/logout').finally(() => {
            (window as any).location = '/';
        });
    };

    const cycleTheme = () => {
        const themeOrder: ThemePreference[] = ['dark', 'light', 'system'];
        const currentIndex = themeOrder.indexOf(currentTheme);
        const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
        updateThemePreference(nextTheme);
        setCurrentTheme(nextTheme);
    };

    const getThemeIcon = () => {
        switch (currentTheme) {
            case 'light': return faSun;
            case 'system': return faDesktop;
            default: return faMoon;
        }
    };

    const getThemeLabel = () => {
        switch (currentTheme) {
            case 'light': return t('theme.light_mode', 'Light mode');
            case 'system': return t('theme.system_mode', 'System mode');
            default: return t('theme.dark_mode', 'Dark mode');
        }
    };

    const themeSettingLabel = t('theme_setting', 'Theme Setting');
    const adminPanelLabel = t('admin_cp', 'Admin Panel');

    const closeSidebar = () => setIsOpen(false);

    const handleThemeNavClick = () => {
        cycleTheme();
        closeSidebar();
    };

    const handleLogoutNavClick = () => {
        closeSidebar();
        onTriggerLogout();
    };

    const renderPanelNavigation = (includeAccount = false) => (
        <>
            <SectionTitle>{t('panel', 'Panel')}</SectionTitle>
            {includeAccount && (
                <NavItem to="/account" onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                    <FontAwesomeIcon icon={faUserCircle} />
                    {t('account', 'Account')}
                </NavItem>
            )}
            {canAccessThemeEditor && (
                <ExternalNavItem href="/admin/settings/theme" onClick={closeSidebar as any} $sidebarItemStyle={sidebarItemStyle}>
                    <FontAwesomeIcon icon={faPalette} />
                    {themeSettingLabel}
                </ExternalNavItem>
            )}
            {rootAdmin && (
                <ExternalNavItem href="/admin" onClick={closeSidebar as any} $sidebarItemStyle={sidebarItemStyle}>
                    <FontAwesomeIcon icon={faToolbox} />
                    {adminPanelLabel}
                </ExternalNavItem>
            )}
            <NavActionButton type="button" onClick={handleThemeNavClick} $sidebarItemStyle={sidebarItemStyle}>
                <FontAwesomeIcon icon={getThemeIcon()} />
                {getThemeLabel()}
            </NavActionButton>
            <NavActionButton type="button" onClick={handleLogoutNavClick} $sidebarItemStyle={sidebarItemStyle}>
                <FontAwesomeIcon icon={faSignOutAlt} />
                {t('sign_out', 'Sign out')}
            </NavActionButton>
        </>
    );

    const renderCollapsedPanelNavigation = (includeAccount = false) => (
        <>
            <CollapsedSectionDivider />
            {includeAccount && (
                <CollapsedNavItem
                    to="/account"
                    onClick={closeSidebar}
                    data-tooltip={t('account', 'Account')}
                    $sidebarItemStyle={sidebarItemStyle}
                >
                    <FontAwesomeIcon icon={faUserCircle} />
                </CollapsedNavItem>
            )}
            {canAccessThemeEditor && (
                <CollapsedExternalNavItem
                    href="/admin/settings/theme"
                    onClick={closeSidebar as any}
                    data-tooltip={themeSettingLabel}
                    $sidebarItemStyle={sidebarItemStyle}
                >
                    <FontAwesomeIcon icon={faPalette} />
                </CollapsedExternalNavItem>
            )}
            {rootAdmin && (
                <CollapsedExternalNavItem
                    href="/admin"
                    onClick={closeSidebar as any}
                    data-tooltip={adminPanelLabel}
                    $sidebarItemStyle={sidebarItemStyle}
                >
                    <FontAwesomeIcon icon={faToolbox} />
                </CollapsedExternalNavItem>
            )}
            <CollapsedActionButton
                type="button"
                onClick={handleThemeNavClick}
                data-tooltip={getThemeLabel()}
                $sidebarItemStyle={sidebarItemStyle}
            >
                <FontAwesomeIcon icon={getThemeIcon()} />
            </CollapsedActionButton>
            <CollapsedActionButton
                type="button"
                onClick={handleLogoutNavClick}
                data-tooltip={t('sign_out', 'Sign out')}
                $sidebarItemStyle={sidebarItemStyle}
            >
                <FontAwesomeIcon icon={faSignOutAlt} />
            </CollapsedActionButton>
        </>
    );

    const getAllServerRoutes = () => {
        if (!serverRoutes) return [];
        let allRoutes: typeof serverRoutes = [];
        Object.values(serverCategories).forEach((routeNames) => {
            let filteredRouteNames = routeNames;
            if (!showDashboard) {
                filteredRouteNames = routeNames.filter((n) => n !== 'Dashboard');
            }
            const categoryRoutes = serverRoutes.filter(
                (route) => route.name && filteredRouteNames.includes(route.name)
            );
            allRoutes = [...allRoutes, ...categoryRoutes];
        });
        return allRoutes;
    };

    const closeAllDropdowns = () => {
        setDropdownOpen(false);
        setMoreDropdownOpen(false);
        setConfigDropdownOpen(false);
        setFooterPopoverOpen(false);
    };

    const loadServers = async () => {
        if (serversLoaded) return;
        setServersLoading(true);
        try {
            const result = await getServers({ per_page: 50 });
            setServers(result.items);
            setServersLoaded(true);
        } catch (e) {
            console.error('Failed to load servers', e);
        } finally {
            setServersLoading(false);
        }
    };

    const toggleServerSwitcher = () => {
        const newState = !serverSwitcherOpen;
        setServerSwitcherOpen(newState);
        if (newState) {
            loadServers();
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setServerSearch('');
        }
    };

    const navigateToServer = (server: Server) => {
        setServerSwitcherOpen(false);
        setServerSearch('');
        closeSidebar();
        history.push(`/server/${server.id}`);
    };

    const filteredServers = servers.filter((server) =>
        server.name.toLowerCase().includes(serverSearch.toLowerCase()) ||
        server.allocations.some((a) =>
            `${a.alias || a.ip}:${a.port}`.includes(serverSearch) ||
            (a.alias && a.alias.toLowerCase().includes(serverSearch.toLowerCase()))
        )
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (serverSwitcherRef.current && !serverSwitcherRef.current.contains(event.target as Node)) {
                setServerSwitcherOpen(false);
                setServerSearch('');
            }
        };

        if (serverSwitcherOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [serverSwitcherOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (footerPopoverRef.current && !footerPopoverRef.current.contains(event.target as Node)) {
                setFooterPopoverOpen(false);
            }
        };

        if (footerPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [footerPopoverOpen]);

    useEffect(() => {
        const nav = collapsedNavRef.current;
        if (!nav || !sidebarCollapsed) return;

        const show = (e: Event) => {
            const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
            if (!target) return;
            const rect = target.getBoundingClientRect();
            setTooltip({
                text: target.getAttribute('data-tooltip') || '',
                top: rect.top + rect.height / 2,
                left: rect.right + 8,
            });
        };

        const hide = () => setTooltip(null);

        nav.addEventListener('mouseover', show);
        nav.addEventListener('mouseout', hide);
        return () => {
            nav.removeEventListener('mouseover', show);
            nav.removeEventListener('mouseout', hide);
        };
    }, [sidebarCollapsed]);

    useEffect(() => {
        const handler = () => {
            if (!rootAdmin || !internalId) {
                return;
            }
            window.location.href = `/admin/servers/view/${internalId}`;
        };

        window.addEventListener('luna:keybind:admin-view-current-server', handler as EventListener);
        return () => window.removeEventListener('luna:keybind:admin-view-current-server', handler as EventListener);
    }, [rootAdmin, internalId]);

    const buildFallbackCategories = (routes: typeof serverRoutes): NavCategory[] => {
        if (!routes) return [];
        return Object.entries(serverCategories)
            .map(([category, routeNames]) => {
                const filteredRouteNames = showDashboard ? routeNames : routeNames.filter((n) => n !== 'Dashboard');
                const items: RenderNavItem[] = filteredRouteNames
                    .map((routeName) => {
                        const route = routes.find((r) => r.name === routeName);
                        if (!route) return null;
                        const isConsole = route.name === 'Console';
                        const routePath =
                            isConsole && !showDashboard ? `/server/${serverId}` : `/server/${serverId}${route.path === '/' ? '' : route.path}`;
                        return {
                            key: `route:${route.path}`,
                            label: translateRouteName(route.name),
                            icon: serverIcons[route.name || ''] || faServer,
                            permission: route.permission,
                            exact: route.path === '/' || (isConsole && !showDashboard),
                            external: false,
                            to: routePath,
                        };
                    })
                    .filter(Boolean) as RenderNavItem[];
                return { category: translateCategoryName(category), items };
            })
            .filter((c) => c.items.length > 0);
    };

    const renderNavItemContent = (item: RenderNavItem, variant: 'sidebar' | 'navbar' | 'bottombar' | 'dropdown', addPanel?: (path: string, title: string) => void) => {
        const normalizePath = (path?: string) => (path ? path.replace(/\/+$/, '') || '/' : '');
        const canSplitCurrentItem = item.to && normalizePath(item.to) !== normalizePath(location.pathname);

        if (variant === 'dropdown') {
            return item.external ? (
                <NavbarDropdownExternal href={item.href || '#'} target="_blank" rel="noreferrer">
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                </NavbarDropdownExternal>
            ) : (
                <NavbarDropdownItem to={item.to || '#'} onClick={closeAllDropdowns}>
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                </NavbarDropdownItem>
            );
        }

        if (variant === 'navbar') {
            return item.external ? (
                <NavbarTabExternal href={item.href || '#'} target="_blank" rel="noreferrer">
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                </NavbarTabExternal>
            ) : (
                <NavbarTab to={item.to || '#'} exact={item.exact}>
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                </NavbarTab>
            );
        }

        if (variant === 'bottombar') {
            return item.external ? (
                <BottomBarTabExternal href={item.href || '#'} target="_blank" rel="noreferrer">
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                </BottomBarTabExternal>
            ) : (
                <BottomBarTab to={item.to || '#'} exact={item.exact}>
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                </BottomBarTab>
            );
        }

        const handleSplitClick = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (addPanel && item.to) {
                addPanel(item.to, item.label);
            }
            closeSidebar();
        };

        if (item.external) {
            return (
                <NavItemWrapper>
                    <ExternalNavItemInner
                        href={item.href || '#'}
                        target="_blank"
                        rel="noreferrer"
                        onClick={closeSidebar as any}
                        $sidebarItemStyle={sidebarItemStyle}
                    >
                        <FontAwesomeIcon icon={item.icon} />
                        {item.label}
                    </ExternalNavItemInner>
                </NavItemWrapper>
            );
        }

        return (
            <NavItemWrapper>
                <NavItemInner to={item.to || '#'} exact={item.exact} onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                </NavItemInner>
                {addPanel && !item.external && canSplitCurrentItem && (
                    <SplitPanelButton className="split-panel-btn" onClick={handleSplitClick} title={t('open_in_split_panel', 'Open in split panel')}>
                        <FontAwesomeIcon icon={faColumns} />
                    </SplitPanelButton>
                )}
            </NavItemWrapper>
        );
    };

    const renderCollapsedNavItem = (item: RenderNavItem) => {
        const content = item.external ? (
            <CollapsedExternalNavItem
                href={item.href || '#'}
                target="_blank"
                rel="noreferrer"
                data-tooltip={item.label}
                $sidebarItemStyle={sidebarItemStyle}
            >
                <FontAwesomeIcon icon={item.icon} />
            </CollapsedExternalNavItem>
        ) : (
            <CollapsedNavItem
                to={item.to || '#'}
                exact={item.exact}
                onClick={closeSidebar}
                data-tooltip={item.label}
                $sidebarItemStyle={sidebarItemStyle}
            >
                <FontAwesomeIcon icon={item.icon} />
            </CollapsedNavItem>
        );
        return item.permission ? (
            <Can key={item.key} action={item.permission} renderOnError={null}>
                {content}
            </Can>
        ) : (
            <React.Fragment key={item.key}>{content}</React.Fragment>
        );
    };

    const panelContext = usePanels();
    const addPanel = panelContext?.addPanel;

    const renderNavItem = (item: RenderNavItem, variant: 'sidebar' | 'navbar' | 'bottombar' | 'dropdown') => {
        const content = renderNavItemContent(item, variant, variant === 'sidebar' ? addPanel : undefined);
        return item.permission ? (
            <Can key={item.key} action={item.permission} renderOnError={null}>
                {content}
            </Can>
        ) : (
            <React.Fragment key={item.key}>{content}</React.Fragment>
        );
    };

    const showTopbarAnnouncement = !!showServerNav && !!announcements?.enabled && announcements?.location === 'topbar';
    const topbarOffset = showTopbarAnnouncement ? 44 : 0;
    const rootStyle = { ['--announcement-top-offset' as any]: `${topbarOffset}px` } as React.CSSProperties;
    const topbarAnnouncement = showTopbarAnnouncement ? (
        <AnnouncementBar config={announcements} location="topbar" />
    ) : null;

    const configured = buildConfiguredNav();
    const baseAllRoutes = getAllServerRoutes();
    const fallbackCategories = buildFallbackCategories(baseAllRoutes);
    const categories = configured || fallbackCategories;
    const serverIpRow = connectionAddress ? (
        <CopyOnClick text={connectionAddress}>
            <ServerIpRow title={t('copy_ip_address', 'Copy IP address')}>
                <ServerIpValue>
                    <PrivacyServerHostBlur when={!!blurConnectionAddress}>{connectionAddress}</PrivacyServerHostBlur>
                </ServerIpValue>
                <ServerIpIcon icon={faCopy} />
            </ServerIpRow>
        </CopyOnClick>
    ) : null;

    if (layoutType === 'navbar') {
        const drawerNavItems = categories;
        const flatItems = categories.flatMap((c) => c.items);
        const mainTabItems = flatItems.slice(0, 6);
        const moreTabItems = flatItems.slice(6);

        return (
            <div style={rootStyle}>
                {topbarAnnouncement}
                <SpinnerOverlay visible={isLoggingOut} fixed />
                <SidebarOverlay $isOpen={isOpen} onClick={closeSidebar} />

                <SidebarWrapper $isOpen={isOpen} $mobileOnly>
                    <div className="flex flex-col h-full overflow-hidden" style={{ paddingTop: '4.5rem' }}>
                        <SidebarHeaderTop>
                            <SidebarLogoBlock>
                                <Logo to="/" onClick={closeSidebar}>
                                    {activeLogo ? <img src={activeLogo} alt={name} /> : name}
                                </Logo>
                            </SidebarLogoBlock>
                            <SidebarHeaderActions>
                                {showDiscordNavbar && discordInviteLink && (
                                    <IconLink
                                        href={discordInviteLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={t('join_discord', 'Join Discord')}
                                    >
                                        <DiscordIcon />
                                    </IconLink>
                                )}
                            </SidebarHeaderActions>
                        </SidebarHeaderTop>

                        {serverSwitcherOpen && (
                            <div className="px-4 pb-4">
                                <ServerSwitcherSearch style={{ border: '1px solid var(--color-neutral)', borderRadius: 'var(--border-radius, 8px)' }}>
                                    <ServerSwitcherSearchIcon>
                                        <FontAwesomeIcon icon={faSearch} />
                                    </ServerSwitcherSearchIcon>
                                    <ServerSwitcherInput
                                        type="text"
                                        placeholder={t('dashboard:search_servers', 'Search servers...')}
                                        value={serverSearch}
                                        onChange={(e) => setServerSearch(e.target.value)}
                                        style={{ borderRadius: 'var(--border-radius, 8px)' }}
                                        autoFocus
                                    />
                                </ServerSwitcherSearch>
                                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-neutral)' }}>
                                    {serversLoading ? (
                                        <div className="py-4 text-center">
                                            <FontAwesomeIcon icon={faCircle} spin style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                    ) : filteredServers.length === 0 ? (
                                        <div className="py-4 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                                            {serverSearch ? t('dashboard:no_servers_found', 'No servers found') : t('dashboard:no_servers_available', 'No servers available')}
                                        </div>
                                    ) : (
                                        filteredServers.slice(0, 10).map((server) => (
                                            <ServerSwitcherItem key={server.uuid} onClick={() => navigateToServer(server)}>
                                                <ServerSwitcherItemIcon>
                                                    <FontAwesomeIcon icon={faServer} />
                                                </ServerSwitcherItemIcon>
                                                <ServerSwitcherItemInfo>
                                                    <ServerSwitcherItemName>{server.name}</ServerSwitcherItemName>
                                                    <ServerSwitcherItemMeta>
                                                        <ServerSwitcherAddressMeta server={server} />
                                                    </ServerSwitcherItemMeta>
                                                </ServerSwitcherItemInfo>
                                            </ServerSwitcherItem>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {showServerNav && serverRoutes && serverId && !serverSwitcherOpen && (
                            <>
                                {powerDockLocation === 'sidebar' && <SidebarPowerControls />}
                                {powerDockLocation === 'dock' && (
                                    <MobilePowerControlsWrapper>
                                        <SidebarPowerControls />
                                    </MobilePowerControlsWrapper>
                                )}
                                <ServerHeader>
                                    <ServerHeaderTop>
                                        <ServerHeaderName>{serverName}</ServerHeaderName>
                                        <ServerHeaderStatus $status={serverStatus}>
                                            <FontAwesomeIcon icon={faCircle} />
                                            {getStatusText(serverStatus, t)}
                                        </ServerHeaderStatus>
                                    </ServerHeaderTop>
                                    {serverIpRow}
                                </ServerHeader>

                                <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
                                    {drawerNavItems.map((group) => (
                                        <React.Fragment key={`drawer:${group.category}`}>
                                            <SectionTitle>{group.category}</SectionTitle>
                                            {group.items.map((item) => renderNavItem(item, 'sidebar'))}
                                        </React.Fragment>
                                    ))}
                                    {renderPanelNavigation(true)}
                                </nav>
                            </>
                        )}

                        {!showServerNav && !serverSwitcherOpen && (
                            <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
                                {showDashboard && (
                                    <NavItem to="/" exact onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                        <FontAwesomeIcon icon={faServer} />
                                        {t('servers', 'Servers')}
                                    </NavItem>
                                )}
                                {showClaim && (
                                    <NavItem to="/claim" onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                        <FontAwesomeIcon icon={faGift} />
                                        {t('claim', 'Claim')}
                                    </NavItem>
                                )}
                                <NavItem to="/account" onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                    <FontAwesomeIcon icon={faUserCircle} />
                                    {t('account', 'Account')}
                                </NavItem>
                                {renderPanelNavigation(false)}
                            </nav>
                        )}

                        <MobileUserSection user={user} closeSidebar={closeSidebar} />
                    </div>
                </SidebarWrapper>

                <NavbarContainer>
                    <NavbarInner $maxWidth={contentMaxWidth}>
                        <div className="flex items-center h-full">
                            <MobileBurger onClick={() => setIsOpen(true)}>
                                <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
                            </MobileBurger>
                            <NavbarLogo to="/">
                                {activeLogo ? <img src={activeLogo} alt={name} /> : name}
                            </NavbarLogo>

                            {showServerNav && serverName && serverId ? (
                                <>
                                    <NavbarServerInfo>
                                        <ServerHeaderStatus $status={serverStatus}>
                                            <FontAwesomeIcon icon={faCircle} />
                                        </ServerHeaderStatus>
                                        <NavbarServerName>{serverName}</NavbarServerName>
                                    </NavbarServerInfo>

                                    <NavbarTabs>
                                        {mainTabItems.map((item) => renderNavItem(item, 'navbar'))}
                                        {moreTabItems.length > 0 && (
                                            <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                                                <NavbarDropdownTrigger
                                                    onClick={() => { closeAllDropdowns(); setConfigDropdownOpen(!configDropdownOpen); }}
                                                    $isOpen={configDropdownOpen}
                                                >
                                                    {t('more', 'More')}
                                                    <FontAwesomeIcon icon={faChevronDown} />
                                                </NavbarDropdownTrigger>
                                                <NavbarDropdown $isOpen={configDropdownOpen} style={{ left: 0 }}>
                                                    {moreTabItems.map((item) => renderNavItem(item, 'dropdown'))}
                                                    {rootAdmin && internalId && (
                                                        <>
                                                            <NavbarDropdownDivider />
                                                            <NavbarDropdownExternal
                                                                href={`/admin/servers/view/${internalId}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <FontAwesomeIcon icon={faToolbox} />
                                                                {t('admin_view', 'Admin View')}
                                                            </NavbarDropdownExternal>
                                                        </>
                                                    )}
                                                </NavbarDropdown>
                                            </div>
                                        )}
                                    </NavbarTabs>
                                </>
                            ) : (
                                <NavbarTabs>
                                    {showDashboard && (
                                        <NavbarTab to="/" exact>
                                            <FontAwesomeIcon icon={faServer} />
                                            Servers
                                        </NavbarTab>
                                    )}
                                    {showClaim && (
                                        <NavbarTab to="/claim">
                                            <FontAwesomeIcon icon={faGift} />
                                            Claim
                                        </NavbarTab>
                                    )}
                                </NavbarTabs>
                            )}
                        </div>

                        <NavbarRight>
                            {showDiscordNavbar && discordInviteLink && (
                                <NavbarIconButton
                                    href={discordInviteLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={t('join_discord', 'Join Discord')}
                                >
                                    <DiscordIcon />
                                </NavbarIconButton>
                            )}
                            {rootAdmin && (
                                <NavbarIconButton href="/admin" title={t('admin_cp', 'Admin Panel')}>
                                    <FontAwesomeIcon icon={faToolbox} />
                                </NavbarIconButton>
                            )}
                            <div style={{ position: 'relative' }}>
                                <NavbarUserButton onClick={() => { closeAllDropdowns(); setDropdownOpen(!dropdownOpen); }}>
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <Avatar.User />
                                    </div>
                                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }} />
                                </NavbarUserButton>
                                <NavbarDropdown $isOpen={dropdownOpen} style={{ right: 0 }}>
                                    <UserDropdownContent onClose={closeAllDropdowns} onLogout={onTriggerLogout} />
                                </NavbarDropdown>
                            </div>
                        </NavbarRight>
                    </NavbarInner>
                </NavbarContainer>

                <DropdownBackdrop isOpen={dropdownOpen || moreDropdownOpen || configDropdownOpen} onClick={closeAllDropdowns} />

                <NavbarMainContent $consoleSidebarOpen={consoleSidebarOpen} $bgImage={bgImage} $bgOverlay={bgOverlay} $hasPanels={panelContext?.hasPanels}>
                    <ContentWrapper $navbarLayout $fullWidth={panelContext?.hasPanels} $maxWidth={contentMaxWidth}>
                        {children}
                    </ContentWrapper>
                </NavbarMainContent>
            </div>
        );
    }

    if (layoutType === 'bottombar') {
        const drawerNavItems = categories;
        const flatItems = categories.flatMap((c) => c.items);
        const mainTabItems = flatItems.slice(0, 6);
        const moreTabItems = flatItems.slice(6);

        return (
            <div style={rootStyle}>
                {topbarAnnouncement}
                <SpinnerOverlay visible={isLoggingOut} fixed />
                <SidebarOverlay $isOpen={isOpen} onClick={closeSidebar} />

                <SidebarWrapper $isOpen={isOpen} $mobileOnly>
                    <div className="flex flex-col h-full overflow-hidden" style={{ paddingTop: '4.5rem' }}>
                        <SidebarHeaderTop>
                            <SidebarLogoBlock>
                                <Logo to="/" onClick={closeSidebar}>
                                    {activeLogo ? <img src={activeLogo} alt={name} /> : name}
                                </Logo>
                            </SidebarLogoBlock>
                            <SidebarHeaderActions>
                                {showDiscordNavbar && discordInviteLink && (
                                    <IconLink
                                        href={discordInviteLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={t('join_discord', 'Join Discord')}
                                    >
                                        <DiscordIcon />
                                    </IconLink>
                                )}
                            </SidebarHeaderActions>
                        </SidebarHeaderTop>

                        {serverSwitcherOpen && (
                            <div className="px-4 pb-4">
                                <ServerSwitcherSearch style={{ border: '1px solid var(--color-neutral)', borderRadius: 'var(--border-radius, 8px)' }}>
                                    <ServerSwitcherSearchIcon>
                                        <FontAwesomeIcon icon={faSearch} />
                                    </ServerSwitcherSearchIcon>
                                    <ServerSwitcherInput
                                        type="text"
                                        placeholder={t('dashboard:search_servers', 'Search servers...')}
                                        value={serverSearch}
                                        onChange={(e) => setServerSearch(e.target.value)}
                                        style={{ borderRadius: 'var(--border-radius, 8px)' }}
                                        autoFocus
                                    />
                                </ServerSwitcherSearch>
                                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-neutral)' }}>
                                    {serversLoading ? (
                                        <div className="py-4 text-center">
                                            <FontAwesomeIcon icon={faCircle} spin style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                    ) : filteredServers.length === 0 ? (
                                        <div className="py-4 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                                            {serverSearch ? t('dashboard:no_servers_found', 'No servers found') : t('dashboard:no_servers_available', 'No servers available')}
                                        </div>
                                    ) : (
                                        filteredServers.slice(0, 10).map((server) => (
                                            <ServerSwitcherItem key={server.uuid} onClick={() => navigateToServer(server)}>
                                                <ServerSwitcherItemIcon>
                                                    <FontAwesomeIcon icon={faServer} />
                                                </ServerSwitcherItemIcon>
                                                <ServerSwitcherItemInfo>
                                                    <ServerSwitcherItemName>{server.name}</ServerSwitcherItemName>
                                                    <ServerSwitcherItemMeta>
                                                        <ServerSwitcherAddressMeta server={server} />
                                                    </ServerSwitcherItemMeta>
                                                </ServerSwitcherItemInfo>
                                            </ServerSwitcherItem>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {showServerNav && serverRoutes && serverId && !serverSwitcherOpen && (
                            <>
                                {powerDockLocation === 'sidebar' && <SidebarPowerControls />}
                                {powerDockLocation === 'dock' && (
                                    <MobilePowerControlsWrapper>
                                        <SidebarPowerControls />
                                    </MobilePowerControlsWrapper>
                                )}
                                <ServerHeader>
                                    <ServerHeaderTop>
                                        <ServerHeaderName>{serverName}</ServerHeaderName>
                                        <ServerHeaderStatus $status={serverStatus}>
                                            <FontAwesomeIcon icon={faCircle} />
                                            {getStatusText(serverStatus, t)}
                                        </ServerHeaderStatus>
                                    </ServerHeaderTop>
                                    {serverIpRow}
                                </ServerHeader>

                                <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
                                    {drawerNavItems.map((group) => (
                                        <React.Fragment key={`drawer:${group.category}`}>
                                            <SectionTitle>{group.category}</SectionTitle>
                                            {group.items.map((item) => renderNavItem(item, 'sidebar'))}
                                        </React.Fragment>
                                    ))}
                                    {renderPanelNavigation(true)}
                                </nav>
                            </>
                        )}

                        {!showServerNav && !serverSwitcherOpen && (
                            <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
                                {showDashboard && (
                                    <NavItem to="/" exact onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                        <FontAwesomeIcon icon={faServer} />
                                        Servers
                                    </NavItem>
                                )}
                                {showClaim && (
                                    <NavItem to="/claim" onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                        <FontAwesomeIcon icon={faGift} />
                                        Claim
                                    </NavItem>
                                )}
                                <NavItem to="/account" onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                    <FontAwesomeIcon icon={faUserCircle} />
                                    {t('account', 'Account')}
                                </NavItem>
                                {renderPanelNavigation(false)}
                            </nav>
                        )}

                        <MobileUserSection user={user} closeSidebar={closeSidebar} />
                    </div>
                </SidebarWrapper>

                <BottomBarMainContent $consoleSidebarOpen={consoleSidebarOpen} $bgImage={bgImage} $bgOverlay={bgOverlay} $hasPanels={panelContext?.hasPanels}>
                    <ContentWrapper $navbarLayout $fullWidth={panelContext?.hasPanels} $maxWidth={contentMaxWidth}>
                        {children}
                    </ContentWrapper>
                </BottomBarMainContent>

                <DropdownBackdrop isOpen={dropdownOpen || moreDropdownOpen || configDropdownOpen} onClick={closeAllDropdowns} />

                <BottomBarContainer>
                    <BottomBarInner $maxWidth={contentMaxWidth}>
                        <BottomBarLeft>
                            <MobileBurger onClick={() => setIsOpen(true)}>
                                <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
                            </MobileBurger>
                            <NavbarLogo to="/">
                                {activeLogo ? <img src={activeLogo} alt={name} /> : name}
                            </NavbarLogo>

                            {showServerNav && serverName && serverId ? (
                                <>
                                    <BottomBarServerInfo>
                                        <ServerHeaderStatus $status={serverStatus}>
                                            <FontAwesomeIcon icon={faCircle} />
                                        </ServerHeaderStatus>
                                        <NavbarServerName>{serverName}</NavbarServerName>
                                    </BottomBarServerInfo>

                                    <BottomBarTabs>
                                        {mainTabItems.map((item) => renderNavItem(item, 'bottombar'))}
                                        {moreTabItems.length > 0 && (
                                            <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                                                <BottomBarDropdownTrigger
                                                    onClick={() => { closeAllDropdowns(); setConfigDropdownOpen(!configDropdownOpen); }}
                                                    $isOpen={configDropdownOpen}
                                                >
                                                    {t('more', 'More')}
                                                    <FontAwesomeIcon icon={faChevronDown} />
                                                </BottomBarDropdownTrigger>
                                                <BottomBarDropdown $isOpen={configDropdownOpen} style={{ left: 0 }}>
                                                    {moreTabItems.map((item) => renderNavItem(item, 'dropdown'))}
                                                    {rootAdmin && internalId && (
                                                        <>
                                                            <NavbarDropdownDivider />
                                                            <NavbarDropdownExternal
                                                                href={`/admin/servers/view/${internalId}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <FontAwesomeIcon icon={faToolbox} />
                                                                {t('admin_view', 'Admin View')}
                                                            </NavbarDropdownExternal>
                                                        </>
                                                    )}
                                                </BottomBarDropdown>
                                            </div>
                                        )}
                                    </BottomBarTabs>
                                </>
                            ) : (
                                <BottomBarTabs>
                                    {showDashboard && (
                                        <BottomBarTab to="/" exact>
                                            <FontAwesomeIcon icon={faServer} />
                                            Servers
                                        </BottomBarTab>
                                    )}
                                    {showClaim && (
                                        <BottomBarTab to="/claim">
                                            <FontAwesomeIcon icon={faGift} />
                                            Claim
                                        </BottomBarTab>
                                    )}
                                </BottomBarTabs>
                            )}
                        </BottomBarLeft>

                        <BottomBarRight>
                            {showDiscordNavbar && discordInviteLink && (
                                <BottomBarIconButton
                                    href={discordInviteLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={t('join_discord', 'Join Discord')}
                                >
                                    <DiscordIcon />
                                </BottomBarIconButton>
                            )}
                            {rootAdmin && (
                                <BottomBarIconButton href="/admin" title={t('admin_cp', 'Admin Panel')}>
                                    <FontAwesomeIcon icon={faToolbox} />
                                </BottomBarIconButton>
                            )}
                            <div style={{ position: 'relative' }}>
                                <BottomBarUserButton onClick={() => { closeAllDropdowns(); setDropdownOpen(!dropdownOpen); }}>
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <Avatar.User />
                                    </div>
                                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }} />
                                </BottomBarUserButton>
                                <BottomBarDropdown $isOpen={dropdownOpen} style={{ right: 0 }}>
                                    <UserDropdownContent onClose={closeAllDropdowns} onLogout={onTriggerLogout} />
                                </BottomBarDropdown>
                            </div>
                        </BottomBarRight>
                    </BottomBarInner>
                </BottomBarContainer>
            </div>
        );
    }

    const isFloating = layoutType === 'floating';
    const containerStyle = isFloating ? { padding: '1.1rem', background: 'var(--color-background)', ...rootStyle } : rootStyle;
    const groupedServerNavItems = categories;

    return (
        <div className="h-screen overflow-hidden" style={containerStyle}>
            {topbarAnnouncement}
            <SpinnerOverlay visible={isLoggingOut} fixed />

            <MobileHeader>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-base)' }}
                >
                    <FontAwesomeIcon icon={faBars} className="w-6 h-6" />
                </button>
                {activeLogo ? (
                    <img
                        className="hoskt-mobile-top-panel-logo"
                        src={activeLogo}
                        alt={name}
                        style={{ maxHeight: '30px', maxWidth: '170px', width: 'auto', objectFit: 'contain' }}
                    />
                ) : showServerNav && serverName ? (
                    <span style={{ color: 'var(--color-base)', fontWeight: 600 }}>{serverName}</span>
                ) : (
                    <span style={{ color: 'var(--color-base)', fontWeight: 600 }}>{name}</span>
                )}
                <div className="w-10" />
            </MobileHeader>

            <SidebarOverlay $isOpen={isOpen} onClick={closeSidebar} />

            <div className="flex h-full" style={isFloating ? { gap: '0.8rem' } : undefined}>
                <SidebarWrapper $isOpen={isOpen} $floating={isFloating} $collapsed={sidebarCollapsed}>
                    <div className="flex flex-col h-full overflow-hidden">
                        {sidebarCollapsed ? (
                            <>
                                <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                    <Link to="/" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', textDecoration: 'none' }}>
                                        {activeLogo ? (
                                            <img src={activeLogo} alt={name} style={{ maxHeight: '28px', maxWidth: '36px', objectFit: 'contain' }} />
                                        ) : (
                                            <span style={{ color: 'var(--color-base)', fontWeight: 700, fontSize: '1.25rem' }}>{(name || 'P').charAt(0)}</span>
                                        )}
                                    </Link>
                                </div>

                                <CollapsedNav ref={collapsedNavRef}>
                                    {showServerNav && serverName && serverId ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: serverStatus === 'running' ? '#22c55e' : serverStatus === 'offline' || !serverStatus ? '#ef4444' : '#eab308' }} />
                                            </div>
                                            {groupedServerNavItems.map((group, idx) => (
                                                <React.Fragment key={group.category}>
                                                    {idx > 0 && <CollapsedSectionDivider />}
                                                    {group.items.map((item) => renderCollapsedNavItem(item))}
                                                </React.Fragment>
                                            ))}
                                            {rootAdmin && internalId && (
                                                <>
                                                    <CollapsedSectionDivider />
                                                    <CollapsedExternalNavItem
                                                        href={`/admin/servers/view/${internalId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        data-tooltip={t('admin_view', 'Admin View')}
                                                        $sidebarItemStyle={sidebarItemStyle}
                                                    >
                                                        <FontAwesomeIcon icon={faToolbox} />
                                                    </CollapsedExternalNavItem>
                                                </>
                                            )}
                                            {renderCollapsedPanelNavigation(true)}
                                        </>
                                    ) : (
                                        <>
                                            <CollapsedNavItem
                                                to="/"
                                                exact
                                                onClick={closeSidebar}
                                                data-tooltip={t('servers', 'Servers')}
                                                $sidebarItemStyle={sidebarItemStyle}
                                            >
                                                <FontAwesomeIcon icon={faServer} />
                                            </CollapsedNavItem>
                                            {showClaim && (
                                                <CollapsedNavItem
                                                    to="/claim"
                                                    onClick={closeSidebar}
                                                    data-tooltip={t('claim', 'Claim')}
                                                    $sidebarItemStyle={sidebarItemStyle}
                                                >
                                                    <FontAwesomeIcon icon={faGift} />
                                                </CollapsedNavItem>
                                            )}
                                            <CollapsedNavItem
                                                to="/account"
                                                onClick={closeSidebar}
                                                data-tooltip={t('account', 'Account')}
                                                $sidebarItemStyle={sidebarItemStyle}
                                            >
                                                <FontAwesomeIcon icon={faUserCircle} />
                                            </CollapsedNavItem>
                                            {renderCollapsedPanelNavigation(false)}
                                        </>
                                    )}
                                </CollapsedNav>
                                {tooltip && (
                                    <SidebarTooltip $visible $top={tooltip.top} $left={tooltip.left}>
                                        {tooltip.text}
                                    </SidebarTooltip>
                                )}

                                <UserSection style={{
                                    padding: '12px 0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    ...(isFloating ? { borderRadius: '0 0 calc(var(--border-radius, 12px) - 1px) calc(var(--border-radius, 12px) - 1px)' } : {})
                                }}>
                                    <Link
                                        to="/account"
                                        onClick={closeSidebar}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', textDecoration: 'none' }}
                                    >
                                        <div className="w-9 h-9 rounded-full overflow-hidden">
                                            <Avatar.User />
                                        </div>
                                    </Link>
                                </UserSection>
                            </>
                        ) : (
                            <>
                                <SidebarHeaderTop>
                                    <SidebarLogoBlock>
                                        <Logo to="/" onClick={closeSidebar}>
                                            {activeLogo ? <img src={activeLogo} alt={name} /> : name}
                                        </Logo>
                                    </SidebarLogoBlock>
                                    <SidebarHeaderActions>
                                        {showDiscordNavbar && discordInviteLink && (
                                            <IconLink
                                                href={discordInviteLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={t('join_discord', 'Join Discord')}
                                            >
                                                <DiscordIcon />
                                            </IconLink>
                                        )}
                                    </SidebarHeaderActions>
                                </SidebarHeaderTop>

                                <nav className="pt-2 flex-1 min-h-0 overflow-y-auto pb-4">
                                    {showServerNav && serverName && serverId ? (
                                        <>
                                            {powerDockLocation === 'sidebar' && <SidebarPowerControls />}
                                            {powerDockLocation === 'dock' && (
                                                <MobilePowerControlsWrapper>
                                                    <SidebarPowerControls />
                                                </MobilePowerControlsWrapper>
                                            )}
                                            <ServerHeader>
                                                <ServerHeaderTop>
                                                    <ServerHeaderName>{serverName}</ServerHeaderName>
                                                    <ServerHeaderStatus $status={serverStatus}>
                                                        <FontAwesomeIcon icon={faCircle} />
                                                        {getStatusText(serverStatus, t)}
                                                    </ServerHeaderStatus>
                                                </ServerHeaderTop>
                                                {serverIpRow}
                                            </ServerHeader>

                                            {groupedServerNavItems.map((group) => (
                                                <div
                                                    key={group.category}
                                                    onMouseEnter={() => setHoveredCategory(group.category)}
                                                    onMouseLeave={() => setHoveredCategory(null)}
                                                >
                                                    <CollapsibleSectionHeader
                                                        onClick={() => toggleCategoryCollapse(group.category)}
                                                    >
                                                        <span>{group.category}</span>
                                                        <SectionChevron
                                                            $collapsed={!!collapsedCategories[group.category]}
                                                            $visible={hoveredCategory === group.category || !!collapsedCategories[group.category]}
                                                        >
                                                            <FontAwesomeIcon icon={faChevronDown} />
                                                        </SectionChevron>
                                                    </CollapsibleSectionHeader>
                                                    <CollapsibleNavGroup
                                                        $collapsed={!!collapsedCategories[group.category]}
                                                        $itemCount={group.items.length}
                                                    >
                                                        {group.items.map((item) => renderNavItem(item, 'sidebar'))}
                                                    </CollapsibleNavGroup>
                                                </div>
                                            ))}
                                            {rootAdmin && internalId && (
                                                <>
                                                    <SectionTitle>{t('admin', 'Admin')}</SectionTitle>
                                                    <ExternalNavItem
                                                        href={`/admin/servers/view/${internalId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        $sidebarItemStyle={sidebarItemStyle}
                                                    >
                                                        <FontAwesomeIcon icon={faToolbox} />
                                                        {t('admin_view', 'Admin View')}
                                                    </ExternalNavItem>
                                                </>
                                            )}
                                            {renderPanelNavigation(true)}
                                        </>
                                    ) : (
                                        <>
                                            <SectionTitle>{t('navigation', 'Navigation')}</SectionTitle>
                                            <NavItem to="/" exact onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                                <FontAwesomeIcon icon={faServer} />
                                                {t('servers', 'Servers')}
                                            </NavItem>
                                            {showClaim && (
                                                <NavItem to="/claim" onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                                    <FontAwesomeIcon icon={faGift} />
                                                    {t('claim', 'Claim')}
                                                </NavItem>
                                            )}
                                            <NavItem to="/account" onClick={closeSidebar} $sidebarItemStyle={sidebarItemStyle}>
                                                <FontAwesomeIcon icon={faUserCircle} />
                                                {t('account', 'Account')}
                                            </NavItem>
                                            {renderPanelNavigation(false)}
                                        </>
                                    )}
                                </nav>

                                <UserSection style={isFloating ? { borderRadius: '0 0 calc(var(--border-radius, 12px) - 1px) calc(var(--border-radius, 12px) - 1px)' } : undefined}>
                                    <div className="flex items-center">
                                        <UserProfileLink to="/account" onClick={closeSidebar}>
                                            <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                                                <Avatar.User />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className="text-sm font-medium truncate"
                                                    style={{ color: 'var(--color-base)' }}
                                                >
                                                    {user?.username}
                                                </p>
                                                <p
                                                    className="text-xs truncate"
                                                    style={{ color: 'var(--color-muted)' }}
                                                >
                                                    {user?.email}
                                                </p>
                                            </div>
                                        </UserProfileLink>
                                    </div>
                                </UserSection>
                            </>
                        )}
                    </div>
                </SidebarWrapper>

                <MainContent $consoleSidebarOpen={consoleSidebarOpen} $bgImage={bgImage} $bgOverlay={bgOverlay} $hasPanels={panelContext?.hasPanels} style={isFloating ? { borderRadius: 'calc(var(--border-radius, 22px) + 6px)', height: '100%', border: '1px solid rgba(45, 212, 191, 0.16)', boxShadow: '0 0 0 1px rgba(255,255,255,0.025)' } : undefined}>
                    <ContentWrapper $fullWidth={panelContext?.hasPanels} $maxWidth={contentMaxWidth}>
                        {children}
                    </ContentWrapper>
                </MainContent>
            </div>
        </div>
    );
};

export default Sidebar;
