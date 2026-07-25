import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import PageJumpControl from '@/components/elements/PageJumpControl';
import Pagination from '@/components/elements/Pagination';
import Select from '@/components/elements/Select';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Spinner from '@/components/elements/Spinner';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import tw from 'twin.macro';
import ModpackRow from './ModpackRow';
import getMinecraftModpacks, { ModpackProvider } from '@/api/swr/getMinecraftModpacks';

interface Props {
    embedded?: boolean;
}

const ModpacksContainer = ({ embedded = false }: Props) => {
    const { search } = useLocation();
    const requestedPage = Number(new URLSearchParams(search).get('page') || 1);
    const defaultPage = embedded ? 1 : requestedPage;

    const [provider, setProvider] = useState<ModpackProvider>('modrinth');
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState(50);
    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const shortUuid = ServerContext.useStoreState((state) => state.server.data!.id);
    const { data: modpacks, error, isValidating } = getMinecraftModpacks(provider, searchQuery, pageSize, page);

    useEffect(() => {
        setPage(1);
    }, [provider, pageSize, searchQuery]);

    useEffect(() => {
        if (!modpacks) return;
        if (modpacks.pagination.currentPage > 1 && !modpacks.items.length) {
            setPage(1);
        }
    }, [modpacks?.pagination.currentPage, modpacks?.items.length]);

    useEffect(() => {
        if (!error) {
            clearFlashes('modpacks');
            return;
        }

        clearAndAddHttpError({ error, key: 'modpacks' });
    }, [error]);

    useEffect(() => {
        if (embedded) return;

        // Keep the standalone Mod Manager page in the URL without forcing a React Router remount.
        window.history.replaceState(
            null,
            document.title,
            `/server/${shortUuid}/modpacks${page <= 1 ? '' : `?page=${page}`}`
        );
    }, [embedded, page, shortUuid]);

    let section;

    if (!modpacks) {
        section = (
            <div css={tw`py-8`}>
                <Spinner size={'large'} centered />
                <p css={tw`mt-3 text-center text-sm text-neutral-300`}>
                    Loading {provider} modpacks… You can still change the provider above.
                </p>
            </div>
        );
    } else {
        section = (
            <>
                <Pagination data={modpacks} onPageSelect={setPage}>
                    {({ items }) =>
                        items.length > 0 ? (
                            <div className='grid lg:grid-cols-3 gap-2'>
                                {items.map((modpack) => (
                                    <ModpackRow key={modpack.id} provider={provider} modpack={modpack} />
                                ))}
                            </div>
                        ) : (
                            <p css={tw`text-center text-sm text-neutral-300`}>
                                There are no modpacks to display for this query.
                            </p>
                        )
                    }
                </Pagination>
                <PageJumpControl
                    currentPage={modpacks.pagination.currentPage}
                    totalPages={modpacks.pagination.totalPages}
                    onPageSelect={setPage}
                    disabled={isValidating}
                />
            </>
        );
    }

    const content = (
        <>
            {embedded && <FlashMessageRender byKey={'modpacks'} css={tw`mb-4`} />}
            {modpacks?.installed_modpack && (
                <div className='mb-6'>
                    <Label>Most Recently Installed Modpack</Label>
                    <ModpackRow
                        provider={modpacks.installed_modpack.provider as ModpackProvider}
                        modpack={modpacks.installed_modpack}
                    />
                </div>
            )}
            <div css={tw`flex flex-wrap gap-4`}>
                <div>
                    <Label htmlFor={'provider'}>Provider</Label>
                    <Select
                        name='provider'
                        value={provider}
                        onChange={(event) => setProvider(event.target.value as ModpackProvider)}
                    >
                        <option value='atlauncher'>ATLauncher</option>
                        <option value='curseforge'>CurseForge</option>
                        <option value='feedthebeast'>Feed The Beast</option>
                        <option value='modrinth'>Modrinth</option>
                        <option value='technic'>Technic</option>
                        <option value='voidswrath'>Voids Wrath</option>
                    </Select>
                </div>
                <div>
                    <Label htmlFor={'page_size'}>Page size</Label>
                    <Select
                        name='page_size'
                        disabled={provider === 'voidswrath'}
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                    >
                        <option value='10'>10</option>
                        <option value='25'>25</option>
                        <option value='50'>50</option>
                    </Select>
                </div>
                <div css={tw`w-full md:w-auto md:flex-1`}>
                    <Label htmlFor={'search_query'}>Search query</Label>
                    <Input
                        type='search'
                        id='search_query'
                        className='h-[2.875rem]'
                        disabled={provider === 'voidswrath'}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>
            </div>
            <div css={tw`mt-3`}>{section}</div>
        </>
    );

    if (embedded) {
        return (
            <div css={tw`mt-6`}>
                <h2 css={tw`mb-4 text-2xl text-neutral-300`}>Modpacks</h2>
                {content}
            </div>
        );
    }

    return (
        <ServerContentBlock title={'Modpacks'} showFlashKey='modpacks'>
            {content}
        </ServerContentBlock>
    );
};

export default ModpacksContainer;
