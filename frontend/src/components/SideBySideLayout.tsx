import type { ReactNode } from 'react';

interface SideBySideLayoutProps {
    codeContent: ReactNode;
    outputContent: ReactNode;
}

export function SideBySideLayout({ codeContent, outputContent }: SideBySideLayoutProps) {
    return (
        <div className="hidden md:flex flex-1 overflow-hidden">
            {/* Left side panel: Code editor */}
            <div className="flex-1 flex flex-col">{codeContent}</div>
            {/* Right side panel: Output */}
            <div className="flex-1 flex flex-col border-l border-dark-600">{outputContent}</div>
        </div>
    );
}
