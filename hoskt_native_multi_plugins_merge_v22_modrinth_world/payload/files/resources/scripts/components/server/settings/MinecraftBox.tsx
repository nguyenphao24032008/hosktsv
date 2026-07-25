import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import loadRcon, { RconResponse } from '@/api/server/rcon/loadRcon';
import useSWR from 'swr';
import useFlash from '@/plugins/useFlash';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import tw from 'twin.macro';
import FlashMessageRender from '@/components/FlashMessageRender';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/Button';
import rotatePassword from '@/api/server/rcon/rotatePassword';
import CopyOnClick from '@/components/elements/CopyOnClick';
import toggleRcon from '@/api/server/rcon/toggleRcon';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const nestId = ServerContext.useStoreState((state) => state.server.data!.nestId);

    const [showPassword, setShowPassword] = useState(false);
    const [spinner, showSpinner] = useState(false);

    const { data, error, mutate } = useSWR<RconResponse>([uuid, '/settings/rcon'], (uuid) => loadRcon(uuid));
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const toggle = (type: string) => {
        clearFlashes('server:settings:rcon');
        showSpinner(true);

        toggleRcon(uuid, type)
            .then((response) => {
                mutate(response);
                addFlash({
                    key: 'server:settings:rcon',
                    type: 'success',
                    title: 'success',
                    message: 'Details successfully saved.',
                });
            })
            .catch((error) => {
                clearAndAddHttpError({ key: 'server:settings:rcon', error });
            })
            .finally(() => {
                showSpinner(false);
            });
    };

    const handleRotatePassword = () => {
        clearFlashes('server:settings:rcon');
        showSpinner(true);

        rotatePassword(uuid)
            .then((response) => {
                mutate({
                    rcon: {
                        enabled: data!.rcon.enabled,
                        port: data!.rcon.port,
                        password: response.password,
                    },
                    query: data!.query,
                });
                addFlash({
                    key: 'server:settings:rcon',
                    type: 'success',
                    title: 'success',
                    message: 'Password successfully changed.',
                });
            })
            .catch((error) => {
                clearAndAddHttpError({ key: 'server:settings:rcon', error });
            })
            .finally(() => {
                showSpinner(false);
            });
    };

    useEffect(() => {
        if (!error) {
            clearFlashes('server:settings:rcon');
        } else {
            clearAndAddHttpError({ key: 'server:settings:rcon', error });
        }
    }, [error]);

    return (
        <>
            {[1].includes(nestId) && (
                <TitledGreyBox title={'Minecraft RCON / Query'} css={tw`mb-6 md:mb-10`}>
                    <SpinnerOverlay visible={spinner} />
                    <FlashMessageRender byKey={'server:settings:rcon'} css={tw`mb-4`} />
                    {!data && !error && <Spinner size={'large'} centered />}
                    {data && (
                        <>
                            <div css={tw`flex items-center justify-between mb-2 text-sm`}>
                                <p>RCON Status</p>
                                <code
                                    css={[
                                        tw`font-mono bg-neutral-900 rounded py-1 px-2`,
                                        data.rcon.enabled ? tw`bg-green-600` : tw`bg-red-600`,
                                    ]}
                                >
                                    {data.rcon.enabled ? 'Enabled' : 'Disabled'}
                                </code>
                            </div>
                            <div css={tw`flex items-center justify-between mb-2 text-sm`}>
                                <p>RCON Port</p>
                                <code css={tw`font-mono bg-neutral-900 rounded py-1 px-2`}>
                                    {data.rcon.port.toString() === '' ? 'Not provided' : data.rcon.port}
                                </code>
                            </div>
                            <div css={tw`flex items-center justify-between mb-2 text-sm`}>
                                <p>RCON Password</p>
                                <CopyOnClick text={data.rcon.password}>
                                    <code
                                        css={tw`font-mono bg-neutral-900 rounded py-1 px-2`}
                                        onMouseEnter={() => setShowPassword(true)}
                                        onMouseLeave={() => setShowPassword(false)}
                                    >
                                        {data.rcon.password === ''
                                            ? 'Password not provided'
                                            : showPassword
                                            ? data.rcon.password
                                            : '********'}
                                    </code>
                                </CopyOnClick>
                            </div>
                            <div css={tw`flex items-center justify-between mb-2 text-sm`}>
                                <p>Query Status</p>
                                <code
                                    css={[
                                        tw`font-mono bg-neutral-900 rounded py-1 px-2`,
                                        data.query.enabled ? tw`bg-green-600` : tw`bg-red-600`,
                                    ]}
                                >
                                    {data.query.enabled ? 'Enabled' : 'Disabled'}
                                </code>
                            </div>
                            <div css={tw`flex items-center justify-between mb-2 text-sm`}>
                                <p>Query Port</p>
                                <code css={tw`font-mono bg-neutral-900 rounded py-1 px-2`}>
                                    {data.query.port.toString() === '' ? 'Not provided' : data.query.port}
                                </code>
                            </div>
                            <div css={tw`text-right mt-4`}>
                                <Button
                                    type={'button'}
                                    color={'grey'}
                                    css={tw`mx-1`}
                                    onClick={() => handleRotatePassword()}
                                >
                                    Rotate RCON Password
                                </Button>
                                <Button
                                    type={'button'}
                                    color={data.rcon.enabled ? 'red' : 'primary'}
                                    css={tw`mx-1`}
                                    onClick={() => toggle('rcon')}
                                >
                                    {!data.rcon.enabled ? 'Enable' : 'Disable'} RCON
                                </Button>
                                <Button
                                    type={'button'}
                                    color={data.query.enabled ? 'red' : 'primary'}
                                    css={tw`mx-1`}
                                    onClick={() => toggle('query')}
                                >
                                    {!data.query.enabled ? 'Enable' : 'Disable'} Query
                                </Button>
                            </div>
                        </>
                    )}
                </TitledGreyBox>
            )}
        </>
    );
};
