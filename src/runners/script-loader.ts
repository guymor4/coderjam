// Load script dynamically
export function loadScript(scriptSrc: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (document.querySelector(`script[src="${scriptSrc}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
