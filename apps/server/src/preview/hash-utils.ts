/**
 * HASH UTILITIES
 *
 * Deterministic hash computation for Preview Runtime.
 *
 * Constitutional constraints:
 * - Hashes exclude non-deterministic data (timestamps, UUIDs, ports)
 * - Same inputs → same hash (always)
 * - SHA-256 only
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import { createHash } from 'crypto';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import type { SessionStatus } from './preview-runtime-types';

export interface SessionHashInput {
  appRequestId: string;
  framework: string;
  frameworkVersion: string;
  manifestHash: string;
  workspaceHash: string;
  status: SessionStatus;
  failureStage: string | null;
  failureOutput: string | null;

  // EXCLUDED (non-deterministic):
  // - sessionId (UUID)
  // - containerId (Docker-generated)
  // - port (dynamically allocated)
  // - previewUrl (includes port)
  // - startedAt, runningAt, terminatedAt (timestamps)
}

/**
 * Compute deterministic session hash.
 * Excludes all non-deterministic fields.
 */
export function computeSessionHash(input: SessionHashInput): string {
  // Stable serialization (sorted keys)
  const serialized = JSON.stringify(
    {
      appRequestId: input.appRequestId,
      framework: input.framework,
      frameworkVersion: input.frameworkVersion,
      manifestHash: input.manifestHash,
      workspaceHash: input.workspaceHash,
      status: input.status,
      failureStage: input.failureStage,
      failureOutput: input.failureOutput,
    },
    Object.keys(input).sort()
  );

  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Compute SHA-256 hash of directory contents.
 * Includes all files, sorted by path for determinism.
 */
export function computeDirectoryHash(dirPath: string): string {
  const files = getAllFilesRecursive(dirPath);

  // Sort files for determinism
  files.sort();

  // Hash file paths and contents
  const hash = createHash('sha256');

  for (const file of files) {
    const relativePath = file.replace(dirPath, '');
    const content = readFileSync(file);

    hash.update(relativePath);
    hash.update(content);
  }

  return hash.digest('hex');
}

/**
 * Get all files in directory recursively.
 */
function getAllFilesRecursive(dirPath: string): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    const entries = readdirSync(currentPath);

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and .next directories
        if (entry === 'node_modules' || entry === '.next' || entry === '.git') {
          continue;
        }
        traverse(fullPath);
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  }

  traverse(dirPath);
  return files;
}
