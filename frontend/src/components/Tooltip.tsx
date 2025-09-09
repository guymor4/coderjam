import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'type'> {
    // Tooltip text, if not provided the tooltip will not be displayed
    text?: string;
    // Tooltip delay in milliseconds
    delay?: number;
    direction?: 'top' | 'bottom';
    children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
    text,
    delay = 100,
    children,
    className = '',
    direction = 'top',
    ...props
}) => {
    const [shown, setShown] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleMouseEnter = React.useCallback(() => {
        if (text) {
            timeoutRef.current = window.setTimeout(() => {
                setShown(true);
            }, delay);
        }
    }, [text, delay]);

    const handleMouseLeave = React.useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setShown(false);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return text ? (
        <div
            role="tooltip"
            {...props}
            className={`relative flex ${className}`} // Flex to make children stretch
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            <div
                className={`
                absolute left-1/2 transform -translate-x-1/2 w-max
                ${direction === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
                ${shown ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                bg-dark-500 text-xs rounded py-1 px-2 z-10
                transition-opacity duration-200`}
            >
                {text}
            </div>
        </div>
    ) : (
        children
    );
};
