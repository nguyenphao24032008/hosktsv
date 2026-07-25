import React, { useEffect } from 'react';
import useSWR from 'swr';
import useFlash from '@/plugins/useFlash';
import getFreePackages from '@/api/freeservers/getFreePackages';
import tw from 'twin.macro';
import Spinner from '@/components/elements/Spinner';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import PageContentBlock from '@/components/elements/PageContentBlock';
import OrderForm from '@/components/dashboard/freeservers/OrderForm';

export interface FreePackagesResponse {
    packages: Package[];
}

interface Package {
    id: number;
    name: string;
    image: string;
    eggs: any[];
}

export default () => {
    const { data, error } = useSWR<FreePackagesResponse>([ '/freeservers' ], () => getFreePackages());

    const { clearFlashes, clearAndAddHttpError } = useFlash();

    useEffect(() => {
        if (!error) {
            clearFlashes('freeservers');
        } else {
            clearAndAddHttpError({ key: 'freeservers', error });
        }
    }, [ error ]);

    return (
        <PageContentBlock title={'Free Server Packags'} showFlashKey={'freeservers'}>
            {!data ?
                <div css={tw`w-full`}>
                    <Spinner size={'large'} centered />
                </div>
                :
                <>
                    <div css={tw`w-full flex flex-wrap`}>
                        {data.packages.map((item, key) => (
                            <div css={tw`w-full md:w-4/12 md:pl-2 md:pr-2 pt-4`} key={key}>
                                <TitledGreyBox title={item.name}>
                                    <div css={tw`px-1 py-2`}>
                                        <div css={tw`flex flex-wrap`}>
                                            <div css={tw`w-auto`}>
                                                <img css={'width: 100%;'} src={item.image} />
                                            </div>
                                        </div>
                                        <div css={tw`pt-4`}>
                                            <OrderForm packageId={item.id} eggs={item.eggs} />
                                        </div>
                                    </div>
                                </TitledGreyBox>
                            </div>
                        ))}
                    </div>
                </>
            }
        </PageContentBlock>
    );
};
