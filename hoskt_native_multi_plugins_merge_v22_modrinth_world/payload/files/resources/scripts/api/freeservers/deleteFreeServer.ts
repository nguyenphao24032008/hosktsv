import http from '@/api/http';

export default (uuid: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        http.post(`/api/client/freeservers/${uuid}/delete`, {}).then((data) => {
            resolve(data.data || []);
        }).catch(reject);
    });
};
