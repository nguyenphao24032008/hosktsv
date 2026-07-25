import http from '@/api/http';

export default async (serverUuid: string, configData: Record<string, any>): Promise<void> => {
    await http.post(`/api/client/extensions/blueserverproperties/${serverUuid}/update`, {
        data: configData,
    });
};

