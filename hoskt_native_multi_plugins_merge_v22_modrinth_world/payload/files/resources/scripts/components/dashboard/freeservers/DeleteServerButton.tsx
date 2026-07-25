import React, { useState } from 'react';
import { ServerContext } from '@/state/server';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { httpErrorToHuman } from '@/api/http';
import Button from '@/components/elements/Button';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import deleteFreeServer from '@/api/freeservers/deleteFreeServer';
import tw from 'twin.macro';
import { useHistory } from 'react-router-dom';

interface Props {
    showMessage: () => void;
}

export default ({ showMessage }: Props) => {
    const [ visible, setVisible ] = useState(false);
    const [ isLoading, setIsLoading ] = useState(false);

    const history = useHistory();
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);

    const { addError, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    const onDelete = () => {
        setIsLoading(true);
        clearFlashes('freeservers:renew');

        deleteFreeServer(uuid).then(() => {
            setIsLoading(false);
            setVisible(false);
            history.push('/');
        }).catch(error => {
            showMessage();
            addError({ key: 'freeservers:renew', message: httpErrorToHuman(error) });

            setIsLoading(false);
            setVisible(false);
        });
    };

    return (
        <>
            <ConfirmationModal
                visible={visible}
                title={'Delete your server?'}
                buttonText={'Yes, delete server'}
                onConfirmed={onDelete}
                showSpinnerOverlay={isLoading}
                onModalDismissed={() => setVisible(false)}
            >
                Are you sure you want to delete this server? You can&apos;t undo this action.
            </ConfirmationModal>
            <Button color={'red'} size={'xsmall'} css={tw`m-1`} onClick={() => setVisible(true)}>
                Delete My Server
            </Button>
        </>
    );
};
