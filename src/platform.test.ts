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
  DoorLock,
  ThermostatCluster,
  Thermostat,
  FanControl,
  FanControlCluster,
  MatterbridgeDevice,
  MatterbridgeEndpoint,
} from 'matterbridge';
import { AnsiLogger, LogLevel } from 'matterbridge/logger';
import { ExampleMatterbridgeDynamicPlatform } from './platform';
import { jest } from '@jest/globals';
import { wait } from 'matterbridge/utils';

describe('TestPlatform', () => {
  let mockMatterbridge: Matterbridge;
  let mockLog: AnsiLogger;
  let mockConfig: PlatformConfig;
  let testPlatform: ExampleMatterbridgeDynamicPlatform;

  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let loggerLogSpy: jest.SpiedFunction<(level: LogLevel, message: string, ...parameters: any[]) => void>;

  // const log = new AnsiLogger({ logName: 'shellyDeviceTest', logTimestampFormat: TimestampFormat.TIME_MILLIS, logDebug: true });

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

  beforeAll(() => {
    mockMatterbridge = {
      addBridgedDevice: jest.fn(async (pluginName: string, device: MatterbridgeDevice) => {
        // console.error('addBridgedDevice called');
      }),
      addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
        device.number = 100;
        // console.error('addBridgedEndpoint called');
      }),
      matterbridgeDirectory: '',
      matterbridgePluginDirectory: 'temp',
      systemInformation: { ipv4Address: undefined },
      matterbridgeVersion: '1.6.2',
      removeAllBridgedDevices: jest.fn(),
    } as unknown as Matterbridge;
    mockLog = { fatal: jest.fn(), error: jest.fn(), warn: jest.fn(), notice: jest.fn(), info: jest.fn(), debug: jest.fn() } as unknown as AnsiLogger;
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    loggerLogSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should throw error in load when version is not valid', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig)).toThrow(
      'This plugin requires Matterbridge version >= "1.6.2". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '1.6.2';
  });

  it('should initialize platform with config name', () => {
    testPlatform = new ExampleMatterbridgeDynamicPlatform(mockMatterbridge, mockLog, mockConfig);
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart in edge mode', async () => {
    mockMatterbridge.edge = true;
    await testPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
  }, 60000);

  it('should call onConfigure in edge mode', async () => {
    jest.useFakeTimers();

    await testPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');

    jest.advanceTimersByTime(60 * 1000);
    jest.useRealTimers();
  });

  it('should call onShutdown  in edge mode', async () => {
    await testPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    mockMatterbridge.edge = false;
  });

  it('should call onStart with reason', async () => {
    await testPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
  }, 60000);

  it('should execute the commandHandlers', async () => {
    // Invoke command handlers
    for (const [key, device] of Array.from(testPlatform.bridgedDevices)) {
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
    jest.useFakeTimers();

    await testPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');

    // Simulate multiple interval executions
    for (let i = 0; i < 200; i++) {
      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();
    }

    jest.useRealTimers();
  }, 60000);

  it('should call onShutdown with reason', async () => {
    await testPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });
});
