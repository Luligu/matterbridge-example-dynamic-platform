import {
  AirQuality,
  AirQualityCluster,
  AtLeastOne,
  BitFlag,
  BooleanStateCluster,
  BooleanStateConfiguration,
  CarbonDioxideConcentrationMeasurement,
  CarbonMonoxideConcentrationMeasurement,
  ColorControl,
  ColorControlCluster,
  DeviceTypeDefinition,
  DoorLock,
  DoorLockCluster,
  EndpointOptions,
  FanControl,
  FanControlCluster,
  FlowMeasurement,
  FlowMeasurementCluster,
  FormaldehydeConcentrationMeasurement,
  LevelControlCluster,
  MatterbridgeEndpoint,
  NitrogenDioxideConcentrationMeasurement,
  OnOffCluster,
  OzoneConcentrationMeasurement,
  PlatformConfig,
  Pm10ConcentrationMeasurement,
  Pm1ConcentrationMeasurement,
  Pm25ConcentrationMeasurement,
  RadonConcentrationMeasurement,
  RelativeHumidityMeasurement,
  RelativeHumidityMeasurementCluster,
  SmokeCoAlarm,
  SmokeCoAlarmCluster,
  TemperatureMeasurement,
  TemperatureMeasurementCluster,
  Thermostat,
  ThermostatCluster,
  TotalVolatileOrganicCompoundsConcentrationMeasurement,
  TypeFromPartialBitSchema,
  WindowCovering,
  WindowCoveringCluster,
  airConditioner,
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
  LocationTag,
  airPurifier,
} from 'matterbridge';
import { Matterbridge, /* MatterbridgeEndpoint as */ MatterbridgeDevice, MatterbridgeDynamicPlatform } from 'matterbridge';
import { isValidBoolean, isValidNumber } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  switch: MatterbridgeDevice | undefined;
  lightOnOff: MatterbridgeDevice | undefined;
  dimmer: MatterbridgeDevice | undefined;
  light: MatterbridgeDevice | undefined;
  lightXY: MatterbridgeDevice | undefined;
  lightHS: MatterbridgeDevice | undefined;
  lightCT: MatterbridgeDevice | undefined;
  outlet: MatterbridgeDevice | undefined;
  cover: MatterbridgeDevice | undefined;
  lock: MatterbridgeDevice | undefined;
  thermoAuto: MatterbridgeDevice | undefined;
  thermoHeat: MatterbridgeDevice | undefined;
  thermoCool: MatterbridgeDevice | undefined;
  fan: MatterbridgeDevice | undefined;
  waterLeak: MatterbridgeDevice | undefined;
  waterFreeze: MatterbridgeDevice | undefined;
  rain: MatterbridgeDevice | undefined;
  smoke: MatterbridgeDevice | undefined;
  airQuality: MatterbridgeDevice | undefined;
  airConditioner: MatterbridgeDevice | undefined;
  airPurifier: MatterbridgeDevice | undefined;
  pump: MatterbridgeDevice | undefined;
  valve: MatterbridgeDevice | undefined;

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

  bridgedDevices = new Map<string, MatterbridgeDevice>();

  fanModeLookup = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart'];

  async createMutableDevice(definition: DeviceTypeDefinition | AtLeastOne<DeviceTypeDefinition>, options: EndpointOptions = {}, debug = false): Promise<MatterbridgeDevice> {
    let device: MatterbridgeDevice;
    if (this.matterbridge.edge === true) device = new MatterbridgeEndpoint(definition, options, debug) as unknown as MatterbridgeDevice;
    else device = new MatterbridgeDevice(definition, options, debug);
    return device;
  }

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('1.6.6')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "1.6.6". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }

    this.log.info('Initializing platform:', this.config.name);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Create a switch device
    this.switch = await this.createMutableDevice([onOffSwitch, bridgedNode], { uniqueStorageKey: 'Switch' }, this.config.debug as boolean);
    this.switch.log.logName = 'Switch';
    this.switch.createDefaultIdentifyClusterServer();
    this.switch.createDefaultGroupsClusterServer();
    this.switch.createDefaultScenesClusterServer();
    this.switch.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Switch',
      '0x23452164',
      0xfff1,
      'Matterbridge',
      'Matterbridge Switch',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.switch.createDefaultOnOffClusterServer();
    this.switch.addDeviceType(powerSource);
    this.switch.createDefaultPowerSourceRechargeableBatteryClusterServer(70);
    await this.registerDevice(this.switch);
    this.bridgedDevices.set(this.switch.deviceName ?? '', this.switch);

    this.switch.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.switch.addCommandHandler('on', async () => {
      await this.switch?.setAttribute(OnOffCluster.id, 'onOff', true, this.switch.log, this.switch);
      this.switch?.log.info('Command on called');
    });
    this.switch.addCommandHandler('off', async () => {
      await this.switch?.setAttribute(OnOffCluster.id, 'onOff', false, this.switch.log, this.switch);
      this.switch?.log.info('Command off called');
    });

    // Create a on off light device
    this.lightOnOff = await this.createMutableDevice([onOffLight, bridgedNode], { uniqueStorageKey: 'Light (on/off)' }, this.config.debug as boolean);
    this.lightOnOff.log.logName = 'Light (on/off)';
    this.lightOnOff.createDefaultIdentifyClusterServer();
    this.lightOnOff.createDefaultGroupsClusterServer();
    this.lightOnOff.createDefaultScenesClusterServer();
    this.lightOnOff.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Light (on/off)',
      '0x2342375564',
      0xfff1,
      'Matterbridge',
      'Matterbridge Light on/off',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.lightOnOff.createDefaultOnOffClusterServer();
    this.lightOnOff.addDeviceType(powerSource);
    this.lightOnOff.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.lightOnOff);
    this.bridgedDevices.set(this.lightOnOff.deviceName ?? '', this.lightOnOff);

    this.lightOnOff.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightOnOff?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightOnOff.addCommandHandler('on', async () => {
      await this.light?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightOnOff?.log, this.lightOnOff);
      this.lightOnOff?.log.info('Command on called');
    });
    this.lightOnOff.addCommandHandler('off', async () => {
      await this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightOnOff?.log, this.lightOnOff);
      this.lightOnOff?.log.info('Command off called');
    });

    // Create a dimmer device
    this.dimmer = await this.createMutableDevice([dimmableLight, bridgedNode], { uniqueStorageKey: 'Dimmer' }, this.config.debug as boolean);
    this.dimmer.log.logName = 'Dimmer';
    this.dimmer.createDefaultIdentifyClusterServer();
    this.dimmer.createDefaultGroupsClusterServer();
    this.dimmer.createDefaultScenesClusterServer();
    this.dimmer.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Dimmer',
      '0x234554564',
      0xfff1,
      'Matterbridge',
      'Matterbridge Dimmer',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.dimmer.createDefaultOnOffClusterServer();
    this.dimmer.createDefaultLevelControlClusterServer();
    this.dimmer.addDeviceType(powerSource);
    this.dimmer.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    await this.registerDevice(this.dimmer);
    this.bridgedDevices.set(this.dimmer.deviceName ?? '', this.dimmer);

    this.dimmer.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.dimmer?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.dimmer.addCommandHandler('on', async () => {
      await this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', true, this.dimmer.log, this.dimmer);
      this.dimmer?.log.info('Command on called');
    });
    this.dimmer.addCommandHandler('off', async () => {
      await this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', false, this.dimmer.log, this.dimmer);
      this.dimmer?.log.info('Command off called');
    });
    this.dimmer.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log, this.dimmer);
      this.dimmer?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.dimmer.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log, this.dimmer);
      this.dimmer?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // Create a light device
    this.light = await this.createMutableDevice([colorTemperatureLight, bridgedNode], { uniqueStorageKey: 'Light (XY, HS and CT)' }, this.config.debug as boolean);
    this.light.log.logName = 'Light (XY, HS and CT)';
    this.light.createDefaultIdentifyClusterServer();
    this.light.createDefaultGroupsClusterServer();
    this.light.createDefaultScenesClusterServer();
    this.light.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Light (XY, HS and CT)',
      '0x23480564',
      0xfff1,
      'Matterbridge',
      'Matterbridge Light',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.light.createDefaultOnOffClusterServer();
    this.light.createDefaultLevelControlClusterServer();
    this.light.createDefaultColorControlClusterServer();
    this.light.addDeviceType(powerSource);
    this.light.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    await this.registerDevice(this.light);
    this.bridgedDevices.set(this.light.deviceName ?? '', this.light);

    this.light.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.light?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.light.addCommandHandler('on', async () => {
      await this.light?.setAttribute(OnOffCluster.id, 'onOff', true, this.light?.log, this.light);
      this.light?.log.info('Command on called');
    });
    this.light.addCommandHandler('off', async () => {
      await this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.light?.log, this.light);
      this.light?.log.info('Command off called');
    });
    this.light.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.light.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.light.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.light?.setAttribute(ColorControlCluster.id, 'currentX', colorX, this.light?.log, this.light);
      await this.light?.setAttribute(ColorControlCluster.id, 'currentY', colorY, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.light.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation } }) => {
      await this.light?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.light?.log, this.light);
      await this.light?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.light?.log, this.light);
      this.light?.log.debug(
        `Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.light.addCommandHandler('moveToHue', async ({ request: { hue }, attributes: { currentHue, currentSaturation } }) => {
      await this.light?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToHue called request: hue ${hue} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToSaturation', async ({ request: { saturation }, attributes: { currentHue, currentSaturation } }) => {
      await this.light?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.light?.log, this.light);
      this.light?.log.debug(
        `Command moveToSaturation called request: saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.light.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      await this.light?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', request.colorTemperatureMireds, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create a light device with HS color control
    this.lightHS = await this.createMutableDevice([colorTemperatureLight, bridgedNode], { uniqueStorageKey: 'Light (HS)' }, this.config.debug as boolean);
    this.lightHS.log.logName = 'Light (HS, CT)';
    this.lightHS.createDefaultIdentifyClusterServer();
    this.lightHS.createDefaultGroupsClusterServer();
    this.lightHS.createDefaultScenesClusterServer();
    this.lightHS.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Light (HS, CT)',
      '0x25097564',
      0xfff1,
      'Matterbridge',
      'Matterbridge Light',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.lightHS.createDefaultOnOffClusterServer();
    this.lightHS.createDefaultLevelControlClusterServer();
    this.lightHS.createHsColorControlClusterServer();
    // await this.lightHS.configureColorControlCluster(true, false, false, ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.lightHS.addDeviceType(powerSource);
    this.lightHS.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.lightHS);
    this.bridgedDevices.set(this.lightHS.deviceName ?? '', this.lightHS);

    this.lightHS.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightHS?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightHS.addCommandHandler('on', async () => {
      await this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.info('Command on called');
    });
    this.lightHS.addCommandHandler('off', async () => {
      await this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.info('Command off called');
    });
    this.lightHS.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      await this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      await this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation } }) => {
      await this.lightHS?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.lightHS?.log, this.lightHS);
      await this.lightHS?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(
        `Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.lightHS.addCommandHandler('moveToHue', async ({ request: { hue }, attributes: { currentHue, currentSaturation } }) => {
      await this.lightHS?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(`Command moveToHue called request: hue ${hue} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToSaturation', async ({ request: { saturation }, attributes: { currentHue, currentSaturation } }) => {
      await this.lightHS?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(
        `Command moveToSaturation called request: saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.lightHS.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      await this.light?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', request.colorTemperatureMireds, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create a light device with XY color control
    this.lightXY = await this.createMutableDevice([colorTemperatureLight, bridgedNode], { uniqueStorageKey: 'Light (XY)' }, this.config.debug as boolean);
    this.lightXY.log.logName = 'Light (XY, CT)';
    this.lightXY.createDefaultIdentifyClusterServer();
    this.lightXY.createDefaultGroupsClusterServer();
    this.lightXY.createDefaultScenesClusterServer();
    this.lightXY.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Light (XY, CT)',
      '0x23497564',
      0xfff1,
      'Matterbridge',
      'Matterbridge Light',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.lightXY.createDefaultOnOffClusterServer();
    this.lightXY.createDefaultLevelControlClusterServer();
    this.lightXY.createXyColorControlClusterServer();
    this.lightXY.addDeviceType(powerSource);
    this.lightXY.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.lightXY);
    this.bridgedDevices.set(this.lightXY.deviceName ?? '', this.lightXY);

    this.lightXY.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightXY?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightXY.addCommandHandler('on', async () => {
      await this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.info('Command on called');
    });
    this.lightXY.addCommandHandler('off', async () => {
      await this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.info('Command off called');
    });
    this.lightXY.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightXY.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightXY.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.lightXY?.setAttribute(ColorControlCluster.id, 'currentX', colorX, this.light?.log, this.light);
      await this.lightXY?.setAttribute(ColorControlCluster.id, 'currentY', colorY, this.light?.log, this.light);
      this.lightXY?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.lightXY.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      await this.light?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', request.colorTemperatureMireds, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create a light device with CT color control
    this.lightCT = await this.createMutableDevice([colorTemperatureLight, bridgedNode], { uniqueStorageKey: 'Light (CT)' }, this.config.debug as boolean);
    this.lightCT.log.logName = 'Light (CT)';
    this.lightCT.createDefaultIdentifyClusterServer();
    this.lightCT.createDefaultGroupsClusterServer();
    this.lightCT.createDefaultScenesClusterServer();
    this.lightCT.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Light (CT)',
      '0x23480749',
      0xfff1,
      'Matterbridge',
      'Matterbridge Light',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.lightCT.createDefaultOnOffClusterServer();
    this.lightCT.createDefaultLevelControlClusterServer();
    this.lightCT.createCtColorControlClusterServer();
    // await this.lightCT.configureColorControlCluster(false, false, true, ColorControl.ColorMode.ColorTemperatureMireds);
    this.lightCT.addDeviceType(powerSource);
    this.lightCT.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    await this.registerDevice(this.lightCT);
    this.bridgedDevices.set(this.lightCT.deviceName ?? '', this.lightCT);

    this.lightCT.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightCT?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightCT.addCommandHandler('on', async () => {
      await this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.info('Command on called');
    });
    this.lightCT.addCommandHandler('off', async () => {
      await this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.info('Command off called');
    });
    this.lightCT.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightCT.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightCT.addCommandHandler('moveToColorTemperature', async ({ request }) => {
      await this.lightCT?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', request.colorTemperatureMireds, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds}`);
    });

    // Create an outlet device
    this.outlet = await this.createMutableDevice([onOffOutlet, bridgedNode], { uniqueStorageKey: 'Outlet' }, this.config.debug as boolean);
    this.outlet.log.logName = 'Outlet';
    this.outlet.createDefaultIdentifyClusterServer();
    this.outlet.createDefaultGroupsClusterServer();
    this.outlet.createDefaultScenesClusterServer();
    this.outlet.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Outlet',
      '0x29252164',
      0xfff1,
      'Matterbridge',
      'Matterbridge Outlet',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.outlet.createDefaultOnOffClusterServer();
    this.outlet.addDeviceType(powerSource);
    this.outlet.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.outlet);
    this.bridgedDevices.set(this.outlet.deviceName ?? '', this.outlet);

    this.outlet.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.outlet?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outlet.addCommandHandler('on', async () => {
      await this.outlet?.setAttribute(OnOffCluster.id, 'onOff', true, this.outlet?.log, this.outlet);
      this.outlet?.log.info('Command on called');
    });
    this.outlet.addCommandHandler('off', async () => {
      await this.outlet?.setAttribute(OnOffCluster.id, 'onOff', false, this.outlet?.log, this.outlet);
      this.outlet?.log.info('Command off called');
    });

    // Create a window covering device
    // Matter uses 10000 = fully closed   0 = fully opened
    this.cover = await this.createMutableDevice([coverDevice, bridgedNode], { uniqueStorageKey: 'Cover' }, this.config.debug as boolean);
    this.cover.log.logName = 'Cover';
    this.cover.createDefaultIdentifyClusterServer();
    this.cover.createDefaultGroupsClusterServer();
    this.cover.createDefaultScenesClusterServer();
    this.cover.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Cover',
      '0x01020564',
      0xfff1,
      'Matterbridge',
      'Matterbridge Cover',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.cover.createDefaultWindowCoveringClusterServer();
    this.cover.addDeviceType(powerSource);
    this.cover.createDefaultPowerSourceRechargeableBatteryClusterServer(86);
    await this.registerDevice(this.cover);
    this.bridgedDevices.set(this.cover.deviceName ?? '', this.cover);

    this.cover.subscribeAttribute(
      WindowCoveringCluster.id,
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

    this.cover.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.cover?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.cover.addCommandHandler('stopMotion', async () => {
      await this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
      this.cover?.log.info(`Command stopMotion called`);
    });

    this.cover.addCommandHandler('downOrClose', async () => {
      await this.cover?.setWindowCoveringCurrentTargetStatus(10000, 10000, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(`Command downOrClose called`);
    });

    this.cover.addCommandHandler('upOrOpen', async () => {
      await this.cover?.setWindowCoveringCurrentTargetStatus(0, 0, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(`Command upOrOpen called`);
    });

    this.cover.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      await this.cover?.setWindowCoveringCurrentTargetStatus(liftPercent100thsValue, liftPercent100thsValue, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(`Command goToLiftPercentage ${liftPercent100thsValue} called`);
    });

    // Create a lock device
    this.lock = await this.createMutableDevice([doorLockDevice, bridgedNode], { uniqueStorageKey: 'Lock' }, this.config.debug as boolean);
    this.lock.log.logName = 'Lock';
    this.lock.createDefaultIdentifyClusterServer();
    this.lock.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Lock',
      '0x96352164',
      0xfff1,
      'Matterbridge',
      'Matterbridge Lock',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.lock.createDefaultDoorLockClusterServer();
    this.lock.addDeviceType(powerSource);
    this.lock.createDefaultPowerSourceRechargeableBatteryClusterServer(30);
    await this.registerDevice(this.lock);
    this.bridgedDevices.set(this.lock.deviceName ?? '', this.lock);

    this.lock.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lock?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lock.addCommandHandler('lockDoor', async () => {
      await this.lock?.setAttribute(DoorLockCluster.id, 'lockState', DoorLock.LockState.Locked, this.lock?.log, this.lock);
      this.lock?.log.info('Command lockDoor called');
    });
    this.lock.addCommandHandler('unlockDoor', async () => {
      await this.lock?.setAttribute(DoorLockCluster.id, 'lockState', DoorLock.LockState.Unlocked, this.lock?.log, this.lock);
      this.lock?.log.info('Command unlockDoor called');
    });

    // Create a thermostat with AutoMode device
    this.thermoAuto = await this.createMutableDevice([thermostatDevice, bridgedNode], { uniqueStorageKey: 'ThermostatAuto' }, this.config.debug as boolean);
    this.thermoAuto.log.logName = 'Thermostat (AutoMode)';
    this.thermoAuto.createDefaultIdentifyClusterServer();
    this.thermoAuto.createDefaultGroupsClusterServer();
    this.thermoAuto.createDefaultScenesClusterServer();
    this.thermoAuto.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Thermostat (AutoMode)',
      '0x96382164A',
      0xfff1,
      'Matterbridge',
      'Matterbridge Thermostat',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.thermoAuto.createDefaultThermostatClusterServer(20, 18, 22);
    this.thermoAuto.addDeviceType(powerSource);
    this.thermoAuto.createDefaultPowerSourceRechargeableBatteryClusterServer(70);

    const flowChild = this.thermoAuto.addChildDeviceTypeWithClusterServer('Flow', [flowSensor], [FlowMeasurement.Cluster.id]);
    flowChild.getClusterServer(FlowMeasurement.Cluster)?.setMeasuredValueAttribute(1 * 10);

    const tempChild = this.thermoAuto.addChildDeviceTypeWithClusterServer('Temperature', [temperatureSensor], [TemperatureMeasurement.Cluster.id]);
    tempChild.getClusterServer(TemperatureMeasurement.Cluster)?.setMeasuredValueAttribute(41 * 100);

    const humidityChild = this.thermoAuto.addChildDeviceTypeWithClusterServer('Humidity', [humiditySensor], [RelativeHumidityMeasurement.Cluster.id]);
    humidityChild.getClusterServer(RelativeHumidityMeasurement.Cluster)?.setMeasuredValueAttribute(80 * 100);

    await this.registerDevice(this.thermoAuto);
    this.bridgedDevices.set(this.thermoAuto.deviceName ?? '', this.thermoAuto);

    this.thermoAuto.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoAuto?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoAuto.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoAuto?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoAuto.addCommandHandler('setpointRaiseLower', async ({ request: { mode, amount } }) => {
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
    this.thermoAuto.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      async (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoAuto?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoAuto.log,
      this.thermoAuto,
    );
    this.thermoAuto.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedHeatingSetpoint',
      async (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
      this.thermoAuto,
    );
    this.thermoAuto.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedCoolingSetpoint',
      async (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
      this.thermoAuto,
    );

    // Create a thermostat with Heat device
    this.thermoHeat = await this.createMutableDevice([thermostatDevice, bridgedNode], { uniqueStorageKey: 'ThermostatHeat' }, this.config.debug as boolean);
    this.thermoHeat.log.logName = 'Thermostat (Heat)';
    this.thermoHeat.createDefaultIdentifyClusterServer();
    this.thermoHeat.createDefaultGroupsClusterServer();
    this.thermoHeat.createDefaultScenesClusterServer();
    this.thermoHeat.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Thermostat (Heat)',
      '0x96382164H',
      0xfff1,
      'Matterbridge',
      'Matterbridge Thermostat',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.thermoHeat.createDefaultHeatingThermostatClusterServer(20, 18, 5, 35);
    this.thermoHeat.addDeviceType(powerSource);
    this.thermoHeat.createDefaultPowerSourceRechargeableBatteryClusterServer(70);

    const heatTempIN = this.thermoHeat.addChildDeviceType('TemperatureIN', [temperatureSensor], {
      tagList: [{ mfgCode: null, namespaceId: LocationTag.Indoor.namespaceId, tag: LocationTag.Indoor.tag, label: null }],
    });
    heatTempIN.createDefaultIdentifyClusterServer();
    heatTempIN.createDefaultTemperatureMeasurementClusterServer(21 * 100);

    const heatTempOUT = this.thermoHeat.addChildDeviceType('TemperatureOUT', [temperatureSensor], {
      tagList: [{ mfgCode: null, namespaceId: LocationTag.Outdoor.namespaceId, tag: LocationTag.Outdoor.tag, label: null }],
    });
    heatTempOUT.createDefaultIdentifyClusterServer();
    heatTempOUT.createDefaultTemperatureMeasurementClusterServer(15 * 100);

    await this.registerDevice(this.thermoHeat);
    this.bridgedDevices.set(this.thermoHeat.deviceName ?? '', this.thermoHeat);

    this.thermoHeat.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoHeat?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoHeat.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoHeat?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoHeat.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      async (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoHeat?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoHeat.log,
    );
    this.thermoHeat.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedHeatingSetpoint',
      async (value) => {
        this.thermoHeat?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoHeat.log,
    );

    // Create a thermostat with Cool device
    this.thermoCool = await this.createMutableDevice([thermostatDevice, bridgedNode], { uniqueStorageKey: 'ThermostatCool' }, this.config.debug as boolean);
    this.thermoCool.log.logName = 'Thermostat (Cool)';
    this.thermoCool.createDefaultIdentifyClusterServer();
    this.thermoCool.createDefaultGroupsClusterServer();
    this.thermoCool.createDefaultScenesClusterServer();
    this.thermoCool.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Thermostat (Cool)',
      '0x96382164C',
      0xfff1,
      'Matterbridge',
      'Matterbridge Thermostat',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.thermoCool.createDefaultCoolingThermostatClusterServer(20, 18, 22);
    this.thermoCool.addDeviceType(powerSource);
    this.thermoCool.createDefaultPowerSourceRechargeableBatteryClusterServer(70);

    await this.registerDevice(this.thermoCool);
    this.bridgedDevices.set(this.thermoCool.deviceName ?? '', this.thermoCool);

    this.thermoCool.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoCool?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoCool.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoCool?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoCool.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      async (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoCool?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoCool.log,
    );
    this.thermoCool.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedCoolingSetpoint',
      async (value) => {
        this.thermoCool?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoCool.log,
    );

    // Create a airPurifier device
    this.airPurifier = await this.createMutableDevice(
      [airPurifier, temperatureSensor, humiditySensor, bridgedNode],
      { uniqueStorageKey: 'Air purifier' },
      this.config.debug as boolean,
    );
    this.airPurifier.log.logName = 'Air purifier';
    this.airPurifier.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Air purifier',
      '0x96584864AP',
      0xfff1,
      'Matterbridge',
      'Matterbridge Air purifier',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.airPurifier.createDefaultIdentifyClusterServer();
    this.airPurifier.createDefaultFanControlClusterServer();
    this.airPurifier.createDefaultTemperatureMeasurementClusterServer(20 * 100);
    this.airPurifier.createDefaultRelativeHumidityMeasurementClusterServer(50 * 100);

    this.airPurifier.addDeviceType(powerSource);
    this.airPurifier.createDefaultPowerSourceWiredClusterServer();

    await this.registerDevice(this.airPurifier);
    this.bridgedDevices.set(this.airPurifier.deviceName ?? '', this.airPurifier);

    this.airPurifier.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airPurifier?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    // Apple sends Off and High
    this.airPurifier.subscribeAttribute(
      FanControlCluster.id,
      'fanMode',
      async (newValue: FanControl.FanMode, oldValue: FanControl.FanMode) => {
        this.fan?.log.info(`Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]}`);
        if (newValue === FanControl.FanMode.Off) {
          await this.airPurifier?.setAttribute(FanControlCluster.id, 'percentCurrent', 0, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          await this.airPurifier?.setAttribute(FanControlCluster.id, 'percentCurrent', 33, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          await this.airPurifier?.setAttribute(FanControlCluster.id, 'percentCurrent', 66, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.High) {
          await this.airPurifier?.setAttribute(FanControlCluster.id, 'percentCurrent', 100, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.On) {
          await this.airPurifier?.setAttribute(FanControlCluster.id, 'percentCurrent', 100, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          await this.airPurifier?.setAttribute(FanControlCluster.id, 'percentCurrent', 50, this.airPurifier?.log);
        }
      },
      this.airPurifier.log,
    );
    this.airPurifier.subscribeAttribute(
      FanControlCluster.id,
      'percentSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Percent setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.airPurifier?.setAttribute(FanControlCluster.id, 'percentCurrent', newValue, this.airPurifier?.log);
      },
      this.airPurifier.log,
    );

    // Create a airConditioning device
    this.airConditioner = await this.createMutableDevice(
      [airConditioner, fanDevice, temperatureSensor, humiditySensor, bridgedNode],
      { uniqueStorageKey: 'Air conditioner' },
      this.config.debug as boolean,
    );
    this.airConditioner.log.logName = 'Air conditioner';
    this.airConditioner.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Air conditioner',
      '0x96382864AC',
      0xfff1,
      'Matterbridge',
      'Matterbridge Air conditioner',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.airConditioner.createDefaultIdentifyClusterServer();
    this.airConditioner.createDefaultOnOffClusterServer(true);
    this.airConditioner.createDefaultThermostatClusterServer(20, 18, 22);
    this.airConditioner.createDefaultFanControlClusterServer();
    this.airConditioner.createDefaultTemperatureMeasurementClusterServer(20);
    this.airConditioner.createDefaultRelativeHumidityMeasurementClusterServer(50);

    this.airConditioner.addDeviceType(powerSource);
    this.airConditioner.createDefaultPowerSourceWiredClusterServer();

    await this.registerDevice(this.airConditioner);
    this.bridgedDevices.set(this.airConditioner.deviceName ?? '', this.airConditioner);

    this.airConditioner.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airConditioner?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.airConditioner.addCommandHandler('on', async () => {
      await this.airConditioner?.setAttribute(OnOffCluster.id, 'onOff', true, this.airConditioner?.log);
      this.outlet?.log.info('Command on called');
    });
    this.airConditioner.addCommandHandler('off', async () => {
      await this.airConditioner?.setAttribute(OnOffCluster.id, 'onOff', false, this.airConditioner?.log);
      this.outlet?.log.info('Command off called');
    });

    // Create a fan device
    this.fan = await this.createMutableDevice([fanDevice, bridgedNode], { uniqueStorageKey: 'Fan' }, this.config.debug as boolean);
    this.fan.log.logName = 'Fan';
    this.fan.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Fan',
      'serial_980545631228',
      0xfff1,
      'Matterbridge',
      'Matterbridge Fan',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.fan.addDeviceTypeWithClusterServer([fanDevice], []);
    await this.registerDevice(this.fan);
    this.bridgedDevices.set(this.fan.deviceName ?? '', this.fan);

    this.fan.subscribeAttribute(
      FanControlCluster.id,
      'fanMode',
      async (newValue: FanControl.FanMode, oldValue: FanControl.FanMode) => {
        this.fan?.log.info(`Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]}`);
        if (newValue === FanControl.FanMode.Off) {
          await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 0, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 33, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 66, this.fan?.log);
        } else if (newValue === FanControl.FanMode.High) {
          await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 100, this.fan?.log);
        } else if (newValue === FanControl.FanMode.On) {
          await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 100, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 50, this.fan?.log);
        }
      },
      this.fan.log,
      this.fan,
    );
    this.fan.subscribeAttribute(
      FanControlCluster.id,
      'percentSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Percent setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', newValue, this.fan?.log);
      },
      this.fan.log,
    );
    this.fan.subscribeAttribute(
      FanControlCluster.id,
      'speedSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Speed setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.fan?.setAttribute(FanControlCluster.id, 'speedCurrent', newValue, this.fan?.log);
      },
      this.fan.log,
    );

    /** ********************* Create a waterLeakDetector device ***********************/
    this.waterLeak = await this.createMutableDevice([waterLeakDetector, bridgedNode], { uniqueStorageKey: 'Water leak detector' }, this.config.debug as boolean);
    this.waterLeak.log.logName = 'Water leak detector';
    this.waterLeak.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Water leak detector',
      'serial_98745631222',
      0xfff1,
      'Matterbridge',
      'Matterbridge WaterLeakDetector',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.waterLeak.addDeviceTypeWithClusterServer([waterLeakDetector], [BooleanStateConfiguration.Cluster.id]);
    await this.registerDevice(this.waterLeak);
    this.bridgedDevices.set(this.waterLeak.deviceName ?? '', this.waterLeak);
    await this.waterLeak.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterLeak.log);

    /** ********************* Create a waterFreezeDetector device ***********************/
    this.waterFreeze = await this.createMutableDevice([waterFreezeDetector, bridgedNode], { uniqueStorageKey: 'Water freeze detector' }, this.config.debug as boolean);
    this.waterFreeze.log.logName = 'Water freeze detector';
    this.waterFreeze.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Water freeze detector',
      'serial_98745631223',
      0xfff1,
      'Matterbridge',
      'Matterbridge WaterFreezeDetector',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.waterFreeze.addDeviceTypeWithClusterServer([waterFreezeDetector], [BooleanStateConfiguration.Cluster.id]);
    await this.registerDevice(this.waterFreeze);
    this.bridgedDevices.set(this.waterFreeze.deviceName ?? '', this.waterFreeze);
    await this.waterFreeze.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterFreeze.log);

    /** ********************* Create a rainSensor device ***********************/
    this.rain = await this.createMutableDevice([rainSensor, bridgedNode], { uniqueStorageKey: 'Rain sensor' }, this.config.debug as boolean);
    this.rain.log.logName = 'Rain sensor';
    this.rain.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Rain sensor',
      'serial_98745631224',
      0xfff1,
      'Matterbridge',
      'Matterbridge RainSensor',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.rain.addDeviceTypeWithClusterServer([rainSensor], [BooleanStateConfiguration.Cluster.id]);
    await this.registerDevice(this.rain);
    this.bridgedDevices.set(this.rain.deviceName ?? '', this.rain);
    await this.rain.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.rain.log);

    /** ********************* Create a smokeCoAlarm device ***********************/
    this.smoke = await this.createMutableDevice([smokeCoAlarm, bridgedNode], { uniqueStorageKey: 'Smoke alarm sensor' }, this.config.debug as boolean);
    this.smoke.log.logName = 'Smoke alarm sensor';
    this.smoke.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Smoke alarm sensor',
      'serial_94745631225',
      0xfff1,
      'Matterbridge',
      'Matterbridge SmokeCoAlarm',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.smoke.addDeviceTypeWithClusterServer([smokeCoAlarm], [CarbonMonoxideConcentrationMeasurement.Cluster.id]);
    await this.registerDevice(this.smoke);
    this.bridgedDevices.set(this.smoke.deviceName ?? '', this.smoke);
    await this.smoke.setAttribute(SmokeCoAlarmCluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    await this.smoke.setAttribute(SmokeCoAlarmCluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    await this.smoke.setAttribute(CarbonMonoxideConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.smoke.log);

    // Create an airQuality device
    this.airQuality = await this.createMutableDevice([airQualitySensor, bridgedNode], { uniqueStorageKey: 'Air quality sensor' }, this.config.debug as boolean);
    this.airQuality.log.logName = 'Air quality Sensor';
    this.airQuality.createDefaultBridgedDeviceBasicInformationClusterServer(
      'Air quality sensor',
      'serial_987484318322',
      0xfff1,
      'Matterbridge',
      'Matterbridge Air Quality Sensor',
      parseInt(this.version.replace(/\D/g, '')),
      this.version === '' ? 'Unknown' : this.version,
      parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
      this.matterbridge.matterbridgeVersion,
    );
    this.airQuality.addDeviceTypeWithClusterServer(
      [airQualitySensor],
      [
        TemperatureMeasurement.Cluster.id,
        RelativeHumidityMeasurement.Cluster.id,
        CarbonMonoxideConcentrationMeasurement.Cluster.id,
        CarbonDioxideConcentrationMeasurement.Cluster.id,
        NitrogenDioxideConcentrationMeasurement.Cluster.id,
        OzoneConcentrationMeasurement.Cluster.id,
        FormaldehydeConcentrationMeasurement.Cluster.id,
        Pm1ConcentrationMeasurement.Cluster.id,
        Pm25ConcentrationMeasurement.Cluster.id,
        Pm10ConcentrationMeasurement.Cluster.id,
        RadonConcentrationMeasurement.Cluster.id,
        TotalVolatileOrganicCompoundsConcentrationMeasurement.Cluster.id,
      ],
    );
    await this.registerDevice(this.airQuality);
    this.bridgedDevices.set(this.airQuality.deviceName ?? '', this.airQuality);
    await this.airQuality.setAttribute(AirQuality.Cluster.id, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    await this.airQuality.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 2150, this.airQuality.log);
    await this.airQuality.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', 5500, this.airQuality.log);
    await this.airQuality.setAttribute(CarbonMonoxideConcentrationMeasurement.Cluster.id, 'measuredValue', 10, this.airQuality.log);
    await this.airQuality.setAttribute(CarbonDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 400, this.airQuality.log);
    await this.airQuality.setAttribute(NitrogenDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality.setAttribute(OzoneConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality.setAttribute(FormaldehydeConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality.setAttribute(Pm1ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality.setAttribute(Pm25ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality.setAttribute(Pm10ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality.setAttribute(RadonConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality.setAttribute(TotalVolatileOrganicCompoundsConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
  }

  override async onConfigure() {
    this.log.info('onConfigure called');

    // Set switch to off
    await this.switch?.setAttribute(OnOffCluster.id, 'onOff', false, this.switch.log);
    this.switch?.log.info('Set switch initial onOff to false');
    // Toggle switch onOff every minute
    this.switchInterval = setInterval(
      async () => {
        const status = this.switch?.getAttribute(OnOffCluster.id, 'onOff', this.switch.log);
        if (isValidBoolean(status)) {
          await this.switch?.setAttribute(OnOffCluster.id, 'onOff', !status, this.switch.log);
          this.switch?.log.info(`Set switch onOff to ${!status}`);
        }
      },
      60 * 1000 + 100,
    );

    // Set light on/off to off
    await this.lightOnOff?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightOnOff.log);
    this.lightOnOff?.log.info('Set light initial onOff to false.');

    // Set light on/off to off
    await this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', false, this.dimmer.log);
    await this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', 1, this.dimmer.log);
    this.dimmer?.log.info(`Set dimmer initial onOff to false, currentLevel to 1.`);

    // Set light to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.light.log);
    await this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', 1, this.light.log);
    await this.light?.setAttribute(ColorControlCluster.id, 'currentHue', 0, this.light.log);
    await this.light?.setAttribute(ColorControlCluster.id, 'currentSaturation', 128, this.light.log);
    await this.light?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.light?.log.info('Set light initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light XY to true, level to 100% and XY to red
    await this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightXY.log);
    await this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', 254, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControlCluster.id, 'currentX', 0.7006 * 65536, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControlCluster.id, 'currentY', 0.2993 * 65536, this.lightXY.log);
    await this.lightXY?.configureColorControlMode(ColorControl.ColorMode.CurrentXAndCurrentY);
    this.lightXY?.log.info('Set light XY initial onOff to true, currentLevel to 254, X to 0.7006 and Y to 0.2993.');

    // Set light HS to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightHS.log);
    await this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', 1, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControlCluster.id, 'currentHue', 0, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControlCluster.id, 'currentSaturation', 128, this.lightHS.log);
    await this.lightHS?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.lightHS?.log.info('Set light HS initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light CT to true, level to 50% and colorTemperatureMireds to 250
    await this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightCT.log);
    await this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', 128, this.lightCT.log);
    await this.lightCT?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', 250, this.lightCT.log);
    await this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
    this.lightCT?.log.info('Set light CT initial onOff to true, currentLevel to 128, colorTemperatureMireds to 250.');

    this.lightInterval = setInterval(
      async () => {
        const state = this.light?.getAttribute(OnOffCluster.id, 'onOff', this.light.log);
        let level = this.light?.getAttribute(LevelControlCluster.id, 'currentLevel', this.light.log);
        if (isValidBoolean(state) && isValidNumber(level, 0, 254)) {
          level += 10;
          if (level >= 250) {
            level = 1;
            await this.lightOnOff?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightOnOff.log);
            await this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', false, this.dimmer.log);
            await this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.light.log);
            await this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightCT.log);
            this.log.info('Set lights onOff to false');
            await this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log);
            await this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light.log);
            await this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY.log);
            await this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS.log);
            await this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT.log);
            this.log.info(`Set lights currentLevel to ${level}`);
          } else {
            await this.lightOnOff?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightOnOff?.log);
            await this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', true, this.dimmer.log);
            await this.light?.setAttribute(OnOffCluster.id, 'onOff', true, this.light.log);
            await this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightCT.log);
            this.log.info('Set lights onOff to true');
            await this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log);
            await this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light.log);
            await this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY.log);
            await this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS.log);
            await this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT.log);
            this.log.info(`Set lights currentLevel to ${level}`);
          }
        }
      },
      60 * 1000 + 200,
    );

    // Set outlet to off
    await this.outlet?.setAttribute(OnOffCluster.id, 'onOff', false, this.outlet.log);
    this.outlet?.log.info('Set outlet initial onOff to false');
    // Toggle outlet onOff every minute
    this.outletInterval = setInterval(
      async () => {
        const state = this.outlet?.getAttribute(OnOffCluster.id, 'onOff', this.outlet.log);
        if (isValidBoolean(state)) {
          await this.outlet?.setAttribute(OnOffCluster.id, 'onOff', !state, this.outlet.log);
          this.outlet?.log.info(`Set outlet onOff to ${!state}`);
        }
      },
      60 * 1000 + 300,
    );

    // Set cover to target = current position and status to stopped (current position is persisted in the cluster)
    await this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
    this.cover?.log.info('Set cover initial targetPositionLiftPercent100ths = currentPositionLiftPercent100ths and operationalStatus to Stopped.');
    // Increment cover position every minute
    this.coverInterval = setInterval(
      async () => {
        let position = this.cover?.getAttribute(WindowCoveringCluster.id, 'currentPositionLiftPercent100ths', this.cover.log);
        if (isValidNumber(position, 0, 10000)) {
          position = position > 9000 ? 0 : position + 1000;
          await this.cover?.setAttribute(WindowCoveringCluster.id, 'targetPositionLiftPercent100ths', position, this.cover.log);
          await this.cover?.setAttribute(WindowCoveringCluster.id, 'currentPositionLiftPercent100ths', position, this.cover.log);
          await this.cover?.setAttribute(
            WindowCoveringCluster.id,
            'operationalStatus',
            { global: WindowCovering.MovementStatus.Stopped, lift: WindowCovering.MovementStatus.Stopped, tilt: WindowCovering.MovementStatus.Stopped },
            this.cover.log,
          );
          this.cover?.log.info(`Set cover current and target positionLiftPercent100ths to ${position} and operationalStatus to Stopped`);
        }
      },
      60 * 1000 + 400,
    );

    // Set lock to Locked
    await this.lock?.setAttribute(DoorLockCluster.id, 'lockState', DoorLock.LockState.Locked, this.lock.log);
    this.lock?.log.info('Set lock initial lockState to Locked');
    // Toggle lock every minute
    this.lockInterval = setInterval(
      async () => {
        const status = this.lock?.getAttribute(DoorLockCluster.id, 'lockState', this.lock.log);
        if (isValidNumber(status, DoorLock.LockState.Locked, DoorLock.LockState.Unlocked)) {
          await this.lock?.setAttribute(
            DoorLockCluster.id,
            'lockState',
            status === DoorLock.LockState.Locked ? DoorLock.LockState.Unlocked : DoorLock.LockState.Locked,
            this.lock.log,
          );
          this.lock?.log.info(`Set lock lockState to ${status === DoorLock.LockState.Locked ? 'Unlocked' : 'Locked'}`);
        }
      },
      60 * 1000 + 500,
    );

    // Set local to 16°C
    await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'localTemperature', 16 * 100, this.thermoAuto.log);
    await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Auto, this.thermoAuto.log);
    this.thermoAuto?.log.info('Set thermostat initial localTemperature to 16°C and mode Auto');
    const temperature = this.thermoAuto?.getChildEndpointByName('Temperature');
    await this.thermoAuto?.setAttribute(TemperatureMeasurementCluster.id, 'measuredValue', 16 * 100, this.thermoAuto.log, temperature);
    const humidity = this.thermoAuto?.getChildEndpointByName('Humidity');
    await this.thermoAuto?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.thermoAuto.log, humidity);
    const flow = this.thermoAuto?.getChildEndpointByName('Flow');
    await this.thermoAuto?.setAttribute(FlowMeasurementCluster.id, 'measuredValue', 10, this.thermoAuto.log, flow);
    this.thermoAuto?.log.info('Set thermostat ext temperature to 16°C, ext humidity to 50% and ext valve flow to 10');

    // Increment localTemperature every minute
    this.thermoInterval = setInterval(
      async () => {
        let temperature = this.thermoAuto?.getAttribute(ThermostatCluster.id, 'localTemperature', this.thermoAuto.log);
        if (isValidNumber(temperature, 1600, 2400)) {
          temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
          await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoAuto.log);
          await this.thermoHeat?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoHeat.log);
          const tempIn = this.thermoHeat?.getChildEndpointByName('TemperatureIN') as MatterbridgeDevice | undefined;
          await tempIn?.setAttribute(TemperatureMeasurementCluster.id, 'measuredValue', temperature - 50, this.thermoHeat?.log);
          const tempOut = this.thermoHeat?.getChildEndpointByName('TemperatureOUT') as MatterbridgeDevice | undefined;
          await tempOut?.setAttribute(TemperatureMeasurementCluster.id, 'measuredValue', temperature - 400, this.thermoHeat?.log);

          await this.thermoCool?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoCool.log);
          const temp = this.thermoAuto?.getChildEndpointByName('Temperature');
          await this.thermoAuto?.setAttribute(TemperatureMeasurementCluster.id, 'measuredValue', temperature, this.thermoAuto.log, temp);
          const humidity = this.thermoAuto?.getChildEndpointByName('Humidity');
          await this.thermoAuto?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.thermoAuto.log, humidity);
          const flow = this.thermoAuto?.getChildEndpointByName('Flow');
          await this.thermoAuto?.setAttribute(FlowMeasurementCluster.id, 'measuredValue', 10, this.thermoAuto.log, flow);
          this.thermoAuto?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
          this.thermoHeat?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
          this.thermoCool?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
        }
      },
      60 * 1000 + 600,
    );

    // Set airConditioner to on
    await this.airConditioner?.setAttribute(OnOffCluster.id, 'onOff', true, this.airConditioner.log);
    // Increment airConditioner localTemperature every minute
    this.airConditionerInterval = setInterval(
      async () => {
        let temperature = this.airConditioner?.getAttribute(ThermostatCluster.id, 'localTemperature', this.airConditioner.log);
        if (isValidNumber(temperature, 1600, 2400)) {
          temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
          await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.airConditioner.log);
          await this.airConditioner?.setAttribute(TemperatureMeasurementCluster.id, 'measuredValue', temperature, this.airConditioner.log);
          await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.airConditioner.log);
          this.airConditioner?.log.info(`Set airConditioner localTemperature to ${temperature / 100}°C`);
        }
      },
      60 * 1000 + 550,
    );

    // Set fan to auto
    this.fan?.log.info('Set fan initial fanMode to Auto, percentCurrent and percentSetting to 50 and speedCurrent and speedSetting to 50');
    await this.fan?.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Auto, this.fan.log);
    await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 50, this.fan.log);
    await this.fan?.setAttribute(FanControlCluster.id, 'percentSetting', 50, this.fan.log);
    await this.fan?.setAttribute(FanControlCluster.id, 'speedCurrent', 50, this.fan.log);
    await this.fan?.setAttribute(FanControlCluster.id, 'speedSetting', 50, this.fan.log);
    // Increment fan percentCurrent every minute
    this.fanInterval = setInterval(
      async () => {
        const mode = this.fan?.getAttribute(FanControlCluster.id, 'fanMode', this.fan.log);
        let value = this.fan?.getAttribute(FanControlCluster.id, 'percentCurrent', this.fan.log);
        if (isValidNumber(mode, FanControl.FanMode.Off, FanControl.FanMode.Auto) && mode === FanControl.FanMode.Auto && isValidNumber(value, 0, 100)) {
          value = value + 10 >= 100 ? 0 : value + 10;
          await this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', value, this.fan.log);
          await this.fan?.setAttribute(FanControlCluster.id, 'percentSetting', value, this.fan.log);
          this.fan?.log.info(`Set fan percentCurrent and percentSetting to ${value}`);
        }
      },
      60 * 1000 + 700,
    );

    // Set waterLeak to false
    await this.waterLeak?.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterLeak.log);
    // Toggle waterLeak every minute
    this.waterLeakInterval = setInterval(
      async () => {
        let value = this.waterLeak?.getAttribute(BooleanStateCluster.id, 'stateValue', this.waterLeak.log);
        if (isValidBoolean(value)) {
          value = !value;
          await this.waterLeak?.setAttribute(BooleanStateCluster.id, 'stateValue', value, this.waterLeak.log);
          this.waterLeak?.log.info(`Set waterLeak stateValue to ${value}`);
        }
      },
      60 * 1000 + 800,
    );

    // Set waterFreeze to false
    await this.waterFreeze?.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterFreeze.log);
    // Toggle waterFreeze every minute
    this.waterFreezeInterval = setInterval(
      async () => {
        let value = this.waterFreeze?.getAttribute(BooleanStateCluster.id, 'stateValue', this.waterFreeze.log);
        if (isValidBoolean(value)) {
          value = !value;
          await this.waterFreeze?.setAttribute(BooleanStateCluster.id, 'stateValue', value, this.waterFreeze.log);
          this.waterFreeze?.log.info(`Set waterFreeze stateValue to ${value}`);
        }
      },
      60 * 1000 + 900,
    );

    // Set rain to false
    await this.rain?.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.rain.log);
    // Toggle rain every minute
    this.rainInterval = setInterval(
      async () => {
        let value = this.rain?.getAttribute(BooleanStateCluster.id, 'stateValue', this.rain.log);
        if (isValidBoolean(value)) {
          value = !value;
          await this.rain?.setAttribute(BooleanStateCluster.id, 'stateValue', value, this.rain.log);
          this.rain?.log.info(`Set rain stateValue to ${value}`);
        }
      },
      60 * 1000 + 1000,
    );

    // Set smoke to Normal
    await this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    await this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    // Toggle smoke every minute
    this.smokeInterval = setInterval(
      async () => {
        let value = this.smoke?.getAttribute(SmokeCoAlarmCluster.id, 'smokeState', this.smoke.log);
        if (isValidNumber(value, SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Critical)) {
          value = value === SmokeCoAlarm.AlarmState.Normal ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
          await this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'smokeState', value, this.smoke.log);
          await this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'coState', value, this.smoke.log);
          this.smoke?.log.info(`Set smoke smokeState and coState to ${value}`);
        }
      },
      60 * 1000 + 1100,
    );

    // Set air quality to Normal
    this.airQuality?.setAttribute(AirQualityCluster.id, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    // Toggle air quality every minute
    this.airQualityInterval = setInterval(
      async () => {
        let value = this.airQuality?.getAttribute(AirQualityCluster.id, 'airQuality', this.airQuality?.log);
        if (isValidNumber(value, AirQuality.AirQualityEnum.Good, AirQuality.AirQualityEnum.ExtremelyPoor)) {
          value = value >= AirQuality.AirQualityEnum.ExtremelyPoor ? AirQuality.AirQualityEnum.Good : value + 1;
          await this.airQuality?.setAttribute(AirQualityCluster.id, 'airQuality', value, this.airQuality.log);
          this.smoke?.log.info(`Set air quality to ${value}`);
        }
      },
      60 * 1000 + 1100,
    );
  }

  override async onShutdown(reason?: string) {
    this.log.info('onShutdown called with reason:', reason ?? 'none');
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
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }
}
