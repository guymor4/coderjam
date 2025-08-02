import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

export type SelectProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'onChange'> & {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
};

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    disabled = false,
    ...otherProps
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((option) => option.value === value);

    // Close the select dropdown when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOptionClick = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div {...otherProps} ref={selectRef} className={`relative inline-block ${className}`}>
            <Button
                disabled={disabled}
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full justify-between min-w-[140px]"
            >
                <span className="flex items-center gap-2">
                    {selectedOption?.icon}
                    {selectedOption?.label || placeholder}
                </span>
                <svg
                    className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </Button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-dark-700 border border-dark-500 rounded-lg shadow-xl z-20 py-1">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleOptionClick(option.value)}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-150 ${
                                option.value === value
                                    ? 'bg-accent-600 text-white'
                                    : 'text-dark-100 hover:bg-dark-600 hover:text-dark-50'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                {option.icon}
                                {option.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
