import http from '@/api/http';
import { RenewInfoResponse } from '@/components/dashboard/freeservers/RenewBox';

export default async (uuid: string): Promise<RenewInfoResponse> => {
    const { data } = await http.get(`/api/client/freeservers/${uuid}/info`);

    return (data.data || []);
};
