import http, { getPaginationSet, PaginatedResult } from '@/api/http';
import FlashMessageRender from '@/components/FlashMessageRender';
import GreyRowBox from '@/components/elements/GreyRowBox';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import Pagination from '@/components/elements/Pagination';
import PageJumpControl from '@/components/elements/PageJumpControl';
import Select from '@/components/elements/Select';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Spinner from '@/components/elements/Spinner';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import useSWR from 'swr';
import tw from 'twin.macro';
import MinecraftWorldRow from './MinecraftWorldRow';

type MinecraftMapProvider = 'curseforge' | 'modrinth';

interface MinecraftMap {
    id: string;
    name: string;
    url: string;
    icon_url: string | null;
}

export interface MinecraftWorld {
    name: string;
    defaultable: boolean;
}

interface MinecraftWorldsResponse {
    worlds: MinecraftWorld[];
    defaultWorld: string | null;
}

type MinecraftMapsResponse = PaginatedResult<MinecraftMap>;

const WORLD_REFRESH_DELAYS = [5000, 15000, 45000];

export default () => {
    const { search } = useLocation();
    const defaultPage = Number(new URLSearchParams(search).get('page') || 1);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const shortUuid = ServerContext.useStoreState((state) => state.server.data!.id);

    // Modrinth is the default because it does not require an API key. A default
    // "world" query makes the map list load immediately when World Manager opens.
    const [minecraftMapProvider, setMinecraftMapProvider] = useState<MinecraftMapProvider>('modrinth');
    const [searchInput, setSearchInput] = useState<string>('world');
    const [searchQuery, setSearchQuery] = useState<string>('world');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const [installingMapId, setInstallingMapId] = useState<string | null>(null);
    const refreshTimers = useRef<number[]>([]);

    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    const {
        data: worldsResponse,
        error: worldsError,
        mutate: mutateWorlds,
    } = useSWR<MinecraftWorldsResponse>(`worlds-${uuid}`, async () => {
        const { data } = await http.get(`/api/client/servers/${uuid}/minecraft-worlds`);
        return data;
    });

    const { data: maps, error: mapsError } = useSWR<MinecraftMapsResponse>(
        `minecraft-maps-${uuid}-${minecraftMapProvider}-${searchQuery}-${page}-${pageSize}`,
        async () => {
            const { data } = await http.get(`/api/client/servers/${uuid}/minecraft-worlds/maps`, {
                params: {
                    provider: minecraftMapProvider,
                    search_query: searchQuery,
                    page_size: pageSize,
                    page,
                },
            });

            return {
                items: data.data || [],
                pagination: getPaginationSet(data.meta.pagination),
            };
        },
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(1);
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [minecraftMapProvider, pageSize]);

    useEffect(() => {
        if (!maps) return;
        if (maps.pagination.currentPage > 1 && !maps.items.length) {
            setPage(1);
        }
    }, [maps?.pagination.currentPage, maps?.items.length]);

    useEffect(() => {
        if (!worldsError && !mapsError) {
            clearFlashes('minecraft-worlds');
            clearFlashes('minecraft-maps');
            return;
        }
        if (worldsError) {
            clearAndAddHttpError({ error: worldsError, key: 'minecraft-worlds' });
        }
        if (mapsError) {
            clearAndAddHttpError({ error: mapsError, key: 'minecraft-maps' });
        }
    }, [worldsError, mapsError]);

    useEffect(() => {
        window.history.replaceState(
            null,
            document.title,
            `/server/${shortUuid}/minecraft-worlds${page <= 1 ? '' : `?page=${page}`}`
        );
    }, [page, shortUuid]);

    useEffect(
        () => () => {
            refreshTimers.current.forEach((timer) => window.clearTimeout(timer));
        },
        []
    );

    const scheduleWorldRefresh = () => {
        refreshTimers.current.forEach((timer) => window.clearTimeout(timer));
        refreshTimers.current = WORLD_REFRESH_DELAYS.map((delay) =>
            window.setTimeout(() => {
                mutateWorlds();
            }, delay)
        );
    };

    const installMap = (mapId: string) => {
        setInstallingMapId(mapId);
        clearFlashes('minecraft-maps');

        http.post(`/api/client/servers/${uuid}/minecraft-worlds/maps/install`, {
            provider: minecraftMapProvider,
            mapId,
        })
            .then(() => {
                addFlash({
                    key: 'minecraft-maps',
                    message:
                        'Map installation has been queued. The world list will refresh automatically after 5, 15, and 45 seconds.',
                    type: 'success',
                });
                mutateWorlds();
                scheduleWorldRefresh();
            })
            .catch((error) => {
                clearAndAddHttpError({ error, key: 'minecraft-maps' });
            })
            .finally(() => {
                setInstallingMapId(null);
            });
    };

    return (
        <ServerContentBlock title={'Worlds'} showFlashKey='minecraft-worlds'>
            <div css={tw`my-10`}>
                {!worldsError && worldsResponse ? (
                    worldsResponse.worlds.length ? (
                        worldsResponse.worlds.map((world, index) => (
                            <MinecraftWorldRow
                                key={world.name}
                                isDefault={world.name === worldsResponse.defaultWorld}
                                className={index > 0 ? 'mt-2' : undefined}
                                mutate={mutateWorlds}
                                world={world}
                            />
                        ))
                    ) : (
                        <p css={tw`text-center text-sm text-neutral-300`}>
                            No &quot;Minecraft: Java Edition&quot; worlds have been detected.
                        </p>
                    )
                ) : worldsError ? null : (
                    <Spinner centered size='base' />
                )}

                <h2 css={tw`text-neutral-300 mb-4 px-4 text-2xl mt-8`}>Maps</h2>
                <FlashMessageRender byKey={'minecraft-maps'} css={tw`mb-4`} />

                <div css={tw`flex flex-wrap gap-4`}>
                    <div css={tw`min-w-[112px]`}>
                        <Label htmlFor='map_provider'>Provider</Label>
                        <Select
                            name='map_provider'
                            value={minecraftMapProvider}
                            onChange={(event) =>
                                setMinecraftMapProvider(event.target.value as MinecraftMapProvider)
                            }
                        >
                            <option value='modrinth'>Modrinth</option>
                            <option value='curseforge'>CurseForge</option>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor='page_size'>Page size</Label>
                        <Select
                            name='page_size'
                            value={pageSize}
                            onChange={(event) => setPageSize(Number(event.target.value))}
                        >
                            <option value='10'>10</option>
                            <option value='25'>25</option>
                            <option value='50'>50</option>
                        </Select>
                    </div>

                    <div css={tw`w-full md:w-auto md:flex-1`}>
                        <Label htmlFor='search_query'>Search query</Label>
                        <Input
                            type='text'
                            name='search_query'
                            value={searchInput}
                            placeholder='world, map, skyblock, survival...'
                            onChange={(event) => setSearchInput(event.target.value)}
                        />
                    </div>
                </div>

                <p css={tw`mt-2 text-xs text-neutral-400`}>
                    Modrinth has no dedicated map category. Results are server-capable projects, and installation only
                    continues when the downloaded archive contains level.dat or uid.dat.
                </p>

                <div css={tw`mt-3`}>
                    {!mapsError && maps ? (
                        <>
                            <Pagination data={maps} onPageSelect={setPage}>
                                {({ items }) =>
                                items.length > 0 ? (
                                    <div className='grid lg:grid-cols-3 gap-2'>
                                        {items.map((map) => (
                                            <GreyRowBox key={`${minecraftMapProvider}-${map.id}`}>
                                                <img
                                                    src={map.icon_url || '/extensions/hoskt-native-version-manager/icons/default.svg?v=22.1'}
                                                    alt={`${map.name} icon`}
                                                    css={tw`rounded-md w-8 h-8 sm:w-12 sm:h-12 object-contain flex items-center justify-center`}
                                                    onError={(event) => {
                                                        if (event.currentTarget.dataset.fallbackApplied === 'true') return;
                                                        event.currentTarget.dataset.fallbackApplied = 'true';
                                                        event.currentTarget.src = '/extensions/hoskt-native-version-manager/icons/default.svg?v=22.1';
                                                    }}
                                                />
                                                <a
                                                    css={tw`ml-3 w-9/12`}
                                                    href={map.url}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                >
                                                    {map.name}
                                                </a>
                                                <button
                                                    type='button'
                                                    title='Install map'
                                                    disabled={installingMapId !== null}
                                                    css={tw`ml-auto text-neutral-400 hover:text-green-400 disabled:opacity-50 transition-colors duration-150`}
                                                    onClick={() => installMap(map.id)}
                                                >
                                                    {installingMapId === map.id ? (
                                                        <Spinner size='small' />
                                                    ) : (
                                                        <FontAwesomeIcon icon={faDownload} css={tw`h-3 w-3`} />
                                                    )}
                                                </button>
                                            </GreyRowBox>
                                        ))}
                                    </div>
                                ) : (
                                    <p css={tw`text-center text-sm text-neutral-300`}>
                                        No &quot;Minecraft: Java Edition&quot; maps have been found for your query.
                                    </p>
                                )
                                }
                            </Pagination>
                            <PageJumpControl
                                currentPage={maps.pagination.currentPage}
                                totalPages={maps.pagination.totalPages}
                                onPageSelect={setPage}
                            />
                        </>
                    ) : mapsError ? null : (
                        <Spinner centered size='base' />
                    )}
                </div>
            </div>
        </ServerContentBlock>
    );
};
