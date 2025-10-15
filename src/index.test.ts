const MATTER_PORT = 6001;
const NAME = 'Index';
const HOMEDIR = path.join('jest', NAME);

process.argv = ['node', 'index.test.js', '-novirtual', '-frontend', '0', '-homedir', HOMEDIR, '-port', MATTER_PORT.toString()];

import path from 'node:path';

import { Matterbridge, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { jest } from '@jest/globals';

import initializePlugin from './index.ts';
import { DynamicPlatformConfig, ExampleMatterbridgeDynamicPlatform } from './platform.ts';
import { setupTest } from './jestHelpers.ts';

// Setup the test environment
setupTest(NAME, false);

describe('initializePlugin', () => {
  let dynamicPlatform: ExampleMatterbridgeDynamicPlatform;

  const mockLog = {
    fatal: jest.fn((message: string, ...parameters: any[]) => {}),
    error: jest.fn((message: string, ...parameters: any[]) => {}),
    warn: jest.fn((message: string, ...parameters: any[]) => {}),
    notice: jest.fn((message: string, ...parameters: any[]) => {}),
    info: jest.fn((message: string, ...parameters: any[]) => {}),
    debug: jest.fn((message: string, ...parameters: any[]) => {}),
  } as unknown as AnsiLogger;

  const mockMatterbridge = {
    homeDirectory: path.join(HOMEDIR),
    rootDirectory: path.join(HOMEDIR),
    matterbridgeDirectory: path.join(HOMEDIR, '.matterbridge'),
    matterbridgePluginDirectory: path.join(HOMEDIR, 'Matterbridge'),
    matterbridgeCertDirectory: path.join(HOMEDIR, '.mattercert'),
    systemInformation: { ipv4Address: undefined, ipv6Address: undefined, osRelease: 'xx.xx.xx.xx.xx.xx', nodeVersion: '22.1.10' },
    matterbridgeVersion: '3.3.0',
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

  const mockConfig: DynamicPlatformConfig = {
    name: 'matterbridge-example-dynamic-platform',
    type: 'DynamicPlatform',
    version: '1.0.0',
    whiteList: [],
    blackList: [],
    useInterval: true,
    enableServerRvc: true,
    debug: true,
    unregisterOnShutdown: false,
  };

  it('should return an instance of the platform', async () => {
    dynamicPlatform = initializePlugin(mockMatterbridge, mockLog, mockConfig);
    expect(dynamicPlatform).toBeInstanceOf(ExampleMatterbridgeDynamicPlatform);
    await dynamicPlatform.onShutdown();
  });

  it('should shutdown the platform', async () => {
    expect(dynamicPlatform).toBeInstanceOf(ExampleMatterbridgeDynamicPlatform);
    await expect(dynamicPlatform.onShutdown('Jest test')).resolves.not.toThrow();
  });
});
