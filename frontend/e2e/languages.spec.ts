import { test, expect, Page } from '@playwright/test';

// Test data for each supported language with simple code that should not error
const LANGUAGE_TEST_DATA = {
    javascript: {
        code: 'console.log("JavaScript works!");',
        expectedOutput: 'JavaScript works!',
    },
    typescript: {
        code: `
function greet(name: string): string {
    return \`Hello, \${name}!\`;
}
console.log(greet('World'));`,
        expectedOutput: 'Hello, World!',
    },
    python: {
        code: 'print("Python works!")',
        expectedOutput: 'Python works!',
    },
    // TODO enable Go tests when Go support is ready
    //     go: {
    //         code: `package main
    //
    // import "fmt"
    //
    // func main() {
    //     fmt.Println("Go works!")
    // }`,
    //         expectedOutput: 'Go works!',
    //     },
};

test.describe('Language Execution Tests', () => {
    // Helper function to wait for pad to be ready and set language
    async function waitForPadLoaded(page: Page) {
        await page.goto(`/`);
        await page.waitForLoadState('networkidle');

        // Wait for either the pad to load completely or stay in loading state
        // The app creates pads on-demand, so we should eventually get past loading
        try {
            // Wait for either the main interface or collaboration error
            await page.waitForSelector('[data-testid="pad-loaded"], [data-testid="loading-pad"]', {
                timeout: 15000,
            });

            // Check if we got the full interface
            const isLoaded = (await page.locator('[data-testid="pad-loaded"]').count()) > 0;
            const isLoading = (await page.locator('[data-testid="loading-pad"]').count()) > 0;

            return { isLoaded, isLoading };
        } catch {
            console.log(`Timeout waiting for pad state`);
            return { isLoaded: false, isLoading: false };
        }
    }

    async function switchLanguage(page: Page, language: string) {
        await page.waitForSelector('[data-testid="pad-loaded"], [data-testid="loading-pad"]', {
            timeout: 15000,
        });

        const languageSelector = page.locator('[data-testid="language-selector"]');
        await expect(languageSelector).toBeAttached();
        await languageSelector.click();
        await page.waitForTimeout(500); // Wait for dropdown to open

        await languageSelector.locator(`button:has-text("${language}")`).last().click();
    }

    // Test each language for basic functionality
    Object.entries(LANGUAGE_TEST_DATA).forEach(([language, testData]) => {
        test(`should execute ${language} code without throwing errors`, async ({ page }) => {
            await waitForPadLoaded(page);

            try {
                await switchLanguage(page, language);

                // Find and interact with editor
                const editor = page.locator('.monaco-editor').first();
                await editor.click();

                // Clear and enter test code
                await page.keyboard.press('Control+a'); // Select all
                await page.keyboard.insertText(testData.code);

                // Find and click run button
                const runButton = page.getByRole('button', { name: /run/i }).first();
                await runButton.click();
                await expect(runButton).toBeEnabled({ timeout: 3000 });
                // Wait for execution to complete

                // Check page content for output or error indicators
                const outputText = await page.locator('[data-testid="output"]').textContent();

                // Check no errors in output
                expect(outputText).not.toContain('Error');
                expect(outputText).not.toContain('error');
                expect(outputText).not.toContain('Exception');
                expect(outputText).not.toContain('SyntaxError');

                // Check for expected output
                expect(outputText).toContain(testData.expectedOutput);
            } catch (error) {
                console.error(`Error testing ${language}:`, error);
                throw error;
            }
        });
    });

    test('should handle rapid language switching without errors', async ({ page }) => {
        await waitForPadLoaded(page);

        const languages = Object.keys(LANGUAGE_TEST_DATA);

        // Rapidly switch between languages
        for (const lang of languages) {
            await switchLanguage(page, lang);

            const outputText = await page.locator('[data-testid="output"]').textContent();
            expect(outputText).not.toContain('Error');
            expect(outputText).not.toContain('error');
            expect(outputText).not.toContain('Exception');
            expect(outputText).not.toContain('SyntaxError');
        }

        // Final screenshot
        await page.screenshot({
            path: `test-results/language-switching-final.png`,
            fullPage: true,
        });
    });
});
