import React, { useEffect } from 'react';
import ContentContainer from '@/components/elements/ContentContainer';
import { CSSTransition } from 'react-transition-group';
import tw from 'twin.macro';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';

export interface PageContentBlockProps {
    title?: string;
    className?: string;
    showFlashKey?: string;
}

const PageContentBlock: React.FC<PageContentBlockProps> = ({ title, showFlashKey, className, children }) => {
    const copyrightText = useStoreState((state: ApplicationStore) => state.settings.data?.copyrightText);

    useEffect(() => {
        if (title) {
            document.title = title;
        }
    }, [title]);

    return (
        <CSSTransition timeout={150} classNames={'fade'} appear in>
            <>
                <ContentContainer className={className}>
                    {showFlashKey && <FlashMessageRender byKey={showFlashKey} css={tw`mb-4`} />}
                    {children}
                </ContentContainer>
                <ContentContainer css={tw`mt-4 mb-4`}>
                    <p css={tw`text-center text-xs`} style={{ color: 'var(--color-inverted)', opacity: 0.4 }}>
                        {copyrightText || `Pterodactyl® © 2015 - ${new Date().getFullYear()}`}
                    </p>
                </ContentContainer>
            </>
        </CSSTransition>
    );
};

export default PageContentBlock;
