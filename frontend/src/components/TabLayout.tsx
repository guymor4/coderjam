import { type ReactNode, useState } from 'react';

interface TabLayoutProps {
    codeContent: ReactNode;
    outputContent: ReactNode;
}

export function TabLayout({ codeContent, outputContent }: TabLayoutProps) {
    const [activeTab, setActiveTab] = useState<'code' | 'output'>('code');

    return (
        <div className="flex flex-col flex-grow h-full">
            {/* Tab Headers */}
            <div className="flex bg-dark-800 border-b border-dark-600">
                <button
                    onClick={() => setActiveTab('code')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'code'
                            ? 'bg-dark-700 text-dark-50 border-b-2 border-blue-400'
                            : 'text-dark-300 hover:text-dark-100 hover:bg-dark-750'
                    }`}
                    type="button"
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                        </svg>
                        Code
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('output')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'output'
                            ? 'bg-dark-700 text-dark-50 border-b-2 border-blue-400'
                            : 'text-dark-300 hover:text-dark-100 hover:bg-dark-750'
                    }`}
                    type="button"
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        Output
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <div className="block flex-1 relative">
                {activeTab === 'code' ? codeContent : outputContent}
            </div>
        </div>
    );
}
