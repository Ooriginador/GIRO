declare module 'react-native-zeroconf' {
  export default class Zeroconf {
    constructor();
    scan(type?: string, protocol?: string, domain?: string): void;
    stop(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    removeDeviceListeners(): void;
    getServices(): any;
    addDeviceListeners(): void;
    // Add other methods as needed
  }
}
