import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import { promises as fs } from 'fs';
import type { FastifyBaseLogger } from 'fastify';

export interface RuntimeVerificationResult {
  passed: boolean;
  errors: string[];
}

/**
 * RuntimeVerifier runs the app in a headless browser to catch runtime errors
 * that static analysis cannot detect.
 */
export class RuntimeVerifier {
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'RuntimeVerifier' });
  }

  /**
   * Verify app by loading it in headless Chromium and testing interactions
   */
  async verify(workspacePath: string): Promise<RuntimeVerificationResult> {
    this.logger.info({ workspacePath }, 'Starting runtime verification');

    const errors: string[] = [];
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // STEP 3: Locate index.html
      const indexHtmlPath = path.join(workspacePath, 'index.html');

      try {
        await fs.access(indexHtmlPath);
      } catch {
        errors.push('[Runtime] index.html not found in workspace');
        return { passed: false, errors };
      }

      // Launch headless browser
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      // STEP 4: Capture console errors and page errors
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          consoleErrors.push(`[Console Error] ${text}`);
          this.logger.warn({ text }, 'Console error detected');
        }
      });

      page.on('pageerror', (error) => {
        const message = error.message;
        const stack = error.stack || '';
        pageErrors.push(`[Page Error] ${message}\n${stack}`);
        this.logger.warn({ message, stack }, 'Page error detected');
      });

      // STEP 3: Load page with timeout
      const fileUrl = `file://${indexHtmlPath}`;

      try {
        await page.goto(fileUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 5000
        });
        this.logger.info('Page loaded successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`[Runtime] Page failed to load: ${message}`);
        return { passed: false, errors };
      }

      // Wait a bit for any immediate errors to surface
      await page.waitForTimeout(500);

      // Check for errors during load
      if (consoleErrors.length > 0 || pageErrors.length > 0) {
        errors.push(...consoleErrors, ...pageErrors);
      }

      // STEP 5: Interaction smoke tests
      try {
        await this.runInteractionTests(page, errors);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`[Runtime] Interaction tests failed: ${message}`);
      }

      // Final check for any errors captured during interactions
      if (consoleErrors.length > 0 || pageErrors.length > 0) {
        errors.push(...consoleErrors.filter(e => !errors.includes(e)));
        errors.push(...pageErrors.filter(e => !errors.includes(e)));
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`[Runtime] Verification crashed: ${message}`);
    } finally {
      // Cleanup
      if (page) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }

    const passed = errors.length === 0;
    this.logger.info({ passed, errorCount: errors.length }, 'Runtime verification completed');

    return {
      passed,
      errors: errors.sort(), // Deterministic output
    };
  }

  /**
   * STEP 5: Run interaction smoke tests
   * Click all buttons, links, and submit forms
   */
  private async runInteractionTests(page: Page, errors: string[]): Promise<void> {
    this.logger.info('Starting interaction tests');

    const interactionTimeout = 5000;

    try {
      // Test all buttons
      const buttons = await page.$$('button');
      this.logger.info({ count: buttons.length }, 'Testing buttons');

      for (let i = 0; i < buttons.length; i++) {
        try {
          const button = buttons[i];
          if (!button) continue;

          const buttonText = await button.textContent().catch(() => 'unknown');

          // Check if button is visible and enabled
          const isVisible = await button.isVisible().catch(() => false);
          const isEnabled = await button.isEnabled().catch(() => false);

          if (isVisible && isEnabled) {
            this.logger.debug({ index: i, text: buttonText }, 'Clicking button');
            await button.click({ timeout: interactionTimeout });

            // Wait a bit for any async operations
            await page.waitForTimeout(200);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`[Runtime] Button ${i} click failed: ${message}`);
          this.logger.warn({ index: i, error: message }, 'Button click failed');
        }
      }

      // Test all links (that don't navigate away)
      const links = await page.$$('a');
      this.logger.info({ count: links.length }, 'Testing links');

      for (let i = 0; i < links.length; i++) {
        try {
          const link = links[i];
          if (!link) continue;

          const href = await link.getAttribute('href').catch(() => '');
          const linkText = await link.textContent().catch(() => 'unknown');

          // Skip external links and full page navigations
          if (href && !href.startsWith('http') && !href.startsWith('mailto:') && href !== '#') {
            const isVisible = await link.isVisible().catch(() => false);

            if (isVisible) {
              this.logger.debug({ index: i, href, text: linkText }, 'Clicking link');
              await link.click({ timeout: interactionTimeout });
              await page.waitForTimeout(200);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          // Links might navigate or do other things - only report real errors
          if (!message.includes('Navigation') && !message.includes('Target closed')) {
            errors.push(`[Runtime] Link ${i} click failed: ${message}`);
            this.logger.warn({ index: i, error: message }, 'Link click failed');
          }
        }
      }

      // Test forms (with dummy data)
      const forms = await page.$$('form');
      this.logger.info({ count: forms.length }, 'Testing forms');

      for (let i = 0; i < forms.length; i++) {
        try {
          const form = forms[i];
          if (!form) continue;

          // Fill in text inputs with dummy data
          const textInputs = await form.$$('input[type="text"], input[type="email"], input[type="password"], input:not([type]), textarea');

          for (const input of textInputs) {
            const inputType = await input.getAttribute('type').catch(() => 'text');
            const isVisible = await input.isVisible().catch(() => false);

            if (isVisible) {
              let dummyValue = 'test';
              if (inputType === 'email') dummyValue = 'test@example.com';
              if (inputType === 'password') dummyValue = 'password123';

              await input.fill(dummyValue, { timeout: 1000 });
            }
          }

          // Try to submit the form
          const submitButton = await form.$('button[type="submit"], input[type="submit"]');
          if (submitButton) {
            const isVisible = await submitButton.isVisible().catch(() => false);
            if (isVisible) {
              this.logger.debug({ index: i }, 'Submitting form');
              await submitButton.click({ timeout: interactionTimeout });
              await page.waitForTimeout(200);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          // Form submissions might navigate - only report real errors
          if (!message.includes('Navigation') && !message.includes('Target closed')) {
            errors.push(`[Runtime] Form ${i} interaction failed: ${message}`);
            this.logger.warn({ index: i, error: message }, 'Form interaction failed');
          }
        }
      }

      this.logger.info('Interaction tests completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`[Runtime] Interaction test phase crashed: ${message}`);
    }
  }
}
