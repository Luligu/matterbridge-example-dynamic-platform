import {
  Matterbridge,
  MatterbridgeEndpoint,
  MatterbridgeDynamicPlatform,
  PlatformConfig,
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
  airPurifier,
  pumpDevice,
  waterValve,
  genericSwitch,
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

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  switch: MatterbridgeEndpoint | undefined;
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
  smoke: MatterbridgeEndpoint | undefined;
  airQuality: MatterbridgeEndpoint | undefined;
  airConditioner: MatterbridgeEndpoint | undefined;
  airPurifier: MatterbridgeEndpoint | undefined;
  pump: MatterbridgeEndpoint | undefined;
  valve: MatterbridgeEndpoint | undefined;
  momentarySwitch: MatterbridgeEndpoint | undefined;
  latchingSwitch: MatterbridgeEndpoint | undefined;

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

  bridgedDevices = new Map<string, MatterbridgeEndpoint>();

  fanModeLookup = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart'];

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('2.2.0')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "2.2.0". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }

    this.log.info('Initializing platform:', this.config.name);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Create a switch device
    this.switch = new MatterbridgeEndpoint(
      [onOffSwitch, bridgedNode, powerSource],
      { uniqueStorageKey: 'Switch' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.switch
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
    await this.registerDevice(this.switch);
    this.bridgedDevices.set(this.switch.deviceName ?? '', this.switch);

    this.switch.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.switch.addCommandHandler('on', async () => {
      await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.switch.log);
      this.switch?.log.info('Command on called');
    });
    this.switch.addCommandHandler('off', async () => {
      await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.switch.log);
      this.switch?.log.info('Command off called');
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
    await this.registerDevice(this.lightOnOff);
    this.bridgedDevices.set(this.lightOnOff.deviceName ?? '', this.lightOnOff);

    this.lightOnOff.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightOnOff?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightOnOff.addCommandHandler('on', async () => {
      await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightOnOff?.log);
      this.lightOnOff?.log.info('Command on called');
    });
    this.lightOnOff.addCommandHandler('off', async () => {
      await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff?.log);
      this.lightOnOff?.log.info('Command off called');
    });

    // Create a dimmer device
    this.dimmer = new MatterbridgeEndpoint(
      [dimmableLight, bridgedNode, powerSource],
      { uniqueStorageKey: 'Dimmer' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.dimmer
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
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    await this.registerDevice(this.dimmer);
    this.bridgedDevices.set(this.dimmer.deviceName ?? '', this.dimmer);

    this.dimmer.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.dimmer?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.dimmer.addCommandHandler('on', async () => {
      await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.dimmer.log);
      this.dimmer?.log.info('Command on called');
    });
    this.dimmer.addCommandHandler('off', async () => {
      await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
      this.dimmer?.log.info('Command off called');
    });
    this.dimmer.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
      this.dimmer?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.dimmer.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
      this.dimmer?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // Create a light device
    this.light = new MatterbridgeEndpoint(
      [colorTemperatureLight, bridgedNode, powerSource],
      { uniqueStorageKey: 'Light (XY, HS and CT)' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.light
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
    await this.registerDevice(this.light);
    this.bridgedDevices.set(this.light.deviceName ?? '', this.light);

    this.light.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.light?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.light.addCommandHandler('on', async () => {
      await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.light?.log);
      this.light?.log.info('Command on called');
    });
    this.light.addCommandHandler('off', async () => {
      await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light?.log);
      this.light?.log.info('Command off called');
    });
    this.light.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light?.log);
      this.light?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.light.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light?.log);
      this.light?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.light.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentX', colorX, this.light?.log);
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentY', colorY, this.light?.log);
      this.light?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.light.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.light?.log);
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.light?.log);
      this.light?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}`);
    });
    this.light.addCommandHandler('moveToHue', async ({ request: { hue } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.light?.log);
      this.light?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.light.addCommandHandler('moveToSaturation', async ({ request: { saturation } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.light?.log);
      this.light?.log.debug(`Command moveToSaturation called request: saturation ${saturation}}`);
    });
    this.light.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.light?.log);
      this.light?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create a light device with HS color control
    this.lightHS = new MatterbridgeEndpoint(
      [colorTemperatureLight, bridgedNode, powerSource],
      { uniqueStorageKey: 'Light (HS, CT)' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.lightHS
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
    await this.registerDevice(this.lightHS);
    this.bridgedDevices.set(this.lightHS.deviceName ?? '', this.lightHS);

    this.lightHS.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightHS?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightHS.addCommandHandler('on', async () => {
      await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightHS?.log);
      this.lightHS?.log.info('Command on called');
    });
    this.lightHS.addCommandHandler('off', async () => {
      await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS?.log);
      this.lightHS?.log.info('Command off called');
    });
    this.lightHS.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightHS.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightHS.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.lightHS?.log);
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}}`);
    });
    this.lightHS.addCommandHandler('moveToHue', async ({ request: { hue } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.lightHS.addCommandHandler('moveToSaturation', async ({ request: { saturation } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToSaturation called request: saturation ${saturation}`);
    });
    this.lightHS.addCommandHandler('moveToColorTemperature', async ({ request: colorTemperatureMireds }) => {
      // await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create a light device with XY color control
    this.lightXY = new MatterbridgeEndpoint(
      [colorTemperatureLight, bridgedNode, powerSource],
      { uniqueStorageKey: 'Light (XY, CT)' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.lightXY
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
    await this.registerDevice(this.lightXY);
    this.bridgedDevices.set(this.lightXY.deviceName ?? '', this.lightXY);

    this.lightXY.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightXY?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightXY.addCommandHandler('on', async () => {
      await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY?.log);
      this.lightXY?.log.info('Command on called');
    });
    this.lightXY.addCommandHandler('off', async () => {
      await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightXY?.log);
      this.lightXY?.log.info('Command off called');
    });
    this.lightXY.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightXY.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightXY.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentX', colorX, this.lightXY?.log);
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentY', colorY, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.lightXY.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create a light device with CT color control
    this.lightCT = new MatterbridgeEndpoint(
      [colorTemperatureLight, bridgedNode, powerSource],
      { uniqueStorageKey: 'Light (CT)' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.lightCT
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
    await this.registerDevice(this.lightCT);
    this.bridgedDevices.set(this.lightCT.deviceName ?? '', this.lightCT);

    this.lightCT.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightCT?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightCT.addCommandHandler('on', async () => {
      await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT?.log);
      this.lightCT?.log.info('Command on called');
    });
    this.lightCT.addCommandHandler('off', async () => {
      await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightCT?.log);
      this.lightCT?.log.info('Command off called');
    });
    this.lightCT.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightCT.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightCT.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightCT?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // Create an outlet device
    this.outlet = new MatterbridgeEndpoint(
      [onOffOutlet, bridgedNode, powerSource],
      { uniqueStorageKey: 'Outlet' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.outlet
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
    await this.registerDevice(this.outlet);
    this.bridgedDevices.set(this.outlet.deviceName ?? '', this.outlet);

    this.outlet.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.outlet?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outlet.addCommandHandler('on', async () => {
      await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.outlet?.log);
      this.outlet?.log.info('Command on called');
    });
    this.outlet.addCommandHandler('off', async () => {
      await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.outlet?.log);
      this.outlet?.log.info('Command off called');
    });

    // Create a window covering device
    // Matter uses 10000 = fully closed   0 = fully opened
    this.cover = new MatterbridgeEndpoint([coverDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Cover' }, this.config.debug as boolean);
    this.cover.log.logName = 'Cover';
    this.cover.createDefaultIdentifyClusterServer();
    this.cover.createDefaultGroupsClusterServer();
    // this.cover.createDefaultScenesClusterServer();
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
    this.cover.createDefaultPowerSourceRechargeableBatteryClusterServer(86);
    await this.registerDevice(this.cover);
    this.bridgedDevices.set(this.cover.deviceName ?? '', this.cover);

    this.cover.subscribeAttribute(
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
    this.lock = new MatterbridgeEndpoint(
      [doorLockDevice, bridgedNode, powerSource],
      { uniqueStorageKey: 'Lock' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.lock
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
    await this.registerDevice(this.lock);
    this.bridgedDevices.set(this.lock.deviceName ?? '', this.lock);

    this.lock.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lock?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lock.addCommandHandler('lockDoor', async () => {
      await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Locked, this.lock?.log);
      this.lock?.log.info('Command lockDoor called');
    });
    this.lock.addCommandHandler('unlockDoor', async () => {
      await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Unlocked, this.lock?.log);
      this.lock?.log.info('Command unlockDoor called');
    });

    // Create a thermostat with AutoMode device
    this.thermoAuto = new MatterbridgeEndpoint(
      [thermostatDevice, bridgedNode, powerSource],
      { uniqueStorageKey: 'Thermostat (AutoMode)' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.thermoAuto
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
    );
    this.thermoAuto.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedHeatingSetpoint',
      async (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );
    this.thermoAuto.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedCoolingSetpoint',
      async (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );

    // Create a thermostat with Heat device
    this.thermoHeat = new MatterbridgeEndpoint(
      [thermostatDevice, bridgedNode, powerSource],
      { uniqueStorageKey: 'Thermostat (Heat)' },
      this.config.debug as boolean,
    ).createDefaultIdentifyClusterServer();
    this.thermoHeat
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
    this.airPurifier = new MatterbridgeEndpoint(
      [airPurifier, temperatureSensor, humiditySensor, bridgedNode, powerSource],
      { uniqueStorageKey: 'Air purifier' },
      this.config.debug as boolean,
    );
    this.airPurifier.log.logName = 'Air purifier';
    this.airPurifier
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
      .createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.airPurifier);
    this.bridgedDevices.set(this.airPurifier.deviceName ?? '', this.airPurifier);

    this.airPurifier.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airPurifier?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    // Apple sends Off and High
    this.airPurifier.subscribeAttribute(
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
    this.airPurifier.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Percent setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.airPurifier?.log);
      },
      this.airPurifier.log,
    );

    // Create a airConditioner device
    this.airConditioner = new MatterbridgeEndpoint([airConditioner, bridgedNode, powerSource], { uniqueStorageKey: 'Air conditioner' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Air conditioner',
        '0x96382864AC',
        0xfff1,
        'Matterbridge',
        'Matterbridge Air conditioner',
        parseInt(this.version.replace(/\D/g, '')),
        this.version === '' ? 'Unknown' : this.version,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultIdentifyClusterServer()
      .createDeadFrontOnOffClusterServer(true)
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultFanControlClusterServer(FanControl.FanMode.Auto)
      .createDefaultTemperatureMeasurementClusterServer(20 * 100)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();
    await this.registerDevice(this.airConditioner);
    this.bridgedDevices.set(this.airConditioner.deviceName ?? '', this.airConditioner);

    this.airConditioner.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airConditioner?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.airConditioner.addCommandHandler('on', async () => {
      this.airConditioner?.log.info('Command on called');
      await this.airConditioner?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'speedSetting', 50, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.airConditioner?.log);
    });
    this.airConditioner.addCommandHandler('off', async () => {
      this.airConditioner?.log.info('Command off called');
      await this.airConditioner?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.airConditioner?.log);
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
      .createDefaultOnOffClusterServer(true)
      .createDefaultPumpConfigurationAndControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.pump);
    this.bridgedDevices.set(this.pump.deviceName ?? '', this.pump);

    this.pump.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.pump?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.pump.addCommandHandler('on', async () => {
      this.pump?.log.info('Command on called');
      await this.pump?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.pump?.log);
    });
    this.pump.addCommandHandler('off', async () => {
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
    await this.registerDevice(this.valve);
    this.bridgedDevices.set(this.valve.deviceName ?? '', this.valve);

    this.valve.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.valve?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    // Create a fan device
    this.fan = new MatterbridgeEndpoint([fanDevice, bridgedNode], { uniqueStorageKey: 'Fan' }, this.config.debug as boolean)
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
      .addRequiredClusterServers();
    await this.registerDevice(this.fan);
    this.bridgedDevices.set(this.fan.deviceName ?? '', this.fan);

    this.fan.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      async (newValue: FanControl.FanMode, oldValue: FanControl.FanMode) => {
        this.fan?.log.info(`Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]}`);
        if (newValue === FanControl.FanMode.Off) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 33, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 66, this.fan?.log);
        } else if (newValue === FanControl.FanMode.High) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fan?.log);
        } else if (newValue === FanControl.FanMode.On) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fan?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 50, this.fan?.log);
        }
      },
      this.fan.log,
    );
    this.fan.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Percent setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.fan?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.fan?.log);
      },
      this.fan.log,
    );
    this.fan.subscribeAttribute(
      FanControl.Cluster.id,
      'speedSetting',
      async (newValue: number | null, oldValue: number | null) => {
        this.fan?.log.info(`Speed setting changed from ${oldValue} to ${newValue}`);
        if (isValidNumber(newValue, 0, 100)) await this.fan?.setAttribute(FanControl.Cluster.id, 'speedCurrent', newValue, this.fan?.log);
      },
      this.fan.log,
    );

    /** ********************* Create a waterLeakDetector device ***********************/
    this.waterLeak = new MatterbridgeEndpoint([waterLeakDetector, bridgedNode], { uniqueStorageKey: 'Water leak detector' }, this.config.debug as boolean)
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
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();
    this.registerDevice(this.waterLeak);
    this.bridgedDevices.set(this.waterLeak.deviceName ?? '', this.waterLeak);

    /** ********************* Create a waterFreezeDetector device ***********************/
    this.waterFreeze = new MatterbridgeEndpoint([waterFreezeDetector, bridgedNode], { uniqueStorageKey: 'Water freeze detector' }, this.config.debug as boolean)
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
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();
    await this.registerDevice(this.waterFreeze);
    this.bridgedDevices.set(this.waterFreeze.deviceName ?? '', this.waterFreeze);

    /** ********************* Create a rainSensor device ***********************/
    this.rain = new MatterbridgeEndpoint([rainSensor, bridgedNode], { uniqueStorageKey: 'Rain sensor' }, this.config.debug as boolean)
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
      .createDefaultIdentifyClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .createDefaultBooleanStateConfigurationClusterServer();
    await this.registerDevice(this.rain);
    this.bridgedDevices.set(this.rain.deviceName ?? '', this.rain);

    /** ********************* Create a smokeCoAlarm device ***********************/
    this.smoke = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode], { uniqueStorageKey: 'Smoke alarm sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Smoke alarm sensor',
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
      .createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(100);
    await this.registerDevice(this.smoke);
    this.bridgedDevices.set(this.smoke.deviceName ?? '', this.smoke);

    // Create an airQuality device
    this.airQuality = new MatterbridgeEndpoint([airQualitySensor, bridgedNode], { uniqueStorageKey: 'Air quality sensor' }, this.config.debug as boolean)
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
      .addRequiredClusterServers()
      .addClusterServers([
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
      ]);
    await this.registerDevice(this.airQuality);
    this.bridgedDevices.set(this.airQuality.deviceName ?? '', this.airQuality);

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
    await this.registerDevice(this.momentarySwitch);
    this.bridgedDevices.set(this.momentarySwitch.deviceName ?? '', this.momentarySwitch);

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
    await this.registerDevice(this.latchingSwitch);
    this.bridgedDevices.set(this.latchingSwitch.deviceName ?? '', this.latchingSwitch);
  }

  override async onConfigure() {
    await super.onConfigure();
    this.log.info('onConfigure called');

    // Set switch to off
    await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.switch.log);
    this.switch?.log.info('Set switch initial onOff to false');
    if (this.config.useInterval) {
      // Toggle switch onOff every minute
      this.switchInterval = setInterval(
        async () => {
          const status = this.switch?.getAttribute(OnOff.Cluster.id, 'onOff', this.switch.log);
          if (isValidBoolean(status)) {
            await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', !status, this.switch.log);
            this.switch?.log.info(`Set switch onOff to ${!status}`);
          }
        },
        60 * 1000 + 100,
      );
    }

    // Set light on/off to off
    await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff.log);
    this.lightOnOff?.log.info('Set light initial onOff to false.');

    // Set light on/off to off
    await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
    await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 1, this.dimmer.log);
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
          const state = this.light?.getAttribute(OnOff.Cluster.id, 'onOff', this.light.log);
          let level = this.light?.getAttribute(LevelControl.Cluster.id, 'currentLevel', this.light.log);
          if (isValidBoolean(state) && isValidNumber(level, 0, 254)) {
            level += 10;
            if (level >= 250) {
              level = 1;
              await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff.log);
              await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
              await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light.log);
              await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightXY.log);
              await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS.log);
              await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightCT.log);
              this.log.info('Set lights onOff to false');
              await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
              await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light.log);
              await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY.log);
              await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS.log);
              await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT.log);
              this.log.info(`Set lights currentLevel to ${level}`);
            } else {
              await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightOnOff?.log);
              await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.dimmer.log);
              await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.light.log);
              await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY.log);
              await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightHS.log);
              await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT.log);
              this.log.info('Set lights onOff to true');
              await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
              await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light.log);
              await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY.log);
              await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS.log);
              await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT.log);
              this.log.info(`Set lights currentLevel to ${level}`);
            }
          }
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
    await this.smoke?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    await this.smoke?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    if (this.config.useInterval) {
      // Toggle smoke every minute
      this.smokeInterval = setInterval(
        async () => {
          let value = this.smoke?.getAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', this.smoke.log);
          if (isValidNumber(value, SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Critical)) {
            value = value === SmokeCoAlarm.AlarmState.Normal ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
            await this.smoke?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', value, this.smoke.log);
            await this.smoke?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', value, this.smoke.log);
            this.smoke?.log.info(`Set smoke smokeState and coState to ${value}`);
          }
        },
        60 * 1000 + 1100,
      );
    }

    // Set air quality to Normal
    await this.airQuality?.setAttribute(AirQuality.Cluster.id, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    await this.airQuality?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 2150, this.airQuality.log);
    await this.airQuality?.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', 5500, this.airQuality.log);
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
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }
}
