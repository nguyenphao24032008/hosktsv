import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import Modal from '@/components/elements/Modal';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { SocketEvent, SocketRequest } from '@/components/server/events';

const TooOldModalFeature = () => {
    const [ visible, setVisible ] = useState(false);
    const [ loading, setLoading ] = useState(false);

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const status = ServerContext.useStoreState(state => state.status.value);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { connected, instance } = ServerContext.useStoreState(state => state.socket);

    useEffect(() => {
        if (!connected || !instance || status === 'running') return;

        const listener = (line: string) => {
            if (line.toLowerCase().indexOf('Fatal error: Array and string offset access syntax with curly braces is no longer supported in') >= 0) {
                instance.send(SocketRequest.SET_STATE, 'kill');
                setVisible(true);
            }
        };

        instance.addListener(SocketEvent.CONSOLE_OUTPUT, listener);

        return () => {
            instance.removeListener(SocketEvent.CONSOLE_OUTPUT, listener);
        };
    }, [ connected, instance, status ]);

    useEffect(() => () => {
        clearFlashes('feature:pocketmine');
    }, []);

    return (
        !visible ?
            null
            :
            <Modal visible onDismissed={() => setVisible(false)} closeOnBackground={false} showSpinnerOverlay={loading}>
                <FlashMessageRender key={'feature:pocketmine'} css={tw`mb-4`}/>
                <h2 css={tw`text-2xl mb-4 text-neutral-100`}>Version Too old</h2>
                <p css={tw`text-neutral-200`}>
                    Your Pocketmine version are too old you need to update it throught the Version tab
                </p>
                <div css={tw`mt-8 sm:flex items-center justify-end`}>
                    <Button isSecondary onClick={() => setVisible(false)} css={tw`w-full sm:w-auto border-transparent`}>
                        Close
                    </Button>
                </div>
            </Modal>
    );
};

export default TooOldModalFeature;
