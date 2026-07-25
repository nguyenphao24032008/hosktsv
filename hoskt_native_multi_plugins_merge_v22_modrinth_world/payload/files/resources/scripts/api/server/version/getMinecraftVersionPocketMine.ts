import useSWR from 'swr';
import http, { VersionsResult } from '@/api/http';

export default (uuid: string) => {
    return useSWR<VersionsResult<any>>([ 'server:minecraftVersion' ], async () => {
        const { data } = await http.get(`/api/client/servers/${uuid}/versions/listpocketmine`, { timeout: 60000 });
        return ({
            items: (data || []),
        });
    });
};
//Buyer Username: bagou450
//Buyer ID: 500
//Resource Version: 1.1
//Resource Name: Pterodactyl Addon [1.X] - Minecraft Bedrock Version Changer
//Transaction ID: SELLER_DOWNLOADED | Only Paid Resources
