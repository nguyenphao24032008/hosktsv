import useSWR from 'swr';
import { createContext, useContext } from 'react';
import { ServerContext } from '@/state/server';
import http, { PaginatedResult } from '@/api/http';

interface MinecraftVersionsContextValue {
    page: number;
    setPage: (value: number | ((state: number) => number)) => void;
    searchFilter: string;
    setSearchFilter: (value: string | ((state: string) => string)) => void;
    versionsType: string;
    setVersionsType: (value: string | ((state: string) => string)) => void;
    modpacktype: string;
    setModpacktype: (value: string | ((state: string) => string)) => void;
}

export const MinecraftVersionsContext = createContext<MinecraftVersionsContextValue>({
    page: 1,
    setPage: () => undefined,
    searchFilter: '',
    setSearchFilter: () => undefined,
    modpacktype: 'curseforge',
    setModpacktype: () => undefined,
    versionsType: 'vanilla',
    setVersionsType: () => undefined,
});

export default () => {
    const { page, searchFilter, modpacktype, versionsType } = useContext(MinecraftVersionsContext);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    return useSWR<PaginatedResult<any>>(
        ['server:minecraftVersion', uuid, page, searchFilter, modpacktype, versionsType],
        async () => {
            const { data } = await http.get(`/api/client/servers/${uuid}/versions/listversion`, {
                params: { versionsType, page, modpacktype },
                timeout: 60000,
            });

            const items = Array.isArray(data.data) ? data.data : [];
            const totalPages = Math.max(1, Number(data.page) || 1);
            const currentPage = Math.min(Math.max(page, 1), totalPages);
            const perPage = 16;

            return {
                items,
                pagination: {
                    total: Math.max(items.length, totalPages * perPage),
                    count: items.length,
                    perPage,
                    currentPage,
                    totalPages,
                },
            };
        }
    );
};
