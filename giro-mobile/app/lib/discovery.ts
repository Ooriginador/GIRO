/**
 * Service Discovery via mDNS/Zeroconf
 * Encontra o GIRO Desktop na rede local
 */

import type { DiscoveredDesktop, DiscoveryOptions } from '@/types/connection';
import Zeroconf from 'react-native-zeroconf';

const DEFAULT_SERVICE_TYPE = '_giro._tcp.';
const DEFAULT_DOMAIN = 'local.';
const DEFAULT_TIMEOUT = 10000; // 10 segundos

type DiscoveryEventCallback = (desktop: DiscoveredDesktop) => void;
type DiscoveryErrorCallback = (error: Error) => void;

class DiscoveryService {
  private zeroconf: Zeroconf;
  private isScanning: boolean = false;
  private discoveredDesktops: Map<string, DiscoveredDesktop> = new Map();
  private onFoundCallbacks: Set<DiscoveryEventCallback> = new Set();
  private onLostCallbacks: Set<DiscoveryEventCallback> = new Set();
  private onErrorCallbacks: Set<DiscoveryErrorCallback> = new Set();

  constructor() {
    this.zeroconf = new Zeroconf();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.zeroconf.on('resolved', (service) => {
      const desktop = this.serviceToDesktop(service);
      if (desktop) {
        this.discoveredDesktops.set(desktop.id, desktop);
        this.notifyFound(desktop);
      }
    });

    this.zeroconf.on('remove', (serviceName) => {
      const desktop = this.discoveredDesktops.get(serviceName);
      if (desktop) {
        this.discoveredDesktops.delete(serviceName);
        this.notifyLost(desktop);
      }
    });

    this.zeroconf.on('error', (error) => {
      this.notifyError(new Error(error?.message || 'Discovery error'));
    });

    this.zeroconf.on('start', () => {
      this.isScanning = true;
    });

    this.zeroconf.on('stop', () => {
      this.isScanning = false;
    });
  }

  private serviceToDesktop(service: any): DiscoveredDesktop | null {
    if (!service || !service.addresses || service.addresses.length === 0) {
      return null;
    }

    // Preferir IPv4 sobre IPv6
    const ipv4 = service.addresses.find((addr: string) => !addr.includes(':'));
    const ip = ipv4 || service.addresses[0];

    return {
      id: service.name,
      name: service.name,
      host: service.host || service.name,
      ip,
      port: service.port || 3847,
      version: service.txt?.version,
      lastSeen: Date.now(),
    };
  }

  private notifyFound(desktop: DiscoveredDesktop): void {
    this.onFoundCallbacks.forEach((callback) => {
      try {
        callback(desktop);
      } catch (error) {
        console.error('Error in onFound callback:', error);
      }
    });
  }

  private notifyLost(desktop: DiscoveredDesktop): void {
    this.onLostCallbacks.forEach((callback) => {
      try {
        callback(desktop);
      } catch (error) {
        console.error('Error in onLost callback:', error);
      }
    });
  }

  private notifyError(error: Error): void {
    this.onErrorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (e) {
        console.error('Error in onError callback:', e);
      }
    });
  }

  /**
   * Inicia a busca por desktops na rede
   */
  async startDiscovery(options: DiscoveryOptions = {}): Promise<void> {
    if (this.isScanning) {
      return;
    }

    const serviceType = options.serviceType || DEFAULT_SERVICE_TYPE;

    try {
      this.zeroconf.scan(serviceType, 'tcp', DEFAULT_DOMAIN);
    } catch (error) {
      this.notifyError(error as Error);
      throw error;
    }
  }

  /**
   * Para a busca
   */
  stopDiscovery(): void {
    if (this.isScanning) {
      this.zeroconf.stop();
    }
  }

  /**
   * Busca com timeout e retorna desktops encontrados
   */
  async discover(options: DiscoveryOptions = {}): Promise<DiscoveredDesktop[]> {
    const timeout = options.timeout || DEFAULT_TIMEOUT;

    this.discoveredDesktops.clear();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.stopDiscovery();
        resolve(Array.from(this.discoveredDesktops.values()));
      }, timeout);

      const errorHandler = (error: Error) => {
        clearTimeout(timeoutId);
        this.stopDiscovery();
        this.offError(errorHandler);
        reject(error);
      };

      this.onError(errorHandler);

      this.startDiscovery(options).catch((error) => {
        clearTimeout(timeoutId);
        this.offError(errorHandler);
        reject(error);
      });
    });
  }

  /**
   * Retorna desktops atualmente descobertos
   */
  getDiscoveredDesktops(): DiscoveredDesktop[] {
    return Array.from(this.discoveredDesktops.values());
  }

  /**
   * Registra callback para quando um desktop é encontrado
   */
  onFound(callback: DiscoveryEventCallback): void {
    this.onFoundCallbacks.add(callback);
  }

  /**
   * Remove callback de desktop encontrado
   */
  offFound(callback: DiscoveryEventCallback): void {
    this.onFoundCallbacks.delete(callback);
  }

  /**
   * Registra callback para quando um desktop é perdido
   */
  onLost(callback: DiscoveryEventCallback): void {
    this.onLostCallbacks.add(callback);
  }

  /**
   * Remove callback de desktop perdido
   */
  offLost(callback: DiscoveryEventCallback): void {
    this.onLostCallbacks.delete(callback);
  }

  /**
   * Registra callback para erros
   */
  onError(callback: DiscoveryErrorCallback): void {
    this.onErrorCallbacks.add(callback);
  }

  /**
   * Remove callback de erro
   */
  offError(callback: DiscoveryErrorCallback): void {
    this.onErrorCallbacks.delete(callback);
  }

  /**
   * Limpa todos os recursos
   */
  destroy(): void {
    this.stopDiscovery();
    this.onFoundCallbacks.clear();
    this.onLostCallbacks.clear();
    this.onErrorCallbacks.clear();
    this.discoveredDesktops.clear();
  }
}

// Singleton instance
export const discoveryService = new DiscoveryService();

export { DiscoveryService };
