/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-empty-object-type */

import {
  DeviceTypeDefinition,
  MatterbridgeEndpoint,
  MatterbridgeServer,
  MatterbridgeOnOffServer,
  waterHeater,
  powerSource,
} from 'matterbridge';
import { ClusterBehavior, MaybePromise, } from 'matterbridge/matter';
import {
  ModeBase,
} from 'matterbridge/matter/clusters';
import {
  // LaundryWasherControlsServer,
  WaterHeaterManagementBehavior,
  WaterHeaterModeBehavior,
} from 'matterbridge/matter/behaviors';

export class Energy extends MatterbridgeEndpoint {
  constructor(deviceType: DeviceTypeDefinition, name: string, serial: string) {
    super([deviceType, powerSource], { uniqueStorageKey: `${name}-${serial}` }, true);
    if (deviceType.code === waterHeater.code) {
      // Water Heater
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Water Heater');
      this.createDefaultPowerSourceWiredClusterServer();
      this.createDefaultWaterHeaterManagementClusterServer();
      this.createDefaultWaterHeaterModeClusterServer();
    } 
  }
}

  /**
   * Creates a default WaterHeater Mode Cluster Server.
   *
   * @param {number} currentMode - The current mode of the water heater.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultWaterHeaterModeClusterServer(currentMode?: number): this {
    this.behaviors.require(WaterHeaterModeServer, {
      supportedModes: [
        { label: 'Auto', mode: 1, modeTags: [{ value: WaterHeaterMode.ModeTag.Auto }] },
        { label: 'Quick', mode: 2, modeTags: [{ value: WaterHeaterMode.ModeTag.Quick }] },
        { label: 'LowNoise', mode: 3, modeTags: [{ value: WaterHeaterMode.ModeTag.LowNoise }] },
        { label: 'Off', mode: 0x4000, modeTags: [{ value: WaterHeaterMode.ModeTag.Off }] },
        { label: 'Manual', mode: 0x4001, modeTags: [{ value: WaterHeaterMode.ModeTag.Manual }] },
        { label: 'Timed', mode: 0x4002, modeTags: [{ value: WaterHeaterMode.ModeTag.Manual }] },
        
      ],
      currentMode,
    });
    return this;
  }

