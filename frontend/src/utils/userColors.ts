// User color utilities for consistent coloring across components

const OTHER_USERS_CURSOR_COLORS = [
    'text-purple-500',
    'text-green-500',
    'text-yellow-500',
    'text-red-500',
    'text-pink-500',
    'text-teal-500',
    'text-orange-500',
    'text-indigo-500',
    'text-gray-500',
    'text-lime-500',
    'text-cyan-500',
];

// Hash function for consistent color assignment based on username
const cyrb53hash = (str: string, seed: number = 0) => {
    let h1 = 0xdeadbeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// Get the color class for a user based on their name
export function getUserColor(userName: string): string {
    return OTHER_USERS_CURSOR_COLORS[cyrb53hash(userName) % OTHER_USERS_CURSOR_COLORS.length];
}

// Get the color class for a user to be used in cursor styling and icons
export function getUserColorClassname(userName: string): string {
    const index = cyrb53hash(userName) % OTHER_USERS_CURSOR_COLORS.length;
    return OTHER_USERS_CURSOR_COLORS[index];
}
