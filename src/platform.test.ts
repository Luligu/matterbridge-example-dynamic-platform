/* eslint-disable jest/no-conditional-expect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ClusterServerObj,
  ColorControlCluster,
  DoorLockCluster,
  IdentifyCluster,
  LevelControlCluster,
  Matterbridge,
  ModeSelectCluster,
  OnOffCluster,
  PlatformConfig,
  WindowCovering,
  WindowCoveringCluster,
  ThermostatCluster,
  Thermostat,
  FanControl,
  FanControlCluster,
  MatterbridgeDevice,
  MatterbridgeEndpoint,
  DeviceTypeId,
} from 'matterbridge';
/*
import {
  AggregatorEndpoint as AggregatorNode,
  Endpoint as EndpointNode,
  ServerNode,
  LogLevel as MatterLogLevel,
  LogFormat as MatterLogFormat,
  MdnsService,
  MatterbridgeEdge,
  StorageContext,
} from 'matterbridge/matter';
*/
import { AnsiLogger, LogLevel } from 'matterbridge/logger';

import { jest } from '@jest/globals';

import { ExampleMatterbridgeDynamicPlatform } from './platform';

describe('TestPlatform', () => {
  let mockMatterbridge: Matterbridge;
  let mockLog: jest.Mocked<AnsiLogger>;
  let mockConfig: PlatformConfig;
  let dynamicPlatform: ExampleMatterbridgeDynamicPlatform;

  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let loggerLogSpy: jest.SpiedFunction<(level: LogLevel, message: string, ...parameters: any[]) => void>;

  /*
  let edge: MatterbridgeEdge;
  let context: StorageContext;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: EndpointNode<AggregatorNode>;
  */

  async function invokeCommands(cluster: ClusterServerObj, data?: Record<string, boolean | number | bigint | string | object | null | undefined>): Promise<void> {
    const commands = (cluster as any).commands as object;
    for (const [key, value] of Object.entries(commands)) {
      if (typeof value.handler === 'function') await value.handler(data ?? {});
    }
  }

  async function invokeCommand(cluster: ClusterServerObj, command: string, data?: Record<string, boolean | number | bigint | string | object | null | undefined>): Promise<void> {
    const commands = (cluster as any).commands as object;
    for (const [key, value] of Object.entries(commands)) {
      if (key === command && typeof value.handler === 'function') await value.handler(data ?? {});
    }
  }

  beforeAll(async () => {
    mockMatterbridge = {
      matterbridgeDirectory: '',
      matterbridgePluginDirectory: 'temp',
      systemInformation: { ipv4Address: undefined },
      matterbridgeVersion: '1.6.7',
      addBridgedDevice: jest.fn(async (pluginName: string, device: MatterbridgeDevice) => {
        // console.log('addBridgedDevice called');
      }),
      addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
        // console.log('addBridgedEndpoint called');
        // await aggregator.add(device);
      }),
      removeBridgedDevice: jest.fn(async (pluginName: string, device: MatterbridgeDevice) => {
        // console.log('removeBridgedDevice called');
      }),
      removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
        // console.log('removeBridgedEndpoint called');
      }),
      removeAllBridgedDevices: jest.fn(async (pluginName: string) => {
        // console.log('removeAllBridgedDevices called');
      }),
      removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {
        // console.log('removeAllBridgedEndpoints called');
      }),
    } as unknown as Matterbridge;

    mockLog = {
      fatal: jest.fn().mockImplementation((message: unknown) => {
        // console.log(`FATAL: ${message as string}`);
      }),
      error: jest.fn().mockImplementation((message: unknown) => {
        // console.log(`ERROR: ${message as string}`);
      }),
      warn: jest.fn().mockImplementation((message: unknown) => {
        // console.log(`WARN: ${message as string}`);
      }),
      notice: jest.fn().mockImplementation((message: unknown) => {
        // console.log(`NOTICE: ${message as string}`);
      }),
      info: jest.fn().mockImplementation((message: unknown) => {
        // console.log(`INFO: ${message as string}`);
      }),
      debug: jest.fn().mockImplementation((message: unknown) => {
        // console.log(`DEBUG: ${message as string}`);
      }),
    } as unknown as jest.Mocked<AnsiLogger>;

    mockConfig = {
      'name': 'matterbridge-example-dynamic-platform',
      'type': 'DynamicPlatform',
      'unregisterOnShutdown': false,
      'debug': false,
    } as PlatformConfig;

    // Spy on and mock the AnsiLogger.log method
    loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {
      // console.error(`Mocked AnsiLogger.log: ${level} - ${message}`, ...parameters);
    });

    // Spy on and mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      // console.error('Mocked console.log', args);
    });

    /*
    // Create a MatterbridgeEdge instance
    edge = await MatterbridgeEdge.loadInstance(false);
    edge.log = new AnsiLogger({ logName: 'Matterbridge', logTimestampFormat: TimestampFormat.TIME_MILLIS, logLevel: LogLevel.DEBUG });
    // Setup matter environment
    edge.environment.vars.set('log.level', MatterLogLevel.DEBUG);
    edge.environment.vars.set('log.format', MatterLogFormat.ANSI);
    edge.environment.vars.set('path.root', 'matterstorage');
    edge.environment.vars.set('runtime.signals', false);
    edge.environment.vars.set('runtime.exitcode', false);
    // Setup Matter mdnsInterface
    if ((edge as any).mdnsInterface) edge.environment.vars.set('mdns.networkInterface', (edge as any).mdnsInterface);
    await edge.startMatterStorage('test', 'Matterbridge');
    context = await edge.createServerNodeContext('Jest', bridge.name, DeviceTypeId(bridge.code), VendorId(0xfff1), 'Matterbridge', 0x8000, 'Matterbridge aggregator');
    server = await edge.createServerNode(context);
    aggregator = await edge.createAggregatorNode(context);
    await server.add(aggregator);
    await server.start();
    */
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    loggerLogSpy.mockRestore();
    consoleLogSpy.mockRestore();
    /*
    await server.close();
    await edge.environment.get(MdnsService)[Symbol.asyncDispose]();
    */
  });

  it('should throw error in load when version is not valid', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig)).toThrow(
      'This plugin requires Matterbridge version >= "1.6.7". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '1.6.7';
  });

  it('should initialize platform in edge mode with config name', () => {
    mockMatterbridge.edge = true;
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig);
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart in edge mode', async () => {
    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(mockMatterbridge.addBridgedDevice).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(23);
  }, 60000);

  it('should call onConfigure in edge mode', async () => {
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
    expect(mockLog.info).toHaveBeenCalledTimes(1);
    expect(mockLog.error).toHaveBeenCalledTimes(202);
    expect(loggerLogSpy).toHaveBeenCalledTimes(3073);

    jest.useRealTimers();
  });

  it('should call onShutdown in edge mode', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedDevice).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedDevices).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  });

  it('should call onShutdown in edge mode and remove all endpoints', async () => {
    mockConfig.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedDevice).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedDevices).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(1);
    mockMatterbridge.edge = false;
    mockConfig.unregisterOnShutdown = false;
  });

  it('should initialize platform with config name', () => {
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig);
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart with reason', async () => {
    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(mockMatterbridge.addBridgedDevice).toHaveBeenCalledTimes(23);
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should execute the commandHandlers', async () => {
    // Invoke command handlers
    for (const [key, device] of Array.from(dynamicPlatform.bridgedDevices)) {
      const identify = device.getClusterServer(IdentifyCluster);
      expect(identify).toBeDefined();
      if (identify) await invokeCommands(identify as unknown as ClusterServerObj);

      if (device.hasClusterServer(OnOffCluster)) {
        const onOff = device.getClusterServer(OnOffCluster);
        expect(onOff).toBeDefined();
        if (onOff) await invokeCommands(onOff as unknown as ClusterServerObj);
      }

      if (device.hasClusterServer(ModeSelectCluster)) {
        const modeSelect = device.getClusterServer(ModeSelectCluster);
        expect(modeSelect).toBeDefined();
        if (modeSelect) await invokeCommands(modeSelect as unknown as ClusterServerObj);
      }

      if (device.hasClusterServer(LevelControlCluster)) {
        const levelControl = device.getClusterServer(LevelControlCluster);
        expect(levelControl).toBeDefined();
        if (levelControl) await invokeCommands(levelControl as unknown as ClusterServerObj, { level: 100 });
      }

      if (device.hasClusterServer(ColorControlCluster)) {
        const colorControl = device.getClusterServer(ColorControlCluster);
        expect(colorControl).toBeDefined();
        if (colorControl) await invokeCommands(colorControl as unknown as ClusterServerObj, { hue: 50, saturation: 100, colorX: 0.5, colorY: 0.5, colorTemperatureMireds: 3000 });
      }

      if (device.hasClusterServer(WindowCoveringCluster.with(WindowCovering.Feature.Lift, WindowCovering.Feature.PositionAwareLift))) {
        const windowCovering = device.getClusterServer(WindowCoveringCluster.with(WindowCovering.Feature.Lift, WindowCovering.Feature.PositionAwareLift));
        expect(windowCovering).toBeDefined();
        if (windowCovering) {
          await invokeCommands(windowCovering as unknown as ClusterServerObj, { liftPercent100thsValue: 5000 });
          device.setAttribute(WindowCoveringCluster.id, 'mode', { motorDirectionReversed: false, calibrationMode: false, maintenanceMode: false, ledFeedback: false });
        }
      }

      if (device.hasClusterServer(DoorLockCluster)) {
        const windowCovering = device.getClusterServer(DoorLockCluster);
        expect(windowCovering).toBeDefined();
        if (windowCovering) await invokeCommands(windowCovering as unknown as ClusterServerObj);
      }

      if (device.hasClusterServer(FanControlCluster)) {
        const fan = device.getClusterServer(FanControlCluster);
        expect(fan).toBeDefined();
        if (fan) {
          await invokeCommands(fan as unknown as ClusterServerObj);
          device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Off);
          device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Low);
          device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Medium);
          device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.High);
          device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.On);
          device.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Auto);

          device.setAttribute(FanControlCluster.id, 'percentSetting', 50);
          device.setAttribute(FanControlCluster.id, 'speedSetting', 50);
        }
      }

      if (device.hasClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode))) {
        const windowCovering = device.getClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode));
        expect(windowCovering).toBeDefined();
        if (windowCovering) {
          await invokeCommands(windowCovering as unknown as ClusterServerObj, { mode: Thermostat.SetpointRaiseLowerMode.Both, amount: 10 });
          device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Cool);
          device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Heat);
          device.setAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', 2400);
          device.setAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', 1800);
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
    expect(mockLog.info).toHaveBeenCalledTimes(390);
    expect(mockLog.error).toHaveBeenCalledTimes(0);
    expect(loggerLogSpy).toHaveBeenCalledTimes(13420);

    jest.useRealTimers();
  }, 300000);

  it('should call onShutdown with reason', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedDevice).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedDevices).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  });

  it('should call onShutdown with reason and remove the devices', async () => {
    mockConfig.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedDevice).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedDevices).toHaveBeenCalledTimes(1);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  });
});
