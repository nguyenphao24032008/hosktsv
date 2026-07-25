import http from '@/api/http';

export interface RconResponse {
    rcon: {
        enabled: boolean;
        port: number;
        password: string;
    };
    query: {
        enabled: boolean;
        port: number;
    };
}

export default async (uuid: string): Promise<RconResponse> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/settings/rcon`);

    return data || [];
};
