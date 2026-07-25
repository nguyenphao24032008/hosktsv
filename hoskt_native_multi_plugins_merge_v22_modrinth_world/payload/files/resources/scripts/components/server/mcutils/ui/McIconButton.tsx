import React, { useRef, useState } from 'react';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import updateIcon from './updateIcon';
import { Button } from '@/components/elements/button/index';
import { useFlashKey } from '@/plugins/useFlash';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import tw from 'twin.macro';

export default function McIconButton() {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [isLoading, setLoading] = useState(false);
    const { mutate } = useFileManagerSwr();
    const inputRef = useRef<HTMLInputElement>(null);
    const { clearAndAddHttpError } = useFlashKey('settings');

    return (
        <>
            <input
                type={'file'}
                onChange={(e) => {
                    setLoading(true);
                    updateIcon(uuid, e.target.files![0])
                        .catch((e) => clearAndAddHttpError(e))
                        .then(() => mutate())
                        .finally(() => setLoading(false));
                }}
                accept={'image/png, image/jpeg, image/jpg'}
                ref={inputRef}
                style={{ display: 'none' }}
            />
            <br></br>
            <Can action={'file.create'}>
                <TitledGreyBox title={'Minecraft Server Icon'} css={tw`mb-6 md:mb-10`}>
                    <div className='flex items-center justify-between text-sm'>
                        <p>Upload a new icon for your Minecraft server. Accepted formats are PNG, JPEG, and JPG.</p>
                        <Button.Text onClick={() => inputRef.current?.click()} disabled={isLoading}>
                            Change Icon
                        </Button.Text>
                    </div>
                </TitledGreyBox>
            </Can>
        </>
    );
}
