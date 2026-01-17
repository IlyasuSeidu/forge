/**
 * SCREENSHOT RENDERER SERVICE
 *
 * Takes generated HTML/React code and produces real browser screenshots
 * using Playwright headless browser.
 *
 * This replaces DALL-E image generation with actual browser rendering,
 * giving us:
 * - Perfect text rendering
 * - Exact layout fidelity
 * - Deterministic results
 * - Screenshot-quality realism
 *
 * The code that generates the screenshot becomes the starting point
 * for production implementation by Forge Implementer.
 */

import { chromium, Browser, Page } from 'playwright';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import pino from 'pino';

void writeFile;
void join;

export interface ScreenshotOptions {
  viewport: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
  screenshotPath: string;
}

export interface ScreenshotResult {
  screenshotPath: string;
  imageHash: string;
  imageSizeBytes: number;
}

export class ScreenshotRenderer {
  private logger: pino.Logger;

  constructor(logger: pino.Logger) {
    this.logger = logger.child({
      service: 'ScreenshotRenderer',
      version: '1.0.0',
    });
  }

  /**
   * Render HTML code in a headless browser and capture screenshot
   */
  async renderHTMLScreenshot(
    htmlCode: string,
    options: ScreenshotOptions
  ): Promise<ScreenshotResult> {
    this.logger.info(
      {
        viewport: options.viewport,
        codeLength: htmlCode.length,
        screenshotPath: options.screenshotPath,
      },
      'Starting HTML screenshot rendering'
    );

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // Launch headless Chromium
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      // Create new page with specified viewport
      page = await browser.newPage({
        viewport: options.viewport,
      });

      // Set content and wait for fonts/images to load
      await page.setContent(htmlCode, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait a bit for any CSS transitions to settle
      await page.waitForTimeout(500);

      // Ensure screenshots directory exists
      await mkdir(dirname(options.screenshotPath), { recursive: true });

      // Capture screenshot
      const screenshotBuffer = await page.screenshot({
        path: options.screenshotPath,
        fullPage: options.fullPage ?? true,
        type: 'png',
      });

      // Calculate hash of screenshot
      const imageHash = createHash('sha256').update(screenshotBuffer).digest('hex');

      this.logger.info(
        {
          screenshotPath: options.screenshotPath,
          imageHash,
          imageSizeBytes: screenshotBuffer.length,
        },
        'Screenshot rendered successfully'
      );

      return {
        screenshotPath: options.screenshotPath,
        imageHash,
        imageSizeBytes: screenshotBuffer.length,
      };
    } catch (error: any) {
      this.logger.error(
        { error: error.message, stack: error.stack },
        'Screenshot rendering failed'
      );
      throw new Error(`Screenshot rendering failed: ${error.message}`);
    } finally {
      // Clean up browser resources
      if (page) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Render React component code (wraps in HTML template first)
   */
  async renderReactScreenshot(
    reactCode: string,
    options: ScreenshotOptions
  ): Promise<ScreenshotResult> {
    this.logger.info(
      {
        viewport: options.viewport,
        codeLength: reactCode.length,
      },
      'Converting React code to HTML for screenshot'
    );

    // Wrap React component in HTML template with React CDN
    const htmlCode = this.wrapReactInHTML(reactCode);

    return this.renderHTMLScreenshot(htmlCode, options);
  }

  /**
   * Wrap React JSX in HTML template with React CDN for screenshot
   */
  private wrapReactInHTML(reactCode: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forge Mockup Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${reactCode}

    // Render the component
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  </script>
</body>
</html>`;
  }

  /**
   * Calculate hash of generated code
   */
  hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
