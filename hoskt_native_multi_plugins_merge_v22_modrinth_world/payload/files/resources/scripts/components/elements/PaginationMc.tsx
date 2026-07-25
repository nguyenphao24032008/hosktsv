import React from 'react';
import { PaginatedResult } from '@/api/http';
import tw, { TwStyle } from 'twin.macro';
import styled from 'styled-components/macro';
import Button from '@/components/elements/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';
import PageJumpControl from '@/components/elements/PageJumpControl';

interface RenderFuncProps<T> {
    items: T[];
    isLastPage: boolean;
    isFirstPage: boolean;
}

interface Props<T> {
    data: PaginatedResult<T>;
    showGoToLast?: boolean;
    showGoToFirst?: boolean;
    customcss?: TwStyle;
    custompage?: string;
    onPageSelect: (page: number) => void;
    children: (props: RenderFuncProps<T>) => React.ReactNode;
}

const Block = styled(Button)`
    ${tw`p-0 w-10 h-10`}

    &:not(:last-of-type) {
        ${tw`mr-2`};
    }
`;

function Pagination<T>({
    data: { items, pagination },
    onPageSelect,
    customcss,
    custompage,
    showGoToFirst = true,
    showGoToLast = true,
    children,
}: Props<T>) {
    const totalPages = Math.max(1, pagination.totalPages || 1);
    const currentPage = Math.min(Math.max(pagination.currentPage || 1, 1), totalPages);
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage >= totalPages;

    const maxVisiblePages = 7;
    let start = Math.max(currentPage - Math.floor(maxVisiblePages / 2), 1);
    let end = Math.min(start + maxVisiblePages - 1, totalPages);
    start = Math.max(end - maxVisiblePages + 1, 1);

    const pages: number[] = [];
    for (let page = start; page <= end; page++) {
        pages.push(page);
    }

    const jumpControl = (
        <PageJumpControl currentPage={currentPage} totalPages={totalPages} onPageSelect={onPageSelect} />
    );

    return (
        <div className={custompage}>
            {children({ items, isFirstPage, isLastPage })}
            {totalPages > 1 && (
                <div css={[tw`mt-4 flex flex-wrap justify-center`, customcss]}>
                    {showGoToFirst && start > 1 && !isFirstPage && (
                        <Block isSecondary color={'primary'} onClick={() => onPageSelect(1)}>
                            <FontAwesomeIcon icon={faAngleDoubleLeft} />
                        </Block>
                    )}
                    {pages.map((page) => (
                        <Block
                            isSecondary={currentPage !== page}
                            color={'primary'}
                            key={`block_page_${page}`}
                            onClick={() => onPageSelect(page)}
                        >
                            {page}
                        </Block>
                    ))}
                    {showGoToLast && end < totalPages && !isLastPage && (
                        <Block isSecondary color={'primary'} onClick={() => onPageSelect(totalPages)}>
                            <FontAwesomeIcon icon={faAngleDoubleRight} />
                        </Block>
                    )}
                </div>
            )}
            {customcss ? <div css={customcss}>{jumpControl}</div> : jumpControl}
        </div>
    );
}

export default Pagination;
