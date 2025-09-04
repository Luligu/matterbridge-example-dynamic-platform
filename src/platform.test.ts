const MATTER_PORT = 6002;
const NAME = 'Platform';
const HOMEDIR = path.join('jest', NAME);

process.argv = ['node', 'platform.test.js', '-novirtual', '-frontend', '0', '-homedir', HOMEDIR, '-port', MATTER_PORT.toString()];

import path from 'node:path';
import { rmSync } from 'node:fs';

import { jest } from '@jest/globals';
import { Matterbridge, PlatformConfig, MatterbridgeEndpoint, onOffSwitch, bridgedNode, powerSource, invokeSubscribeHandler } from 'matterbridge';
import { AnsiLogger, LogLevel } from 'matterbridge/logger';
import { ServerNode, Endpoint, LogLevel as Level, LogFormat as Format, MdnsService } from 'matterbridge/matter';
import { AggregatorEndpoint } from 'matterbridge/matter/endpoints';
import {
  ColorControlCluster,
  DoorLockCluster,
  FanControl,
  FanControlCluster,
  IdentifyCluster,
  LevelControlCluster,
  ModeSelectCluster,
  OnOffCluster,
  Thermostat,
  ThermostatCluster,
  WindowCovering,
  WindowCoveringCluster,
} from 'matterbridge/matter/clusters';

import { ExampleMatterbridgeDynamicPlatform } from './platform.ts';

let loggerLogSpy: jest.SpiedFunction<typeof AnsiLogger.prototype.log>;
let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
let consoleDebugSpy: jest.SpiedFunction<typeof console.log>;
let consoleInfoSpy: jest.SpiedFunction<typeof console.log>;
let consoleWarnSpy: jest.SpiedFunction<typeof console.log>;
let consoleErrorSpy: jest.SpiedFunction<typeof console.log>;
const debug = false; // Set to true to enable debug logs

if (!debug) {
  loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {});
  consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation((...args: any[]) => {});
  consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation((...args: any[]) => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {});
} else {
  loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log');
  consoleLogSpy = jest.spyOn(console, 'log');
  consoleDebugSpy = jest.spyOn(console, 'debug');
  consoleInfoSpy = jest.spyOn(console, 'info');
  consoleWarnSpy = jest.spyOn(console, 'warn');
  consoleErrorSpy = jest.spyOn(console, 'error');
}

// Cleanup the test environment
rmSync(HOMEDIR, { recursive: true, force: true });

describe('TestPlatform', () => {
  let matterbridge: Matterbridge;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: Endpoint<AggregatorEndpoint>;
  let device: MatterbridgeEndpoint;
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
    matterbridgeVersion: '3.2.6',
    log: mockLog,
    getDevices: jest.fn(() => {
      return [];
    }),
    getPlugins: jest.fn(() => {
      return [];
    }),
    addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      await aggregator.add(device);
    }),
    removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {}),
    removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {}),
  } as unknown as Matterbridge;

  const mockConfig = {
    name: 'matterbridge-example-dynamic-platform',
    type: 'DynamicPlatform',
    whiteList: [],
    blackList: [],
    useInterval: true,
    enableServerRvc: true,
    debug: true,
    unregisterOnShutdown: false,
  } as PlatformConfig;

  beforeAll(async () => {
    // Create a MatterbridgeEdge instance
    matterbridge = await Matterbridge.loadInstance(false);
    matterbridge.rootDirectory = path.join(HOMEDIR);
    matterbridge.homeDirectory = path.join(HOMEDIR);
    matterbridge.matterbridgeDirectory = path.join(HOMEDIR, '.matterbridge');
    matterbridge.matterbridgePluginDirectory = path.join(HOMEDIR, 'Matterbridge');
    matterbridge.matterbridgeCertDirectory = path.join(HOMEDIR, '.mattercert');

    // Setup matter environment
    matterbridge.environment.vars.set('log.level', Level.NOTICE);
    matterbridge.environment.vars.set('log.format', Format.ANSI);
    matterbridge.environment.vars.set('path.root', path.join(HOMEDIR, '.matterbridge', 'matterstorage'));
    matterbridge.environment.vars.set('runtime.signals', false);
    matterbridge.environment.vars.set('runtime.exitcode', false);
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Close the Matterbridge instance
    await matterbridge.destroyInstance();

    // Restore all mocks
    jest.restoreAllMocks();
  });

  it('should initialize matterbridge', () => {
    expect(matterbridge).toBeDefined();
  });

  it('should create the context', async () => {
    await (matterbridge as any).startMatterStorage();
    expect(matterbridge.matterStorageService).toBeDefined();
    expect(matterbridge.matterStorageManager).toBeDefined();
    expect(matterbridge.matterbridgeContext).toBeDefined();
  });

  it('should create the server', async () => {
    server = await (matterbridge as any).createServerNode(matterbridge.matterbridgeContext);
    expect(server).toBeDefined();
  });

  it('should create the aggregator', async () => {
    aggregator = await (matterbridge as any).createAggregatorNode(matterbridge.matterbridgeContext);
    expect(aggregator).toBeDefined();
  });

  it('should add the aggregator to the server', async () => {
    expect(await server.add(aggregator)).toBeDefined();
  });

  it('should add a device to the aggregator to the server', async () => {
    device = new MatterbridgeEndpoint([onOffSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Device' }, true);
    device.createDefaultBridgedDeviceBasicInformationClusterServer('Switch', '0x23452164', 0xfff1, 'Matterbridge', 'Matterbridge Switch');
    device.addRequiredClusterServers();
    expect(await aggregator.add(device)).toBeDefined();
  });

  it('should throw error in load when version is not valid', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig)).toThrow(
      'This plugin requires Matterbridge version >= "3.2.6". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '3.2.6';
  });

  it('should initialize platform with config name and set the default config', () => {
    mockConfig.whiteList = undefined;
    mockConfig.blackList = undefined;
    mockConfig.enableRVC = undefined;
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig);
    dynamicPlatform.version = '1.6.6';
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
    expect(mockConfig.whiteList).toEqual([]);
    expect(mockConfig.blackList).toEqual([]);
    expect(mockConfig.enableRVC).toBe(undefined);
    expect(mockConfig.enableServerRvc).toBe(true);
    mockConfig.whiteList = [];
    mockConfig.blackList = [];
    mockConfig.enableRVC = true;
  });

  it('should initialize platform with config name', () => {
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig);
    dynamicPlatform.version = '1.6.6';
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart without reason and add no devices', async () => {
    mockConfig.whiteList = ['No devices'];
    mockConfig.blackList = [];
    await dynamicPlatform.onStart();
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'none');
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should call onShutdown with reason and cleanup the interval', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should call onStart with reason and add all the devices', async () => {
    mockConfig.whiteList = [];
    mockConfig.blackList = [];
    dynamicPlatform.version = '';

    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(56);
  }, 60000);

  it('should start the server', async () => {
    await (matterbridge as any).startServerNode(server);
    expect(server.lifecycle.isOnline).toBe(true);
  });

  it('should execute the commandHandlers', async () => {
    // Invoke command handlers
    for (const [key, device] of Array.from(dynamicPlatform.bridgedDevices)) {
      expect(device).toBeDefined();

      if (device.hasClusterServer(IdentifyCluster)) {
        jest.clearAllMocks();
        await device.executeCommandHandler('identify', { identifyTime: 5 });
        await device.executeCommandHandler('triggerEffect', { effectIdentifier: 0, effectVariant: 0 });
      }

      if (device.hasClusterServer(OnOffCluster)) {
        await device.executeCommandHandler('on');
        await device.executeCommandHandler('off');
        await device.executeCommandHandler('toggle');
      }

      if (device.hasClusterServer(ModeSelectCluster)) {
        await device.executeCommandHandler('changeToMode', { mode: 1 });
      }

      if (device.hasClusterServer(LevelControlCluster)) {
        await device.executeCommandHandler('moveToLevel', { level: 1 });
        await device.executeCommandHandler('moveToLevelWithOnOff', { level: 1 });
      }

      if (device.hasClusterServer(ColorControlCluster)) {
        await device.executeCommandHandler('moveToColor', { hue: 50, saturation: 100, colorX: 0.5, colorY: 0.5, colorTemperatureMireds: 300 });
        await device.executeCommandHandler('moveToHue', { hue: 50, saturation: 100, colorX: 0.5, colorY: 0.5, colorTemperatureMireds: 300 });
        await device.executeCommandHandler('moveToSaturation', { hue: 50, saturation: 100, colorX: 0.5, colorY: 0.5, colorTemperatureMireds: 300 });
        await device.executeCommandHandler('moveToHueAndSaturation', { hue: 50, saturation: 100, colorX: 0.5, colorY: 0.5, colorTemperatureMireds: 300 });
        await device.executeCommandHandler('moveToColorTemperature', { hue: 50, saturation: 100, colorX: 0.5, colorY: 0.5, colorTemperatureMireds: 300 });
      }

      if (device.hasClusterServer(WindowCoveringCluster.with(WindowCovering.Feature.Lift, WindowCovering.Feature.PositionAwareLift))) {
        await device.executeCommandHandler('upOrOpen');
        await device.executeCommandHandler('downOrClose');
        await device.executeCommandHandler('stopMotion');
        await device.executeCommandHandler('goToLiftPercentage', { liftPercent100thsValue: 5000 });
        if (device.deviceName === 'Cover lift and tilt') {
          await device.executeCommandHandler('goToTiltPercentage', { tiltPercent100thsValue: 5000 });
        }
      }

      if (device.hasClusterServer(DoorLockCluster)) {
        await device.executeCommandHandler('lockDoor');
        await device.executeCommandHandler('unlockDoor');
      }

      if (device.hasClusterServer(FanControlCluster)) {
        await device.executeCommandHandler('step', { direction: FanControl.StepDirection.Increase });
        await device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Off);
        await device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Low);
        await device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Medium);
        await device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.High);
        await device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.On);
        if (device.deviceName === 'Fan auto') {
          await device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Auto);
        }

        await device.setAttribute(FanControlCluster.id, 'percentSetting', 50);
        await device.setAttribute(FanControlCluster.id, 'percentSetting', 10);

        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Off, FanControl.FanMode.Off);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Low, FanControl.FanMode.Low);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Medium, FanControl.FanMode.Medium);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.High, FanControl.FanMode.High);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.On, FanControl.FanMode.On);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Auto, FanControl.FanMode.Auto);
        await invokeSubscribeHandler(device, 'fanControl', 'percentSetting', 30, 30);
        await invokeSubscribeHandler(device, 'fanControl', 'rockSetting', {}, {});
        await invokeSubscribeHandler(device, 'fanControl', 'windSetting', {}, {});
        await invokeSubscribeHandler(device, 'fanControl', 'airflowDirection', {}, {});
      }

      if (device.hasClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode))) {
        await device.executeCommandHandler('setpointRaiseLower', { mode: Thermostat.SetpointRaiseLowerMode.Both, amount: 100 });
        if (device.deviceName === 'Thermostat (AutoMode)') {
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Off);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Heat);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Cool);
        }
        if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (Heat)') {
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Off);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Heat);
          await device.setAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', 2800);
          await device.setAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', 2700);
        }
        if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (Cool)') {
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Off);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Cool);
          await device.setAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', 1500);
          await device.setAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', 1400);
        }
      }
    }
  });

  it('should call onConfigure', async () => {
    expect(mockLog.info).toHaveBeenCalledTimes(0);
    expect(loggerLogSpy).toHaveBeenCalledTimes(0);

    consoleErrorSpy.mockRestore();

    jest.useFakeTimers();

    await dynamicPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');

    // Simulate multiple interval executions
    for (let i = 0; i < 100; i++) {
      // Flush microtasks
      for (let i = 0; i < 5; i++) await Promise.resolve();

      // jest.advanceTimersByTime(60 * 1000);
      // Jest advanceTimersByTime Async
      await jest.advanceTimersByTimeAsync(60 * 1000);

      // Flush microtasks
      for (let i = 0; i < 5; i++) await Promise.resolve();
    }

    jest.useRealTimers();

    expect(mockLog.info).toHaveBeenCalledWith('Appliances animation phase 0');
    expect(mockLog.info).toHaveBeenCalledWith('Appliances animation phase 10');

    expect(mockLog.info).toHaveBeenCalled(); // Times(1003);
    expect(mockLog.warn).toHaveBeenCalledTimes(0);
    expect(mockLog.error).toHaveBeenCalledTimes(0);
    expect(loggerLogSpy).toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.SinglePress'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.DoublePress'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.LongPress'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.Press'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.Release'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Set lock lockState to Unlocked'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Set lock lockState to Locked'));
  }, 60000);

  it('should call onShutdown with reason', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should call onShutdown with reason and remove the devices', async () => {
    mockConfig.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(1);
  }, 60000);

  it('should stop the server', async () => {
    await server.close();
    expect(server.lifecycle.isOnline).toBe(false);
    await server.env.get(MdnsService)[Symbol.asyncDispose]();
  }, 60000);

  it('should stop the storage', async () => {
    await (matterbridge as any).stopMatterStorage();
    expect(matterbridge.matterStorageService).not.toBeDefined();
    expect(matterbridge.matterStorageManager).not.toBeDefined();
    expect(matterbridge.matterbridgeContext).not.toBeDefined();
  });
});
