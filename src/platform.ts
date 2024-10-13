import {
  AirQuality,
  AirQualityCluster,
  BooleanStateCluster,
  BooleanStateConfiguration,
  CarbonDioxideConcentrationMeasurement,
  CarbonMonoxideConcentrationMeasurement,
  ClusterId,
  ColorControl,
  ColorControlCluster,
  DeviceTypes,
  DoorLock,
  DoorLockCluster,
  Endpoint,
  FanControl,
  FanControlCluster,
  FlowMeasurement,
  FormaldehydeConcentrationMeasurement,
  LevelControlCluster,
  NitrogenDioxideConcentrationMeasurement,
  OnOffCluster,
  OzoneConcentrationMeasurement,
  PlatformConfig,
  Pm10ConcentrationMeasurement,
  Pm1ConcentrationMeasurement,
  Pm25ConcentrationMeasurement,
  RadonConcentrationMeasurement,
  RelativeHumidityMeasurement,
  SmokeCoAlarm,
  SmokeCoAlarmCluster,
  TemperatureMeasurement,
  Thermostat,
  ThermostatCluster,
  TotalVolatileOrganicCompoundsConcentrationMeasurement,
  WindowCovering,
  WindowCoveringCluster,
  airQualitySensor,
  bridgedNode,
  onOffSwitch,
  powerSource,
  rainSensor,
  smokeCoAlarm,
  waterFreezeDetector,
  waterLeakDetector,
} from 'matterbridge';
import { Matterbridge, MatterbridgeDevice, MatterbridgeDynamicPlatform } from 'matterbridge';
import { isValidBoolean, isValidNumber } from 'matterbridge/utils';
import { AnsiLogger, db, hk, or } from 'matterbridge/logger';

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
  thermo: MatterbridgeDevice | undefined;
  fan: MatterbridgeDevice | undefined;
  waterLeak: MatterbridgeDevice | undefined;
  waterFreeze: MatterbridgeDevice | undefined;
  rain: MatterbridgeDevice | undefined;
  smoke: MatterbridgeDevice | undefined;
  airQuality: MatterbridgeDevice | undefined;

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

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('1.6.0')) {
      throw new Error(`This plugin requires Matterbridge version >= "1.6.0". Please update Matterbridge to the latest version in the frontend."`);
    }

    this.log.info('Initializing platform:', this.config.name);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Create a switch device
    this.switch = new MatterbridgeDevice(onOffSwitch, undefined, this.config.debug as boolean);
    this.switch.log.logName = 'Switch';
    this.switch.createDefaultIdentifyClusterServer();
    this.switch.createDefaultGroupsClusterServer();
    this.switch.createDefaultScenesClusterServer();
    this.switch.createDefaultBridgedDeviceBasicInformationClusterServer('Switch', '0x23452164', 0xfff1, 'Luligu', 'Matterbridge Switch');
    this.switch.createDefaultOnOffClusterServer();
    this.switch.addDeviceType(powerSource);
    this.switch.createDefaultPowerSourceRechargeableBatteryClusterServer(70);
    await this.registerDevice(this.switch);

    this.switch.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.switch.addCommandHandler('on', async () => {
      this.switch?.setAttribute(OnOffCluster.id, 'onOff', true, this.switch.log, this.switch);
      this.switch?.log.info('Command on called');
    });
    this.switch.addCommandHandler('off', async () => {
      this.switch?.setAttribute(OnOffCluster.id, 'onOff', false, this.switch.log, this.switch);
      this.switch?.log.info('Command off called');
    });
    /*
    addCommandHandler(
      OnOffCluster.id,
      'on',
      async (data) => {
        this.switch?.setAttribute(OnOffCluster.id, 'onOff', true, this.switch.log, this.switch);
        this.switch?.log.info(`Command on called with: ${data}`);
      },
      this.switch.log,
      this.switch,
    );
    addCommandHandler(
      OnOffCluster.id,
      'off',
      async (data) => {
        this.switch?.setAttribute(OnOffCluster.id, 'onOff', false, this.switch.log, this.switch);
        this.switch?.log.info(`Command off called with: ${data}`);
      },
      this.switch.log,
      this.switch,
    );
    */

    // Create a on off light device
    this.lightOnOff = new MatterbridgeDevice(DeviceTypes.ON_OFF_LIGHT, undefined, this.config.debug as boolean);
    this.lightOnOff.log.logName = 'Light (on/off)';
    this.lightOnOff.createDefaultIdentifyClusterServer();
    this.lightOnOff.createDefaultGroupsClusterServer();
    this.lightOnOff.createDefaultScenesClusterServer();
    this.lightOnOff.createDefaultBridgedDeviceBasicInformationClusterServer('Light (on/off)', '0x2342375564', 0xfff1, 'Luligu', 'Matterbridge Light on/off');
    this.lightOnOff.createDefaultOnOffClusterServer();
    this.lightOnOff.addDeviceType(powerSource);
    this.lightOnOff.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.lightOnOff);

    this.lightOnOff.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightOnOff?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightOnOff.addCommandHandler('on', async () => {
      this.light?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightOnOff?.log, this.lightOnOff);
      this.lightOnOff?.log.info('Command on called');
    });
    this.lightOnOff.addCommandHandler('off', async () => {
      this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightOnOff?.log, this.lightOnOff);
      this.lightOnOff?.log.info('Command off called');
    });

    // Create a dimmer device
    this.dimmer = new MatterbridgeDevice(DeviceTypes.DIMMABLE_LIGHT, undefined, this.config.debug as boolean);
    this.dimmer.log.logName = 'Dimmer';
    this.dimmer.createDefaultIdentifyClusterServer();
    this.dimmer.createDefaultGroupsClusterServer();
    this.dimmer.createDefaultScenesClusterServer();
    this.dimmer.createDefaultBridgedDeviceBasicInformationClusterServer('Dimmer', '0x234554564', 0xfff1, 'Luligu', 'Matterbridge Dimmer');
    this.dimmer.createDefaultOnOffClusterServer();
    this.dimmer.createDefaultLevelControlClusterServer();
    this.dimmer.addDeviceType(powerSource);
    this.dimmer.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    await this.registerDevice(this.dimmer);

    this.dimmer.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.dimmer?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.dimmer.addCommandHandler('on', async () => {
      this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', true, this.dimmer.log, this.dimmer);
      this.dimmer?.log.info('Command on called');
    });
    this.dimmer.addCommandHandler('off', async () => {
      this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', false, this.dimmer.log, this.dimmer);
      this.dimmer?.log.info('Command off called');
    });
    this.dimmer.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log, this.dimmer);
      this.dimmer?.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.dimmer.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log, this.dimmer);
      this.dimmer?.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });

    // Create a light device
    this.light = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT, undefined, this.config.debug as boolean);
    this.light.log.logName = 'Light (XY, HS and CT)';
    this.light.createDefaultIdentifyClusterServer();
    this.light.createDefaultGroupsClusterServer();
    this.light.createDefaultScenesClusterServer();
    this.light.createDefaultBridgedDeviceBasicInformationClusterServer('Light (XY, HS and CT)', '0x23480564', 0xfff1, 'Luligu', 'Matterbridge Light');
    this.light.createDefaultOnOffClusterServer();
    this.light.createDefaultLevelControlClusterServer();
    this.light.createDefaultCompleteColorControlClusterServer();
    this.light.addDeviceType(powerSource);
    this.light.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    await this.registerDevice(this.light);

    this.light.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.light?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.light.addCommandHandler('on', async () => {
      this.light?.setAttribute(OnOffCluster.id, 'onOff', true, this.light?.log, this.light);
      this.light?.log.info('Command on called');
    });
    this.light.addCommandHandler('off', async () => {
      this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.light?.log, this.light);
      this.light?.log.info('Command off called');
    });
    this.light.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToColor', async ({ request: { colorX, colorY }, attributes: { currentX, currentY } }) => {
      this.light?.setAttribute(ColorControlCluster.id, 'currentX', colorX, this.light?.log, this.light);
      this.light?.setAttribute(ColorControlCluster.id, 'currentY', colorY, this.light?.log, this.light);
      this.light?.log.debug(
        `Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536} attributes: X ${(currentX?.getLocal() ?? 0) / 65536} Y ${(currentY?.getLocal() ?? 0) / 65536}`,
      );
    });
    this.light.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.light?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.light?.log, this.light);
      this.light?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.light?.log, this.light);
      this.light?.log.debug(
        `Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.light.addCommandHandler('moveToHue', async ({ request: { hue }, attributes: { currentHue, currentSaturation } }) => {
      this.light?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToHue called request: hue ${hue} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToSaturation', async ({ request: { saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.light?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.light?.log, this.light);
      this.light?.log.debug(
        `Command moveToSaturation called request: saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.light.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      this.light?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', request.colorTemperatureMireds, this.light?.log, this.light);
      this.light?.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create a light device with HS color control
    this.lightHS = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT, undefined, this.config.debug as boolean);
    this.lightHS.log.logName = 'Light (HS)';
    this.lightHS.createDefaultIdentifyClusterServer();
    this.lightHS.createDefaultGroupsClusterServer();
    this.lightHS.createDefaultScenesClusterServer();
    this.lightHS.createDefaultBridgedDeviceBasicInformationClusterServer('Light (HS)', '0x25097564', 0xfff1, 'Luligu', 'Matterbridge Light');
    this.lightHS.createDefaultOnOffClusterServer();
    this.lightHS.createDefaultLevelControlClusterServer();
    this.lightHS.createDefaultCompleteColorControlClusterServer();
    this.lightHS.configureColorControlCluster(true, false, false, ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.lightHS.addDeviceType(powerSource);
    this.lightHS.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.lightHS);

    this.lightHS.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightHS?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightHS.addCommandHandler('on', async () => {
      this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.info('Command on called');
    });
    this.lightHS.addCommandHandler('off', async () => {
      this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.info('Command off called');
    });
    this.lightHS.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.lightHS?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.lightHS?.log, this.lightHS);
      this.lightHS?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(
        `Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.lightHS.addCommandHandler('moveToHue', async ({ request: { hue }, attributes: { currentHue, currentSaturation } }) => {
      this.lightHS?.setAttribute(ColorControlCluster.id, 'currentHue', hue, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(`Command moveToHue called request: hue ${hue} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToSaturation', async ({ request: { saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.lightHS?.setAttribute(ColorControlCluster.id, 'currentSaturation', saturation, this.lightHS?.log, this.lightHS);
      this.lightHS?.log.debug(
        `Command moveToSaturation called request: saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });

    // Create a light device with XY color control
    this.lightXY = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT, undefined, this.config.debug as boolean);
    this.lightXY.log.logName = 'Light (XY)';
    this.lightXY.createDefaultIdentifyClusterServer();
    this.lightXY.createDefaultGroupsClusterServer();
    this.lightXY.createDefaultScenesClusterServer();
    this.lightXY.createDefaultBridgedDeviceBasicInformationClusterServer('Light (XY)', '0x23497564', 0xfff1, 'Luligu', 'Matterbridge Light');
    this.lightXY.createDefaultOnOffClusterServer();
    this.lightXY.createDefaultLevelControlClusterServer();
    this.lightXY.createDefaultCompleteColorControlClusterServer();
    this.lightXY.configureColorControlCluster(false, true, false, ColorControl.ColorMode.CurrentXAndCurrentY);
    this.lightXY.addDeviceType(powerSource);
    this.lightXY.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.lightXY);

    this.lightXY.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightXY?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightXY.addCommandHandler('on', async () => {
      this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.info('Command on called');
    });
    this.lightXY.addCommandHandler('off', async () => {
      this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.info('Command off called');
    });
    this.lightXY.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightXY.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightXY.addCommandHandler('moveToColor', async ({ request: { colorX, colorY }, attributes: { currentX, currentY } }) => {
      this.lightXY?.setAttribute(ColorControlCluster.id, 'currentX', colorX, this.lightXY?.log, this.lightXY);
      this.lightXY?.setAttribute(ColorControlCluster.id, 'currentY', colorY, this.lightXY?.log, this.lightXY);
      this.lightXY?.log.debug(
        `Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536} attributes: X ${(currentX?.getLocal() ?? 0) / 65536} Y ${(currentY?.getLocal() ?? 0) / 65536}`,
      );
    });

    // Create a light device with CT color control
    this.lightCT = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT, undefined, this.config.debug as boolean);
    this.lightCT.log.logName = 'Light (CT)';
    this.lightCT.createDefaultIdentifyClusterServer();
    this.lightCT.createDefaultGroupsClusterServer();
    this.lightCT.createDefaultScenesClusterServer();
    this.lightCT.createDefaultBridgedDeviceBasicInformationClusterServer('Light (CT)', '0x23480749', 0xfff1, 'Luligu', 'Matterbridge Light');
    this.lightCT.createDefaultOnOffClusterServer();
    this.lightCT.createDefaultLevelControlClusterServer();
    this.lightCT.createDefaultCompleteColorControlClusterServer();
    this.lightCT.configureColorControlCluster(false, false, true, ColorControl.ColorMode.ColorTemperatureMireds);
    this.lightCT.addDeviceType(powerSource);
    this.lightCT.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    await this.registerDevice(this.lightCT);

    this.lightCT.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightCT?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightCT.addCommandHandler('on', async () => {
      this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.info('Command on called');
    });
    this.lightCT.addCommandHandler('off', async () => {
      this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.info('Command off called');
    });
    this.lightCT.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightCT.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightCT.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      this.lightCT?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', request.colorTemperatureMireds, this.lightCT?.log, this.lightCT);
      this.lightCT?.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create an outlet device
    this.outlet = new MatterbridgeDevice(DeviceTypes.ON_OFF_PLUGIN_UNIT, undefined, this.config.debug as boolean);
    this.outlet.log.logName = 'Outlet';
    this.outlet.createDefaultIdentifyClusterServer();
    this.outlet.createDefaultGroupsClusterServer();
    this.outlet.createDefaultScenesClusterServer();
    this.outlet.createDefaultBridgedDeviceBasicInformationClusterServer('Outlet', '0x29252164', 0xfff1, 'Luligu', 'Matterbridge Outlet');
    this.outlet.createDefaultOnOffClusterServer();
    this.outlet.addDeviceType(powerSource);
    this.outlet.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.outlet);

    this.outlet.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.outlet?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outlet.addCommandHandler('on', async () => {
      this.outlet?.setAttribute(OnOffCluster.id, 'onOff', true, this.outlet?.log, this.outlet);
      this.outlet?.log.info('Command on called');
    });
    this.outlet.addCommandHandler('off', async () => {
      this.outlet?.setAttribute(OnOffCluster.id, 'onOff', false, this.outlet?.log, this.outlet);
      this.outlet?.log.info('Command off called');
    });

    // Create a window covering device
    // Matter uses 10000 = fully closed   0 = fully opened
    this.cover = new MatterbridgeDevice(DeviceTypes.WINDOW_COVERING, undefined, this.config.debug as boolean);
    this.cover.log.logName = 'Cover';
    this.cover.createDefaultIdentifyClusterServer();
    this.cover.createDefaultGroupsClusterServer();
    this.cover.createDefaultScenesClusterServer();
    this.cover.createDefaultBridgedDeviceBasicInformationClusterServer('Cover', '0x01020564', 0xfff1, 'Luligu', 'Matterbridge Cover');
    this.cover.createDefaultWindowCoveringClusterServer();
    this.cover.addDeviceType(powerSource);
    this.cover.createDefaultPowerSourceRechargeableBatteryClusterServer(86);
    await this.registerDevice(this.cover);

    this.cover.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.cover?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.cover.addCommandHandler('stopMotion', async ({ attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
      this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
      this.cover?.log.info(
        `Command stopMotion called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
      );
    });

    this.cover.addCommandHandler('downOrClose', async ({ attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
      this.cover?.setWindowCoveringCurrentTargetStatus(10000, 10000, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(
        `Command downOrClose called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
      );
    });

    this.cover.addCommandHandler('upOrOpen', async ({ attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
      this.cover?.setWindowCoveringCurrentTargetStatus(0, 0, WindowCovering.MovementStatus.Stopped);
      this.cover?.log.info(
        `Command upOrOpen called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
      );
    });

    this.cover.addCommandHandler(
      'goToLiftPercentage',
      async ({ request: { liftPercent100thsValue }, attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
        this.cover?.setWindowCoveringCurrentTargetStatus(liftPercent100thsValue, liftPercent100thsValue, WindowCovering.MovementStatus.Stopped);
        this.cover?.log.info(
          `Command goToLiftPercentage ${liftPercent100thsValue} called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
        );
      },
    );

    // Create a lock device
    this.lock = new MatterbridgeDevice(DeviceTypes.DOOR_LOCK, undefined, this.config.debug as boolean);
    this.lock.log.logName = 'Lock';
    this.lock.createDefaultIdentifyClusterServer();
    this.lock.createDefaultBridgedDeviceBasicInformationClusterServer('Lock', '0x96352164', 0xfff1, 'Luligu', 'Matterbridge Lock');
    this.lock.createDefaultDoorLockClusterServer();
    this.lock.addDeviceType(powerSource);
    this.lock.createDefaultPowerSourceRechargeableBatteryClusterServer(30);
    await this.registerDevice(this.lock);

    this.lock.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lock?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lock.addCommandHandler('lockDoor', async () => {
      this.lock?.setAttribute(DoorLockCluster.id, 'lockState', DoorLock.LockState.Locked, this.lock?.log, this.lock);
      this.lock?.log.info('Command lockDoor called');
    });
    this.lock.addCommandHandler('unlockDoor', async () => {
      this.lock?.setAttribute(DoorLockCluster.id, 'lockState', DoorLock.LockState.Unlocked, this.lock?.log, this.lock);
      this.lock?.log.info('Command unlockDoor called');
    });

    // Create a thermostat device
    this.thermo = new MatterbridgeDevice(DeviceTypes.THERMOSTAT, undefined, this.config.debug as boolean);
    this.thermo.log.logName = 'Thermostat';
    this.thermo.createDefaultIdentifyClusterServer();
    this.thermo.createDefaultGroupsClusterServer();
    this.thermo.createDefaultScenesClusterServer();
    this.thermo.createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat', '0x96382164', 0xfff1, 'Luligu', 'Matterbridge Thermostat');
    this.thermo.createDefaultThermostatClusterServer(20, 18, 22);
    this.thermo.addDeviceType(powerSource);
    this.thermo.createDefaultPowerSourceRechargeableBatteryClusterServer(70);

    const flowChild = this.thermo.addChildDeviceTypeWithClusterServer('Flow', [DeviceTypes.FLOW_SENSOR], [FlowMeasurement.Cluster.id]);
    flowChild.getClusterServer(FlowMeasurement.Cluster)?.setMeasuredValueAttribute(1 * 10);

    const tempChild = this.thermo.addChildDeviceTypeWithClusterServer('Temperature', [DeviceTypes.TEMPERATURE_SENSOR], [TemperatureMeasurement.Cluster.id]);
    tempChild.getClusterServer(TemperatureMeasurement.Cluster)?.setMeasuredValueAttribute(41 * 100);

    const humidityChild = this.thermo.addChildDeviceTypeWithClusterServer('Humidity', [DeviceTypes.HUMIDITY_SENSOR], [RelativeHumidityMeasurement.Cluster.id]);
    humidityChild.getClusterServer(RelativeHumidityMeasurement.Cluster)?.setMeasuredValueAttribute(80 * 100);

    await this.registerDevice(this.thermo);

    this.thermo.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermo?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.thermo.addCommandHandler('setpointRaiseLower', async ({ request: { mode, amount }, attributes }) => {
      const lookupSetpointAdjustMode = ['Heat', 'Cool', 'Both'];
      this.thermo?.log.info(`Command setpointRaiseLower called with mode: ${lookupSetpointAdjustMode[mode]} amount: ${amount / 10}`);
      if (mode === /* Thermostat.SetpointRaiseLowerMode.Heat*/ 0 && attributes.occupiedHeatingSetpoint) {
        const setpoint = attributes.occupiedHeatingSetpoint?.getLocal() / 100 + amount / 10;
        attributes.occupiedHeatingSetpoint.setLocal(setpoint * 100);
        this.thermo?.log.info('Set occupiedHeatingSetpoint:', setpoint);
      }
      if (mode === /* Thermostat.SetpointRaiseLowerMode.Cool*/ 1 && attributes.occupiedCoolingSetpoint) {
        const setpoint = attributes.occupiedCoolingSetpoint.getLocal() / 100 + amount / 10;
        attributes.occupiedCoolingSetpoint.setLocal(setpoint * 100);
        this.thermo?.log.info('Set occupiedCoolingSetpoint:', setpoint);
      }
    });
    const thermostat = this.thermo.getClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode));
    if (thermostat) {
      subscribeAttribute(
        ThermostatCluster.id,
        'systemMode',
        async (value) => {
          const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
          this.thermo?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
        },
        this.thermo.log,
        this.thermo,
      );
      subscribeAttribute(
        ThermostatCluster.id,
        'occupiedHeatingSetpoint',
        async (value) => {
          this.thermo?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
        },
        this.thermo.log,
        this.thermo,
      );
      subscribeAttribute(
        ThermostatCluster.id,
        'occupiedCoolingSetpoint',
        async (value) => {
          this.thermo?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
        },
        this.thermo.log,
        this.thermo,
      );
    }

    // Create a fan device
    this.fan = new MatterbridgeDevice([DeviceTypes.FAN, bridgedNode], undefined, this.config.debug as boolean);
    this.fan.log.logName = 'Fan';
    this.fan.createDefaultBridgedDeviceBasicInformationClusterServer('Fan', 'serial_980545631228', 0xfff1, 'Luligu', 'Matterbridge Fan', 2, '2.1.1');
    this.fan.addDeviceTypeWithClusterServer([DeviceTypes.FAN], []);
    await this.registerDevice(this.fan);
    const fanCluster = this.fan.getClusterServer(FanControlCluster.with(FanControl.Feature.MultiSpeed, FanControl.Feature.Auto));
    if (fanCluster) {
      const fanModeLookup = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart'];
      subscribeAttribute(
        FanControlCluster.id,
        'fanMode',
        (newValue: FanControl.FanMode, oldValue: FanControl.FanMode) => {
          this.fan?.log.info(`Fan mode changed from ${fanModeLookup[oldValue]} to ${fanModeLookup[newValue]}`);
          if (newValue === FanControl.FanMode.Off) {
            fanCluster.setPercentCurrentAttribute(0);
          } else if (newValue === FanControl.FanMode.Low) {
            fanCluster.setPercentCurrentAttribute(33);
          } else if (newValue === FanControl.FanMode.Medium) {
            fanCluster.setPercentCurrentAttribute(66);
          } else if (newValue === FanControl.FanMode.High) {
            fanCluster.setPercentCurrentAttribute(100);
          } else if (newValue === FanControl.FanMode.On) {
            fanCluster.setPercentCurrentAttribute(100);
          } else if (newValue === FanControl.FanMode.Auto) {
            fanCluster.setPercentCurrentAttribute(50);
          }
        },
        this.fan.log,
        this.fan,
      );
      subscribeAttribute(
        FanControlCluster.id,
        'percentSetting',
        (newValue: number | null, oldValue: number | null) => {
          this.fan?.log.info(`Percent setting changed from ${oldValue} to ${newValue}`);
          if (newValue) fanCluster.setPercentCurrentAttribute(newValue);
        },
        this.fan.log,
        this.fan,
      );
      subscribeAttribute(
        FanControlCluster.id,
        'speedSetting',
        (newValue: number | null, oldValue: number | null) => {
          this.fan?.log.info(`Speed setting changed from ${oldValue} to ${newValue}`);
          if (newValue) fanCluster.setSpeedCurrentAttribute(newValue);
        },
        this.fan.log,
        this.fan,
      );
    }

    this.waterLeak = new MatterbridgeDevice([waterLeakDetector, bridgedNode], undefined, this.config.debug as boolean);
    this.waterLeak.log.logName = 'Water leak detector';
    this.waterLeak.createDefaultBridgedDeviceBasicInformationClusterServer('Water leak detector', 'serial_98745631222', 0xfff1, 'Luligu', 'Matterbridge WaterLeakDetector');
    this.waterLeak.addDeviceTypeWithClusterServer([waterLeakDetector], [BooleanStateConfiguration.Cluster.id]);
    this.waterLeak.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterLeak.log);
    await this.registerDevice(this.waterLeak);

    this.waterFreeze = new MatterbridgeDevice([waterFreezeDetector, bridgedNode], undefined, this.config.debug as boolean);
    this.waterFreeze.log.logName = 'Water freeze detector';
    this.waterFreeze.createDefaultBridgedDeviceBasicInformationClusterServer('Water freeze detector', 'serial_98745631223', 0xfff1, 'Luligu', 'Matterbridge WaterFreezeDetector');
    this.waterFreeze.addDeviceTypeWithClusterServer([waterFreezeDetector], [BooleanStateConfiguration.Cluster.id]);
    this.waterFreeze.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterFreeze.log);
    await this.registerDevice(this.waterFreeze);

    this.rain = new MatterbridgeDevice([rainSensor, bridgedNode], undefined, this.config.debug as boolean);
    this.rain.log.logName = 'Rain sensor';
    this.rain.createDefaultBridgedDeviceBasicInformationClusterServer('Rain sensor', 'serial_98745631224', 0xfff1, 'Luligu', 'Matterbridge RainSensor');
    this.rain.addDeviceTypeWithClusterServer([rainSensor], [BooleanStateConfiguration.Cluster.id]);
    this.rain.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.rain.log);
    await this.registerDevice(this.rain);

    this.smoke = new MatterbridgeDevice([smokeCoAlarm, bridgedNode], undefined, this.config.debug as boolean);
    this.smoke.log.logName = 'Smoke alarm sensor';
    this.smoke.createDefaultBridgedDeviceBasicInformationClusterServer('Smoke alarm sensor', 'serial_94745631225', 0xfff1, 'Luligu', 'Matterbridge SmokeCoAlarm');
    this.smoke.addDeviceTypeWithClusterServer([smokeCoAlarm], [CarbonMonoxideConcentrationMeasurement.Cluster.id]);
    this.smoke.setAttribute(SmokeCoAlarmCluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    this.smoke.setAttribute(SmokeCoAlarmCluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    this.smoke.setAttribute(CarbonMonoxideConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.smoke.log);
    await this.registerDevice(this.smoke);

    // Create an airQuality device
    this.airQuality = new MatterbridgeDevice([airQualitySensor, bridgedNode], undefined, this.config.debug as boolean);
    this.airQuality.log.logName = 'Air quality Sensor';
    this.airQuality.createDefaultBridgedDeviceBasicInformationClusterServer('Air quality sensor', 'serial_987484318322', 0xfff1, 'Luligu', 'Matterbridge Air Quality Sensor');
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
    this.airQuality.setAttribute(AirQuality.Cluster.id, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    this.airQuality.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 2150, this.airQuality.log);
    this.airQuality.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', 5500, this.airQuality.log);
    this.airQuality.setAttribute(CarbonMonoxideConcentrationMeasurement.Cluster.id, 'measuredValue', 10, this.airQuality.log);
    this.airQuality.setAttribute(CarbonDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 400, this.airQuality.log);
    this.airQuality.setAttribute(NitrogenDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    this.airQuality.setAttribute(OzoneConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    this.airQuality.setAttribute(FormaldehydeConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    this.airQuality.setAttribute(Pm1ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    this.airQuality.setAttribute(Pm25ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    this.airQuality.setAttribute(Pm10ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    this.airQuality.setAttribute(RadonConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    this.airQuality.setAttribute(TotalVolatileOrganicCompoundsConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.registerDevice(this.airQuality);
  }

  override async onConfigure() {
    this.log.info('onConfigure called');

    // Set switch to off
    this.switch?.setAttribute(OnOffCluster.id, 'onOff', false, this.switch.log);
    this.switch?.log.info('Set switch initial onOff to false');
    // Toggle switch onOff every minute
    this.switchInterval = setInterval(
      () => {
        const status = this.switch?.getAttribute(OnOffCluster.id, 'onOff', this.switch.log);
        if (isValidBoolean(status)) {
          this.switch?.setAttribute(OnOffCluster.id, 'onOff', !status, this.switch.log);
          this.switch?.log.info(`Set switch onOff to ${!status}`);
        }
      },
      60 * 1000 + 100,
    );

    // Set light on/off to off
    this.lightOnOff?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightOnOff.log);
    this.lightOnOff?.log.info('Set light initial onOff to false.');

    // Set light on/off to off
    this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', false, this.dimmer.log);
    this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', 0, this.dimmer.log);
    this.dimmer?.log.info('Set dimmer initial onOff to false, currentLevel to 0.');

    // Set light to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.light.log);
    this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', 0, this.light.log);
    this.light?.setAttribute(ColorControlCluster.id, 'currentHue', 0, this.light.log);
    this.light?.setAttribute(ColorControlCluster.id, 'currentSaturation', 128, this.light.log);
    this.light?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.light?.log.info('Set light initial onOff to false, currentLevel to 0, hue to 0 and saturation to 50%.');

    // Set light XY to true, level to 100% and XY to red
    this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightXY.log);
    this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', 254, this.lightXY.log);
    this.lightXY?.setAttribute(ColorControlCluster.id, 'currentX', 0.7006 * 65536, this.lightXY.log);
    this.lightXY?.setAttribute(ColorControlCluster.id, 'currentY', 0.2993 * 65536, this.lightXY.log);
    this.lightXY?.configureColorControlMode(ColorControl.ColorMode.CurrentXAndCurrentY);
    this.lightXY?.log.info('Set light XY initial onOff to true, currentLevel to 254, X to 0.7006 and Y to 0.2993.');

    // Set light HS to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightHS.log);
    this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', 0, this.lightHS.log);
    this.lightHS?.setAttribute(ColorControlCluster.id, 'currentHue', 0, this.lightHS.log);
    this.lightHS?.setAttribute(ColorControlCluster.id, 'currentSaturation', 128, this.lightHS.log);
    this.lightHS?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.lightHS?.log.info('Set light HS initial onOff to false, currentLevel to 0, hue to 0 and saturation to 50%.');

    // Set light CT to true, level to 50% and colorTemperatureMireds to 250
    this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightCT.log);
    this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', 128, this.lightCT.log);
    this.lightCT?.setAttribute(ColorControlCluster.id, 'colorTemperatureMireds', 250, this.lightCT.log);
    this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
    this.lightCT?.log.info('Set light CT initial onOff to true, currentLevel to 128, colorTemperatureMireds to 250.');

    this.lightInterval = setInterval(
      () => {
        const state = this.light?.getAttribute(OnOffCluster.id, 'onOff', this.light.log);
        let level = this.light?.getAttribute(LevelControlCluster.id, 'currentLevel', this.light.log);
        if (isValidBoolean(state) && isValidNumber(level, 0, 254)) {
          level += 10;
          if (level > 254) {
            level = 0;
            this.lightOnOff?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightOnOff.log);
            this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', false, this.dimmer.log);
            this.light?.setAttribute(OnOffCluster.id, 'onOff', false, this.light.log);
            this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightXY.log);
            this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightHS.log);
            this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', false, this.lightCT.log);
            this.log.info('Set lights onOff to false');
            this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log);
            this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light.log);
            this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY.log);
            this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS.log);
            this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT.log);
            this.log.info(`Set lights currentLevel to ${level}`);
          } else {
            this.lightOnOff?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightOnOff?.log);
            this.dimmer?.setAttribute(OnOffCluster.id, 'onOff', true, this.dimmer.log);
            this.light?.setAttribute(OnOffCluster.id, 'onOff', true, this.light.log);
            this.lightXY?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightXY.log);
            this.lightHS?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightHS.log);
            this.lightCT?.setAttribute(OnOffCluster.id, 'onOff', true, this.lightCT.log);
            this.log.info('Set lights onOff to true');
            this.dimmer?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.dimmer.log);
            this.light?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.light.log);
            this.lightXY?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightXY.log);
            this.lightHS?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightHS.log);
            this.lightCT?.setAttribute(LevelControlCluster.id, 'currentLevel', level, this.lightCT.log);
            this.log.info(`Set lights currentLevel to ${level}`);
          }
        }
      },
      60 * 1000 + 200,
    );

    // Set outlet to off
    this.outlet?.setAttribute(OnOffCluster.id, 'onOff', false, this.outlet.log);
    this.outlet?.log.info('Set outlet initial onOff to false');
    // Toggle outlet onOff every minute
    this.outletInterval = setInterval(
      () => {
        const state = this.outlet?.getAttribute(OnOffCluster.id, 'onOff', this.outlet.log);
        if (isValidBoolean(state)) {
          this.outlet?.setAttribute(OnOffCluster.id, 'onOff', !state, this.outlet.log);
          this.outlet?.log.info(`Set outlet onOff to ${!state}`);
        }
      },
      60 * 1000 + 300,
    );

    // Set cover to target = current position and status to stopped (current position is persisted in the cluster)
    this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
    this.cover?.log.info('Set cover initial targetPositionLiftPercent100ths = currentPositionLiftPercent100ths and operationalStatus to Stopped.');
    // Increment cover position every minute
    this.coverInterval = setInterval(
      () => {
        let position = this.cover?.getAttribute(WindowCoveringCluster.id, 'currentPositionLiftPercent100ths', this.cover.log);
        if (isValidNumber(position, 0, 10000)) {
          position = position > 9000 ? 0 : position + 1000;
          this.cover?.setAttribute(WindowCoveringCluster.id, 'targetPositionLiftPercent100ths', position, this.cover.log);
          this.cover?.setAttribute(WindowCoveringCluster.id, 'currentPositionLiftPercent100ths', position, this.cover.log);
          this.cover?.setAttribute(
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
    this.lock?.setAttribute(DoorLockCluster.id, 'lockState', DoorLock.LockState.Locked, this.lock.log);
    this.lock?.log.info('Set lock initial lockState to Locked');
    // Toggle lock every minute
    this.lockInterval = setInterval(
      () => {
        const status = this.lock?.getAttribute(DoorLockCluster.id, 'lockState', this.lock.log);
        if (isValidNumber(status, DoorLock.LockState.Locked, DoorLock.LockState.Unlocked)) {
          this.lock?.setAttribute(DoorLockCluster.id, 'lockState', status === DoorLock.LockState.Locked ? DoorLock.LockState.Unlocked : DoorLock.LockState.Locked, this.lock.log);
          this.lock?.log.info(`Set lock lockState to ${status === DoorLock.LockState.Locked ? 'Unlocked' : 'Locked'}`);
        }
      },
      60 * 1000 + 500,
    );

    // Set local to 16°C
    this.thermo?.setAttribute(ThermostatCluster.id, 'localTemperature', 1600, this.thermo.log);
    this.thermo?.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Auto, this.thermo.log);
    this.thermo?.log.info('Set thermostat initial localTemperature to 16°C and mode Auto');
    // Increment localTemperature every minute
    this.thermoInterval = setInterval(
      () => {
        let temperature = this.thermo?.getAttribute(ThermostatCluster.id, 'localTemperature', this.thermo.log);
        if (isValidNumber(temperature, 1600, 2400)) {
          temperature = temperature + 100 >= 2400 ? 1600 : temperature + 100;
          this.thermo?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermo.log);
          this.thermo?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
        }
      },
      60 * 1000 + 600,
    );

    // Set fan to auto
    this.fan?.log.info('Set fan initial fanMode to Auto, percentCurrent to 50 and speedCurrent to 50');
    this.fan?.setAttribute(FanControlCluster.id, 'fanMode', FanControl.FanMode.Auto, this.fan.log);
    this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', 50, this.fan.log);
    this.fan?.setAttribute(FanControlCluster.id, 'speedCurrent', 50, this.fan.log);
    // Increment fan percentCurrent every minute
    this.fanInterval = setInterval(
      () => {
        const mode = this.fan?.getAttribute(FanControlCluster.id, 'fanMode', this.fan.log);
        let value = this.fan?.getAttribute(FanControlCluster.id, 'percentCurrent', this.fan.log);
        if (isValidNumber(mode, FanControl.FanMode.Off, FanControl.FanMode.Auto) && mode === FanControl.FanMode.Auto && isValidNumber(value, 0, 100)) {
          value = value + 10 >= 100 ? 0 : value + 10;
          this.fan?.setAttribute(FanControlCluster.id, 'percentCurrent', value, this.fan.log);
          this.fan?.log.info(`Set fan percentCurrent to ${value}`);
        }
      },
      60 * 1000 + 700,
    );

    // Set waterLeak to false
    this.waterLeak?.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterLeak.log);
    // Toggle waterLeak every minute
    this.waterLeakInterval = setInterval(
      () => {
        let value = this.waterLeak?.getAttribute(BooleanStateCluster.id, 'stateValue', this.waterLeak.log);
        if (isValidBoolean(value)) {
          value = !value;
          this.waterLeak?.setAttribute(BooleanStateCluster.id, 'stateValue', value, this.waterLeak.log);
          this.waterLeak?.log.info(`Set waterLeak stateValue to ${value}`);
        }
      },
      60 * 1000 + 800,
    );

    // Set waterFreeze to false
    this.waterFreeze?.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.waterFreeze.log);
    // Toggle waterFreeze every minute
    this.waterFreezeInterval = setInterval(
      () => {
        let value = this.waterFreeze?.getAttribute(BooleanStateCluster.id, 'stateValue', this.waterFreeze.log);
        if (isValidBoolean(value)) {
          value = !value;
          this.waterFreeze?.setAttribute(BooleanStateCluster.id, 'stateValue', value, this.waterFreeze.log);
          this.waterFreeze?.log.info(`Set waterFreeze stateValue to ${value}`);
        }
      },
      60 * 1000 + 900,
    );

    // Set rain to false
    this.rain?.setAttribute(BooleanStateCluster.id, 'stateValue', false, this.rain.log);
    // Toggle rain every minute
    this.rainInterval = setInterval(
      () => {
        let value = this.rain?.getAttribute(BooleanStateCluster.id, 'stateValue', this.rain.log);
        if (isValidBoolean(value)) {
          value = !value;
          this.rain?.setAttribute(BooleanStateCluster.id, 'stateValue', value, this.rain.log);
          this.rain?.log.info(`Set rain stateValue to ${value}`);
        }
      },
      60 * 1000 + 1000,
    );

    // Set smoke to Normal
    this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smoke.log);
    // Toggle smoke every minute
    this.smokeInterval = setInterval(
      () => {
        let value = this.smoke?.getAttribute(SmokeCoAlarmCluster.id, 'smokeState', this.smoke.log);
        if (isValidNumber(value, SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Critical)) {
          value = value === SmokeCoAlarm.AlarmState.Normal ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
          this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'smokeState', value, this.smoke.log);
          this.smoke?.setAttribute(SmokeCoAlarmCluster.id, 'coState', value, this.smoke.log);
          this.smoke?.log.info(`Set smoke smokeState and coState to ${value}`);
        }
      },
      60 * 1000 + 1100,
    );

    // Set air quality to Normal
    this.airQuality?.setAttribute(AirQualityCluster.id, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    // Toggle air quality every minute
    this.airQualityInterval = setInterval(
      () => {
        let value = this.airQuality?.getAttribute(AirQualityCluster.id, 'airQuality', this.airQuality?.log);
        if (isValidNumber(value, AirQuality.AirQualityEnum.Good, AirQuality.AirQualityEnum.ExtremelyPoor)) {
          value = value >= AirQuality.AirQualityEnum.ExtremelyPoor ? AirQuality.AirQualityEnum.Good : value + 1;
          this.airQuality?.setAttribute(AirQualityCluster.id, 'airQuality', value, this.airQuality.log);
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
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function subscribeAttribute(clusterId: ClusterId, attribute: string, listener: (newValue: any, oldValue: any) => void, log?: AnsiLogger, endpoint?: Endpoint): boolean {
  // if (!endpoint) endpoint = this as Endpoint;
  if (!endpoint) return false;

  const clusterServer = endpoint.getClusterServerById(clusterId);
  if (!clusterServer) {
    log?.error(`subscribeAttribute error: Cluster ${clusterId} not found on endpoint ${endpoint.name}:${endpoint.number}`);
    return false;
  }
  const capitalizedAttributeName = attribute.charAt(0).toUpperCase() + attribute.slice(1);
  if (!clusterServer.isAttributeSupportedByName(attribute) && !clusterServer.isAttributeSupportedByName(capitalizedAttributeName)) {
    if (log) log.error(`subscribeAttribute error: Attribute ${attribute} not found on Cluster ${clusterServer.name} on endpoint ${endpoint.name}:${endpoint.number}`);
    return false;
  }
  // Find the subscribe method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(clusterServer as any)[`subscribe${capitalizedAttributeName}Attribute`]) {
    log?.error(
      `subscribeAttribute error: subscribe${capitalizedAttributeName}Attribute not found on Cluster ${clusterServer.name} on endpoint ${endpoint.name}:${endpoint.number}`,
    );
    return false;
  }
  // Subscribe to the attribute
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
  const subscribe = (clusterServer as any)[`subscribe${capitalizedAttributeName}Attribute`] as (listener: (newValue: any, oldValue: any) => void) => {};
  subscribe(listener);
  log?.info(`${db}Subscribe endpoint ${or}${endpoint.name}:${endpoint.number}${db} attribute ${hk}${clusterServer.name}.${capitalizedAttributeName}${db}`);
  return true;
}

/*

interface MatterCommandData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
  endpoint: Endpoint;
}

function addCommandHandler(clusterId: ClusterId, command: string, handler: (data: MatterCommandData) => void, log?: AnsiLogger, endpoint?: Endpoint): boolean {
  // if (!endpoint) endpoint = this as Endpoint;
  if (!endpoint) return false;

  const clusterServer = endpoint.getClusterServerById(clusterId);
  if (!clusterServer) {
    log?.error(`addCommandHandler error: Cluster ${clusterId} not found on endpoint ${endpoint.name}:${endpoint.number}`);
    return false;
  }
  if (!clusterServer.isCommandSupportedByName(command)) {
    if (log) log.error(`addCommandHandler error: Command ${command} not found on Cluster ${clusterServer.name} on endpoint ${endpoint.name}:${endpoint.number}`);
    return false;
  }
  // Find the command
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commands = (clusterServer as any).commands as object;
  for (const [key, value] of Object.entries(commands)) {
    // console.log(`Key "${key}": ${debugStringify(value)}`);
    if (key === command) {
      value.handler = handler;
      log?.info(`${db}Command handler added for endpoint ${or}${endpoint.name}:${endpoint.number}${db} ${hk}${clusterServer.name}.${command}${db}`);
      return true;
    }
  }
  log?.error(`Command handler not found for endpoint ${or}${endpoint.name}:${endpoint.number}${er} ${hk}${clusterServer.name}.${command}${er}`);
  return false;
}
*/
