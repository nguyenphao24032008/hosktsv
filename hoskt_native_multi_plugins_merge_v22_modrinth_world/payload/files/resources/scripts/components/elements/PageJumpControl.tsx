import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import tw from 'twin.macro';

interface Props {
    currentPage: number;
    totalPages: number;
    onPageSelect: (page: number) => void;
    disabled?: boolean;
    className?: string;
}

const clampPage = (page: number, totalPages: number): number => Math.min(Math.max(Math.floor(page), 1), totalPages);

export default ({ currentPage, totalPages, onPageSelect, disabled = false, className }: Props) => {
    const safeTotalPages = useMemo(
        () => Math.max(1, Number.isFinite(totalPages) ? Math.floor(totalPages) : 1),
        [totalPages]
    );
    const safeCurrentPage = clampPage(Number.isFinite(currentPage) ? currentPage : 1, safeTotalPages);
    const [pageInput, setPageInput] = useState(String(safeCurrentPage));

    useEffect(() => {
        setPageInput(String(safeCurrentPage));
    }, [safeCurrentPage]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const requestedPage = Number(pageInput);
        if (!Number.isFinite(requestedPage)) {
            setPageInput(String(safeCurrentPage));
            return;
        }

        const nextPage = clampPage(requestedPage, safeTotalPages);
        setPageInput(String(nextPage));
        onPageSelect(nextPage);
    };

    return (
        <form
            className={className}
            onSubmit={submit}
            css={tw`mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-neutral-300`}
        >
            <span css={tw`whitespace-nowrap`}>
                Page <strong css={tw`text-neutral-100`}>{safeCurrentPage}</strong> of{' '}
                <strong css={tw`text-neutral-100`}>{safeTotalPages}</strong>
            </span>
            <input
                aria-label='Page number'
                type='number'
                inputMode='numeric'
                min={1}
                max={safeTotalPages}
                step={1}
                disabled={disabled}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                css={tw`h-10 w-20 rounded border border-neutral-600 bg-neutral-800 px-3 text-center text-neutral-100 outline-none transition-colors focus:border-primary-400 disabled:cursor-not-allowed disabled:opacity-50`}
            />
            <button
                type='submit'
                disabled={disabled}
                css={tw`h-10 rounded border border-primary-500 px-4 font-medium text-primary-300 transition-colors hover:bg-primary-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50`}
            >
                Go
            </button>
        </form>
    );
};
