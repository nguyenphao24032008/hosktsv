import http from '@/api/http';

export default async (uuid: string, image: File): Promise<void> => {
    const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(image);
    });

    await http.patch(`/api/client/extensions/mcutils/servers/${uuid}`, {
        image: base64.split(',')[1],
    });
};
