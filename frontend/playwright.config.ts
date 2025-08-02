import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:3001',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    /* Run your local dev server before starting the tests */
    webServer: [
        {
            command: 'yarn dev',
            port: 3001,
            timeout: 60000,
            cwd: '../',
            reuseExistingServer: !process.env.CI,
        },
    ],
});
