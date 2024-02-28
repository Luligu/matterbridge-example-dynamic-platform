import { DeviceTypes } from '@project-chip/matter-node.js/device';

import { Matterbridge, MatterbridgeDevice, MatterbridgeDynamicPlatform } from '../../matterbridge/dist/index.js';
import { AnsiLogger } from 'node-ansi-logger';

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  constructor(matterbridge: Matterbridge, log: AnsiLogger) {
    super(matterbridge, log);
  }

  override onStartDynamicPlatform(): void {
    this.log.info('onStartDynamicPlatform called');

    const cover = new MatterbridgeDevice(DeviceTypes.WINDOW_COVERING);
    cover.createDefaultIdentifyClusterServer();
    cover.createDefaultGroupsClusterServer();
    cover.createDefaultScenesClusterServer();
    cover.createDefaultBridgedDeviceBasicInformationClusterServer('BridgedDevice1', 'BridgedDevice1 0x01020564', 0xfff1, 'Luligu', 'BridgedDevice1');
    cover.createDefaultPowerSourceRechargableBatteryClusterServer(86);
    cover.createDefaultWindowCoveringClusterServer();
    this.registerDevice(cover);

    cover.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
    });
    cover.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      this.log.warn(`Command goToLiftPercentage called liftPercent100thsValue:${liftPercent100thsValue}`);
    });

    const light = new MatterbridgeDevice(DeviceTypes.ON_OFF_LIGHT);
    light.createDefaultIdentifyClusterServer();
    light.createDefaultGroupsClusterServer();
    light.createDefaultScenesClusterServer();
    light.createDefaultBridgedDeviceBasicInformationClusterServer('BridgedDevice2', 'BridgedDevice2 0x23023304', 0xfff1, 'Luligu', 'BridgedDevice2');
    light.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    light.createDefaultOnOffClusterServer();
    this.registerDevice(light);

    light.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
    });
    light.addCommandHandler('on', async () => {
      this.log.warn('Command on called');
    });
    light.addCommandHandler('off', async () => {
      this.log.warn('Command off called');
    });
  }

  override onShutdown(): void {
    this.log.info('onShutdown called');
  }
}
