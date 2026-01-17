/**
 * API Client for Forge Backend
 *
 * Typed fetch wrapper for backend communication.
 * No fancy abstractions - just typed requests/responses.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ============================================================================
// TYPES
// ============================================================================

export type SessionStatus = 'READY' | 'STARTING' | 'BUILDING' | 'RUNNING' | 'FAILED' | 'TERMINATED';

export interface PreviewStartRequest {
  appRequestId: string;
}

export interface PreviewStartResponse {
  sessionId: string;
  message: string;
}

export interface PreviewStatusResponse {
  sessionId: string;
  status: SessionStatus;
  previewUrl: string | null;
  failureStage: string | null;
  failureOutput: string | null;
}

export interface PreviewTerminateResponse {
  message: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Start a preview session
   */
  async startPreview(appRequestId: string): Promise<PreviewStartResponse> {
    const response = await fetch(`${this.baseUrl}/api/preview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appRequestId }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.details || error.error || 'Failed to start preview');
    }

    return response.json();
  }

  /**
   * Get preview session status
   */
  async getPreviewStatus(sessionId: string): Promise<PreviewStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/preview/status/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.details || error.error || 'Failed to get preview status');
    }

    return response.json();
  }

  /**
   * Terminate a preview session
   */
  async terminatePreview(sessionId: string): Promise<PreviewTerminateResponse> {
    const response = await fetch(`${this.baseUrl}/api/preview/terminate/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.details || error.error || 'Failed to terminate preview');
    }

    return response.json();
  }

  /**
   * Get project export URL
   */
  getProjectExportUrl(projectId: string): string {
    return `${this.baseUrl}/api/projects/${projectId}/export.zip`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const api = new ApiClient();
