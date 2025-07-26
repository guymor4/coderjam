import React from 'react';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    variant?: 'default' | 'outline';
    colorType?: 'default' | 'green' | 'red';
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'default',
    colorType = 'default',
    children,
    className = '',
    ...props
}) => {
    const baseClasses =
        'py-2.5 px-4 rounded-lg transition-all duration-200 inline-flex items-center justify-center font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-950';

    const variantClasses = {
        default: {
            default:
                'bg-dark-600 text-dark-100 enabled:hover:bg-dark-500 focus:ring-dark-400 border border-dark-500',
            green: 'bg-emerald-600 text-white enabled:hover:bg-emerald-700 focus:ring-emerald-500 border border-emerald-600',
            red: 'bg-red-600 text-white enabled:hover:bg-red-700 focus:ring-red-500 border border-red-600',
        },
        outline: {
            default:
                'border border-dark-500 text-dark-100 bg-transparent enabled:hover:bg-dark-700 enabled:hover:border-dark-400 focus:ring-dark-400',
            green: 'border border-emerald-600 text-emerald-400 bg-transparent enabled:hover:bg-emerald-950 enabled:hover:border-emerald-500 focus:ring-emerald-500',
            red: 'border border-red-600 text-red-400 bg-transparent enabled:hover:bg-red-950 enabled:hover:border-red-500 focus:ring-red-500',
        },
    };

    const buttonClasses = `${baseClasses} ${variantClasses[variant][colorType]} ${className}`;

    return (
        <button className={buttonClasses} {...props}>
            {children}
        </button>
    );
};
