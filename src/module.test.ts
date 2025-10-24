const MATTER_PORT = 6000;
const NAME = 'Platform';
const HOMEDIR = path.join('jest', NAME);

process.argv = ['node', 'platform.test.js', '-novirtual', '-frontend', '0', '-homedir', HOMEDIR, '-port', MATTER_PORT.toString()];

import path from 'node:path';

import { jest } from '@jest/globals';
import { Matterbridge, MatterbridgeEndpoint, onOffSwitch, bridgedNode, powerSource, invokeSubscribeHandler } from 'matterbridge';
import { AnsiLogger, LogLevel, TimestampFormat } from 'matterbridge/logger';
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

import initializePlugin, { DynamicPlatformConfig, ExampleMatterbridgeDynamicPlatform } from './module.js';
import {
  consoleErrorSpy,
  loggerLogSpy,
  setupTest,
  createTestEnvironment,
  createMatterbridgeEnvironment,
  setDebug,
  startMatterbridgeEnvironment,
  stopMatterbridgeEnvironment,
  flushAsync,
} from './jestHelpers.js';

// Setup the test environment
setupTest(NAME, false);

describe('TestPlatform', () => {
  let matterbridge: Matterbridge;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: Endpoint<AggregatorEndpoint>;
  let device: MatterbridgeEndpoint;
  let dynamicPlatform: ExampleMatterbridgeDynamicPlatform;
  let log: AnsiLogger;

  const config: DynamicPlatformConfig = {
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

  beforeAll(async () => {
    matterbridge = await createMatterbridgeEnvironment(NAME);
    [server, aggregator] = await startMatterbridgeEnvironment(matterbridge, MATTER_PORT);
    log = new AnsiLogger({ logName: NAME, logTimestampFormat: TimestampFormat.TIME_MILLIS, logLevel: LogLevel.DEBUG });
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  it('should initialize matterbridge environment', async () => {
    // setDebug(true);
    matterbridge = await createMatterbridgeEnvironment(HOMEDIR);
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
  });

  it('should start matterbridge environment', async () => {
    [server, aggregator] = await startMatterbridgeEnvironment(matterbridge);
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(ServerNode);
    expect(aggregator).toBeDefined();
    expect(aggregator).toBeInstanceOf(Endpoint);
    // setDebug(false);
  }, 60000);

  it('should add a device to the aggregator', async () => {
    device = new MatterbridgeEndpoint([onOffSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Device' }, true);
    device.createDefaultBridgedDeviceBasicInformationClusterServer('Switch', '0x23452164', 0xfff1, 'Matterbridge', 'Matterbridge Switch');
    device.addRequiredClusterServers();
    expect(await aggregator.add(device)).toBeDefined();
  });

  it('should return an instance of the platform', async () => {
    dynamicPlatform = initializePlugin(mockMatterbridge, mockLog, config);
    expect(dynamicPlatform).toBeInstanceOf(ExampleMatterbridgeDynamicPlatform);
    await dynamicPlatform.onShutdown();
  });

  it('should throw error in load when version is not valid', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.3.0". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '3.3.0';
  });

  it('should initialize platform with config name and set the default config', () => {
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, config);
    dynamicPlatform.version = '1.6.6';
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', config.name);
    expect(config.whiteList).toEqual([]);
    expect(config.blackList).toEqual([]);
    expect(config.useInterval).toBe(true);
    expect(config.enableServerRvc).toBe(true);
  });

  it('should initialize platform with config name', () => {
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, config);
    dynamicPlatform.version = '1.6.6';
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', config.name);
  });

  it('should call onStart without reason and add no devices', async () => {
    config.whiteList = ['No devices'];
    config.blackList = [];
    await dynamicPlatform.onStart();
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'none');
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(0);
  });

  it('should call onShutdown with reason and cleanup the interval', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  });

  it('should call onStart with reason and add all the devices', async () => {
    config.whiteList = [];
    config.blackList = [];
    dynamicPlatform.version = '';

    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(58);
  });

  it('should start the server', async () => {
    // @ts-expect-error - access to private member for testing
    await matterbridge.startServerNode(server);
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
        if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (AutoOccupancy)') {
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Off);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Heat);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Cool);
        }
        if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (AutoOccupancy)' || device.deviceName === 'Thermostat (Heat)') {
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Off);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Heat);
          await device.setAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', 2800);
          await device.setAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', 2700);
        }
        if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (AutoOccupancy)' || device.deviceName === 'Thermostat (Cool)') {
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Off);
          await device.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Cool);
          await device.setAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', 1500);
          await device.setAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', 1400);
        }
        if (device.deviceName === 'Thermostat (AutoOccupancy)') {
          await device.setAttribute(ThermostatCluster.id, 'unoccupiedHeatingSetpoint', 2800);
          await device.setAttribute(ThermostatCluster.id, 'unoccupiedHeatingSetpoint', 2700);
          await device.setAttribute(ThermostatCluster.id, 'unoccupiedCoolingSetpoint', 1500);
          await device.setAttribute(ThermostatCluster.id, 'unoccupiedCoolingSetpoint', 1400);
        }
        await invokeSubscribeHandler(device, 'Thermostat', 'systemMode', Thermostat.SystemMode.Off, Thermostat.SystemMode.Off);
        await invokeSubscribeHandler(device, 'Thermostat', 'occupiedHeatingSetpoint', 2800, 2700);
        await invokeSubscribeHandler(device, 'Thermostat', 'occupiedCoolingSetpoint', 1500, 1400);
        await invokeSubscribeHandler(device, 'Thermostat', 'unoccupiedHeatingSetpoint', 2000, 1900);
        await invokeSubscribeHandler(device, 'Thermostat', 'unoccupiedCoolingSetpoint', 2000, 1900);
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

    await flushAsync(undefined, undefined, 500);

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
  });

  it('should call onShutdown with reason and remove the devices', async () => {
    config.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(1);
  });

  it('should stop matterbridge environment', async () => {
    await flushAsync();
    // setDebug(true);
    await stopMatterbridgeEnvironment(matterbridge, server, aggregator);
    expect(server.lifecycle.isOnline).toBe(false);
    // setDebug(false);
  }, 60000);
});
