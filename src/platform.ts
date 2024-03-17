import { DeviceTypes, LevelControlCluster, OnOffCluster, WindowCovering, WindowCoveringCluster } from 'matterbridge';

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

    this.light = new MatterbridgeDevice(DeviceTypes.ON_OFF_LIGHT);
    this.light.createDefaultIdentifyClusterServer();
    this.light.createDefaultGroupsClusterServer();
    this.light.createDefaultScenesClusterServer();
    this.light.createDefaultBridgedDeviceBasicInformationClusterServer('Bridged device 2', '0x23480564', 0xfff1, 'Luligu', 'Dynamic device 2');
    this.light.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    this.light.createDefaultOnOffClusterServer();
    this.light.createDefaultLevelControlClusterServer();
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
          this.log.info(`Set PositionLiftPercent100ths to ${position}`);
        }
      },
      60 * 1000 + 500,
    );

    this.lightInterval = setInterval(
      () => {
        if (!this.light) return;
        const lightOnOffCluster = this.light.getClusterServer(OnOffCluster);
        if (lightOnOffCluster) {
          const status = lightOnOffCluster.getOnOffAttribute();
          lightOnOffCluster.setOnOffAttribute(!status);
          this.log.info(`Set onOff to ${!status}`);
        }
        const lightLevelControlCluster = this.light.getClusterServer(LevelControlCluster);
        if (lightLevelControlCluster) {
          let level = lightLevelControlCluster.getCurrentLevelAttribute();
          if (level === null) return;
          level += 10;
          if (level > 254) level = 0;
          lightLevelControlCluster.setCurrentLevelAttribute(level);
          this.log.info(`Set currentLevel to ${level}`);
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
