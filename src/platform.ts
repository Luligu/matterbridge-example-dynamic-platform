import { ColorControl, ColorControlCluster, DeviceTypes, LevelControlCluster, OnOffCluster, WindowCovering, WindowCoveringCluster } from 'matterbridge';

import { Matterbridge, MatterbridgeDevice, MatterbridgeDynamicPlatform } from 'matterbridge';
import { AnsiLogger } from 'node-ansi-logger';

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  cover: MatterbridgeDevice | undefined;
  light: MatterbridgeDevice | undefined;
  coverInterval: NodeJS.Timeout | undefined;
  lightInterval: NodeJS.Timeout | undefined;

  constructor(matterbridge: Matterbridge, log: AnsiLogger) {
    super(matterbridge, log);
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Create a window covering device
    this.cover = new MatterbridgeDevice(DeviceTypes.WINDOW_COVERING);
    this.cover.createDefaultIdentifyClusterServer();
    this.cover.createDefaultGroupsClusterServer();
    this.cover.createDefaultScenesClusterServer();
    this.cover.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 1', '0x01020564', 0xfff1, 'Luligu', 'Dynamic device 1');
    this.cover.createDefaultPowerSourceRechargableBatteryClusterServer(86);
    this.cover.createDefaultWindowCoveringClusterServer();
    await this.registerDevice(this.cover);

    this.cover.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.cover.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      this.log.info(`Command goToLiftPercentage called liftPercent100thsValue:${liftPercent100thsValue}`);
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
      this.log.info('Command on called');
    });
    this.light.addCommandHandler('off', async () => {
      this.log.info('Command off called');
    });
  }
  override async onConfigure() {
    this.log.info('onConfigure called');

    if (!this.cover) return;
    const coverCluster = this.cover.getClusterServer(WindowCoveringCluster.with(WindowCovering.Feature.Lift, WindowCovering.Feature.PositionAwareLift));
    if (coverCluster && coverCluster.getCurrentPositionLiftPercent100thsAttribute) {
      const position = coverCluster.getCurrentPositionLiftPercent100thsAttribute();
      if (position === null) return;
      this.log.debug(`**onConfigure called. Current PositionLiftPercent100ths is ${position}. Set target and status.`);
      coverCluster.setTargetPositionLiftPercent100thsAttribute(position);
      coverCluster.setOperationalStatusAttribute({
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      });
      this.log.info(`Set cover initial currentPositionLiftPercent100ths and targetPositionLiftPercent100ths to ${position} and operationalStatus to Stopped.`);
    }

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
      60 * 1000 + 500,
    );

    // Set light to off and level to 0
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
  }

  override async onShutdown(reason?: string) {
    this.log.info('onShutdown called with reason:', reason ?? 'none');
    clearInterval(this.coverInterval);
    clearInterval(this.lightInterval);
    await this.unregisterAllDevices();
  }
}
