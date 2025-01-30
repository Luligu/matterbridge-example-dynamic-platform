/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Matterbridge, PlatformConfig, MatterbridgeEndpoint, onOffSwitch, bridgedNode, powerSource } from 'matterbridge';
import { AnsiLogger, LogLevel, TimestampFormat } from 'matterbridge/logger';
import { ServerNode, Endpoint, LogLevel as Level, LogFormat as Format } from 'matterbridge/matter';
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
import { jest } from '@jest/globals';

import { ExampleMatterbridgeDynamicPlatform } from './platform';

describe('TestPlatform', () => {
  let matterbridge: Matterbridge;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: Endpoint<AggregatorEndpoint>;
  let device: MatterbridgeEndpoint;
  let dynamicPlatform: ExampleMatterbridgeDynamicPlatform;

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
    matterbridgeVersion: '2.1.0',
    edge: true,
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
      // console.log('addBridgedEndpoint called for server', server.construction.status, 'aggregator', aggregator.construction.status);
      // console.log('addBridgedEndpoint called with plugin', pluginName, 'device', device.deviceName, 'status', device.construction.status);
      await aggregator.add(device);
    }),
    removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('removeBridgedEndpoint called');
    }),
    removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {
      // console.log('removeAllBridgedEndpoints called');
    }),
  } as unknown as Matterbridge;

  const mockConfig = {
    'name': 'matterbridge-example-dynamic-platform',
    'type': 'DynamicPlatform',
    'unregisterOnShutdown': false,
    'debug': true,
  } as PlatformConfig;

  /*
  // Spy on AnsiLogger.log
  const loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log');
  // Spy on console.log
  const consoleLogSpy = jest.spyOn(console, 'log');
  // Spy on console.debug
  const consoleDebugSpy = jest.spyOn(console, 'debug');
  // Spy on console.info
  const consoleInfoSpy = jest.spyOn(console, 'info');
  // Spy on console.warn
  const consoleWarnSpy = jest.spyOn(console, 'warn');
  // Spy on console.error
  const consoleErrorSpy = jest.spyOn(console, 'error');
  */

  // Spy on and mock AnsiLogger.log
  const loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {
    //
  });
  // Spy on and mock console.log
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
    //
  });
  // Spy on and mock console.debug
  const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation((...args: any[]) => {
    //
  });
  // Spy on and mock console.info
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation((...args: any[]) => {
    //
  });
  // Spy on and mock console.warn
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
    //
  });
  // Spy on and mock console.error
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
    //
  });

  beforeAll(async () => {
    // Create a MatterbridgeEdge instance
    matterbridge = await Matterbridge.loadInstance(false);
    matterbridge.log = new AnsiLogger({ logName: 'Matterbridge', logTimestampFormat: TimestampFormat.TIME_MILLIS, logLevel: LogLevel.DEBUG });

    // Setup matter environment
    matterbridge.environment.vars.set('log.level', Level.DEBUG);
    matterbridge.environment.vars.set('log.format', Format.ANSI);
    matterbridge.environment.vars.set('path.root', 'matterstorage');
    matterbridge.environment.vars.set('runtime.signals', false);
    matterbridge.environment.vars.set('runtime.exitcode', false);
    if (matterbridge.mdnsInterface) matterbridge.environment.vars.set('mdns.networkInterface', matterbridge.mdnsInterface);
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
    // console.log('Server: ', server.construction.status);
  });

  it('should create the aggregator', async () => {
    aggregator = await (matterbridge as any).createAggregatorNode(matterbridge.matterbridgeContext);
    expect(aggregator).toBeDefined();
    // console.log('Aggregator: ', aggregator.construction.status);
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
      'This plugin requires Matterbridge version >= "2.1.0". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '2.1.0';
  });

  it('should initialize platform with config name', () => {
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig);
    dynamicPlatform.version = '1.6.6';
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart with reason', async () => {
    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(23);
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
        // expect(mockLog.info).toHaveBeenCalledTimes(1);
        // expect(mockLog.info).toHaveBeenCalledWith('Command identify called identifyTime:5');
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
        device.setAttribute(WindowCoveringCluster.id, 'mode', { motorDirectionReversed: false, calibrationMode: false, maintenanceMode: false, ledFeedback: false });
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
        await device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Auto);

        await device.setAttribute(FanControlCluster.id, 'percentSetting', 50);
        await device.setAttribute(FanControlCluster.id, 'percentSetting', 10);
        await device.setAttribute(FanControlCluster.id, 'speedSetting', 50);
        await device.setAttribute(FanControlCluster.id, 'speedSetting', 10);
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

    jest.useFakeTimers();

    await dynamicPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');

    // Simulate multiple interval executions
    for (let i = 0; i < 200; i++) {
      jest.advanceTimersByTime(61 * 1000);
      await Promise.resolve();
    }

    jest.useRealTimers();

    expect(mockLog.info).toHaveBeenCalledTimes(1);
    expect(mockLog.error).toHaveBeenCalledTimes(0);
    expect(loggerLogSpy).toHaveBeenCalledTimes(4431);
  }, 300000);

  it('should call onShutdown with reason', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  });

  it('should call onShutdown with reason and remove the devices', async () => {
    mockConfig.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(1);
  });

  it('should stop the server', async () => {
    await (matterbridge as any).stopServerNode(server);
    expect(server.lifecycle.isOnline).toBe(false);
  });

  it('should stop the storage', async () => {
    await (matterbridge as any).stopMatterStorage();
    expect(matterbridge.matterStorageService).not.toBeDefined();
    expect(matterbridge.matterStorageManager).not.toBeDefined();
    expect(matterbridge.matterbridgeContext).not.toBeDefined();
  });
});
