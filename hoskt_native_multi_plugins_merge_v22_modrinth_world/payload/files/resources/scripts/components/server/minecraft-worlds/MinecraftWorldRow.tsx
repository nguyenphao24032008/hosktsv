import http from '@/api/http';
import deleteFiles from '@/api/server/files/deleteFiles';
import { Button } from '@/components/elements/button';
import Code from '@/components/elements/Code';
import { Dialog } from '@/components/elements/dialog';
import GreyRowBox from '@/components/elements/GreyRowBox';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import tw from 'twin.macro';
import { MinecraftWorld } from './MinecraftWorldContainer';

interface Props {
    world: MinecraftWorld;
    isDefault: boolean;
    mutate: any;
    className?: string;
}

export default ({ world, mutate, isDefault, className }: Props) => {
    const [deleting, setDeleting] = useState<boolean>(false);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearAndAddHttpError } = useFlash();

    const deleteWorld = () => {
        deleteFiles(uuid, '/', [world.name])
            .then(() => {
                mutate();
            })
            .catch((error) => {
                clearAndAddHttpError({ key: 'worlds', error });
            });

        setDeleting(false);
    };

    const makeDefault = () => {
        http.post(`/api/client/servers/${uuid}/minecraft-worlds/make-default`, {
            worldName: world.name,
        }).then(() => {
            mutate();
        });
    };

    return (
        <>
            <Dialog.Confirm
                title={'Delete World'}
                confirm={'Delete World'}
                open={deleting}
                onClose={() => setDeleting(false)}
                onConfirmed={() => deleteWorld()}
            >
                The world <Code>{world.name}</Code> and its whole directory will be immediately deleted. There is no
                going back.
            </Dialog.Confirm>
            <GreyRowBox className={className} css={tw`justify-center`}>
                <p>
                    {world.name}{' '}
                    {isDefault ? (
                        <span
                            className='underline decoration-dotted'
                            title='This is the world that is specified in the level-name parameter of server.properties.'
                        >
                            (default)
                        </span>
                    ) : (
                        ''
                    )}
                </p>
                <div css={tw`ml-auto`}>
                    {!isDefault && world.defaultable && (
                        <Button size={Button.Sizes.Small} onClick={() => makeDefault()}>
                            Make default
                        </Button>
                    )}
                    <button
                        css={tw`ml-3 text-neutral-400 hover:text-red-400 transition-colors duration-150`}
                        onClick={() => setDeleting(true)}
                    >
                        <FontAwesomeIcon css={tw`h-3 w-3`} icon={faTrash} />
                    </button>
                </div>
            </GreyRowBox>
        </>
    );
};
