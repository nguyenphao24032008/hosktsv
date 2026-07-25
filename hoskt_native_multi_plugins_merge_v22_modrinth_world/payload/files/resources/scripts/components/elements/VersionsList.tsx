import React from 'react';
import { VersionsResult } from '@/api/http';
import tw from 'twin.macro';
import styled from 'styled-components/macro';
import Button from '@/components/elements/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';

interface RenderFuncProps<T> {
    items: T[];
}

interface Props<T> {
    data: VersionsResult<T>;
    children: (props: RenderFuncProps<T>) => React.ReactNode;
}

const Block = styled(Button)`
    ${tw`p-0 w-10 h-10`}
    
    &:not(:last-of-type) {
        ${tw`mr-2`};
    }
`;

function VersionsList<T> ({ data: { items }, children }: Props<T>) {
    return (
        <>
            {children({ items })}
        </>
    );
}

export default VersionsList;
// Buyer Username: bagou450
// Buyer ID: 500
// Resource Version: 1.1.2
// Resource Name: Pterodactyl Addon [1.X] - Minecraft Bedrock Version Changer
// Transaction ID: SELLER_DOWNLOADED