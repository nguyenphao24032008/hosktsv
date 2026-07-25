import http from '@/api/http';
import { FreePackagesResponse } from '@/components/dashboard/freeservers/FreeServersContainer';

export default async (): Promise<FreePackagesResponse> => {
    const { data } = await http.get('/api/client/freeservers');

    return (data.data || []);
};
