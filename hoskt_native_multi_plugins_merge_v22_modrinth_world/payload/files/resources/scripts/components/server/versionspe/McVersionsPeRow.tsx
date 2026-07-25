import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import tw from 'twin.macro';
import useFlash from '@/plugins/useFlash';
import GreyRowBox from '@/components/elements/GreyRowBox';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { ServerContext } from '@/state/server';
import Button from '@/components/elements/Button';
import { ApplicationStore } from '@/state';
import { Actions, useStoreActions } from 'easy-peasy';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import updateStartupVariable from '@/api/server/updateStartupVariable';
import reinstallServer from '@/api/server/reinstallServer';

interface Props {
    minecraftVersions: any;
    className?: string;
    type: string;
}

export default ({ minecraftVersions, className, type }: Props) => {
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const [ loading, setLoading ] = useState(false);
    const { clearAndAddHttpError } = useFlash();
    const { addFlash, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);
    const [ visible, setVisible ] = useState(false);
    const name = type + ' ' + minecraftVersions.tag_name;
    function clear () {
        clearFlashes();
    }
    const Install = () => {
        setVisible(false);
        setLoading(true);
        updateStartupVariable(uuid, 'VERSION', minecraftVersions.tag_name).then(() => {
            reinstallServer(uuid).then(() => {
                addFlash({
                    key: 'minecraftMcVersion',
                    type: 'success',
                    message: 'Version changed successfully',
                });
                setLoading(false);
                setTimeout(clear, 3000);
            }).catch(error => {
                clearAndAddHttpError({ key: 'banip', error });
                setLoading(false);
            });
        }).catch(error => {
            clearAndAddHttpError({ key: 'banip', error });
            setLoading(false);
        });
    };
    return (
        <GreyRowBox css={tw`flex-wrap md:flex-nowrap items-center`} className={className}>
            <SpinnerOverlay visible={loading || false} fixed/>
            <ConfirmationModal
                visible={visible}
                title={`Install the ${name}?`}
                buttonText={'Install'}
                onConfirmed={() => Install()}
                onModalDismissed={() => setVisible(false)}
            >
                <p css={tw`text-neutral-300`}>
                    This action reinstall the server!
                </p>
                <p css={tw`text-neutral-300 mt-4`}>
                    Are you sure you want to continue?
                </p>
            </ConfirmationModal>
            <div css={tw`flex items-center truncate w-full md:flex-1`}>
                <div css={tw`flex flex-col truncate`}>
                    <div css={tw`flex items-center text-sm mb-1`}>
                        {name}
                    </div>
                </div>
            </div>
            <div css={tw`mt-4 md:mt-0 ml-6`} style={{ marginRight: '-0.5rem' }}>
                <Button
                    type={'button'}
                    color={'green'}
                    isSecondary
                    onClick={() => setVisible(true)}
                    title="Install"
                >
                    <FontAwesomeIcon icon={faDownload} /> Install
                </Button>
            </div>
        </GreyRowBox>
    );
};
