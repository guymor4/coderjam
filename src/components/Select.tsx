import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
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
        <div ref={selectRef} className={`relative inline-block ${className}`}>
            <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left"
            >
                {selectedOption?.label || placeholder}
                <svg
                    className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleOptionClick(option.value)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md ${
                                option.value === value
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
