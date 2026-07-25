import http from '@/api/http';

export default (uuid: string, type: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        http.post(`/api/client/servers/${uuid}/settings/rcon/toggle`, {
            type,
        })
            .then((data) => {
                resolve(data.data || []);
            })
            .catch(reject);
    });
};
