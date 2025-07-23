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
        'py-2 px-3 rounded-md transition-colors inline-flex items-center disabled:opacity-60';

    const variantClasses = {
        default: {
            default: 'bg-gray-900 text-white enabled:hover:bg-gray-800 focus:ring-gray-500',
            green: 'bg-green-600 text-white enabled:hover:bg-green-700 focus:ring-green-500',
            red: 'bg-red-600 text-white enabled:hover:bg-red-700 focus:ring-red-500',
        },
        outline: {
            default:
                'border border-gray-300 text-gray-700 bg-transparent enabled:hover:bg-gray-200 focus:ring-gray-500',
            green: 'border border-green-300 text-green-700 bg-transparent enabled:hover:bg-green-200 focus:ring-green-500',
            red: 'border border-red-300 text-red-700 bg-transparent enabled:hover:bg-red-200 focus:ring-red-500',
        },
    };

    const buttonClasses = `${baseClasses} ${variantClasses[variant][colorType]} ${className}`;

    return (
        <button className={buttonClasses} {...props}>
            {children}
        </button>
    );
};
