import React, { useEffect, useState } from 'react';
import tw from 'twin.macro';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useSWR from 'swr';
import useFlash from '@/plugins/useFlash';
import getRenewInfo from '@/api/freeservers/getRenewInfo';
import { ServerContext } from '@/state/server';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/Button';
import FlashMessageRender from '@/components/FlashMessageRender';
import renewFreeServer from '@/api/freeservers/renewFreeServer';
import DeleteServerButton from '@/components/dashboard/freeservers/DeleteServerButton';
import classNames from 'classnames';
import styles from '@/components/server/console/style.module.css';

export interface RenewInfoResponse {
    isFreeServer: boolean;
    expire: string;
    addHours: number;
}

export default () => {
    if (!location.pathname.startsWith('/server')) {
        return <></>;
    }

    const [isSubmit, setSubmit] = useState(false);
    const [hidden, setHidden] = useState(true);

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const { data, error, mutate } = useSWR<RenewInfoResponse>(
        [uuid, '/freeservers/renew'],
        (uuid) => getRenewInfo(uuid),
        {
            revalidateOnFocus: false,
        }
    );

    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    useEffect(() => {
        if (!error) {
            clearFlashes('freeservers:renew');
        } else {
            clearAndAddHttpError({ key: 'freeservers:renew', error });
        }
    }, [error]);

    const submit = () => {
        clearFlashes('freeservers:renew');
        setSubmit(true);

        renewFreeServer(uuid)
            .then(() => {
                setHidden(false);
                setSubmit(false);
                mutate();
                addFlash({
                    key: 'freeservers:renew',
                    message: "You've successfully renew your server.",
                    type: 'success',
                    title: 'Success',
                });
            })
            .catch((error) => {
                setSubmit(false);
                setHidden(false);
                clearAndAddHttpError({ key: 'freeservers:renew', error });
            });
    };

    return (
        <>
            {!hidden && (
                <div css={tw`flex items-center w-full col-span-6`}>
                    <FlashMessageRender byKey={'freeservers:renew'} />
                </div>
            )}
            {!data ? (
                <Spinner size={'small'} centered />
            ) : (
                <>
                    {data.isFreeServer ? (
                        <div className={classNames(styles.stat_block, 'bg-gray-600')}>
                            <div className={classNames(styles.status_bar || 'bg-gray-700')} />
                            <div className={'flex flex-col justify-center overflow-hidden w-full'}>
                                <p className={'font-header leading-tight text-xs md:text-sm text-gray-200'}>
                                    Renew Server
                                </p>
                                <div className={'h-[3rem] w-full font-semibold text-gray-50 truncate'}>
                                    <p css={tw`text-xs uppercase`}>
                                        <FontAwesomeIcon icon={faClock} fixedWidth css={tw`mr-1 text-green-500`} />
                                        Expired: {data.expire}
                                    </p>
                                    <div css={tw`text-center`}>
                                        <Button
                                            color={'primary'}
                                            size={'xsmall'}
                                            disabled={isSubmit}
                                            isLoading={isSubmit}
                                            onClick={submit}
                                        >
                                            ADD {data.addHours} HOUR(S)
                                        </Button>
                                        <DeleteServerButton showMessage={() => setHidden(false)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <></>
                    )}
                </>
            )}
        </>
    );
};
