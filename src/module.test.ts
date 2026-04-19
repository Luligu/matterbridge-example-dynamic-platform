const NAME = 'Platform';
const MATTER_PORT = 6000;
const MATTER_CREATE_ONLY = true;
const HOMEDIR = path.join('jest', NAME);

process.argv = ['node', 'platform.test.js', '-novirtual', '-frontend', '0', '-homedir', HOMEDIR, '-port', MATTER_PORT.toString()];

import path from 'node:path';

import { jest } from '@jest/globals';
import { featuresFor, invokeSubscribeHandler, MatterbridgeEndpoint } from 'matterbridge';
import {
  addBridgedEndpointMatterbridgeSpy,
  addMatterbridgePlatform,
  createMatterbridgeEnvironment,
  destroyMatterbridgeEnvironment,
  flushAsync,
  loggerInfoSpy,
  loggerLogSpy,
  logKeepAlives,
  matterbridge,
  removeAllBridgedEndpointsMatterbridgeSpy,
  removeBridgedEndpointMatterbridgeSpy,
  setDebug,
  setupTest,
  startMatterbridgeEnvironment,
  stopMatterbridgeEnvironment,
} from 'matterbridge/jestutils';
import { AnsiLogger, LogLevel, TimestampFormat } from 'matterbridge/logger';
import { ColorControl, DoorLock, FanControl, Identify, KeypadInput, LevelControl, ModeSelect, OnOff, Thermostat } from 'matterbridge/matter/clusters';

import initializePlugin, { DynamicPlatformConfig, ExampleMatterbridgeDynamicPlatform } from './module.js';

// Setup the test environment
setupTest(NAME, false);

describe('TestPlatform', () => {
  let device: MatterbridgeEndpoint;
  let dynamicPlatform: ExampleMatterbridgeDynamicPlatform;
  const log = new AnsiLogger({ logName: NAME, logTimestampFormat: TimestampFormat.TIME_MILLIS, logLevel: LogLevel.DEBUG });

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
    await createMatterbridgeEnvironment();
    await startMatterbridgeEnvironment(MATTER_PORT, MATTER_CREATE_ONLY);
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await stopMatterbridgeEnvironment(MATTER_CREATE_ONLY);
    await destroyMatterbridgeEnvironment(undefined, undefined, !MATTER_CREATE_ONLY);
    // Restore all mocks
    jest.restoreAllMocks();
    // logKeepAlives();
  });

  it('should return an instance of the platform', async () => {
    dynamicPlatform = initializePlugin(matterbridge, log, config);
    expect(dynamicPlatform).toBeInstanceOf(ExampleMatterbridgeDynamicPlatform);
    await dynamicPlatform.onShutdown();
  });

  it('should throw error in load when version is not valid', () => {
    const savedVersion = matterbridge.matterbridgeVersion;
    matterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new ExampleMatterbridgeDynamicPlatform(matterbridge, log, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.7.2". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    matterbridge.matterbridgeVersion = savedVersion;
  });

  it('should initialize platform with config name and set the default config', () => {
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(matterbridge, log, config);
    addMatterbridgePlatform(dynamicPlatform);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Initializing platform:', config.name);
    expect(config.whiteList).toEqual([]);
    expect(config.blackList).toEqual([]);
    expect(config.useInterval).toBe(true);
    expect(config.enableServerRvc).toBe(true);
  });

  it('should call onShutdown with reason and remove the devices', async () => {
    config.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onShutdown called with reason:', 'Test reason');
    expect(removeBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeAllBridgedEndpointsMatterbridgeSpy).toHaveBeenCalledTimes(1);
    expect(removeBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeAllBridgedEndpointsMatterbridgeSpy).toHaveBeenCalledTimes(1);
    config.unregisterOnShutdown = false;
  });

  it('should initialize platform with config name', () => {
    dynamicPlatform = new ExampleMatterbridgeDynamicPlatform(matterbridge, log, config);
    addMatterbridgePlatform(dynamicPlatform);
    dynamicPlatform.version = '1.6.6';
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Initializing platform:', config.name);
  });

  it('should call onStart without reason and add no devices', async () => {
    config.whiteList = ['No devices'];
    config.blackList = [];
    await dynamicPlatform.onStart();
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onStart called with reason:', 'none');
    expect(addBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(addBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
  });

  it('should call onShutdown with reason and cleanup the interval', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onShutdown called with reason:', 'Test reason');
    expect(removeBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeAllBridgedEndpointsMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeAllBridgedEndpointsMatterbridgeSpy).toHaveBeenCalledTimes(0);
  });

  it('should call onStart with reason and add all the devices', async () => {
    config.whiteList = [];
    config.blackList = [];
    dynamicPlatform.version = '';

    await dynamicPlatform.onStart('Test reason');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onStart called with reason:', 'Test reason');
    expect(addBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(70);
    expect(addBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(70);
    expect(loggerLogSpy).toHaveBeenCalled();
    expect(loggerLogSpy).not.toHaveBeenCalledWith(LogLevel.WARN, expect.anything());
    expect(loggerLogSpy).not.toHaveBeenCalledWith(LogLevel.ERROR, expect.anything());
    expect(loggerLogSpy).not.toHaveBeenCalledWith(LogLevel.FATAL, expect.anything());
  });

  it('should execute the commandHandlers', async () => {
    await flushAsync();
    expect(dynamicPlatform.getDevices()).toHaveLength(70);
    // Invoke command handlers
    for (const device of dynamicPlatform.getDevices()) {
      expect(device).toBeDefined();

      if (device.hasClusterServer(Identify.Cluster)) {
        jest.clearAllMocks();
        await device.invokeBehaviorCommand(Identify.Cluster, 'identify', { identifyTime: 5 });
        await device.invokeBehaviorCommand(Identify.Cluster, 'triggerEffect', { effectIdentifier: 0, effectVariant: 0 });
      }

      if (device.hasClusterServer(OnOff.Cluster)) {
        const onOffFeatures = featuresFor(device, OnOff.Cluster);

        if (!onOffFeatures.offOnly && !onOffFeatures.deadFrontBehavior) {
          await device.invokeBehaviorCommand(OnOff.Cluster, 'on');
          await device.invokeBehaviorCommand(OnOff.Cluster, 'toggle');
        }
        if (!onOffFeatures.deadFrontBehavior) {
          await device.invokeBehaviorCommand(OnOff.Cluster, 'off');
        }
      }

      if (device.hasClusterServer(ModeSelect.Cluster)) {
        await device.invokeBehaviorCommand(ModeSelect.Cluster, 'changeToMode', { newMode: 1 });
      }

      if (device.hasClusterServer(LevelControl.Cluster)) {
        await device.invokeBehaviorCommand(LevelControl.Cluster, 'moveToLevel', {
          level: 1,
          transitionTime: 0,
          optionsMask: { executeIfOff: false },
          optionsOverride: { executeIfOff: false },
        });
        await device.invokeBehaviorCommand(LevelControl.Cluster, 'moveToLevelWithOnOff', {
          level: 1,
          transitionTime: 0,
          optionsMask: { executeIfOff: false },
          optionsOverride: { executeIfOff: false },
        });
      }

      if (device.hasClusterServer(ColorControl.Cluster)) {
        const colorControlFeatures = featuresFor(device, ColorControl.Cluster);

        if (colorControlFeatures.xy) {
          await device.invokeBehaviorCommand(ColorControl.Cluster.with(ColorControl.Feature.Xy), 'moveToColor', {
            colorX: 50,
            colorY: 100,
            transitionTime: 0,
            optionsMask: { executeIfOff: false },
            optionsOverride: { executeIfOff: false },
          });
        }
        if (colorControlFeatures.hueSaturation) {
          await device.invokeBehaviorCommand(ColorControl.Cluster.with(ColorControl.Feature.HueSaturation), 'moveToHue', {
            hue: 50,
            direction: ColorControl.Direction.Shortest,
            transitionTime: 0,
            optionsMask: { executeIfOff: false },
            optionsOverride: { executeIfOff: false },
          });
          await device.invokeBehaviorCommand(ColorControl.Cluster.with(ColorControl.Feature.HueSaturation), 'moveToSaturation', {
            saturation: 100,
            transitionTime: 0,
            optionsMask: { executeIfOff: false },
            optionsOverride: { executeIfOff: false },
          });
          await device.invokeBehaviorCommand(ColorControl.Cluster.with(ColorControl.Feature.HueSaturation), 'moveToHueAndSaturation', {
            hue: 50,
            saturation: 100,
            transitionTime: 0,
            optionsMask: { executeIfOff: false },
            optionsOverride: { executeIfOff: false },
          });
        }
        if (colorControlFeatures.colorTemperature) {
          await device.invokeBehaviorCommand(ColorControl.Cluster.with(ColorControl.Feature.ColorTemperature), 'moveToColorTemperature', {
            colorTemperatureMireds: 300,
            transitionTime: 0,
            optionsMask: { executeIfOff: false },
            optionsOverride: { executeIfOff: false },
          });
        }
      }

      if (device.hasClusterServer('WindowCovering')) {
        const windowCoveringFeatures = featuresFor(device, 'WindowCovering');

        if (windowCoveringFeatures.lift && windowCoveringFeatures.positionAwareLift) {
          await device.invokeBehaviorCommand('windowCovering', 'upOrOpen');
          await device.invokeBehaviorCommand('windowCovering', 'downOrClose');
          await device.invokeBehaviorCommand('windowCovering', 'stopMotion');
          await device.invokeBehaviorCommand('windowCovering', 'goToLiftPercentage', { liftPercent100thsValue: 5000 });
          if (windowCoveringFeatures.tilt && windowCoveringFeatures.positionAwareTilt) {
            await device.invokeBehaviorCommand('windowCovering', 'goToTiltPercentage', { tiltPercent100thsValue: 5000 });
          }
        }
      }

      if (device.hasClusterServer(DoorLock.Cluster)) {
        await device.invokeBehaviorCommand(DoorLock.Cluster, 'lockDoor', {});
        await device.invokeBehaviorCommand(DoorLock.Cluster, 'unlockDoor', {});
        await device.setAttribute(DoorLock.Cluster.id, 'operatingMode', DoorLock.OperatingMode.NoRemoteLockUnlock);
        await device.setAttribute(DoorLock.Cluster.id, 'operatingMode', DoorLock.OperatingMode.Normal);
      }
      if (device.id === 'UserPinLock') {
        await device.invokeBehaviorCommand(DoorLock.Cluster, 'lockDoor', {});
        await device.invokeBehaviorCommand(DoorLock.Cluster, 'unlockDoor', {});
        await device.setAttribute(DoorLock.Cluster, 'operatingMode', DoorLock.OperatingMode.Normal);
        await device.setAttribute(DoorLock.Complete, 'wrongCodeEntryLimit', 3);
        await device.setAttribute(DoorLock.Complete, 'userCodeTemporaryDisableTime', 30);
      }

      if (device.hasClusterServer(FanControl.Cluster)) {
        const fanControlFeatures = featuresFor(device, FanControl.Cluster);

        if (fanControlFeatures.step) {
          await device.invokeBehaviorCommand('fanControl', 'step', {
            direction: FanControl.StepDirection.Increase,
            wrap: false,
            lowestOff: false,
          });
        }
        await device.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Off);
        await device.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Low);
        const sequence = device.getAttribute(FanControl.Cluster.id, 'fanModeSequence');
        if (sequence === FanControl.FanModeSequence.OffLowMedHigh || sequence === FanControl.FanModeSequence.OffLowMedHighAuto)
          await device.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Medium);
        await device.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.High);
        await device.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.On);
        if (fanControlFeatures.auto && device.deviceName === 'Fan auto') {
          await device.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Auto);
        }

        await device.setAttribute(FanControl.Cluster.id, 'percentSetting', 50);
        await device.setAttribute(FanControl.Cluster.id, 'percentSetting', 10);

        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Off, FanControl.FanMode.Off);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Low, FanControl.FanMode.Low);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Medium, FanControl.FanMode.Medium);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.High, FanControl.FanMode.High);
        await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.On, FanControl.FanMode.On);
        if (fanControlFeatures.auto) {
          await invokeSubscribeHandler(device, 'fanControl', 'fanMode', FanControl.FanMode.Auto, FanControl.FanMode.Auto);
        }
        await invokeSubscribeHandler(device, 'fanControl', 'percentSetting', 30, 30);
        if (fanControlFeatures.rocking) {
          await invokeSubscribeHandler(device, 'fanControl', 'rockSetting', {}, {});
        }
        if (fanControlFeatures.wind) {
          await invokeSubscribeHandler(device, 'fanControl', 'windSetting', {}, {});
        }
        if (fanControlFeatures.airflowDirection) {
          await invokeSubscribeHandler(device, 'fanControl', 'airflowDirection', {}, {});
        }
      }

      if (device.hasClusterServer('Thermostat')) {
        const thermostatFeatures = featuresFor(device, 'Thermostat');

        if (thermostatFeatures.heating && thermostatFeatures.cooling && thermostatFeatures.autoMode) {
          await device.invokeBehaviorCommand('Thermostat', 'setpointRaiseLower', { mode: Thermostat.SetpointRaiseLowerMode.Both, amount: 100 });
          if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (AutoOccupancy)') {
            await device.setAttribute(Thermostat.Cluster.id, 'systemMode', Thermostat.SystemMode.Off);
            await device.setAttribute(Thermostat.Cluster.id, 'systemMode', Thermostat.SystemMode.Heat);
            await device.setAttribute(Thermostat.Cluster.id, 'systemMode', Thermostat.SystemMode.Cool);
          }
          if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (AutoOccupancy)' || device.deviceName === 'Thermostat (Heat)') {
            await device.setAttribute(Thermostat.Cluster.id, 'systemMode', Thermostat.SystemMode.Off);
            await device.setAttribute(Thermostat.Cluster.id, 'systemMode', Thermostat.SystemMode.Heat);
            await device.setAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', 2800);
            await device.setAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', 2700);
          }
          if (device.deviceName === 'Thermostat (AutoMode)' || device.deviceName === 'Thermostat (AutoOccupancy)' || device.deviceName === 'Thermostat (Cool)') {
            await device.setAttribute(Thermostat.Cluster.id, 'systemMode', Thermostat.SystemMode.Off);
            await device.setAttribute(Thermostat.Cluster.id, 'systemMode', Thermostat.SystemMode.Cool);
            await device.setAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', 1600);
            await device.setAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', 1500);
          }
          if (device.deviceName === 'Thermostat (AutoOccupancy)') {
            await device.setAttribute(Thermostat.Cluster.id, 'unoccupiedHeatingSetpoint', 2800);
            await device.setAttribute(Thermostat.Cluster.id, 'unoccupiedHeatingSetpoint', 2700);
            await device.setAttribute(Thermostat.Cluster.id, 'unoccupiedCoolingSetpoint', 1600);
            await device.setAttribute(Thermostat.Cluster.id, 'unoccupiedCoolingSetpoint', 1500);
          }
          await invokeSubscribeHandler(device, 'Thermostat', 'systemMode', Thermostat.SystemMode.Off, Thermostat.SystemMode.Off);
          await invokeSubscribeHandler(device, 'Thermostat', 'occupiedHeatingSetpoint', 2800, 2700);
          await invokeSubscribeHandler(device, 'Thermostat', 'occupiedCoolingSetpoint', 1500, 1400);
          await invokeSubscribeHandler(device, 'Thermostat', 'unoccupiedHeatingSetpoint', 2000, 1900);
          await invokeSubscribeHandler(device, 'Thermostat', 'unoccupiedCoolingSetpoint', 2000, 1900);
        }
      }
    }
  }, 30000);

  it('should execute thermostat preset commands and subscriptions', async () => {
    await flushAsync();
    // Find the Thermostat (AutoModePresets) device which has presets
    const thermoAutoPreset = dynamicPlatform.getDeviceByName('Thermostat (AutoModePresets)');
    expect(thermoAutoPreset).toBeDefined();
    if (!thermoAutoPreset) return;
    expect(thermoAutoPreset.hasClusterServer(Thermostat.Cluster.id)).toBe(true);

    // Test setpointRaiseLower command
    await thermoAutoPreset.invokeBehaviorCommand('Thermostat', 'setpointRaiseLower', { mode: Thermostat.SetpointRaiseLowerMode.Heat, amount: 100 });
    await thermoAutoPreset.invokeBehaviorCommand('Thermostat', 'setpointRaiseLower', { mode: Thermostat.SetpointRaiseLowerMode.Cool, amount: 100 });
    await thermoAutoPreset.invokeBehaviorCommand('Thermostat', 'setpointRaiseLower', { mode: Thermostat.SetpointRaiseLowerMode.Both, amount: 100 });
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Command setpointRaiseLower called'));

    // Test setActivePresetRequest command with valid preset
    const presetHandle = new Uint8Array([0x00]);
    await thermoAutoPreset.invokeBehaviorCommand('Thermostat', 'setActivePresetRequest', { presetHandle });
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Command setActivePresetRequest called'));

    // Test setActivePresetRequest command with invalid preset
    const invalidPresetHandle = new Uint8Array([0xff]);
    await expect(thermoAutoPreset.invokeBehaviorCommand('Thermostat', 'setActivePresetRequest', { presetHandle: invalidPresetHandle })).rejects.toThrow(
      'Requested PresetHandle not found',
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Command setActivePresetRequest called'));

    // Test subscriptions
    await invokeSubscribeHandler(thermoAutoPreset, 'Thermostat', 'systemMode', Thermostat.SystemMode.Off, Thermostat.SystemMode.Heat);
    await invokeSubscribeHandler(thermoAutoPreset, 'Thermostat', 'occupiedHeatingSetpoint', 2700, 2800);
    await invokeSubscribeHandler(thermoAutoPreset, 'Thermostat', 'occupiedCoolingSetpoint', 1400, 1500);
    await invokeSubscribeHandler(thermoAutoPreset, 'Thermostat', 'activePresetHandle', new Uint8Array([0x00]), new Uint8Array([0x00]));
    await invokeSubscribeHandler(thermoAutoPreset, 'Thermostat', 'presets', [], []);

    // Matter.js applies preset-derived setpoints to the unoccupied attributes when occupancy is false.
    // It preserves activePresetHandle for the initial preset and then clears it again on subsequent preset changes.
    // It doesn't seem to be spec compliant
    const presetSetpointChecks = [
      { handle: 0x00, unoccupiedHeat: 2200, unoccupiedCool: 2300 },
      { handle: 0x01, unoccupiedHeat: 1800, unoccupiedCool: 2600 },
      { handle: 0x02, unoccupiedHeat: 1800, unoccupiedCool: 2100 },
      { handle: 0x03, unoccupiedHeat: 1900, unoccupiedCool: 2400 },
      { handle: 0x04, unoccupiedHeat: 1600, unoccupiedCool: 2700 },
      { handle: 0x05, unoccupiedHeat: 1850, unoccupiedCool: 2200 },
    ];
    await setDebug(false);
    try {
      for (const preset of presetSetpointChecks) {
        await thermoAutoPreset.invokeBehaviorCommand('Thermostat', 'setActivePresetRequest', { presetHandle: new Uint8Array([preset.handle]) });

        const occupiedHeat = thermoAutoPreset.getAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint') as number | undefined;
        const occupiedCool = thermoAutoPreset.getAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint') as number | undefined;
        const unoccupiedHeat = thermoAutoPreset.getAttribute(Thermostat.Cluster.id, 'unoccupiedHeatingSetpoint') as number | undefined;
        const unoccupiedCool = thermoAutoPreset.getAttribute(Thermostat.Cluster.id, 'unoccupiedCoolingSetpoint') as number | undefined;
        const activePresetHandle = thermoAutoPreset.getAttribute(Thermostat.Cluster.id, 'activePresetHandle') as Uint8Array | null | undefined;

        expect(occupiedHeat).toBe(1800);
        expect(occupiedCool).toBe(2200);
        expect(unoccupiedHeat).toBe(preset.unoccupiedHeat);
        expect(unoccupiedCool).toBe(preset.unoccupiedCool);
        if (preset.handle === 0x00) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(activePresetHandle).toEqual(new Uint8Array([0x00]));
        } else {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(activePresetHandle).toBeNull();
        }
        // eslint-disable-next-line no-console
        console.log(
          `Matter.js preset ${preset.handle}: activePresetHandle=${JSON.stringify(activePresetHandle ? Array.from(activePresetHandle) : null)} occupiedHeat=${occupiedHeat} occupiedCool=${occupiedCool} unoccupiedHeat=${unoccupiedHeat} unoccupiedCool=${unoccupiedCool}`,
        );
      }
    } finally {
      await setDebug(false);
    }
  }, 30000);

  it('should execute the remaining thermostat, fan base and air conditioner callbacks', async () => {
    await flushAsync();
    const thermoHeat = dynamicPlatform.getDeviceByName('Thermostat (Heat)');
    const thermoCool = dynamicPlatform.getDeviceByName('Thermostat (Cool)');
    const fanBase = dynamicPlatform.getDeviceByName('Fan base');
    const airConditioner = dynamicPlatform.getDeviceByName('Air Conditioner');

    expect(thermoHeat).toBeDefined();
    expect(thermoCool).toBeDefined();
    expect(fanBase).toBeDefined();
    expect(airConditioner).toBeDefined();
    if (!thermoHeat || !thermoCool || !fanBase || !airConditioner) return;

    jest.clearAllMocks();

    await invokeSubscribeHandler(thermoHeat, 'Thermostat', 'systemMode', Thermostat.SystemMode.Heat, Thermostat.SystemMode.Off);
    await invokeSubscribeHandler(thermoHeat, 'Thermostat', 'occupiedHeatingSetpoint', 2800, 2700);
    await invokeSubscribeHandler(thermoCool, 'Thermostat', 'systemMode', Thermostat.SystemMode.Cool, Thermostat.SystemMode.Off);
    await invokeSubscribeHandler(thermoCool, 'Thermostat', 'occupiedCoolingSetpoint', 1500, 1400);

    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Subscribe systemMode called with:', 'Heat');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Subscribe occupiedHeatingSetpoint called with:', 28);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Subscribe systemMode called with:', 'Cool');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Subscribe occupiedCoolingSetpoint called with:', 15);

    await invokeSubscribeHandler(fanBase, 'fanControl', 'fanMode', FanControl.FanMode.Auto, FanControl.FanMode.Off);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Fan mode changed from Off to Auto'));

    await airConditioner.executeCommandHandler('on', {}, 'onOff', {} as never, airConditioner);
    expect(airConditioner.getAttribute(Thermostat.Cluster.id, 'localTemperature')).toBe(20 * 100);
    expect(airConditioner.getAttribute(FanControl.Cluster.id, 'percentSetting')).toBe(50);

    await airConditioner.executeCommandHandler('off', {}, 'onOff', {} as never, airConditioner);
    expect(airConditioner.getAttribute(Thermostat.Cluster.id, 'localTemperature')).toBeNull();
    expect(airConditioner.getAttribute(FanControl.Cluster.id, 'percentSetting')).toBeNull();
  }, 30000);

  it('should execute basic video player commands', async () => {
    await flushAsync();
    // Find the BasicVideoPlayer device
    const basicVideoPlayer = dynamicPlatform.getDeviceByName('BasicVideoPlayer');
    expect(basicVideoPlayer).toBeDefined();
    if (!basicVideoPlayer) return;

    // Test MediaPlayback commands
    await basicVideoPlayer.invokeBehaviorCommand('mediaPlayback', 'MediaPlayback.play', {});
    expect(loggerInfoSpy).toHaveBeenCalledWith('Command play called');
    await basicVideoPlayer.invokeBehaviorCommand('mediaPlayback', 'MediaPlayback.pause', {});
    expect(loggerInfoSpy).toHaveBeenCalledWith('Command pause called');
    await basicVideoPlayer.invokeBehaviorCommand('mediaPlayback', 'MediaPlayback.stop', {});
    expect(loggerInfoSpy).toHaveBeenCalledWith('Command stop called');
    await basicVideoPlayer.invokeBehaviorCommand('mediaPlayback', 'MediaPlayback.previous', {});
    expect(loggerInfoSpy).toHaveBeenCalledWith('Command previous called');
    await basicVideoPlayer.invokeBehaviorCommand('mediaPlayback', 'MediaPlayback.next', {});
    expect(loggerInfoSpy).toHaveBeenCalledWith('Command next called');
    await basicVideoPlayer.invokeBehaviorCommand('mediaPlayback', 'MediaPlayback.skipForward', {});
    expect(loggerInfoSpy).toHaveBeenCalledWith('Command skipForward called');
    await basicVideoPlayer.invokeBehaviorCommand('mediaPlayback', 'MediaPlayback.skipBackward', {});
    expect(loggerInfoSpy).toHaveBeenCalledWith('Command skipBackward called');

    // Test KeypadInput commands
    await basicVideoPlayer.invokeBehaviorCommand('keypadInput', 'KeypadInput.sendKey', { keyCode: KeypadInput.CecKeyCode.Down });
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Command sendKey with ${KeypadInput.CecKeyCode.Down} called`);
  }, 30000);

  it('should call onConfigure', async () => {
    await flushAsync();
    await dynamicPlatform.onConfigure();
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onConfigure called');

    await dynamicPlatform.executeIntervals(40, 10);

    expect(loggerLogSpy).toHaveBeenCalled();
    expect(loggerLogSpy).not.toHaveBeenCalledWith(LogLevel.WARN, expect.anything());
    expect(loggerLogSpy).not.toHaveBeenCalledWith(LogLevel.ERROR, expect.anything());
    expect(loggerLogSpy).not.toHaveBeenCalledWith(LogLevel.FATAL, expect.anything());
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 0');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 1');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 2');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 3');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 4');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 5');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 6');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 7');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 8');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Appliances animation phase 9');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.SinglePress'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.DoublePress'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.LongPress'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.Press'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Switch.Release'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Set lock lockState to Unlocked'));
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Set lock lockState to Locked'));
  }, 60000);

  it('should call onShutdown with reason', async () => {
    await flushAsync();
    await dynamicPlatform.onShutdown('Test reason');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onShutdown called with reason:', 'Test reason');
    expect(removeBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeAllBridgedEndpointsMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeBridgedEndpointMatterbridgeSpy).toHaveBeenCalledTimes(0);
    expect(removeAllBridgedEndpointsMatterbridgeSpy).toHaveBeenCalledTimes(0);
  });
});
