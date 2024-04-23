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
} from 'matterbridge';

import { Matterbridge, MatterbridgeDevice, MatterbridgeDynamicPlatform } from 'matterbridge';
import { AnsiLogger } from 'node-ansi-logger';

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  switch: MatterbridgeDevice | undefined;
  light: MatterbridgeDevice | undefined;
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
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Create a switch device
    this.switch = new MatterbridgeDevice(onOffSwitch);
    this.switch.createDefaultIdentifyClusterServer();
    this.switch.createDefaultGroupsClusterServer();
    this.switch.createDefaultScenesClusterServer();
    this.switch.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 3', '0x23452164', 0xfff1, 'Luligu', 'Dynamic device 3');
    this.switch.createDefaultPowerSourceRechargeableBatteryClusterServer(70);
    this.switch.createDefaultOnOffClusterServer();
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
    this.light = new MatterbridgeDevice(DeviceTypes.ON_OFF_LIGHT);
    this.light.createDefaultIdentifyClusterServer();
    this.light.createDefaultGroupsClusterServer();
    this.light.createDefaultScenesClusterServer();
    this.light.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 2', '0x23480564', 0xfff1, 'Luligu', 'Dynamic device 2');
    this.light.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    this.light.createDefaultOnOffClusterServer();
    this.light.createDefaultLevelControlClusterServer();
    this.light.createDefaultColorControlClusterServer();
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
    this.light.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation }, attributes: { currentHue, currentSaturation } }) => {
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentHueAttribute(hue);
      this.light?.getClusterServer(ColorControlCluster.with(ColorControl.Feature.HueSaturation))?.setCurrentSaturationAttribute(saturation);
      this.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation} attributes: hue ${currentHue?.getLocal()} saturation ${currentSaturation?.getLocal()}`);
    });
    this.light.addCommandHandler('moveToColorTemperature', async ({ request, attributes }) => {
      this.light?.getClusterServer(ColorControl.Complete)?.setColorTemperatureMiredsAttribute(request.colorTemperatureMireds);
      this.log.debug(`Command moveToColorTemperature called request: ${request.colorTemperatureMireds} attributes: ${attributes.colorTemperatureMireds?.getLocal()}`);
    });

    // Create an outlet device
    this.outlet = new MatterbridgeDevice(DeviceTypes.ON_OFF_PLUGIN_UNIT);
    this.outlet.createDefaultIdentifyClusterServer();
    this.outlet.createDefaultGroupsClusterServer();
    this.outlet.createDefaultScenesClusterServer();
    this.outlet.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 4', '0x29252164', 0xfff1, 'Luligu', 'Dynamic device 4');
    this.outlet.createDefaultPowerSourceWiredClusterServer();
    this.outlet.createDefaultOnOffClusterServer();
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
    this.cover = new MatterbridgeDevice(DeviceTypes.WINDOW_COVERING);
    this.cover.createDefaultIdentifyClusterServer();
    this.cover.createDefaultGroupsClusterServer();
    this.cover.createDefaultScenesClusterServer();
    this.cover.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 1', '0x01020564', 0xfff1, 'Luligu', 'Dynamic device 1');
    this.cover.createDefaultPowerSourceRechargeableBatteryClusterServer(86);
    this.cover.createDefaultWindowCoveringClusterServer();
    await this.registerDevice(this.cover);

    this.cover.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.cover.addCommandHandler('stopMotion', async ({ attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
      const position = currentPositionLiftPercent100ths?.getLocal();
      if (position !== null && position !== undefined) targetPositionLiftPercent100ths?.setLocal(position);
      operationalStatus.setLocal({
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      });
      this.log.debug(`Command stopMotion called. Attributes: currentPositionLiftPercent100ths: ${currentPositionLiftPercent100ths?.getLocal()}`);
      this.log.debug(`Command stopMotion called. Attributes: targetPositionLiftPercent100ths: ${targetPositionLiftPercent100ths?.getLocal()}`);
      this.log.debug(`Command stopMotion called. Attributes: operationalStatus: ${operationalStatus?.getLocal().lift}`);
    });

    this.cover.addCommandHandler(
      'goToLiftPercentage',
      async ({ request: { liftPercent100thsValue }, attributes: { currentPositionLiftPercent100ths, targetPositionLiftPercent100ths, operationalStatus } }) => {
        currentPositionLiftPercent100ths?.setLocal(liftPercent100thsValue);
        targetPositionLiftPercent100ths?.setLocal(liftPercent100thsValue);
        operationalStatus.setLocal({
          global: WindowCovering.MovementStatus.Stopped,
          lift: WindowCovering.MovementStatus.Stopped,
          tilt: WindowCovering.MovementStatus.Stopped,
        });
        this.log.info(`Command goToLiftPercentage called. Request: liftPercent100thsValue: ${liftPercent100thsValue} `);
        this.log.debug(`Command goToLiftPercentage called. Attributes: currentPositionLiftPercent100ths: ${currentPositionLiftPercent100ths?.getLocal()}`);
        this.log.debug(`Command goToLiftPercentage called. Attributes: targetPositionLiftPercent100ths: ${targetPositionLiftPercent100ths?.getLocal()}`);
        this.log.debug(`Command goToLiftPercentage called. Attributes: operationalStatus: ${operationalStatus?.getLocal().lift}`);
      },
    );

    // Create a lock device
    this.lock = new MatterbridgeDevice(DeviceTypes.DOOR_LOCK);
    this.lock.createDefaultIdentifyClusterServer();
    this.lock.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 5', '0x96352164', 0xfff1, 'Luligu', 'Dynamic device 5');
    this.lock.createDefaultPowerSourceRechargeableBatteryClusterServer(30);
    this.lock.createDefaultDoorLockClusterServer();
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
    this.thermo.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 6', '0x96382164', 0xfff1, 'Luligu', 'Dynamic device 6');
    this.thermo.createDefaultPowerSourceRechargeableBatteryClusterServer(70);
    this.thermo.createDefaultThermostatClusterServer(20, 18, 22);

    const flowChild = this.thermo.addChildDeviceTypeWithClusterServer([DeviceTypes.FLOW_SENSOR], [FlowMeasurement.Cluster.id]);
    flowChild.getClusterServer(FlowMeasurement.Cluster)?.setMeasuredValueAttribute(1 * 10);

    const tempChild = this.thermo.addChildDeviceTypeWithClusterServer([DeviceTypes.TEMPERATURE_SENSOR], [TemperatureMeasurement.Cluster.id]);
    tempChild.getClusterServer(TemperatureMeasurement.Cluster)?.setMeasuredValueAttribute(41 * 100);

    const humidityChild = this.thermo.addChildDeviceTypeWithClusterServer([DeviceTypes.HUMIDITY_SENSOR], [RelativeHumidityMeasurement.Cluster.id]);
    humidityChild.getClusterServer(RelativeHumidityMeasurement.Cluster)?.setMeasuredValueAttribute(80 * 100);

    await this.registerDevice(this.thermo);

    this.thermo.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
      // if (this.thermo) logEndpoint(this.thermo);
    });
    this.thermo.addCommandHandler('setpointRaiseLower', async ({ request: { mode, amount }, attributes }) => {
      const lookupSetpointAdjustMode = ['Heat', 'Cool', 'Both'];
      this.log.info(`Command setpointRaiseLower called with mode: ${lookupSetpointAdjustMode[mode]} amount: ${amount / 10}`);
      if (mode === Thermostat.SetpointAdjustMode.Heat && attributes.occupiedHeatingSetpoint) {
        const setpoint = attributes.occupiedHeatingSetpoint?.getLocal() / 100 + amount / 10;
        attributes.occupiedHeatingSetpoint.setLocal(setpoint * 100);
        this.log.info('Set occupiedHeatingSetpoint:', setpoint);
      }
      if (mode === Thermostat.SetpointAdjustMode.Cool && attributes.occupiedCoolingSetpoint) {
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
    this.log.debug('Set cover initial targetPositionLiftPercent100ths = currentPositionLiftPercent100ths and operationalStatus to Stopped.');

    this.coverInterval = setInterval(
      () => {
        if (!this.cover) return;
        const coverCluster = this.cover.getClusterServer(WindowCoveringCluster.with(WindowCovering.Feature.Lift, WindowCovering.Feature.PositionAwareLift));
        if (coverCluster && coverCluster.getCurrentPositionLiftPercent100thsAttribute) {
          let position = coverCluster.getCurrentPositionLiftPercent100thsAttribute();
          if (position === null) return;
          position = position >= 9000 ? 0 : position + 1000;
          coverCluster.setTargetPositionLiftPercent100thsAttribute(position);
          coverCluster.setCurrentPositionLiftPercent100thsAttribute(position);
          coverCluster.setOperationalStatusAttribute({
            global: WindowCovering.MovementStatus.Stopped,
            lift: WindowCovering.MovementStatus.Stopped,
            tilt: WindowCovering.MovementStatus.Stopped,
          });
          this.log.info(`Set cover positionLiftPercent100ths to ${position}`);
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
    this.thermo?.getClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode))?.setLocalTemperatureAttribute(1600);
    this.log.info('Set thermo initial localTemperature to 16°C');

    this.thermoInterval = setInterval(
      () => {
        if (!this.thermo) return;
        const cluster = this.thermo.getClusterServer(ThermostatCluster.with(Thermostat.Feature.Heating, Thermostat.Feature.Cooling, Thermostat.Feature.AutoMode));
        if (!cluster) return;
        let local = cluster.getLocalTemperatureAttribute() ?? 1600;
        local = local >= 2300 ? 1600 : local + 100;
        cluster.setLocalTemperatureAttribute(local);
        this.log.info(`Set thermo localTemperature to ${local / 100}°C`);
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
