/**
 * FRAMEWORK ASSEMBLY LAYER - NEXT.JS PACK
 *
 * THIS IS NOT AN AGENT. THIS IS A DETERMINISTIC MANUFACTURING JIG.
 *
 * Purpose:
 * - Takes Forge Implementer filesystem output
 * - Validates required files exist
 * - Injects Next.js base scaffold (app router, layout.tsx, page.tsx)
 * - Mounts generated files deterministically
 * - Wires routes and layouts
 * - Produces manifest with framework metadata
 * - Fails loudly on any violations
 *
 * Philosophy:
 * - No thinking, no decisions, no improvements, no fixes
 * - If something is missing → FAIL
 * - If something is invalid → FAIL
 * - 100% deterministic, 0% intelligence
 * - No LLM usage at runtime
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, basename, extname } from 'path';
import { createHash } from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ForgeImplementerOutput {
  appRequestId: string;
  executionLogId: string;
  executionLogHash: string;
  workspaceDir: string;
  filesCreated: string[];
  filesModified: string[];
  timestamp: string;
}

export interface NextJsManifest {
  manifestId: string;
  appRequestId: string;
  executionLogHash: string; // Hash-chain reference
  frameworkVersion: string;
  frameworkType: 'nextjs-app-router';
  outputDir: string;
  baseScaffold: {
    appDir: string;
    layoutPath: string;
    rootPagePath: string;
    publicDir: string;
  };
  mountedFiles: MountedFile[];
  routes: Route[];
  buildCommands: {
    install: string;
    dev: string;
    build: string;
    start: string;
  };
  manifestHash: string;
  createdAt: string;
}

export interface MountedFile {
  sourcePath: string; // Relative to workspace
  mountPath: string;  // Relative to Next.js project root
  fileType: 'component' | 'page' | 'layout' | 'api' | 'lib' | 'style' | 'config' | 'other';
  determinedBy: string; // Rule that determined the mount location
}

export interface Route {
  path: string;        // e.g., "/dashboard"
  filePath: string;    // e.g., "app/dashboard/page.tsx"
  routeType: 'page' | 'api' | 'layout';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// ASSEMBLY JIG
// ============================================================================

export class FrameworkAssemblyNextJs {
  private readonly NEXTJS_VERSION = '14.2.0'; // Pin to specific version
  private readonly FRAMEWORK_TYPE = 'nextjs-app-router';

  /**
   * Main assembly entry point.
   * Takes Forge Implementer output, validates it, and produces a runnable Next.js app.
   *
   * DETERMINISTIC: Same input always produces same output.
   * FAIL-LOUD: Any violation throws immediately.
   */
  async assemble(input: ForgeImplementerOutput): Promise<NextJsManifest> {
    // PHASE 1: Validate input
    this.validateInput(input);

    // PHASE 2: Create base scaffold
    const outputDir = join(input.workspaceDir, 'nextjs-app');
    const baseScaffold = this.createBaseScaffold(outputDir);

    // PHASE 3: Mount generated files deterministically
    const mountedFiles = this.mountGeneratedFiles(input, outputDir);

    // PHASE 4: Discover and wire routes
    const routes = this.discoverRoutes(outputDir);

    // PHASE 5: Generate manifest
    const manifest = this.generateManifest(
      input,
      outputDir,
      baseScaffold,
      mountedFiles,
      routes
    );

    // PHASE 6: Write manifest to disk
    this.writeManifest(manifest, outputDir);

    return manifest;
  }

  // ==========================================================================
  // PHASE 1: INPUT VALIDATION
  // ==========================================================================

  private validateInput(input: ForgeImplementerOutput): void {
    const errors: string[] = [];

    // Check required fields
    if (!input.appRequestId) errors.push('Missing appRequestId');
    if (!input.executionLogId) errors.push('Missing executionLogId');
    if (!input.executionLogHash) errors.push('Missing executionLogHash');
    if (!input.workspaceDir) errors.push('Missing workspaceDir');
    if (!input.filesCreated) errors.push('Missing filesCreated array');
    if (!input.timestamp) errors.push('Missing timestamp');

    // Check workspace exists
    if (!existsSync(input.workspaceDir)) {
      errors.push(`Workspace directory does not exist: ${input.workspaceDir}`);
    }

    // Check all declared files actually exist
    const allFiles = [...(input.filesCreated || []), ...(input.filesModified || [])];
    for (const file of allFiles) {
      const fullPath = join(input.workspaceDir, file);
      if (!existsSync(fullPath)) {
        errors.push(`Declared file does not exist: ${file}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `ASSEMBLY VALIDATION FAILED:\n${errors.map(e => `  - ${e}`).join('\n')}`
      );
    }
  }

  // ==========================================================================
  // PHASE 2: BASE SCAFFOLD CREATION
  // ==========================================================================

  private createBaseScaffold(outputDir: string): NextJsManifest['baseScaffold'] {
    // Create directory structure
    const appDir = join(outputDir, 'app');
    const publicDir = join(outputDir, 'public');

    mkdirSync(appDir, { recursive: true });
    mkdirSync(publicDir, { recursive: true });

    // Create root layout.tsx
    const layoutPath = join(appDir, 'layout.tsx');
    const layoutContent = this.generateRootLayout();
    writeFileSync(layoutPath, layoutContent, 'utf-8');

    // Create root page.tsx
    const rootPagePath = join(appDir, 'page.tsx');
    const rootPageContent = this.generateRootPage();
    writeFileSync(rootPagePath, rootPageContent, 'utf-8');

    // Create package.json
    const packageJsonPath = join(outputDir, 'package.json');
    const packageJson = this.generatePackageJson();
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

    // Create next.config.js
    const nextConfigPath = join(outputDir, 'next.config.js');
    const nextConfig = this.generateNextConfig();
    writeFileSync(nextConfigPath, nextConfig, 'utf-8');

    // Create tsconfig.json
    const tsconfigPath = join(outputDir, 'tsconfig.json');
    const tsconfig = this.generateTsConfig();
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf-8');

    // Create .gitignore
    const gitignorePath = join(outputDir, '.gitignore');
    const gitignore = this.generateGitignore();
    writeFileSync(gitignorePath, gitignore, 'utf-8');

    return {
      appDir: relative(outputDir, appDir),
      layoutPath: relative(outputDir, layoutPath),
      rootPagePath: relative(outputDir, rootPagePath),
      publicDir: relative(outputDir, publicDir),
    };
  }

  private generateRootLayout(): string {
    return `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forge Generated App',
  description: 'Generated by Forge Constitutional Assembly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`;
  }

  private generateRootPage(): string {
    return `export default function Home() {
  return (
    <main>
      <h1>Forge Generated Application</h1>
      <p>This application was generated by Forge Constitutional Assembly.</p>
    </main>
  )
}
`;
  }

  private generatePackageJson() {
    return {
      name: 'forge-generated-app',
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        next: `^${this.NEXTJS_VERSION}`,
      },
      devDependencies: {
        '@types/node': '^20',
        '@types/react': '^18',
        '@types/react-dom': '^18',
        typescript: '^5',
        eslint: '^8',
        'eslint-config-next': `${this.NEXTJS_VERSION}`,
      },
    };
  }

  private generateNextConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
`;
  }

  private generateTsConfig() {
    return {
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [
          {
            name: 'next',
          },
        ],
        paths: {
          '@/*': ['./*'],
        },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    };
  }

  private generateGitignore(): string {
    return `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;
  }

  // ==========================================================================
  // PHASE 3: MOUNT GENERATED FILES
  // ==========================================================================

  private mountGeneratedFiles(
    input: ForgeImplementerOutput,
    outputDir: string
  ): MountedFile[] {
    const mountedFiles: MountedFile[] = [];
    const allFiles = [...input.filesCreated, ...(input.filesModified || [])];

    for (const file of allFiles) {
      const sourcePath = join(input.workspaceDir, file);
      const mountInfo = this.determineMountLocation(file);
      const mountPath = join(outputDir, mountInfo.mountPath);

      // Create parent directory if needed
      mkdirSync(dirname(mountPath), { recursive: true });

      // Copy file to mount location
      const content = readFileSync(sourcePath, 'utf-8');
      writeFileSync(mountPath, content, 'utf-8');

      mountedFiles.push({
        sourcePath: file,
        mountPath: relative(outputDir, mountPath),
        fileType: mountInfo.fileType,
        determinedBy: mountInfo.rule,
      });
    }

    // Sort for determinism
    mountedFiles.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

    return mountedFiles;
  }

  /**
   * Deterministically determine where a file should be mounted in the Next.js project.
   * Rules are evaluated in order - first match wins.
   */
  private determineMountLocation(filePath: string): {
    mountPath: string;
    fileType: MountedFile['fileType'];
    rule: string;
  } {
    const ext = extname(filePath);
    const fileName = basename(filePath);
    const dirName = dirname(filePath);

    // Rule 1: Files explicitly in "app" directory → mount to app/
    if (dirName.startsWith('app/') || dirName === 'app') {
      return {
        mountPath: filePath,
        fileType: this.inferFileType(filePath),
        rule: 'RULE_1_APP_DIR',
      };
    }

    // Rule 2: Files named "page.tsx" or "page.js" → treat as page
    if (fileName === 'page.tsx' || fileName === 'page.js') {
      return {
        mountPath: join('app', filePath),
        fileType: 'page',
        rule: 'RULE_2_PAGE_FILE',
      };
    }

    // Rule 3: Files named "layout.tsx" or "layout.js" → treat as layout
    if (fileName === 'layout.tsx' || fileName === 'layout.js') {
      return {
        mountPath: join('app', filePath),
        fileType: 'layout',
        rule: 'RULE_3_LAYOUT_FILE',
      };
    }

    // Rule 4: Files in "components" directory → mount to components/
    if (dirName.startsWith('components/') || dirName === 'components') {
      return {
        mountPath: filePath,
        fileType: 'component',
        rule: 'RULE_4_COMPONENTS_DIR',
      };
    }

    // Rule 5: Files in "lib" directory → mount to lib/
    if (dirName.startsWith('lib/') || dirName === 'lib') {
      return {
        mountPath: filePath,
        fileType: 'lib',
        rule: 'RULE_5_LIB_DIR',
      };
    }

    // Rule 6: Files in "styles" directory or .css files → mount to styles/
    if (
      dirName.startsWith('styles/') ||
      dirName === 'styles' ||
      ext === '.css' ||
      ext === '.scss'
    ) {
      return {
        mountPath: dirName.startsWith('styles/') ? filePath : join('styles', fileName),
        fileType: 'style',
        rule: 'RULE_6_STYLES',
      };
    }

    // Rule 7: Files in "api" directory or route handlers → mount to app/api/
    if (dirName.startsWith('api/') || dirName === 'api' || fileName === 'route.ts') {
      return {
        mountPath: join('app', filePath),
        fileType: 'api',
        rule: 'RULE_7_API_ROUTES',
      };
    }

    // Rule 8: Config files (next.config.js, etc.) → mount to root
    if (
      fileName === 'next.config.js' ||
      fileName === 'next.config.mjs' ||
      fileName === 'middleware.ts' ||
      fileName === 'middleware.js'
    ) {
      return {
        mountPath: fileName,
        fileType: 'config',
        rule: 'RULE_8_CONFIG_FILES',
      };
    }

    // Rule 9: TypeScript/JavaScript files → default to lib/
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      return {
        mountPath: join('lib', filePath),
        fileType: 'lib',
        rule: 'RULE_9_DEFAULT_CODE',
      };
    }

    // Rule 10: Everything else → mount as-is
    return {
      mountPath: filePath,
      fileType: 'other',
      rule: 'RULE_10_PASSTHROUGH',
    };
  }

  private inferFileType(filePath: string): MountedFile['fileType'] {
    const fileName = basename(filePath);
    const ext = extname(filePath);

    if (fileName === 'page.tsx' || fileName === 'page.js') return 'page';
    if (fileName === 'layout.tsx' || fileName === 'layout.js') return 'layout';
    if (fileName === 'route.ts' || fileName === 'route.js') return 'api';
    if (ext === '.css' || ext === '.scss') return 'style';
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/lib/')) return 'lib';
    if (fileName.startsWith('next.config') || fileName === 'middleware.ts')
      return 'config';

    return 'other';
  }

  // ==========================================================================
  // PHASE 4: ROUTE DISCOVERY
  // ==========================================================================

  private discoverRoutes(outputDir: string): Route[] {
    const routes: Route[] = [];
    const appDir = join(outputDir, 'app');

    if (!existsSync(appDir)) {
      return routes;
    }

    this.scanDirectory(appDir, appDir, routes);

    // Sort for determinism
    routes.sort((a, b) => a.path.localeCompare(b.path));

    return routes;
  }

  private scanDirectory(baseDir: string, currentDir: string, routes: Route[]): void {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        this.scanDirectory(baseDir, fullPath, routes);
      } else if (stat.isFile()) {
        const fileName = basename(fullPath);

        // Detect pages
        if (fileName === 'page.tsx' || fileName === 'page.js') {
          const routePath = this.pathToRoute(baseDir, dirname(fullPath));
          routes.push({
            path: routePath,
            filePath: relative(dirname(baseDir), fullPath),
            routeType: 'page',
          });
        }

        // Detect API routes
        if (fileName === 'route.ts' || fileName === 'route.js') {
          const routePath = this.pathToRoute(baseDir, dirname(fullPath));
          routes.push({
            path: routePath,
            filePath: relative(dirname(baseDir), fullPath),
            routeType: 'api',
          });
        }

        // Detect layouts
        if (fileName === 'layout.tsx' || fileName === 'layout.js') {
          const routePath = this.pathToRoute(baseDir, dirname(fullPath));
          routes.push({
            path: routePath,
            filePath: relative(dirname(baseDir), fullPath),
            routeType: 'layout',
          });
        }
      }
    }
  }

  private pathToRoute(baseDir: string, fullPath: string): string {
    const rel = relative(baseDir, fullPath);
    if (rel === '' || rel === '.') return '/';

    return '/' + rel.replace(/\\/g, '/');
  }

  // ==========================================================================
  // PHASE 5: MANIFEST GENERATION
  // ==========================================================================

  private generateManifest(
    input: ForgeImplementerOutput,
    outputDir: string,
    baseScaffold: NextJsManifest['baseScaffold'],
    mountedFiles: MountedFile[],
    routes: Route[]
  ): NextJsManifest {
    const manifest: Omit<NextJsManifest, 'manifestHash'> = {
      manifestId: `manifest-${Date.now()}`,
      appRequestId: input.appRequestId,
      executionLogHash: input.executionLogHash,
      frameworkVersion: this.NEXTJS_VERSION,
      frameworkType: this.FRAMEWORK_TYPE,
      outputDir,
      baseScaffold,
      mountedFiles,
      routes,
      buildCommands: {
        install: 'npm install',
        dev: 'npm run dev',
        build: 'npm run build',
        start: 'npm run start',
      },
      createdAt: new Date().toISOString(),
    };

    // Compute deterministic hash (exclude manifestId)
    const manifestHash = this.computeManifestHash(manifest);

    return {
      ...manifest,
      manifestHash,
    };
  }

  private computeManifestHash(manifest: Omit<NextJsManifest, 'manifestHash'>): string {
    // Serialize deterministically (exclude manifestId and createdAt)
    const serialized = JSON.stringify(
      {
        appRequestId: manifest.appRequestId,
        executionLogHash: manifest.executionLogHash,
        frameworkVersion: manifest.frameworkVersion,
        frameworkType: manifest.frameworkType,
        baseScaffold: manifest.baseScaffold,
        mountedFiles: manifest.mountedFiles,
        routes: manifest.routes,
        buildCommands: manifest.buildCommands,
      },
      null,
      2
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  // ==========================================================================
  // PHASE 6: MANIFEST PERSISTENCE
  // ==========================================================================

  private writeManifest(manifest: NextJsManifest, outputDir: string): void {
    const manifestPath = join(outputDir, 'forge-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  // ==========================================================================
  // VALIDATION UTILITIES
  // ==========================================================================

  /**
   * Validate that the assembled Next.js app is structurally correct.
   * Does NOT run builds or tests - only checks file presence and structure.
   */
  validateAssembly(outputDir: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required files exist
    const requiredFiles = [
      'package.json',
      'next.config.js',
      'tsconfig.json',
      'app/layout.tsx',
      'app/page.tsx',
    ];

    for (const file of requiredFiles) {
      const filePath = join(outputDir, file);
      if (!existsSync(filePath)) {
        errors.push(`Required file missing: ${file}`);
      }
    }

    // Check package.json is valid JSON
    try {
      const packageJsonPath = join(outputDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        const content = readFileSync(packageJsonPath, 'utf-8');
        JSON.parse(content);
      }
    } catch (err: any) {
      errors.push(`package.json is invalid JSON: ${err.message}`);
    }

    // Check tsconfig.json is valid JSON
    try {
      const tsconfigPath = join(outputDir, 'tsconfig.json');
      if (existsSync(tsconfigPath)) {
        const content = readFileSync(tsconfigPath, 'utf-8');
        JSON.parse(content);
      }
    } catch (err: any) {
      errors.push(`tsconfig.json is invalid JSON: ${err.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
