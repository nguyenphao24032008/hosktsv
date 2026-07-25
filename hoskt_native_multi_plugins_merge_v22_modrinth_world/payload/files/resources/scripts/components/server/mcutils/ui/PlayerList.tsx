import React, { useEffect, useState } from 'react';
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import StatBlock from '@/components/server/console/StatBlock';
import { ServerContext } from '@/state/server';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PlayerList() {
    const server = ServerContext.useStoreState(state => state.server.data);
    const { data, error } = useSWR(server ? `/api/client/extensions/mcutils/servers/${server.uuid}/playerlist` : null, fetcher);
    const [playerData, setPlayerData] = useState<{ online: number, max: number }>({ online: 0, max: 0 });

    useEffect(() => {
        if (data && data.players) {
            setPlayerData(data.players);
        }
    }, [data]);

    if (error || !data) {
        return null;
    }

    return (
        <StatBlock icon={faUsers} title={'Players'}>
            {!data ? (
                <span className={'text-gray-400'}>Loading...</span>
            ) : (
                <span>{`${playerData.online}/${playerData.max}`}</span>
            )}
        </StatBlock>
    );
}
