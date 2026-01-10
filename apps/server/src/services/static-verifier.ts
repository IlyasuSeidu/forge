import type { FastifyBaseLogger } from 'fastify';
import { parse } from 'node-html-parser';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface VerificationResult {
  passed: boolean;
  errors: string[];
}

/**
 * StaticVerifier performs static analysis on generated artifacts
 * to catch common bugs before runtime execution
 */
export class StaticVerifier {
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'StaticVerifier' });
  }

  /**
   * Runs static verification on workspace artifacts
   * @param workspacePath - Absolute path to workspace directory
   * @returns Verification result with pass/fail and error details
   */
  async verify(workspacePath: string): Promise<VerificationResult> {
    this.logger.info({ workspacePath }, 'Starting static verification');

    const errors: string[] = [];

    try {
      // Step 1: Collect all HTML and JS files
      const files = await this.collectFiles(workspacePath);

      this.logger.debug(
        { htmlFiles: files.htmlFiles.length, jsFiles: files.jsFiles.length },
        'Files collected for verification'
      );

      // Step 2: Extract HTML IDs
      const htmlIds = await this.extractHtmlIds(files.htmlFiles, errors);

      // Step 3: Validate JS selectors against HTML IDs
      await this.validateJsSelectors(files.jsFiles, htmlIds, errors);

      // Step 4: Validate file paths and references
      await this.validateFilePaths(files.htmlFiles, workspacePath, errors);

      // Return result
      const passed = errors.length === 0;

      this.logger.info(
        { passed, errorCount: errors.length },
        'Static verification completed'
      );

      return {
        passed,
        errors: errors.sort(), // Sort for deterministic output
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error({ error: errorMessage }, 'Static verification failed');

      return {
        passed: false,
        errors: [`Static verification crashed: ${errorMessage}`],
      };
    }
  }

  /**
   * Collects all HTML and JS files from workspace
   */
  private async collectFiles(
    workspacePath: string
  ): Promise<{ htmlFiles: string[]; jsFiles: string[] }> {
    const htmlFiles: string[] = [];
    const jsFiles: string[] = [];

    const entries = await fs.readdir(workspacePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(workspacePath, entry.name);

        if (entry.name.endsWith('.html')) {
          htmlFiles.push(fullPath);
        } else if (entry.name.endsWith('.js')) {
          jsFiles.push(fullPath);
        }
      }
    }

    return { htmlFiles, jsFiles };
  }

  /**
   * STEP 2: Extracts all element IDs from HTML files
   * Detects duplicate IDs within and across files
   */
  private async extractHtmlIds(
    htmlFiles: string[],
    errors: string[]
  ): Promise<Map<string, string>> {
    const htmlIds = new Map<string, string>(); // id -> filename where it was found

    for (const htmlFile of htmlFiles) {
      const filename = path.basename(htmlFile);
      const content = await fs.readFile(htmlFile, 'utf-8');

      try {
        const root = parse(content);

        // Find all elements with id attribute
        const elementsWithIds = root.querySelectorAll('[id]');

        for (const element of elementsWithIds) {
          const id = element.getAttribute('id');

          if (!id) continue;

          // Check for duplicate IDs
          if (htmlIds.has(id)) {
            const originalFile = htmlIds.get(id)!;

            if (originalFile === filename) {
              errors.push(
                `[${filename}] Duplicate ID "${id}" found in same file`
              );
            } else {
              errors.push(
                `[${filename}] Duplicate ID "${id}" already exists in ${originalFile}`
              );
            }
          } else {
            htmlIds.set(id, filename);
          }
        }

        this.logger.debug(
          { filename, idsFound: elementsWithIds.length },
          'Extracted IDs from HTML'
        );
      } catch (error) {
        errors.push(
          `[${filename}] Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return htmlIds;
  }

  /**
   * STEP 3: Validates that all JS selector references exist in HTML
   */
  private async validateJsSelectors(
    jsFiles: string[],
    htmlIds: Map<string, string>,
    errors: string[]
  ): Promise<void> {
    for (const jsFile of jsFiles) {
      const filename = path.basename(jsFile);
      const content = await fs.readFile(jsFile, 'utf-8');

      // Extract getElementById calls
      const getByIdMatches = content.matchAll(
        /document\.getElementById\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
      );

      for (const match of getByIdMatches) {
        const id = match[1];

        if (id && !htmlIds.has(id)) {
          errors.push(
            `[${filename}] Element ID "${id}" referenced in JS but not found in HTML. Hint: Add <element id="${id}"> to your HTML file.`
          );
        }
      }

      // Extract querySelector('#id') calls
      const querySelectorMatches = content.matchAll(
        /document\.querySelector\s*\(\s*['"`](#[^'"`]+)['"`]\s*\)/g
      );

      for (const match of querySelectorMatches) {
        const selector = match[1]; // Includes the '#'

        if (selector) {
          const id = selector.substring(1); // Remove '#'

          if (!htmlIds.has(id)) {
            errors.push(
              `[${filename}] Element ID "${id}" referenced in querySelector("${selector}") but not found in HTML. Hint: Add <element id="${id}"> to your HTML file.`
            );
          }
        }
      }

      // Extract querySelectorAll('#id') calls
      const querySelectorAllMatches = content.matchAll(
        /document\.querySelectorAll\s*\(\s*['"`](#[^'"`]+)['"`]\s*\)/g
      );

      for (const match of querySelectorAllMatches) {
        const selector = match[1]; // Includes the '#'

        if (selector) {
          const id = selector.substring(1); // Remove '#'

          if (!htmlIds.has(id)) {
            errors.push(
              `[${filename}] Element ID "${id}" referenced in querySelectorAll("${selector}") but not found in HTML. Hint: Add <element id="${id}"> to your HTML file.`
            );
          }
        }
      }

      this.logger.debug({ filename }, 'Validated JS selectors');
    }
  }

  /**
   * STEP 4: Validates file paths and references
   */
  private async validateFilePaths(
    htmlFiles: string[],
    workspacePath: string,
    errors: string[]
  ): Promise<void> {
    for (const htmlFile of htmlFiles) {
      const filename = path.basename(htmlFile);
      const content = await fs.readFile(htmlFile, 'utf-8');

      // Check for file:// protocol
      if (content.includes('file://')) {
        const matches = content.matchAll(/file:\/\/([^\s"'<>]+)/g);

        for (const match of matches) {
          errors.push(
            `[${filename}] Absolute file:// path detected: "${match[0]}". Use relative paths like "styles.css" instead.`
          );
        }
      }

      // Check for absolute paths (Unix and Windows)
      const absolutePathRegex =
        /(href|src)\s*=\s*['"`](\/[^'"`]+|[A-Za-z]:\\[^'"`]+)['"`]/g;
      const absoluteMatches = content.matchAll(absolutePathRegex);

      for (const match of absoluteMatches) {
        const fullMatch = match[0];
        const pathValue = match[2];

        // Skip if it's a CDN URL (starts with http/https)
        if (content.substring(match.index! - 10, match.index).includes('http')) {
          continue;
        }

        errors.push(
          `[${filename}] Absolute path detected: ${fullMatch}. Use relative paths like "styles.css" instead of "${pathValue}".`
        );
      }

      // Validate referenced files exist
      try {
        const root = parse(content);

        // Check <script src="">
        const scripts = root.querySelectorAll('script[src]');

        for (const script of scripts) {
          const src = script.getAttribute('src');

          if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
            const referencedPath = path.join(workspacePath, src);

            try {
              await fs.access(referencedPath);
            } catch {
              errors.push(
                `[${filename}] Referenced script file does not exist: "${src}". Make sure the file is created in the workspace.`
              );
            }
          }
        }

        // Check <link href="">
        const links = root.querySelectorAll('link[href]');

        for (const link of links) {
          const href = link.getAttribute('href');

          if (href && !href.startsWith('http://') && !href.startsWith('https://')) {
            const referencedPath = path.join(workspacePath, href);

            try {
              await fs.access(referencedPath);
            } catch {
              errors.push(
                `[${filename}] Referenced stylesheet does not exist: "${href}". Make sure the file is created in the workspace.`
              );
            }
          }
        }

        // Check <img src="">
        const images = root.querySelectorAll('img[src]');

        for (const img of images) {
          const src = img.getAttribute('src');

          if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
            const referencedPath = path.join(workspacePath, src);

            try {
              await fs.access(referencedPath);
            } catch {
              errors.push(
                `[${filename}] Referenced image does not exist: "${src}". Make sure the file is created in the workspace or use a valid URL.`
              );
            }
          }
        }

        this.logger.debug({ filename }, 'Validated file paths and references');
      } catch (error) {
        errors.push(
          `[${filename}] Failed to validate file references: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }
}
