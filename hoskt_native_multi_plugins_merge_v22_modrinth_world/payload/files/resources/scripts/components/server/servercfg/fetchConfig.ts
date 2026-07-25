import http from '@/api/http';

export interface ConfigItem {
    name: string;
    rawValue: string;
    inputType: string;
    options: string[];
}

export interface ServerConfigResponse {
    items: ConfigItem[];
    defaults: Record<string, any>;
}

export default async (serverUuid: string): Promise<ServerConfigResponse> => {
    const { data } = await http.get(`/api/client/extensions/blueserverproperties/${serverUuid}`);
    return data;
};

