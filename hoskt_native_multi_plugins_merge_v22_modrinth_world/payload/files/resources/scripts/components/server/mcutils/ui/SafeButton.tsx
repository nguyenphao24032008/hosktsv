import React from 'react';

type SafeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
};

const baseClass = [
    'hoskt-mcutils-safe-button',
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'rounded-md',
    'border',
    'border-neutral-600',
    'bg-neutral-700',
    'px-3',
    'py-2',
    'text-sm',
    'font-medium',
    'text-neutral-100',
    'transition-colors',
    'hover:bg-neutral-600',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'min-w-0',
    'max-w-full',
    'whitespace-normal',
    'break-words',
    'text-center',
].join(' ');

const SafeButton = React.forwardRef<HTMLButtonElement, SafeButtonProps>(
    ({ children, className = '', type = 'button', size: _size, style, ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={`${baseClass} ${className}`}
            style={{ WebkitAppearance: 'none', appearance: 'none', backgroundImage: 'none', ...style }}
            {...props}
        >
            {children}
        </button>
    )
);

SafeButton.displayName = 'SafeButton';

export default SafeButton;
