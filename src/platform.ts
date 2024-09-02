import {
  ColorControl,
  ColorControlCluster,
  DeviceTypes,
  DoorLock,
  DoorLockCluster,
  FlowMeasurement,
  LevelControlCluster,
  OnOffCluster,
  PlatformConfig,
  RelativeHumidityMeasurement,
  TemperatureMeasurement,
  Thermostat,
  ThermostatCluster,
  WindowCovering,
  WindowCoveringCluster,
  onOffSwitch,
  powerSource,
} from 'matterbridge';
import { Matterbridge, MatterbridgeDevice, MatterbridgeDynamicPlatform } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  switch: MatterbridgeDevice | undefined;
  light: MatterbridgeDevice | undefined;
  lightXY: MatterbridgeDevice | undefined;
  lightHS: MatterbridgeDevice | undefined;
  lightCT: MatterbridgeDevice | undefined;
  outlet: MatterbridgeDevice | undefined;
  cover: MatterbridgeDevice | undefined;
  lock: MatterbridgeDevice | undefined;
  thermo: MatterbridgeDevice | undefined;
  switchInterval: NodeJS.Timeout | undefined;
  lightInterval: NodeJS.Timeout | undefined;
  outletInterval: NodeJS.Timeout | undefined;
  coverInterval: NodeJS.Timeout | undefined;
  lockInterval: NodeJS.Timeout | undefined;
  thermoInterval: NodeJS.Timeout | undefined;

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);
    this.log.info('Initializing platform:', this.config.name);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Create a switch device
    this.switch = new MatterbridgeDevice(onOffSwitch);
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
      this.switch?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
      this.log.info('Command on called');
    });
    this.switch.addCommandHandler('off', async () => {
      this.switch?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
      this.log.info('Command off called');
    });

    // Create a light device
    this.light = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT);
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
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.light.addCommandHandler('on', async () => {
      this.light?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
      this.log.info('Command on called');
    });
    this.light.addCommandHandler('off', async () => {
      this.light?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
      this.log.info('Command off called');
    });
    this.light.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.light?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.light?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToColor', async ({ request: { colorX, colorY }, attributes: { currentX, currentY } }) => {
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.Xy))?.setCurrentXAttribute(colorX);
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.Xy))?.setCurrentYAttribute(colorY);
      this.log.debug(
        `Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536} attributes: X ${(currentX?.getLocal() ?? 0) / 65536} Y ${(currentY?.getLocal() ?? 0) / 65536}`,
      );
    });
    this.light.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentHueAttribute(hue);
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentSaturationAttribute(saturation);
      this.log.debug(
        `Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.light.addCommandHandler('moveToHue', async ({ request: { hue }, attributes: { currentHue, currentSaturation } }) => {
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentHueAttribute(hue);
      this.log.debug(`Command moveToHue called request: hue ${hue} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToSaturation', async ({ request: { saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentSaturationAttribute(saturation);
      this.log.debug(`Command moveToSaturation called request: saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      this.light?.getClusterServer(ColorControl.Complete)?.setColorTemperatureMiredsAttribute(request.colorTemperatureMireds);
      this.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create a light device with HS color control
    this.lightHS = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT);
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
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightHS.addCommandHandler('on', async () => {
      this.lightHS?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
      this.log.info('Command on called');
    });
    this.lightHS.addCommandHandler('off', async () => {
      this.lightHS?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
      this.log.info('Command off called');
    });
    this.lightHS.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightHS?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightHS?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.lightHS?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentHueAttribute(hue);
      this.lightHS?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentSaturationAttribute(saturation);
      this.log.debug(
        `Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`,
      );
    });
    this.lightHS.addCommandHandler('moveToHue', async ({ request: { hue }, attributes: { currentHue, currentSaturation } }) => {
      this.lightHS?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentHueAttribute(hue);
      this.log.debug(`Command moveToHue called request: hue ${hue} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.lightHS.addCommandHandler('moveToSaturation', async ({ request: { saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.lightHS?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentSaturationAttribute(saturation);
      this.log.debug(`Command moveToSaturation called request: saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });

    // Create a light device with XY color control
    this.lightXY = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT);
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
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightXY.addCommandHandler('on', async () => {
      this.lightXY?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
      this.log.info('Command on called');
    });
    this.lightXY.addCommandHandler('off', async () => {
      this.lightXY?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
      this.log.info('Command off called');
    });
    this.lightXY.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightXY?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightXY.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightXY?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightXY.addCommandHandler('moveToColor', async ({ request: { colorX, colorY }, attributes: { currentX, currentY } }) => {
      this.lightXY?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.Xy))?.setCurrentXAttribute(colorX);
      this.lightXY?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.Xy))?.setCurrentYAttribute(colorY);
      this.log.debug(
        `Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536} attributes: X ${(currentX?.getLocal() ?? 0) / 65536} Y ${(currentY?.getLocal() ?? 0) / 65536}`,
      );
    });

    // Create a light device with CT color control
    this.lightCT = new MatterbridgeDevice(DeviceTypes.COLOR_TEMPERATURE_LIGHT);
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
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightCT.addCommandHandler('on', async () => {
      this.lightCT?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
      this.log.info('Command on called');
    });
    this.lightCT.addCommandHandler('off', async () => {
      this.lightCT?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
      this.log.info('Command off called');
    });
    this.lightCT.addCommandHandler('moveToLevel', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightCT?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevel called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightCT.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level }, attributes: { currentLevel } }) => {
      this.lightCT?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(level);
      this.log.debug(`Command moveToLevelWithOnOff called request: ${level} attributes: ${currentLevel?.getLocal()}`);
    });
    this.lightCT.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      this.lightCT?.getClusterServer(ColorControl.Complete)?.setColorTemperatureMiredsAttribute(request.colorTemperatureMireds);
      this.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create an outlet device
    this.outlet = new MatterbridgeDevice(DeviceTypes.ON_OFF_PLUGIN_UNIT);
    this.outlet.createDefaultIdentifyClusterServer();
    this.outlet.createDefaultGroupsClusterServer();
    this.outlet.createDefaultScenesClusterServer();
    this.outlet.createDefaultBridgedDeviceBasicInformationClusterServer('Outlet', '0x29252164', 0xfff1, 'Luligu', 'Matterbridge Outlet');
    this.outlet.createDefaultOnOffClusterServer();
    this.outlet.addDeviceType(powerSource);
    this.outlet.createDefaultPowerSourceWiredClusterServer();
    await this.registerDevice(this.outlet);

    this.outlet.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outlet.addCommandHandler('on', async () => {
      this.outlet?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
      this.log.info('Command on called');
    });
    this.outlet.addCommandHandler('off', async () => {
      this.outlet?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
      this.log.info('Command off called');
    });

    // Create a window covering device
    // Matter uses 10000 = fully closed   0 = fully opened
    this.cover = new MatterbridgeDevice(DeviceTypes.WINDOW_COVERING);
    this.cover.createDefaultIdentifyClusterServer();
    this.cover.createDefaultGroupsClusterServer();
    this.cover.createDefaultScenesClusterServer();
    this.cover.createDefaultBridgedDeviceBasicInformationClusterServer('Cover', '0x01020564', 0xfff1, 'Luligu', 'Matterbridge Cover');
    this.cover.createDefaultWindowCoveringClusterServer();
    this.cover.addDeviceType(powerSource);
    this.cover.createDefaultPowerSourceRechargeableBatteryClusterServer(86);
    await this.registerDevice(this.cover);

    this.cover.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.cover.addCommandHandler('stopMotion', async ({ attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
      this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
      this.log.info(
        `Command stopMotion called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
      );
    });

    this.cover.addCommandHandler('downOrClose', async ({ attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
      this.cover?.setWindowCoveringCurrentTargetStatus(10000, 10000, WindowCovering.MovementStatus.Stopped);
      this.log.info(
        `Command downOrClose called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
      );
    });

    this.cover.addCommandHandler('upOrOpen', async ({ attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
      this.cover?.setWindowCoveringCurrentTargetStatus(0, 0, WindowCovering.MovementStatus.Stopped);
      this.log.info(
        `Command upOrOpen called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
      );
    });

    this.cover.addCommandHandler(
      'goToLiftPercentage',
      async ({ request: { liftPercent100thsValue }, attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
        this.cover?.setWindowCoveringCurrentTargetStatus(liftPercent100thsValue, liftPercent100thsValue, WindowCovering.MovementStatus.Stopped);
        this.log.info(
          `Command goToLiftPercentage ${liftPercent100thsValue} called: current ${currentPositionLiftPercent100ths?.getLocal()} target ${targetPositionLiftPercent100ths?.getLocal()} status ${operationalStatus?.getLocal().lift}`,
        );
      },
    );

    // Create a lock device
    this.lock = new MatterbridgeDevice(DeviceTypes.DOOR_LOCK);
    this.lock.createDefaultIdentifyClusterServer();
    this.lock.createDefaultBridgedDeviceBasicInformationClusterServer('Lock', '0x96352164', 0xfff1, 'Luligu', 'Matterbridge Lock');
    this.lock.createDefaultDoorLockClusterServer();
    this.lock.addDeviceType(powerSource);
    this.lock.createDefaultPowerSourceRechargeableBatteryClusterServer(30);
    await this.registerDevice(this.lock);

    this.lock.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lock.addCommandHandler('lockDoor', async () => {
      this.lock?.getClusterServer(DoorLockCluster)?.setLockStateAttribute(DoorLock.LockState.Locked);
      this.log.info('Command lockDoor called');
    });
    this.lock.addCommandHandler('unlockDoor', async () => {
      this.lock?.getClusterServer(DoorLockCluster)?.setLockStateAttribute(DoorLock.LockState.Unlocked);
      this.log.info('Command unlockDoor called');
    });

    // Create a thermostat device
    this.thermo = new MatterbridgeDevice(DeviceTypes.THERMOSTAT);
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
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
      // if (this.thermo) logEndpoint(this.thermo);
    });
    this.thermo.addCommandHandler('setpointRaiseLower', async ({ request: { mode, amount }, attributes }) => {
      const lookupSetpointAdjustMode = ['Heat', 'Cool', 'Both'];
      this.log.info(`Command setpointRaiseLower called with mode: ${lookupSetpointAdjustMode[mode]} amount: ${amount / 10}`);
      if (mode === /* Thermostat.SetpointRaiseLowerMode.Heat*/ 0 && attributes.occupiedHeatingSetpoint) {
        const setpoint = attributes.occupiedHeatingSetpoint?.getLocal() / 100 + amount / 10;
        attributes.occupiedHeatingSetpoint.setLocal(setpoint * 100);
        this.log.info('Set occupiedHeatingSetpoint:', setpoint);
      }
      if (mode === /* Thermostat.SetpointRaiseLowerMode.Cool*/ 1 && attributes.occupiedCoolingSetpoint) {
        const setpoint = attributes.occupiedCoolingSetpoint.getLocal() / 100 + amount / 10;
        attributes.occupiedCoolingSetpoint.setLocal(setpoint * 100);
        this.log.info('Set occupiedCoolingSetpoint:', setpoint);
      }
    });
    const thermostat = this.thermo.getClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode));
    if (thermostat) {
      thermostat.subscribeSystemModeAttribute(async (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      });
      thermostat.subscribeOccupiedHeatingSetpointAttribute(async (value) => {
        this.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      });
      thermostat.subscribeOccupiedCoolingSetpointAttribute(async (value) => {
        this.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      });
    }
  }

  override async onConfigure() {
    this.log.info('onConfigure called');

    // Set switch to off
    this.switch?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
    this.log.info('Set switch initial onOff to false');

    this.switchInterval = setInterval(
      () => {
        if (!this.switch) return;
        const status = this.switch.getClusterServer(OnOffCluster)?.getOnOffAttribute();
        this.switch.getClusterServer(OnOffCluster)?.setOnOffAttribute(!status);
        this.log.info(`Set switch onOff to ${status}`);
      },
      60 * 1000 + 100,
    );

    // Set light to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    this.light?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
    this.light?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(0);
    this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentHueAttribute(0);
    this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentSaturationAttribute(128);
    this.light?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.log.info('Set light initial onOff to false, currentLevel to 0, hue to 0 and saturation to 50%.');

    this.lightInterval = setInterval(
      () => {
        if (!this.light) return;
        const lightLevelControlCluster = this.light.getClusterServer(LevelControlCluster);
        if (lightLevelControlCluster) {
          let level = lightLevelControlCluster.getCurrentLevelAttribute();
          if (level === null) return;
          level += 10;
          if (level > 254) {
            level = 0;
            this.light.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
            this.log.info('Set light onOff to false');
            return;
          } else {
            this.light.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
            this.log.info('Set light onOff to true');
          }
          lightLevelControlCluster.setCurrentLevelAttribute(level);
          this.log.info(`Set light currentLevel to ${level}`);
        }
      },
      60 * 1000 + 200,
    );

    // Set light XY to off, level to 0 and XY to red
    this.lightXY?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
    this.lightXY?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(254);
    this.lightXY?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.Xy))?.setCurrentXAttribute(0.7006 * 65536);
    this.lightXY?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.Xy))?.setCurrentYAttribute(0.2993 * 65536);
    this.lightXY?.configureColorControlMode(ColorControl.ColorMode.CurrentXAndCurrentY);
    this.log.info('Set light XY initial onOff to true, currentLevel to 254, X to 0.7006 and Y to 0.2993.');

    // Set light HS to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    this.lightHS?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
    this.lightHS?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(0);
    this.lightHS?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentHueAttribute(0);
    this.lightHS?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentSaturationAttribute(128);
    this.lightHS?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.log.info('Set light HS initial onOff to false, currentLevel to 0, hue to 0 and saturation to 50%.');

    // Set light CT to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    this.lightCT?.getClusterServer(OnOffCluster)?.setOnOffAttribute(true);
    this.lightCT?.getClusterServer(LevelControlCluster)?.setCurrentLevelAttribute(128);
    this.lightCT?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.ColorTemperature))?.setColorTemperatureMiredsAttribute(250);
    this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
    this.log.info('Set light CT initial onOff to true, currentLevel to 128, colorTemperatureMireds to 250.');

    // Set outlet to off
    this.outlet?.getClusterServer(OnOffCluster)?.setOnOffAttribute(false);
    this.log.info('Set outlet initial onOff to false');

    this.outletInterval = setInterval(
      () => {
        if (!this.outlet) return;
        const status = this.outlet.getClusterServer(OnOffCluster)?.getOnOffAttribute();
        this.outlet.getClusterServer(OnOffCluster)?.setOnOffAttribute(!status);
        this.log.info(`Set outlet onOff to ${status}`);
      },
      60 * 1000 + 300,
    );

    // Set cover to target = current position and status to stopped (current position is persisted in the cluster)
    this.cover?.setWindowCoveringTargetAsCurrentAndStopped();
    this.log.info('Set cover initial targetPositionLiftPercent100ths = currentPositionLiftPercent100ths and operationalStatus to Stopped.');

    this.coverInterval = setInterval(
      () => {
        if (!this.cover) return;
        const coverCluster = this.cover.getClusterServer(WindowCoveringCluster.with(WindowCovering.Feature.Lift, WindowCovering.Feature.PositionAwareLift));
        if (coverCluster && coverCluster.getCurrentPositionLiftPercent100thsAttribute) {
          let position = coverCluster.getCurrentPositionLiftPercent100thsAttribute();
          if (position === null) return;
          position = position > 9000 ? 0 : position + 1000;
          coverCluster.setTargetPositionLiftPercent100thsAttribute(position);
          coverCluster.setCurrentPositionLiftPercent100thsAttribute(position);
          coverCluster.setOperationalStatusAttribute({
            global: WindowCovering.MovementStatus.Stopped,
            lift: WindowCovering.MovementStatus.Stopped,
            tilt: WindowCovering.MovementStatus.Stopped,
          });
          this.log.info(`Set cover current and target positionLiftPercent100ths to ${position} and operationalStatus to Stopped`);
        }
      },
      60 * 1000 + 400,
    );

    // Set lock to Locked
    this.lock?.getClusterServer(DoorLockCluster)?.setLockStateAttribute(DoorLock.LockState.Locked);
    this.log.info('Set lock initial lockState to Locked');

    this.lockInterval = setInterval(
      () => {
        if (!this.lock) return;
        const status = this.lock.getClusterServer(DoorLockCluster)?.getLockStateAttribute();
        this.lock.getClusterServer(DoorLockCluster)?.setLockStateAttribute(status === DoorLock.LockState.Locked ? DoorLock.LockState.Unlocked : DoorLock.LockState.Locked);
        this.log.info(`Set lock lockState to ${status === DoorLock.LockState.Locked ? 'Locked' : 'Unlocked'}`);
      },
      60 * 1000 + 700,
    );

    // Set local to 16°C
    const clusterThermo = this.thermo?.getClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode));
    clusterThermo?.setLocalTemperatureAttribute(1600);
    clusterThermo?.setSystemModeAttribute(Thermostat.SystemMode.Auto);
    this.log.info('Set thermostat initial localTemperature to 16°C and mode Auto');

    this.thermoInterval = setInterval(
      () => {
        if (!this.thermo) return;
        const cluster = this.thermo.getClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode));
        if (!cluster) return;
        let local = cluster.getLocalTemperatureAttribute() ?? 1600;
        local = local >= 2500 ? 1600 : local + 100;
        cluster.setLocalTemperatureAttribute(local);
        this.log.info(`Set thermostat localTemperature to ${local / 100}°C`);
      },
      60 * 1000 + 700,
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
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }
}
