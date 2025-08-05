import type { ReactNode } from 'react';

interface CollaborationBalloonProps {
    isVisible: boolean;
    onClose: () => void;
    userCount: number;
    children: ReactNode;
}

export function CollaborationBalloon({
    isVisible,
    onClose,
    userCount,
    children,
}: CollaborationBalloonProps) {
    if (!isVisible) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                onClick={onClose}
            />

            {/* Balloon Content */}
            <div className="fixed bottom-20 left-4 right-4 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50 md:hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
                    <div className="flex items-center gap-2">
                        <svg
                            className="w-5 h-5 text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                            />
                        </svg>
                        <h3 className="font-medium text-dark-50">
                            Collaboration ({userCount + 1})
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                        type="button"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-64 overflow-y-auto">{children}</div>
            </div>
        </>
    );
}

interface CollaborationToggleProps {
    userCount: number;
    isConnected: boolean;
    onClick: () => void;
}

export function CollaborationToggle({ userCount, isConnected, onClick }: CollaborationToggleProps) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center transition-colors z-30 md:hidden"
            type="button"
        >
            <div className="relative">
                <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                </svg>
                {/* User count badge */}
                {userCount > 0 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                            {userCount > 9 ? '9+' : userCount}
                        </span>
                    </div>
                )}
                {/* Connection status indicator */}
                <div
                    className={`absolute -bottom-1 -left-1 w-3 h-3 rounded-full border-2 border-white ${
                        isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`}
                />
            </div>
        </button>
    );
}
