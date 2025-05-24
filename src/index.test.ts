/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Matterbridge, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { ExampleMatterbridgeDynamicPlatform } from './platform.js';
import initializePlugin from './index';
import { jest } from '@jest/globals';

describe('initializePlugin', () => {
  const mockLog = {
    fatal: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.fatal', message, parameters);
    }),
    error: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.error', message, parameters);
    }),
    warn: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.warn', message, parameters);
    }),
    notice: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.notice', message, parameters);
    }),
    info: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.info', message, parameters);
    }),
    debug: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.debug', message, parameters);
    }),
  } as unknown as AnsiLogger;

  const mockMatterbridge = {
    matterbridgeDirectory: './jest/matterbridge',
    matterbridgePluginDirectory: './jest/plugins',
    systemInformation: { ipv4Address: undefined, ipv6Address: undefined, osRelease: 'xx.xx.xx.xx.xx.xx', nodeVersion: '22.1.10' },
    matterbridgeVersion: '3.0.4',
    enableConcentrationMeasurements: true,
    enableRVC: true,
    log: mockLog,
    getDevices: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    getPlugins: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('addBridgedEndpoint called');
    }),
    removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('removeBridgedEndpoint called');
    }),
    removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {
      // console.log('removeAllBridgedEndpoints called');
    }),
  } as unknown as Matterbridge;

  const mockConfig = {
    name: 'matterbridge-example-dynamic-platform',
    type: 'DynamicPlatform',
    whiteList: [],
    blackList: [],
    useInterval: true,
    enableConcentrationMeasurements: true,
    debug: true,
    unregisterOnShutdown: false,
  } as PlatformConfig;

  it('should return an instance of TestPlatform', async () => {
    const result = initializePlugin(mockMatterbridge, mockLog, mockConfig);
    expect(result).toBeInstanceOf(ExampleMatterbridgeDynamicPlatform);
    await result.onShutdown();
  });
});
