import React, { useContext, useEffect, useState } from 'react';
import Spinner from '@/components/elements/Spinner';
import useFlash from '@/plugins/useFlash';
import FlashMessageRender from '@/components/FlashMessageRender';
import tw from 'twin.macro';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import McVersionsRow from './McVersionsRow';
import { ServerContext } from '@/state/server';
import getMinecraftVersions, { MinecraftVersionsContext } from '@/api/server/version/getMinecraftVersions';
import GreyRowBox from '@/components/elements/GreyRowBox';
import Select from '@/components/elements/Select';
import Pagination from '@/components/elements/PaginationMc';
import ModpacksContainer from '@/components/server/minecraft-modpacks/ModpacksContainer';

const custom = false;
const modpacks = true;

const VersionSelect = () => {
    const { versionsType, setVersionsType, setPage } = useContext(MinecraftVersionsContext);

    return (
        <>
            <p>
                <span css={tw`font-bold`}>Version selector</span>
                <br />
                Select the version you want to run your server with.
            </p>
            <Select
                onChange={(event) => {
                    setVersionsType(event.target.value);
                    setPage(1);
                }}
                value={versionsType}
            >
                <option value='vanilla'>Vanilla</option>
                <option value='snapshot'>Snapshot</option>
                <option value='spigot'>Spigot</option>
                <option value='paper'>Paper</option>
                <option value='purpur'>Purpur</option>
                <option value='sponge'>Sponge</option>
                <option value='bungeecord'>Bungeecord</option>
                <option value='waterfall'>Waterfall</option>
                <option value='velocity'>Velocity</option>
                <option value='forge'>Forge</option>
                <option value='fabric'>Fabric</option>
                <option value='mohist'>Mohist</option>
                <option value='magma'>Magma</option>
                <option value='catserver'>Catserver</option>
                {modpacks && <option value='modpacks'>Modpacks</option>}
                {custom && <option value='others'>Others</option>}
            </Select>
        </>
    );
};

const VersionSelectorBox = () => (
    <GreyRowBox css={tw`grid grid-cols-1 gap-3 md:grid-cols-2 col-span-1 md:col-span-2 mt-2 mr-2`}>
        <VersionSelect />
    </GreyRowBox>
);

const McVersionsListContainer = () => {
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const mcversion = ServerContext.useStoreState((state) => state.server.data!.mcversion);
    const { data: minecraftVersions, error, isValidating } = getMinecraftVersions();
    const { versionsType, page, setPage, modpacktype } = useContext(MinecraftVersionsContext);

    useEffect(() => {
        if (!error) {
            clearFlashes('server:minecraftVersion');
            return;
        }

        clearAndAddHttpError({ error, key: 'server:minecraftVersion' });
    }, [error]);

    useEffect(() => {
        if (minecraftVersions && minecraftVersions.pagination.currentPage !== page) {
            setPage(minecraftVersions.pagination.currentPage);
        }
    }, [minecraftVersions?.pagination.currentPage, page]);

    if (!minecraftVersions || (error && isValidating)) {
        return <Spinner size={'large'} centered />;
    }

    return (
        <ServerContentBlock title={'Minecraft Version ' + versionsType}>
            <FlashMessageRender byKey={'server:minecraftVersion'} css={tw`mb-2`} />
            {mcversion !== null && (
                <p css={tw`text-lg text-center mb-2`}>
                    Current version:{' '}
                    <span css={tw`text-cyan-600`}>
                        {mcversion.charAt(0).toUpperCase() + mcversion.slice(1)}
                    </span>
                </p>
            )}

            <Pagination
                data={minecraftVersions}
                onPageSelect={setPage}
                custompage={'grid grid-cols-1 md:grid-cols-3'}
                customcss={tw`md:col-span-3`}
            >
                {({ items }) =>
                    !items.length ? (
                        <>
                            <VersionSelectorBox />
                            <p css={tw`text-center text-sm text-neutral-300 col-span-3`}>
                                Can&apos;t find any version on the server
                            </p>
                        </>
                    ) : (
                        <>
                            <VersionSelectorBox />
                            {items.map((minecraftVersion, index) => (
                                <McVersionsRow
                                    key={`${versionsType}-${minecraftVersion.version || index}`}
                                    minecraftVersions={minecraftVersion}
                                    type={versionsType}
                                    stype={versionsType}
                                    modpacktype={modpacktype}
                                    css={tw`mt-2 mr-2`}
                                />
                            ))}
                        </>
                    )
                }
            </Pagination>
        </ServerContentBlock>
    );
};

const EmbeddedModpacksContainer = () => (
    <ServerContentBlock title={'Minecraft Version Manager'}>
        <div className='grid grid-cols-1 md:grid-cols-3'>
            <VersionSelectorBox />
        </div>
        <ModpacksContainer embedded />
    </ServerContentBlock>
);

const VersionManagerContainer = () => {
    const { versionsType } = useContext(MinecraftVersionsContext);
    return versionsType === 'modpacks' ? <EmbeddedModpacksContainer /> : <McVersionsListContainer />;
};

export default () => {
    const [page, setPage] = useState<number>(1);
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [versionsType, setVersionsType] = useState<string>('vanilla');
    const [modpacktype, setModpacktype] = useState<string>('curseforge');

    return (
        <MinecraftVersionsContext.Provider
            value={{
                page,
                setPage,
                searchFilter,
                setSearchFilter,
                modpacktype,
                setModpacktype,
                versionsType,
                setVersionsType,
            }}
        >
            <VersionManagerContainer />
        </MinecraftVersionsContext.Provider>
    );
};
