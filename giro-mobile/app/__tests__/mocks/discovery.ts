/**
 * Discovery Mock
 * Mock implementation for mDNS service discovery
 */

import type { DiscoveredDesktop } from '@/types/connection';
import { EventEmitter } from 'events';
import { createDiscoveredDesktop } from '../factories';

export class MockZeroconf extends EventEmitter {
  private isScanning = false;
  private mockDesktops: DiscoveredDesktop[] = [];

  constructor() {
    super();
    // Default mock desktop
    this.mockDesktops = [createDiscoveredDesktop()];
  }

  scan(_type: string = '_giro._tcp', _protocol: string = 'local.'): void {
    this.isScanning = true;
    this.emit('start');

    // Simulate finding desktops after a short delay
    setTimeout(() => {
      this.mockDesktops.forEach((desktop) => {
        this.emit('resolved', {
          name: desktop.name,
          host: desktop.ip,
          port: desktop.port,
          txt: {
            storeName: (desktop as any).storeName || desktop.name,
            version: desktop.version,
          },
        });
      });
    }, 100);
  }

  stop(): void {
    this.isScanning = false;
    this.emit('stop');
  }

  // Test helpers
  setMockDesktops(desktops: DiscoveredDesktop[]): void {
    this.mockDesktops = desktops;
  }

  addMockDesktop(desktop: DiscoveredDesktop): void {
    this.mockDesktops.push(desktop);
  }

  clearMockDesktops(): void {
    this.mockDesktops = [];
  }

  simulateDesktopFound(desktop: DiscoveredDesktop): void {
    this.emit('resolved', {
      name: desktop.name,
      host: desktop.ip,
      port: desktop.port,
      txt: {
        storeName: (desktop as any).storeName || desktop.name,
        version: desktop.version,
      },
    });
  }

  simulateDesktopLost(name: string): void {
    this.emit('removed', name);
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  getIsScanning(): boolean {
    return this.isScanning;
  }
}

export function createMockZeroconf(): MockZeroconf {
  return new MockZeroconf();
}

// Export a singleton for tests that need to share the mock
let sharedMock: MockZeroconf | null = null;

export function getSharedMockZeroconf(): MockZeroconf {
  if (!sharedMock) {
    sharedMock = createMockZeroconf();
  }
  return sharedMock;
}

export function resetSharedMockZeroconf(): void {
  sharedMock = null;
}
