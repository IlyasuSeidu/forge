/**
 * PORT ALLOCATOR
 *
 * Deterministic port allocation to prevent conflicts.
 * Range: 10000-20000 (10,000 ports available)
 *
 * NO intelligence, NO optimization, simple allocation tracking.
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

export class PortAllocator {
  private allocatedPorts = new Set<number>();
  private readonly MIN_PORT = 10000;
  private readonly MAX_PORT = 20000;

  /**
   * Allocate a port from the available range.
   * Returns first available port found.
   *
   * NO INTELLIGENCE - linear search only.
   */
  allocate(): number {
    for (let port = this.MIN_PORT; port <= this.MAX_PORT; port++) {
      if (!this.allocatedPorts.has(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new Error(
      `PORT ALLOCATION FAILED: No available ports in range ${this.MIN_PORT}-${this.MAX_PORT}`
    );
  }

  /**
   * Release a previously allocated port.
   * Idempotent - releasing an unallocated port is a no-op.
   */
  release(port: number): void {
    this.allocatedPorts.delete(port);
  }

  /**
   * Check if a port is currently allocated.
   */
  isAllocated(port: number): boolean {
    return this.allocatedPorts.has(port);
  }

  /**
   * Get count of currently allocated ports.
   */
  getAllocatedCount(): number {
    return this.allocatedPorts.size;
  }

  /**
   * Get total available ports.
   */
  getAvailableCount(): number {
    return this.MAX_PORT - this.MIN_PORT + 1 - this.allocatedPorts.size;
  }
}
