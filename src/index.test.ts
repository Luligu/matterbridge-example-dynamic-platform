import path from 'node:path';
import { rmSync } from 'node:fs';

import { Matterbridge, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { jest } from '@jest/globals';

import initializePlugin from './index.ts';
import { ExampleMatterbridgeDynamicPlatform } from './platform.ts';

// Cleanup the matter environment
try {
  rmSync(path.join('jest', 'index'), { recursive: true, force: true });
} catch (error) {
  //
}

describe('initializePlugin', () => {
  const mockLog = {
    fatal: jest.fn((message: string, ...parameters: any[]) => {}),
    error: jest.fn((message: string, ...parameters: any[]) => {}),
    warn: jest.fn((message: string, ...parameters: any[]) => {}),
    notice: jest.fn((message: string, ...parameters: any[]) => {}),
    info: jest.fn((message: string, ...parameters: any[]) => {}),
    debug: jest.fn((message: string, ...parameters: any[]) => {}),
  } as unknown as AnsiLogger;

  const mockMatterbridge = {
    homeDirectory: path.join('jest', 'index'),
    matterbridgeDirectory: path.join('jest', 'index', '.matterbridge'),
    matterbridgePluginDirectory: path.join('jest', 'index', 'Matterbridge'),
    systemInformation: { ipv4Address: undefined, ipv6Address: undefined, osRelease: 'xx.xx.xx.xx.xx.xx', nodeVersion: '22.1.10' },
    matterbridgeVersion: '3.1.2',
    enableConcentrationMeasurements: true,
    enableRVC: true,
    log: mockLog,
    getDevices: jest.fn(() => {
      return [];
    }),
    getPlugins: jest.fn(() => {
      return [];
    }),
    addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {}),
    removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {}),
    removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {}),
  } as unknown as Matterbridge;

  const mockConfig = {
    name: 'matterbridge-example-dynamic-platform',
    type: 'DynamicPlatform',
    whiteList: [],
    blackList: [],
    useInterval: true,
    debug: true,
    unregisterOnShutdown: false,
  } as PlatformConfig;

  it('should return an instance of TestPlatform', async () => {
    const result = initializePlugin(mockMatterbridge, mockLog, mockConfig);
    expect(result).toBeInstanceOf(ExampleMatterbridgeDynamicPlatform);
    await result.onShutdown();
  });
});
