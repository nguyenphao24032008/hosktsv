import React, { useEffect } from 'react';
import Spinner from '@/components/elements/Spinner';
import useFlash from '@/plugins/useFlash';
import FlashMessageRender from '@/components/FlashMessageRender';
import tw from 'twin.macro';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import VersionsList from '@/components/elements/VersionsList';
import McVersionsRow from './McVersionsPeRow';
import { ServerContext } from '@/state/server';
import getMinecraftVersionPocketMine from '@/api/server/version/getMinecraftVersionPocketMine';

const McVersionsPocketMineContainer = () => {
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);

    const { data: minecraftVersions, error, isValidating } = getMinecraftVersionPocketMine(uuid);

    useEffect(() => {
        if (!error) {
            clearFlashes('minecraftMcVersion');

            return;
        }

        clearAndAddHttpError({ error, key: 'minecraftMcVersion' });
    }, [ error ]);
    if (!minecraftVersions || (error && isValidating)) {
        return <Spinner size={'large'} centered/>;
    }
    //bagou450
//Pterodactyl Addon [1.X] - Minecraft Bedrock Version Changer
//SELLER_DOWNLOADED
    return (
        <ServerContentBlock title={'Minecraft McVersion'}>
            <FlashMessageRender byKey={'minecraftMcVersion'} css={tw`mb-4`}/>
            <VersionsList data={minecraftVersions}>
                {({ items }) => (
                    !items.length ?
                        <p css={tw`text-center text-sm text-neutral-300`}>
                            Can&apos;t find any version on the server
                        </p>
                        :
                        items.map((minecraftVersions, index) => <McVersionsRow
                            key={minecraftVersions.id}
                            minecraftVersions={minecraftVersions}
                            type="PocketMine"
                            css={index > 0 ? tw`mt-2` : undefined}
                        />)
                )}
            </VersionsList>
        </ServerContentBlock>
    );
};

export default () => {
    return (
        <McVersionsPocketMineContainer/>
    );
};
