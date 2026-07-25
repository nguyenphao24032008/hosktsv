import http from '@/api/http';

export default (packageId: number, eggId: number): Promise<any> => {
    return new Promise((resolve, reject) => {
        http.post('/api/client/freeservers/create', {
            packageId, eggId,
        }).then((data) => {
            resolve(data.data || []);
        }).catch(reject);
    });
};
