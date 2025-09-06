import { test, expect, Page, Locator } from '@playwright/test';

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
    go: {
        code: `
package main

import "fmt"

func main() {
    fmt.Println("Go works!")
}`,
        expectedOutput: 'Go works!',
    },
};

const runButtonLocator = (page: Page) => page.getByRole('button', { name: /run/i });
const getLanguageOption = (languageSelect: Locator, language: string) =>
    languageSelect.locator('..').locator(`button:has-text("${language}")`).last();

// Get language selector and wait for it to be enabled
const languageSelectLocator = (page: Page) => page.locator('[data-testid="language-selector"] button');

test.describe('Language Execution Tests', () => {
    async function setupPageAndWaitForLoad(page: Page) {
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

        const languageSelector = languageSelectLocator(page);
        await expect(languageSelector).toBeEnabled();
        await languageSelector.click();
        await page.waitForTimeout(500); // Wait for dropdown to open

        await getLanguageOption(languageSelector, language).click();

        await expect(languageSelector).toBeEnabled({
            timeout: 60000 // it's disabled until the runner is ready
        });
    }
    // Test each language for basic functionality
    Object.entries(LANGUAGE_TEST_DATA).forEach(([language, testData]) => {
        test(`${language} - run sample code`, async ({ page }) => {
            test.setTimeout(120_000); // Extend timeout for slow tests

            await setupPageAndWaitForLoad(page);

            try {
                await switchLanguage(page, language);

                // Clear and enter test code
                const editor = page.locator('.monaco-editor').first();
                await editor.click();
                await page.keyboard.press('Control+KeyA'); // Select all
                await page.keyboard.insertText(testData.code);

                // Find and click run button
                const runButton = runButtonLocator(page);
                await runButton.click({
                    timeout: 60000 // it's disabled until the code run is finished
                });
                await expect(runButton).toBeEnabled({
                    timeout: 120000 // it's disabled until the code run is finished
                });
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

    test('rapid language switching without errors', async ({ page }) => {
        await setupPageAndWaitForLoad(page);

        const languages = Object.keys(LANGUAGE_TEST_DATA);

        // Rapidly switch between languages
        // DO NOT wait for initialization to complete, only check no errors in output
        for (const lang of languages) {
            await switchLanguage(page, lang);

            const outputText = await page.locator('[data-testid="output"]').textContent();
            expect(outputText?.length ?? 0).toBeGreaterThan(0);
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
