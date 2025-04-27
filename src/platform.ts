import {
  Matterbridge,
  MatterbridgeEndpoint,
  MatterbridgeDynamicPlatform,
  PlatformConfig,
  airQualitySensor,
  bridgedNode,
  colorTemperatureLight,
  coverDevice,
  dimmableLight,
  doorLockDevice,
  fanDevice,
  flowSensor,
  humiditySensor,
  onOffLight,
  onOffOutlet,
  onOffSwitch,
  powerSource,
  rainSensor,
  smokeCoAlarm,
  temperatureSensor,
  thermostatDevice,
  waterFreezeDetector,
  waterLeakDetector,
  airPurifier,
  pumpDevice,
  waterValve,
  genericSwitch,
  airConditioner,
  laundryWasher,
  cooktop,
  extractorHood,
  microwaveOven,
  oven,
  refrigerator,
  dishwasher,
  laundryDryer,
  onOffMountedSwitch,
  dimmableMountedSwitch,
  extendedColorLight,
  // onOffMountedSwitch,
  // dimmableMountedSwitch,
} from 'matterbridge';
import { isValidBoolean, isValidNumber } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';
import { LocationTag } from 'matterbridge/matter';
import {
  PowerSource,
  BooleanState,
  OnOff,
  LevelControl,
  AirQuality,
  CarbonDioxideConcentrationMeasurement,
  CarbonMonoxideConcentrationMeasurement,
  FlowMeasurement,
  ColorControl,
  DoorLock,
  FanControl,
  FormaldehydeConcentrationMeasurement,
  NitrogenDioxideConcentrationMeasurement,
  OzoneConcentrationMeasurement,
  Pm10ConcentrationMeasurement,
  Pm1ConcentrationMeasurement,
  Pm25ConcentrationMeasurement,
  RadonConcentrationMeasurement,
  RelativeHumidityMeasurement,
  RelativeHumidityMeasurementCluster,
  SmokeCoAlarm,
  TemperatureMeasurement,
  Thermostat,
  ThermostatCluster,
  TotalVolatileOrganicCompoundsConcentrationMeasurement,
  WindowCovering,
} from 'matterbridge/matter/clusters';
import { BitFlag, TypeFromPartialBitSchema } from 'matterbridge/matter/types';
import { Appliances } from './appliances.js';
import { Robot } from './robot.js';

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  switch: MatterbridgeEndpoint | undefined;
  mountedOnOffSwitch: MatterbridgeEndpoint | undefined;
  mountedDimmerSwitch: MatterbridgeEndpoint | undefined;
  lightOnOff: MatterbridgeEndpoint | undefined;
  dimmer: MatterbridgeEndpoint | undefined;
  light: MatterbridgeEndpoint | undefined;
  lightXY: MatterbridgeEndpoint | undefined;
  lightHS: MatterbridgeEndpoint | undefined;
  lightCT: MatterbridgeEndpoint | undefined;
  outlet: MatterbridgeEndpoint | undefined;
  cover: MatterbridgeEndpoint | undefined;
  lock: MatterbridgeEndpoint | undefined;
  thermoAuto: MatterbridgeEndpoint | undefined;
  thermoHeat: MatterbridgeEndpoint | undefined;
  thermoCool: MatterbridgeEndpoint | undefined;
  fan: MatterbridgeEndpoint | undefined;
  waterLeak: MatterbridgeEndpoint | undefined;
  waterFreeze: MatterbridgeEndpoint | undefined;
  rain: MatterbridgeEndpoint | undefined;
  smokeCo: MatterbridgeEndpoint | undefined;
  smokeOnly: MatterbridgeEndpoint | undefined;
  coOnly: MatterbridgeEndpoint | undefined;
  airQuality: MatterbridgeEndpoint | undefined;
  airConditioner: MatterbridgeEndpoint | undefined;
  airPurifier: MatterbridgeEndpoint | undefined;
  pump: MatterbridgeEndpoint | undefined;
  valve: MatterbridgeEndpoint | undefined;
  momentarySwitch: MatterbridgeEndpoint | undefined;
  latchingSwitch: MatterbridgeEndpoint | undefined;
  vacuum: MatterbridgeEndpoint | undefined;

  switchInterval: NodeJS.Timeout | undefined;
  lightInterval: NodeJS.Timeout | undefined;
  outletInterval: NodeJS.Timeout | undefined;
  coverInterval: NodeJS.Timeout | undefined;
  lockInterval: NodeJS.Timeout | undefined;
  thermoInterval: NodeJS.Timeout | undefined;
  fanInterval: NodeJS.Timeout | undefined;
  waterLeakInterval: NodeJS.Timeout | undefined;
  waterFreezeInterval: NodeJS.Timeout | undefined;
  rainInterval: NodeJS.Timeout | undefined;
  smokeInterval: NodeJS.Timeout | undefined;
  airQualityInterval: NodeJS.Timeout | undefined;
  airConditionerInterval: NodeJS.Timeout | undefined;
  genericSwitchInterval: NodeJS.Timeout | undefined;
  genericSwitchLastEvent: 'Single' | 'Double' | 'Long' | 'Press' | 'Release' = 'Release';

  intervalOnOff = false;
  intervalLevel = 0;
  intervalColorTemperature = 147;

  bridgedDevices = new Map<string, MatterbridgeEndpoint>();

  fanModeLookup = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart'];

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('2.2.7')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "2.2.7". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }

    this.log.info('Initializing platform:', this.config.name);
    if (config.whiteList === undefined) config.whiteList = [];
    if (config.blackList === undefined) config.blackList = [];
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Wait for the platform to start
    await this.ready;
    await this.clearSelect();

    // Create a switch device
    this.switch = new MatterbridgeEndpoint([onOffSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Switch' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Switch',
        '0x23452164',
        0xfff1,
        'Matterbridge',
        'Matterbridge Switch',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70);
    this.setSelectDevice(this.switch.serialNumber ?? '', this.switch.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.switch.deviceName ?? '')) {
      await this.registerDevice(this.switch);
      this.bridgedDevices.set(this.switch.deviceName ?? '', this.switch);
    } else {
      this.switch = undefined;
    }

    this.switch?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.switch?.addCommandHandler('on', async () => {
      await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.switch.log);
      this.switch?.log.info('Command on called');
    });
    this.switch?.addCommandHandler('off', async () => {
      await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.switch.log);
      this.switch?.log.info('Command off called');
    });

    // Create a mounted onOff switch device
    this.mountedOnOffSwitch = new MatterbridgeEndpoint([onOffMountedSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'OnOffMountedSwitch' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'OnOff Mounted Switch',
        '0x298242164',
        0xfff1,
        'Matterbridge',
        'Matterbridge OnOff Mounted Switch',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70);
    this.setSelectDevice(this.mountedOnOffSwitch.serialNumber ?? '', this.mountedOnOffSwitch.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.mountedOnOffSwitch.deviceName ?? '')) {
      await this.registerDevice(this.mountedOnOffSwitch);
      this.bridgedDevices.set(this.mountedOnOffSwitch.deviceName ?? '', this.mountedOnOffSwitch);
    } else {
      this.mountedOnOffSwitch = undefined;
    }

    this.mountedOnOffSwitch?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.mountedOnOffSwitch?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedOnOffSwitch?.addCommandHandler('on', async () => {
      await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.mountedOnOffSwitch.log);
      this.mountedOnOffSwitch?.log.info('Command on called');
    });
    this.mountedOnOffSwitch?.addCommandHandler('off', async () => {
      await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedOnOffSwitch.log);
      this.mountedOnOffSwitch?.log.info('Command off called');
    });

    // Create a mounted dimmer switch device
    this.mountedDimmerSwitch = new MatterbridgeEndpoint(
      [dimmableMountedSwitch, bridgedNode, powerSource],
      { uniqueStorageKey: 'DimmerMountedSwitch' },
      this.config.debug as boolean,
    )
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Dimmer Mounted Switch',
        '0x22145578864',
        0xfff1,
        'Matterbridge',
        'Matterbridge Dimmer Mounted Switch',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70);
    this.setSelectDevice(this.mountedDimmerSwitch.serialNumber ?? '', this.mountedDimmerSwitch.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.mountedDimmerSwitch.deviceName ?? '')) {
      await this.registerDevice(this.mountedDimmerSwitch);
      this.bridgedDevices.set(this.mountedDimmerSwitch.deviceName ?? '', this.mountedDimmerSwitch);
    } else {
      this.mountedDimmerSwitch = undefined;
    }

    this.mountedDimmerSwitch?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.mountedDimmerSwitch?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedDimmerSwitch?.addCommandHandler('on', async () => {
      await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.info('Command on called');
    });
    this.mountedDimmerSwitch?.addCommandHandler('off', async () => {
      await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.info('Command off called');
    });
    this.mountedDimmerSwitch?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.mountedDimmerSwitch?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // Create a on off light device
    this.lightOnOff = new MatterbridgeEndpoint([onOffLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (on/off)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Light (on/off)',
        '0x2342375564',
        0xfff1,
        'Matterbridge',
        'Matterbridge Light on/off',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer();
    this.setSelectDevice(this.lightOnOff.serialNumber ?? '', this.lightOnOff.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.lightOnOff.deviceName ?? '')) {
      await this.registerDevice(this.lightOnOff);
      this.bridgedDevices.set(this.lightOnOff.deviceName ?? '', this.lightOnOff);
    } else {
      this.lightOnOff = undefined;
    }

    this.lightOnOff?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightOnOff?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightOnOff?.addCommandHandler('on', async () => {
      await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightOnOff?.log);
      this.lightOnOff?.log.info('Command on called');
    });
    this.lightOnOff?.addCommandHandler('off', async () => {
      await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff?.log);
      this.lightOnOff?.log.info('Command off called');
    });

    // Create a dimmer device
    this.dimmer = new MatterbridgeEndpoint([dimmableLight, bridgedNode, powerSource], { uniqueStorageKey: 'Dimmer' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Dimmer',
        '0x234554564',
        0xfff1,
        'Matterbridge',
        'Matterbridge Dimmer',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 2990, '2 x AA', 2);
    this.setSelectDevice(this.dimmer.serialNumber ?? '', this.dimmer.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.dimmer.deviceName ?? '')) {
      await this.registerDevice(this.dimmer);
      this.bridgedDevices.set(this.dimmer.deviceName ?? '', this.dimmer);
    } else {
      this.dimmer = undefined;
    }

    this.dimmer?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.dimmer?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.dimmer?.addCommandHandler('on', async () => {
      await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.dimmer.log);
      this.dimmer?.log.info('Command on called');
    });
    this.dimmer?.addCommandHandler('off', async () => {
      await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
      this.dimmer?.log.info('Command off called');
    });
    this.dimmer?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
      this.dimmer?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.dimmer?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
      this.dimmer?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // Create a light device
    this.light = new MatterbridgeEndpoint([extendedColorLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (XY, HS and CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Light (XY, HS and CT)',
        '0x23480564',
        0xfff1,
        'Matterbridge',
        'Matterbridge Light',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultColorControlClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    this.setSelectDevice(this.light.serialNumber ?? '', this.light.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.light.deviceName ?? '')) {
      await this.registerDevice(this.light);
      this.bridgedDevices.set(this.light.deviceName ?? '', this.light);
    } else {
      this.light = undefined;
    }

    this.light?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.light?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.light?.addCommandHandler('on', async () => {
      await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.light?.log);
      this.light?.log.info('Command on called');
    });
    this.light?.addCommandHandler('off', async () => {
      await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light?.log);
      this.light?.log.info('Command off called');
    });
    this.light?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light?.log);
      this.light?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.light?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light?.log);
      this.light?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.light?.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentX', colorX, this.light?.log);
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentY', colorY, this.light?.log);
      this.light?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.light?.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.light?.log);
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.light?.log);
      this.light?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}`);
    });
    this.light?.addCommandHandler('moveToHue', async ({ request: { hue } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.light?.log);
      this.light?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.light?.addCommandHandler('moveToSaturation', async ({ request: { saturation } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.light?.log);
      this.light?.log.debug(`Command moveToSaturation called request: saturation ${saturation}}`);
    });
    this.light?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.light?.log);
      this.light?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create a light device with HS color control
    this.lightHS = new MatterbridgeEndpoint([colorTemperatureLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (HS, CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Light (HS, CT)',
        '0x25097564',
        0xfff1,
        'Matterbridge',
        'Matterbridge Light',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createHsColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();
    this.setSelectDevice(this.lightHS.serialNumber ?? '', this.lightHS.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.lightHS.deviceName ?? '')) {
      await this.registerDevice(this.lightHS);
      this.bridgedDevices.set(this.lightHS.deviceName ?? '', this.lightHS);
    } else {
      this.lightHS = undefined;
    }

    this.lightHS?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightHS?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightHS?.addCommandHandler('on', async () => {
      await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightHS?.log);
      this.lightHS?.log.info('Command on called');
    });
    this.lightHS?.addCommandHandler('off', async () => {
      await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS?.log);
      this.lightHS?.log.info('Command off called');
    });
    this.lightHS?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightHS?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightHS?.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.lightHS?.log);
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}}`);
    });
    this.lightHS?.addCommandHandler('moveToHue', async ({ request: { hue } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.lightHS?.addCommandHandler('moveToSaturation', async ({ request: { saturation } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToSaturation called request: saturation ${saturation}`);
    });
    this.lightHS?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create a light device with XY color control
    this.lightXY = new MatterbridgeEndpoint([extendedColorLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (XY, CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Light (XY, CT)',
        '0x23497564',
        0xfff1,
        'Matterbridge',
        'Matterbridge Light',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createXyColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();
    this.setSelectDevice(this.lightXY.serialNumber ?? '', this.lightXY.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.lightXY.deviceName ?? '')) {
      await this.registerDevice(this.lightXY);
      this.bridgedDevices.set(this.lightXY.deviceName ?? '', this.lightXY);
    } else {
      this.lightXY = undefined;
    }

    this.lightXY?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightXY?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightXY?.addCommandHandler('on', async () => {
      await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY?.log);
      this.lightXY?.log.info('Command on called');
    });
    this.lightXY?.addCommandHandler('off', async () => {
      await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightXY?.log);
      this.lightXY?.log.info('Command off called');
    });
    this.lightXY?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightXY?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightXY?.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentX', colorX, this.lightXY?.log);
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentY', colorY, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.lightXY?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create a light device with CT color control
    this.lightCT = new MatterbridgeEndpoint([colorTemperatureLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Light (CT)',
        '0x23480749',
        0xfff1,
        'Matterbridge',
        'Matterbridge Light',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createCtColorControlClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    this.setSelectDevice(this.lightCT.serialNumber ?? '', this.lightCT.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.lightCT.deviceName ?? '')) {
      await this.registerDevice(this.lightCT);
      this.bridgedDevices.set(this.lightCT.deviceName ?? '', this.lightCT);
    } else {
      this.lightCT = undefined;
    }

    this.lightCT?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightCT?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightCT?.addCommandHandler('on', async () => {
      await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT?.log);
      this.lightCT?.log.info('Command on called');
    });
    this.lightCT?.addCommandHandler('off', async () => {
      await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightCT?.log);
      this.lightCT?.log.info('Command off called');
    });
    this.lightCT?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightCT?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightCT?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightCT?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create an outlet device
    this.outlet = new MatterbridgeEndpoint([onOffOutlet, bridgedNode, powerSource], { uniqueStorageKey: 'Outlet' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Outlet',
        '0x29252164',
        0xfff1,
        'Matterbridge',
        'Matterbridge Outlet',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer();
    this.setSelectDevice(this.outlet.serialNumber ?? '', this.outlet.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.outlet.deviceName ?? '')) {
      await this.registerDevice(this.outlet);
      this.bridgedDevices.set(this.outlet.deviceName ?? '', this.outlet);
    } else {
      this.outlet = undefined;
    }

    this.outlet?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.outlet?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outlet?.addCommandHandler('on', async () => {
      await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.outlet?.log);
      this.outlet?.log.info('Command on called');
    });
    this.outlet?.addCommandHandler('off', async () => {
      await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.outlet?.log);
      this.outlet?.log.info('Command off called');
    });

    // Create a window covering device
    // Matter uses 10000 = fully closed   0 = fully opened
    this.cover = new MatterbridgeEndpoint([coverDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Cover' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Cover',
        '0x01020564',
        0xfff1,
        'Matterbridge',
        'Matterbridge Cover',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultWindowCoveringClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(86);
    this.setSelectDevice(this.cover.serialNumber ?? '', this.cover.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.cover.deviceName ?? '')) {
      await this.registerDevice(this.cover);
      this.bridgedDevices.set(this.cover.deviceName ?? '', this.cover);
    } else {
      this.cover = undefined;
    }

    this.cover?.subscribeAttribute(
      WindowCovering.Cluster.id,
      'mode',
      (
        newValue: TypeFromPartialBitSchema<{
          motorDirectionReversed: BitFlag;
          calibrationMode: BitFlag;
          maintenanceMode: BitFlag;
          ledFeedback: BitFlag;
        }>,
        oldValue: TypeFromPartialBitSchema<{
          motorDirectionReversed: BitFlag;
          calibrationMode: BitFlag;
          maintenanceMode: BitFlag;
          ledFeedback: BitFlag;
        }>,
      ) => {
        this.cover?.log.info(
          `Attribute mode changed from ${oldValue} to ${newValue}. Reverse: ${newValue.motorDirectionReversed}. Calibration: ${newValue.calibrationMode}. Maintenance: ${newValue.maintenanceMode}. LED: ${newValue.ledFeedback}`,
        );
      },
      this.cover.log,
    );

    this.cover?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.cover?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.cover?.addCommandHandler('stopMotion', async () => {
      await this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
      this.cover?.log.info(`Command stopMotion called`);
    });

    this.cover?.addCommandHandler('downOrClose', async () => {
      await this.cover?.setWindowCoveringCurrentTargetStatus(10000, 10000, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(`Command downOrClose called`);
    });

    this.cover?.addCommandHandler('upOrOpen', async () => {
      await this.cover?.setWindowCoveringCurrentTargetStatus(0, 0, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(`Command upOrOpen called`);
    });

    this.cover?.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      await this.cover?.setWindowCoveringCurrentTargetStatus(liftPercent100thsValue, liftPercent100thsValue, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(`Command goToLiftPercentage ${liftPercent100thsValue} called`);
    });

    // Create a lock device
    this.lock = new MatterbridgeEndpoint([doorLockDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Lock' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Lock',
        '0x96352164',
        0xfff1,
        'Matterbridge',
        'Matterbridge Lock',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultDoorLockClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(30);
    this.setSelectDevice(this.lock.serialNumber ?? '', this.lock.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.lock.deviceName ?? '')) {
      await this.registerDevice(this.lock);
      this.bridgedDevices.set(this.lock.deviceName ?? '', this.lock);
    } else {
      this.lock = undefined;
    }

    this.lock?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lock?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lock?.addCommandHandler('lockDoor', async () => {
      await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Locked, this.lock?.log);
      this.lock?.log.info('Command lockDoor called');
    });
    this.lock?.addCommandHandler('unlockDoor', async () => {
      await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Unlocked, this.lock?.log);
      this.lock?.log.info('Command unlockDoor called');
    });

    // Create a thermostat with AutoMode device
    this.thermoAuto = new MatterbridgeEndpoint([thermostatDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Thermostat (AutoMode)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Thermostat (AutoMode)',
        '0x96382164A',
        0xfff1,
        'Matterbridge',
        'Matterbridge Thermostat',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 4700);

    this.thermoAuto
      .addChildDeviceType('Flow', flowSensor)
      .createDefaultFlowMeasurementClusterServer(1 * 10)
      .addRequiredClusterServers();

    this.thermoAuto
      .addChildDeviceType('Temperature', temperatureSensor)
      .createDefaultTemperatureMeasurementClusterServer(21 * 100)
      .addRequiredClusterServers();

    this.thermoAuto
      .addChildDeviceType('Humidity', humiditySensor)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .addRequiredClusterServers();

    this.setSelectDevice(this.thermoAuto.serialNumber ?? '', this.thermoAuto.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.thermoAuto.deviceName ?? '')) {
      await this.registerDevice(this.thermoAuto);
      this.bridgedDevices.set(this.thermoAuto.deviceName ?? '', this.thermoAuto);
    } else {
      this.thermoAuto = undefined;
    }

    this.thermoAuto?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoAuto?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoAuto?.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoAuto?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoAuto?.addCommandHandler('setpointRaiseLower', async ({ request: { mode, amount } }) => {
      const lookupSetpointAdjustMode = ['Heat', 'Cool', 'Both'];
      this.thermoAuto?.log.info(`Command setpointRaiseLower called with mode: ${lookupSetpointAdjustMode[mode]} amount: ${amount / 10}`);
      if (mode === Thermostat.SetpointRaiseLowerMode.Heat || mode === Thermostat.SetpointRaiseLowerMode.Both) {
        const setpoint = this.thermoAuto?.getAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', this.thermoAuto?.log) / 100 + amount / 10;
        await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', setpoint * 100, this.thermoAuto?.log);
        this.thermoAuto?.log.info('Set occupiedHeatingSetpoint:', setpoint);
      }
      if (mode === Thermostat.SetpointRaiseLowerMode.Cool || mode === Thermostat.SetpointRaiseLowerMode.Both) {
        const setpoint = this.thermoAuto?.getAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', this.thermoAuto?.log) / 100 + amount / 10;
        await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', setpoint * 100, this.thermoAuto?.log);
        this.thermoAuto?.log.info('Set occupiedCoolingSetpoint:', setpoint);
      }
    });
    this.thermoAuto?.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      async (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoAuto?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoAuto.log,
    );
    this.thermoAuto?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedHeatingSetpoint',
      async (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );
    this.thermoAuto?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedCoolingSetpoint',
      async (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );

    // Create a thermostat with Heat device
    this.thermoHeat = new MatterbridgeEndpoint([thermostatDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Thermostat (Heat)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Thermostat (Heat)',
        '0x96382164H',
        0xfff1,
        'Matterbridge',
        'Matterbridge Thermostat',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultHeatingThermostatClusterServer(20, 18, 5, 35)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 6010, 'AA 1.5V', 4);

    this.thermoHeat
      .addChildDeviceType('TemperatureIN', [temperatureSensor], {
        tagList: [{ mfgCode: null, namespaceId: LocationTag.Indoor.namespaceId, tag: LocationTag.Indoor.tag, label: null }],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(21 * 100);

    this.thermoHeat
      .addChildDeviceType('TemperatureOUT', [temperatureSensor], {
        tagList: [{ mfgCode: null, namespaceId: LocationTag.Outdoor.namespaceId, tag: LocationTag.Outdoor.tag, label: null }],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(15 * 100);

    this.setSelectDevice(this.thermoHeat.serialNumber ?? '', this.thermoHeat.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.thermoHeat.deviceName ?? '')) {
      await this.registerDevice(this.thermoHeat);
      this.bridgedDevices.set(this.thermoHeat.deviceName ?? '', this.thermoHeat);
    } else {
      this.thermoHeat = undefined;
    }

    this.thermoHeat?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoHeat?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoHeat?.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoHeat?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoHeat?.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      async (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoHeat?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoHeat.log,
    );
    this.thermoHeat?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedHeatingSetpoint',
      async (value) => {
        this.thermoHeat?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoHeat.log,
    );

    // Create a thermostat with Cool device
    this.thermoCool = new MatterbridgeEndpoint([thermostatDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Thermostat (Cool)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Thermostat (Cool)',
        '0x96382164C',
        0xfff1,
        'Matterbridge',
        'Matterbridge Thermostat',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultCoolingThermostatClusterServer(20, 18, 5, 35)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(40, PowerSource.BatChargeLevel.Ok, 5080, 'AA 1.5V', 4);
    this.setSelectDevice(this.thermoCool.serialNumber ?? '', this.thermoCool.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.thermoCool.deviceName ?? '')) {
      await this.registerDevice(this.thermoCool);
      this.bridgedDevices.set(this.thermoCool.deviceName ?? '', this.thermoCool);
    } else {
      this.thermoCool = undefined;
    }

    this.thermoCool?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoCool?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoCool?.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoCool?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoCool?.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      async (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoCool?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoCool.log,
    );
    this.thermoCool?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedCoolingSetpoint',
      async (value) => {
        this.thermoCool?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoCool.log,
    );

    // Create a airPurifier device
    this.airPurifier = new MatterbridgeEndpoint(
      [airPurifier, temperatureSensor, humiditySensor, bridgedNode, powerSource],
      { uniqueStorageKey: 'Air purifier' },
      this.config.debug as boolean,
    )
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Air purifier',
        '0x96584864AP',
        0xfff1,
        'Matterbridge',
        'Matterbridge Air purifier',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createDefaultFanControlClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(20 * 100)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultActivatedCarbonFilterMonitoringClusterServer()
      .createDefaultHepaFilterMonitoringClusterServer();
    this.setSelectDevice(this.airPurifier.serialNumber ?? '', this.airPurifier.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.airPurifier.deviceName ?? '')) {
      await this.registerDevice(this.airPurifier);
      this.bridgedDevices.set(this.airPurifier.deviceName ?? '', this.airPurifier);
    } else {
      this.airPurifier = undefined;
    }

    this.airPurifier?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airPurifier?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    // Apple sends Off and High
    this.airPurifier?.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      async (newValue: FanControl.FanMode, oldValue: FanControl.FanMode) => {
        this.fan?.log.info(`Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]}`);
        if (newValue === FanControl.FanMode.Off) {
          await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 33, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 66, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.High) {
          await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.On) {
          await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 50, this.airPurifier?.log);
        }
      },
      this.airPurifier.log,
    );
    this.airPurifier?.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Percent setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.airPurifier?.log);
      },
      this.airPurifier.log,
    );

    // Create a airConditioner device
    this.airConditioner = new MatterbridgeEndpoint([airConditioner, bridgedNode, powerSource], { uniqueStorageKey: 'Air Conditioner' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Air Conditioner',
        '0x96382864AC',
        0xfff1,
        'Matterbridge',
        'Matterbridge Air Conditioner',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createDeadFrontOnOffClusterServer(true)
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultFanControlClusterServer(FanControl.FanMode.Auto)
      .createDefaultTemperatureMeasurementClusterServer(20 * 100)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();
    this.setSelectDevice(this.airConditioner.serialNumber ?? '', this.airConditioner.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.airConditioner.deviceName ?? '')) {
      await this.registerDevice(this.airConditioner);
      this.bridgedDevices.set(this.airConditioner.deviceName ?? '', this.airConditioner);
    } else {
      this.airConditioner = undefined;
    }

    this.airConditioner?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airConditioner?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.airConditioner?.addCommandHandler('on', async () => {
      this.airConditioner?.log.info('Command on called');
      // await this.airConditioner?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'speedSetting', 50, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.airConditioner?.log);
    });
    this.airConditioner?.addCommandHandler('off', async () => {
      this.airConditioner?.log.info('Command off called');
      // await this.airConditioner?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'speedSetting', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'percentSetting', null, this.airConditioner?.log);
    });

    // Create a pumpDevice device
    this.pump = new MatterbridgeEndpoint([pumpDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Pump' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Pump',
        '0x96382864PUMP',
        0xfff1,
        'Matterbridge',
        'Matterbridge Pump',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createOnOffClusterServer()
      .createLevelControlClusterServer()
      .createDefaultPumpConfigurationAndControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();
    this.setSelectDevice(this.pump.serialNumber ?? '', this.pump.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.pump.deviceName ?? '')) {
      await this.registerDevice(this.pump);
      this.bridgedDevices.set(this.pump.deviceName ?? '', this.pump);
    } else {
      this.pump = undefined;
    }

    this.pump?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.pump?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.pump?.addCommandHandler('on', async () => {
      this.pump?.log.info('Command on called');
      await this.pump?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.pump?.log);
    });
    this.pump?.addCommandHandler('off', async () => {
      this.pump?.log.info('Command off called');
      await this.pump?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.pump?.log);
    });

    // Create a waterValve device
    this.valve = new MatterbridgeEndpoint([waterValve, bridgedNode, powerSource], { uniqueStorageKey: 'Water valve' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Water valve',
        '0x96382864WV',
        0xfff1,
        'Matterbridge',
        'Matterbridge Water valve',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createDefaultValveConfigurationAndControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();
    this.setSelectDevice(this.valve.serialNumber ?? '', this.valve.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.valve.deviceName ?? '')) {
      await this.registerDevice(this.valve);
      this.bridgedDevices.set(this.valve.deviceName ?? '', this.valve);
    } else {
      this.valve = undefined;
    }

    this.valve?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.valve?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    // Create a fan device
    this.fan = new MatterbridgeEndpoint([fanDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Fan' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Fan',
        'serial_980545631228',
        0xfff1,
        'Matterbridge',
        'Matterbridge Fan',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();
    this.setSelectDevice(this.fan.serialNumber ?? '', this.fan.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.fan.deviceName ?? '')) {
      await this.registerDevice(this.fan);
      this.bridgedDevices.set(this.fan.deviceName ?? '', this.fan);
    } else {
      this.fan = undefined;
    }

    this.fan?.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      async (newValue: FanControl.FanMode, oldValue: FanControl.FanMode) => {
        this.fan?.log.info(`Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]}`);
        if (newValue === FanControl.FanMode.Off) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fan?.log);
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', 33, this.fan?.log);
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 33, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', 66, this.fan?.log);
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 66, this.fan?.log);
        } else if (newValue === FanControl.FanMode.High) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fan?.log);
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fan?.log);
        } else if (newValue === FanControl.FanMode.On) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fan?.log);
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.fan?.log);
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 50, this.fan?.log);
        }
      },
      this.fan.log,
    );
    this.fan?.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Percent setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.fan?.log);
      },
      this.fan.log,
    );
    this.fan?.subscribeAttribute(
      FanControl.Cluster.id,
      'speedSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Speed setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.fan?.setAttribute(FanControl.Cluster.id, 'speedCurrent', newValue, this.fan?.log);
      },
      this.fan.log,
    );

    /** ********************* Create a waterLeakDetector device ***********************/
    this.waterLeak = new MatterbridgeEndpoint([waterLeakDetector, bridgedNode, powerSource], { uniqueStorageKey: 'Water leak detector' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Water leak detector',
        'serial_98745631222',
        0xfff1,
        'Matterbridge',
        'Matterbridge WaterLeakDetector',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();
    this.setSelectDevice(this.waterLeak.serialNumber ?? '', this.waterLeak.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.waterLeak.deviceName ?? '')) {
      await this.registerDevice(this.waterLeak);
      this.bridgedDevices.set(this.waterLeak.deviceName ?? '', this.waterLeak);
    } else {
      this.waterLeak = undefined;
    }

    /** ********************* Create a waterFreezeDetector device ***********************/
    this.waterFreeze = new MatterbridgeEndpoint([waterFreezeDetector, bridgedNode, powerSource], { uniqueStorageKey: 'Water freeze detector' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Water freeze detector',
        'serial_98745631223',
        0xfff1,
        'Matterbridge',
        'Matterbridge WaterFreezeDetector',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();
    this.setSelectDevice(this.waterFreeze.serialNumber ?? '', this.waterFreeze.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.waterFreeze.deviceName ?? '')) {
      await this.registerDevice(this.waterFreeze);
      this.bridgedDevices.set(this.waterFreeze.deviceName ?? '', this.waterFreeze);
    } else {
      this.waterFreeze = undefined;
    }

    /** ********************* Create a rainSensor device ***********************/
    this.rain = new MatterbridgeEndpoint([rainSensor, bridgedNode, powerSource], { uniqueStorageKey: 'Rain sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Rain sensor',
        'serial_98745631224',
        0xfff1,
        'Matterbridge',
        'Matterbridge RainSensor',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultIdentifyClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .createDefaultBooleanStateConfigurationClusterServer();
    this.setSelectDevice(this.rain.serialNumber ?? '', this.rain.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.rain.deviceName ?? '')) {
      await this.registerDevice(this.rain);
      this.bridgedDevices.set(this.rain.deviceName ?? '', this.rain);
    } else {
      this.rain = undefined;
    }

    /** ********************* Create a smokeCoAlarm device ***********************/
    this.smokeCo = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { uniqueStorageKey: 'SmokeCo alarm sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'SmokeCo alarm sensor',
        'serial_94745631225',
        0xfff1,
        'Matterbridge',
        'Matterbridge SmokeCoAlarm',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createDefaultSmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer();
    // The Home App 18.4 does not support the following cluster: if present the device will be discarded
    if (this.config.enableConcentrationMeasurements === true) this.smokeCo.createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(100);
    this.setSelectDevice(this.smokeCo.serialNumber ?? '', this.smokeCo.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.smokeCo.deviceName ?? '')) {
      await this.registerDevice(this.smokeCo);
      this.bridgedDevices.set(this.smokeCo.deviceName ?? '', this.smokeCo);
    } else {
      this.smokeCo = undefined;
    }

    /** ********************* Create a smokeCoAlarm smoke only device ***********************/
    this.smokeOnly = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { uniqueStorageKey: 'Smoke alarm sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Smoke alarm sensor',
        'serial_94755661225',
        0xfff1,
        'Matterbridge',
        'Matterbridge SmokeCoAlarm',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createSmokeOnlySmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer();
    this.setSelectDevice(this.smokeOnly.serialNumber ?? '', this.smokeOnly.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.smokeOnly.deviceName ?? '')) {
      await this.registerDevice(this.smokeOnly);
      this.bridgedDevices.set(this.smokeOnly.deviceName ?? '', this.smokeOnly);
    } else {
      this.smokeOnly = undefined;
    }

    /** ********************* Create a smokeCoAlarm co only device ***********************/
    this.coOnly = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { uniqueStorageKey: 'Co alarm sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Co alarm sensor',
        'serial_947456317488',
        0xfff1,
        'Matterbridge',
        'Matterbridge SmokeCoAlarm',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createCoOnlySmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer();
    // The Home App 18.4 does not support the following cluster: if present the device will be discarded
    if (this.config.enableConcentrationMeasurements === true) this.coOnly.createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(100);
    this.setSelectDevice(this.coOnly.serialNumber ?? '', this.coOnly.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.coOnly.deviceName ?? '')) {
      await this.registerDevice(this.coOnly);
      this.bridgedDevices.set(this.coOnly.deviceName ?? '', this.coOnly);
    } else {
      this.coOnly = undefined;
    }

    /** ********************* Create an airQuality device ***********************/
    this.airQuality = new MatterbridgeEndpoint([airQualitySensor, bridgedNode, powerSource], { uniqueStorageKey: 'Air quality sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Air quality sensor',
        'serial_987484318322',
        0xfff1,
        'Matterbridge',
        'Matterbridge Air Quality Sensor',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultPowerSourceReplaceableBatteryClusterServer(50, PowerSource.BatChargeLevel.Warning, 2900, 'CR2450', 1)
      .addRequiredClusterServers()
      .addClusterServers([TemperatureMeasurement.Cluster.id, RelativeHumidityMeasurement.Cluster.id]);
    // The Home App 18.4 does not support the following clusters: if present the device will be discarded
    if (this.config.enableConcentrationMeasurements === true) {
      this.airQuality.createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(10);
      this.airQuality.createDefaultCarbonDioxideConcentrationMeasurementClusterServer(400);
      this.airQuality.createDefaultNitrogenDioxideConcentrationMeasurementClusterServer(1);
      this.airQuality.createDefaultOzoneConcentrationMeasurementClusterServer(1);
      this.airQuality.createDefaultFormaldehydeConcentrationMeasurementClusterServer(1);
      this.airQuality.createDefaultPm1ConcentrationMeasurementClusterServer(100);
      this.airQuality.createDefaultPm25ConcentrationMeasurementClusterServer(100);
      this.airQuality.createDefaultPm10ConcentrationMeasurementClusterServer(100);
      this.airQuality.createDefaultRadonConcentrationMeasurementClusterServer(100);
      this.airQuality.createDefaultTvocMeasurementClusterServer(100);
    }
    this.setSelectDevice(this.airQuality.serialNumber ?? '', this.airQuality.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.airQuality.deviceName ?? '')) {
      await this.registerDevice(this.airQuality);
      this.bridgedDevices.set(this.airQuality.deviceName ?? '', this.airQuality);
    } else {
      this.airQuality = undefined;
    }

    /** ********************* Create a momentary switch ***********************/
    this.momentarySwitch = new MatterbridgeEndpoint([genericSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Momentary switch' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Momentary switch',
        'serial_947942331225',
        0xfff1,
        'Matterbridge',
        'Matterbridge MomentarySwitch',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createDefaultSwitchClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(50, PowerSource.BatChargeLevel.Ok, 2900, 'CR2450', 1);
    this.setSelectDevice(this.momentarySwitch.serialNumber ?? '', this.momentarySwitch.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.momentarySwitch.deviceName ?? '')) {
      await this.registerDevice(this.momentarySwitch);
      this.bridgedDevices.set(this.momentarySwitch.deviceName ?? '', this.momentarySwitch);
    } else {
      this.momentarySwitch = undefined;
    }

    /** ********************* Create a latching switch ***********************/
    this.latchingSwitch = new MatterbridgeEndpoint([genericSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Latching switch' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Latching switch',
        'serial_947442331225',
        0xfff1,
        'Matterbridge',
        'Matterbridge LatchingSwitch',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createDefaultLatchingSwitchClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(10, PowerSource.BatChargeLevel.Critical, 2850, 'CR2032', 1);
    this.setSelectDevice(this.latchingSwitch.serialNumber ?? '', this.latchingSwitch.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(this.latchingSwitch.deviceName ?? '')) {
      await this.registerDevice(this.latchingSwitch);
      this.bridgedDevices.set(this.latchingSwitch.deviceName ?? '', this.latchingSwitch);
    } else {
      this.latchingSwitch = undefined;
    }

    /** ********************* Create a vacuum ***********************/

    const robot = new Robot('Robot Vacuum', '1238777820');
    this.setSelectDevice(robot.serialNumber ?? '', robot.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(robot.deviceName ?? '')) {
      await this.registerDevice(robot);
      this.bridgedDevices.set(robot.deviceName ?? '', robot);
    }

    /** ********************* Create the appliances ***********************/

    const laundryWasherDevice = new Appliances(laundryWasher, 'Laundry Washer', '1234567890');
    this.setSelectDevice(laundryWasherDevice.serialNumber ?? '', laundryWasherDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(laundryWasherDevice.deviceName ?? '')) {
      await this.registerDevice(laundryWasherDevice);
      this.bridgedDevices.set(laundryWasherDevice.deviceName ?? '', laundryWasherDevice);
    }

    const laundryDryerDevice = new Appliances(laundryDryer, 'Laundry Dryer', '1235227890');
    this.setSelectDevice(laundryDryerDevice.serialNumber ?? '', laundryDryerDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(laundryDryerDevice.deviceName ?? '')) {
      await this.registerDevice(laundryDryerDevice);
      this.bridgedDevices.set(laundryDryerDevice.deviceName ?? '', laundryDryerDevice);
    }

    const dishwasherDevice = new Appliances(dishwasher, 'Dishwasher', '0987654321');
    this.setSelectDevice(dishwasherDevice.serialNumber ?? '', dishwasherDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(dishwasherDevice.deviceName ?? '')) {
      await this.registerDevice(dishwasherDevice);
      this.bridgedDevices.set(dishwasherDevice.deviceName ?? '', dishwasherDevice);
    }

    const refrigeratorDevice = new Appliances(refrigerator, 'Refrigerator', '9987654322');
    refrigeratorDevice.addFixedLabel('composed', 'Refrigerator');
    this.setSelectDevice(refrigeratorDevice.serialNumber ?? '', refrigeratorDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(refrigeratorDevice.deviceName ?? '')) {
      await this.registerDevice(refrigeratorDevice);
      this.bridgedDevices.set(refrigeratorDevice.deviceName ?? '', refrigeratorDevice);
    }

    const ovenDevice = new Appliances(oven, 'Oven', '1298867891');
    ovenDevice.addFixedLabel('composed', 'Oven');
    this.setSelectDevice(ovenDevice.serialNumber ?? '', ovenDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(ovenDevice.deviceName ?? '')) {
      await this.registerDevice(ovenDevice);
      this.bridgedDevices.set(ovenDevice.deviceName ?? '', ovenDevice);
    }

    const microwaveOvenDevice = new Appliances(microwaveOven, 'Microwave Oven', '1234567892');
    this.setSelectDevice(microwaveOvenDevice.serialNumber ?? '', microwaveOvenDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(microwaveOvenDevice.deviceName ?? '')) {
      await this.registerDevice(microwaveOvenDevice);
      this.bridgedDevices.set(microwaveOvenDevice.deviceName ?? '', microwaveOvenDevice);
    }

    const extractorHoodDevice = new Appliances(extractorHood, 'Extractor Hood', '1234567893');
    this.setSelectDevice(extractorHoodDevice.serialNumber ?? '', extractorHoodDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(extractorHoodDevice.deviceName ?? '')) {
      await this.registerDevice(extractorHoodDevice);
      this.bridgedDevices.set(extractorHoodDevice.deviceName ?? '', extractorHoodDevice);
    }

    const cooktopDevice = new Appliances(cooktop, 'Cooktop', '1255887894');
    this.setSelectDevice(cooktopDevice.serialNumber ?? '', cooktopDevice.deviceName ?? '', undefined, 'hub');
    if (this.validateDevice(cooktopDevice.deviceName ?? '')) {
      await this.registerDevice(cooktopDevice);
      this.bridgedDevices.set(cooktopDevice.deviceName ?? '', cooktopDevice);
    }
  }

  override async onConfigure() {
    await super.onConfigure();
    this.log.info('onConfigure called');

    // Set switch to off
    await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.switch.log);
    await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitch.log);
    this.switch?.log.info(`Set switch initial onOff to ${this.intervalOnOff}`);
    if (this.config.useInterval) {
      // Toggle switch onOff every minute
      this.switchInterval = setInterval(
        async () => {
          await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.switch.log);
          await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitch.log);
          this.log.info(`Set switches onOff to ${this.intervalOnOff}`);
          this.intervalOnOff = !this.intervalOnOff;
        },
        60 * 1000 + 100,
      );
    }

    // Set light on/off to off
    await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff.log);
    this.lightOnOff?.log.info('Set light initial onOff to false.');

    // Set dimmer on/off to off
    await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
    await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 1, this.dimmer.log);
    await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedDimmerSwitch.log);
    await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 1, this.mountedDimmerSwitch.log);
    this.dimmer?.log.info(`Set dimmer initial onOff to false, currentLevel to 1.`);

    // Set light to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light.log);
    await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 200, this.light.log);
    await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', 0, this.light.log);
    await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', 128, this.light.log);
    await this.light?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.light?.log.info('Set light initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light XY to true, level to 100% and XY to red
    await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY.log);
    await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 254, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentX', 0.7006 * 65536, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentY', 0.2993 * 65536, this.lightXY.log);
    await this.lightXY?.configureColorControlMode(ColorControl.ColorMode.CurrentXAndCurrentY);
    this.lightXY?.log.info('Set light XY initial onOff to true, currentLevel to 254, X to 0.7006 and Y to 0.2993.');

    // Set light HS to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS.log);
    await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 1, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', 0, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', 128, this.lightHS.log);
    await this.lightHS?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.lightHS?.log.info('Set light HS initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light CT to true, level to 50% and colorTemperatureMireds to 250
    await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT.log);
    await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 128, this.lightCT.log);
    await this.lightCT?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', 250, this.lightCT.log);
    await this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
    this.lightCT?.log.info('Set light CT initial onOff to true, currentLevel to 128, colorTemperatureMireds to 250.');

    if (this.config.useInterval) {
      this.lightInterval = setInterval(
        async () => {
          this.intervalLevel += 10;
          if (this.intervalLevel >= 250) {
            this.intervalLevel = 0;
            await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff.log);
            await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedDimmerSwitch.log);
            await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light.log);
            await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightCT.log);
            this.log.info('Set lights onOff to false');
          } else {
            await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightOnOff?.log);
            await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.mountedDimmerSwitch.log);
            await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.light.log);
            await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT.log);
            this.log.info('Set lights onOff to true');
            await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.mountedDimmerSwitch.log);
            await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.light.log);
            await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.lightXY.log);
            await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.lightHS.log);
            await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.lightCT.log);
            this.log.info(`Set lights currentLevel to ${this.intervalLevel}`);
          }
          this.intervalColorTemperature += 50;
          if (this.intervalColorTemperature > 500) {
            this.intervalColorTemperature = 147;
          }
          await this.light?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.light.log);
          await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightHS.log);
          await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightXY.log);
          await this.lightCT?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightCT.log);
          await this.light?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          await this.lightHS?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          await this.lightXY?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          await this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          this.log.info(`Set lights colorTemperatureMireds to ${this.intervalColorTemperature}`);
        },
        60 * 1000 + 200,
      );
    }

    // Set outlet to off
    await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.outlet.log);
    this.outlet?.log.info('Set outlet initial onOff to false');
    if (this.config.useInterval) {
      // Toggle outlet onOff every minute
      this.outletInterval = setInterval(
        async () => {
          const state = this.outlet?.getAttribute(OnOff.Cluster.id, 'onOff', this.outlet.log);
          if (isValidBoolean(state)) {
            await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', !state, this.outlet.log);
            this.outlet?.log.info(`Set outlet onOff to ${!state}`);
          }
        },
        60 * 1000 + 300,
      );
    }

    // Set cover to target = current position and status to stopped (current position is persisted in the cluster)
    await this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
    this.cover?.log.info('Set cover initial targetPositionLiftPercent100ths = currentPositionLiftPercent100ths and operationalStatus to Stopped.');
    if (this.config.useInterval) {
      // Increment cover position every minute
      this.coverInterval = setInterval(
        async () => {
          let position = this.cover?.getAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.cover.log);
          if (isValidNumber(position, 0, 10000)) {
            position = position > 9000 ? 0 : position + 1000;
            await this.cover?.setAttribute(WindowCovering.Cluster.id, 'targetPositionLiftPercent100ths', position, this.cover.log);
            await this.cover?.setAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', position, this.cover.log);
            await this.cover?.setAttribute(
              WindowCovering.Cluster.id,
              'operationalStatus',
              { global: WindowCovering.MovementStatus.Stopped, lift: WindowCovering.MovementStatus.Stopped, tilt: WindowCovering.MovementStatus.Stopped },
              this.cover.log,
            );
            this.cover?.log.info(`Set cover current and target positionLiftPercent100ths to ${position} and operationalStatus to Stopped`);
          }
        },
        60 * 1000 + 400,
      );
    }

    // Set lock to Locked
    await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Locked, this.lock.log);
    this.lock?.log.info('Set lock initial lockState to Locked');
    if (this.config.useInterval) {
      // Toggle lock every minute
      this.lockInterval = setInterval(
        async () => {
          const status = this.lock?.getAttribute(DoorLock.Cluster.id, 'lockState', this.lock.log);
          if (isValidNumber(status, DoorLock.LockState.Locked, DoorLock.LockState.Unlocked)) {
            await this.lock?.setAttribute(
              DoorLock.Cluster.id,
              'lockState',
              status === DoorLock.LockState.Locked ? DoorLock.LockState.Unlocked : DoorLock.LockState.Locked,
              this.lock.log,
            );
            this.lock?.log.info(`Set lock lockState to ${status === DoorLock.LockState.Locked ? 'Unlocked' : 'Locked'}`);
          }
        },
        60 * 1000 + 500,
      );
    }

    // Set local to 16°C
    await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'localTemperature', 16 * 100, this.thermoAuto.log);
    await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Auto, this.thermoAuto.log);
    this.thermoAuto?.log.info('Set thermostat initial localTemperature to 16°C and mode Auto');
    const temperature = this.thermoAuto?.getChildEndpointByName('Temperature');
    await temperature?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 16 * 100, this.thermoAuto?.log);
    const humidity = this.thermoAuto?.getChildEndpointByName('Humidity');
    await humidity?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.thermoAuto?.log);
    const flow = this.thermoAuto?.getChildEndpointByName('Flow');
    await flow?.setAttribute(FlowMeasurement.Cluster.id, 'measuredValue', 10, this.thermoAuto?.log);
    this.thermoAuto?.log.info('Set thermostat ext temperature to 16°C, ext humidity to 50% and ext valve flow to 10');

    if (this.config.useInterval) {
      // Increment localTemperature every minute
      this.thermoInterval = setInterval(
        async () => {
          let temperature = this.thermoAuto?.getAttribute(ThermostatCluster.id, 'localTemperature', this.thermoAuto.log);
          if (isValidNumber(temperature, 1600, 2400)) {
            temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
            await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoAuto.log);

            await this.thermoHeat?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoHeat.log);
            const tempIn = this.thermoHeat?.getChildEndpointByName('TemperatureIN');
            await tempIn?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature - 50, this.thermoHeat?.log);
            const tempOut = this.thermoHeat?.getChildEndpointByName('TemperatureOUT');
            await tempOut?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature - 400, this.thermoHeat?.log);

            await this.thermoCool?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoCool.log);
            const temp = this.thermoCool?.getChildEndpointByName('Temperature');
            await temp?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.thermoCool?.log);
            const humidity = this.thermoCool?.getChildEndpointByName('Humidity');
            await humidity?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.thermoCool?.log);
            const flow = this.thermoCool?.getChildEndpointByName('Flow');
            await flow?.setAttribute(FlowMeasurement.Cluster.id, 'measuredValue', 10, this.thermoCool?.log);
            this.thermoAuto?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
            this.thermoHeat?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
            this.thermoCool?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
          }
        },
        60 * 1000 + 600,
      );
    }

    // Set airConditioner to on
    await this.airConditioner?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.airConditioner.log);
    await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', 2000, this.airConditioner.log);
    if (this.config.useInterval) {
      // Increment airConditioner localTemperature every minute
      this.airConditionerInterval = setInterval(
        async () => {
          let temperature = this.airConditioner?.getAttribute(ThermostatCluster.id, 'localTemperature', this.airConditioner.log);
          if (isValidNumber(temperature, 1600, 2400)) {
            temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
            await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.airConditioner.log);
            await this.airConditioner?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.airConditioner.log);
            await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.airConditioner.log);
            this.airConditioner?.log.info(`Set airConditioner localTemperature to ${temperature / 100}°C`);
          }
        },
        60 * 1000 + 550,
      );
    }

    // Set fan to auto
    this.fan?.log.info('Set fan initial fanMode to Auto, percentCurrent and percentSetting to 50 and speedCurrent and speedSetting to 50');
    await this.fan?.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Auto, this.fan.log);
    await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 50, this.fan.log);
    await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.fan.log);
    await this.fan?.setAttribute(FanControl.Cluster.id, 'speedCurrent', 50, this.fan.log);
    await this.fan?.setAttribute(FanControl.Cluster.id, 'speedSetting', 50, this.fan.log);
    if (this.config.useInterval) {
      // Increment fan percentCurrent every minute
      this.fanInterval = setInterval(
        async () => {
          const mode = this.fan?.getAttribute(FanControl.Cluster.id, 'fanMode', this.fan.log);
          let value = this.fan?.getAttribute(FanControl.Cluster.id, 'percentCurrent', this.fan.log);
          if (isValidNumber(mode, FanControl.FanMode.Off, FanControl.FanMode.Auto) && mode === FanControl.FanMode.Auto && isValidNumber(value, 0, 100)) {
            value = value + 10 >= 100 ? 0 : value + 10;
            await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', value, this.fan.log);
            await this.fan?.setAttribute(FanControl.Cluster.id, 'percentSetting', value, this.fan.log);
            this.fan?.log.info(`Set fan percentCurrent and percentSetting to ${value}`);
          }
        },
        60 * 1000 + 700,
      );
    }

    // Set waterLeak to false
    await this.waterLeak?.setAttribute(BooleanState.Cluster.id, 'stateValue', false, this.waterLeak.log);
    if (this.config.useInterval) {
      // Toggle waterLeak every minute
      this.waterLeakInterval = setInterval(
        async () => {
          let value = this.waterLeak?.getAttribute(BooleanState.Cluster.id, 'stateValue', this.waterLeak.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.waterLeak?.setAttribute(BooleanState.Cluster.id, 'stateValue', value, this.waterLeak.log);
            this.waterLeak?.log.info(`Set waterLeak stateValue to ${value}`);
          }
        },
        60 * 1000 + 800,
      );
    }

    // Set waterFreeze to false
    await this.waterFreeze?.setAttribute(BooleanState.Cluster.id, 'stateValue', false, this.waterFreeze.log);
    if (this.config.useInterval) {
      // Toggle waterFreeze every minute
      this.waterFreezeInterval = setInterval(
        async () => {
          let value = this.waterFreeze?.getAttribute(BooleanState.Cluster.id, 'stateValue', this.waterFreeze.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.waterFreeze?.setAttribute(BooleanState.Cluster.id, 'stateValue', value, this.waterFreeze.log);
            this.waterFreeze?.log.info(`Set waterFreeze stateValue to ${value}`);
          }
        },
        60 * 1000 + 900,
      );
    }

    // Set rain to false
    await this.rain?.setAttribute(BooleanState.Cluster.id, 'stateValue', false, this.rain.log);
    if (this.config.useInterval) {
      // Toggle rain every minute
      this.rainInterval = setInterval(
        async () => {
          let value = this.rain?.getAttribute(BooleanState.Cluster.id, 'stateValue', this.rain.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.rain?.setAttribute(BooleanState.Cluster.id, 'stateValue', value, this.rain.log);
            this.rain?.log.info(`Set rain stateValue to ${value}`);
          }
        },
        60 * 1000 + 1000,
      );
    }

    // Set smoke to Normal
    await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smokeCo.log);
    await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smokeCo.log);
    await this.smokeOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smokeOnly.log);
    await this.coOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.coOnly.log);
    if (this.config.useInterval) {
      // Toggle smoke every minute
      this.smokeInterval = setInterval(
        async () => {
          let value = this.smokeCo?.getAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', this.smokeCo.log);
          if (isValidNumber(value, SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Critical)) {
            value = value === SmokeCoAlarm.AlarmState.Normal ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
            await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', value, this.smokeCo.log);
            await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', value, this.smokeCo.log);
            await this.smokeOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', value, this.smokeOnly.log);
            await this.coOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', value, this.coOnly.log);
            this.smokeCo?.log.info(`Set smoke smokeState and coState to ${value}`);
          }
        },
        60 * 1000 + 1100,
      );
    }

    // Set air quality to Normal
    await this.airQuality?.setAttribute(AirQuality.Cluster.id, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    await this.airQuality?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 2150, this.airQuality.log);
    await this.airQuality?.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', 5500, this.airQuality.log);
    if (this.config.enableConcentrationMeasurements === true) {
      await this.airQuality?.setAttribute(CarbonMonoxideConcentrationMeasurement.Cluster.id, 'measuredValue', 10, this.airQuality.log);
      await this.airQuality?.setAttribute(CarbonDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 400, this.airQuality.log);
      await this.airQuality?.setAttribute(NitrogenDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
      await this.airQuality?.setAttribute(OzoneConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
      await this.airQuality?.setAttribute(FormaldehydeConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
      await this.airQuality?.setAttribute(Pm1ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
      await this.airQuality?.setAttribute(Pm25ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
      await this.airQuality?.setAttribute(Pm10ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
      await this.airQuality?.setAttribute(RadonConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
      await this.airQuality?.setAttribute(TotalVolatileOrganicCompoundsConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    }

    if (this.config.useInterval) {
      // Toggle air quality every minute
      this.airQualityInterval = setInterval(
        async () => {
          let value = this.airQuality?.getAttribute(AirQuality.Cluster.id, 'airQuality', this.airQuality?.log);
          if (isValidNumber(value, AirQuality.AirQualityEnum.Good, AirQuality.AirQualityEnum.ExtremelyPoor)) {
            value = value >= AirQuality.AirQualityEnum.ExtremelyPoor ? AirQuality.AirQualityEnum.Good : value + 1;
            await this.airQuality?.setAttribute(AirQuality.Cluster.id, 'airQuality', value, this.airQuality.log);
            this.airQuality?.log.info(`Set air quality to ${value}`);
          }
        },
        60 * 1000 + 1100,
      );
    }

    // Set dead front onOff on for Appliances: brings the appliances out of the "dead front" state
    const airConditionerDevice = this.bridgedDevices.get('Air Conditioner');
    await airConditionerDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, airConditionerDevice.log);

    const laundryWasherDevice = this.bridgedDevices.get('Laundry Washer');
    await laundryWasherDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, laundryWasherDevice.log);

    const laundryDryerDevice = this.bridgedDevices.get('Laundry Dryer');
    await laundryDryerDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, laundryDryerDevice.log);

    const dishwasherDevice = this.bridgedDevices.get('Dishwasher');
    await dishwasherDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, dishwasherDevice.log);
    this.log.info(`Set appliances dead front OnOff to on`);

    // Set onOff only on for Appliances: brings the appliances on
    const cooktopDevice = this.bridgedDevices.get('Cooktop');
    await cooktopDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, cooktopDevice.log);
    cooktopDevice?.log.info(`Set Cooktop onOff only OnOff to on`);
    const surface1 = cooktopDevice?.getChildEndpointByName('Surface1');
    await surface1?.setAttribute(OnOff.Cluster.id, 'onOff', true, surface1.log);
    surface1?.log.info(`Set Surface 1 onOff only OnOff to on`);
    const surface2 = cooktopDevice?.getChildEndpointByName('Surface2');
    await surface2?.setAttribute(OnOff.Cluster.id, 'onOff', true, surface2.log);
    surface2?.log.info(`Set Surface 2 onOff only OnOff to on`);

    if (this.config.useInterval) {
      // Trigger the switches every minute
      this.genericSwitchInterval = setInterval(
        async () => {
          if (this.genericSwitchLastEvent === 'Release') {
            await this.momentarySwitch?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            this.genericSwitchLastEvent = 'Single';
          } else if (this.genericSwitchLastEvent === 'Single') {
            await this.momentarySwitch?.triggerSwitchEvent('Double', this.momentarySwitch?.log);
            this.genericSwitchLastEvent = 'Double';
          } else if (this.genericSwitchLastEvent === 'Double') {
            await this.momentarySwitch?.triggerSwitchEvent('Long', this.momentarySwitch?.log);
            this.genericSwitchLastEvent = 'Long';
          } else if (this.genericSwitchLastEvent === 'Long') {
            await this.latchingSwitch?.triggerSwitchEvent('Press', this.latchingSwitch?.log);
            this.genericSwitchLastEvent = 'Press';
          } else if (this.genericSwitchLastEvent === 'Press') {
            await this.latchingSwitch?.triggerSwitchEvent('Release', this.latchingSwitch?.log);
            this.genericSwitchLastEvent = 'Release';
          }
        },
        60 * 1000 + 1900,
      );
    }
  }

  override async onShutdown(reason?: string) {
    clearInterval(this.switchInterval);
    clearInterval(this.lightInterval);
    clearInterval(this.outletInterval);
    clearInterval(this.coverInterval);
    clearInterval(this.lockInterval);
    clearInterval(this.thermoInterval);
    clearInterval(this.fanInterval);
    clearInterval(this.waterLeakInterval);
    clearInterval(this.waterFreezeInterval);
    clearInterval(this.rainInterval);
    clearInterval(this.smokeInterval);
    clearInterval(this.airQualityInterval);
    clearInterval(this.airConditionerInterval);
    clearInterval(this.genericSwitchInterval);
    await super.onShutdown(reason);
    this.log.info('onShutdown called with reason:', reason ?? 'none');
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices(500);
  }
}
