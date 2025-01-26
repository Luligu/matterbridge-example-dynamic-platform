/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
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
  MatterbridgeEndpoint,
} from 'matterbridge';

import { AnsiLogger, LogLevel } from 'matterbridge/logger';

import { jest } from '@jest/globals';

import { ExampleMatterbridgeDynamicPlatform } from './platform';

describe('TestPlatform', () => {
  let dynamicPlatform: ExampleMatterbridgeDynamicPlatform;

  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let loggerLogSpy: jest.SpiedFunction<(level: LogLevel, message: string, ...parameters: any[]) => void>;

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
    'name': 'matterbridge-example-dynamic-platform',
    'type': 'DynamicPlatform',
    'unregisterOnShutdown': false,
    'debug': false,
  } as PlatformConfig;

  beforeAll(async () => {
    // Spy on and mock the AnsiLogger.log method
    loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {
      // console.error(`Mocked AnsiLogger.log: ${level} - ${message}`, ...parameters);
    });

    // Spy on and mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      // console.error('Mocked console.log', args);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    loggerLogSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should throw error in load when version is not valid', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig)).toThrow(
      'This plugin requires Matterbridge version >= "2.1.0". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '2.1.0';
  });

  it('should initialize platform in edge mode with config name', () => {
    mockMatterbridge.edge = true;
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig);
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart in edge mode', async () => {
    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
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
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  });

  it('should call onShutdown in edge mode and remove all endpoints', async () => {
    mockConfig.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
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
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(23);
  }, 60000);

  // eslint-disable-next-line jest/no-commented-out-tests
  /*
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
*/

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
    expect(mockLog.info).toHaveBeenCalledTimes(1);
    expect(mockLog.error).toHaveBeenCalledTimes(202);
    expect(loggerLogSpy).toHaveBeenCalledTimes(3073);

    jest.useRealTimers();
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
});
