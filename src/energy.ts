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


/** ************************************************************** WaterHeaterMode ***********************************************************/

// Interface for the WaterHeaterMode
export namespace WaterHeaterModeInterface {
  export interface Base {
    changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse>;
  }
}
export interface WaterHeaterModeInterface {
  components: [{ flags: {}; methods: WaterHeaterModeInterface.Base }];
}

// Behavior for WaterHeaterMode
export const WaterHeaterModeBehavior = ClusterBehavior.withInterface<WaterHeaterModeInterface>().for(WaterHeaterMode.Cluster);
type WaterHeaterModeBehaviorType = InstanceType<typeof WaterHeaterModeBehavior>;
export interface WaterHeaterModeBehavior extends WaterHeaterModeBehaviorType {}
type WaterHeaterModeStateType = InstanceType<typeof WaterHeaterModeBehavior.State>;
export namespace WaterHeaterModeBehavior {
  export interface State extends WaterHeaterModeStateType {}
}

// Server for WaterHeaterMode
class WaterHeaterModeServer extends WaterHeaterModeBehavior {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    device.log.info('WaterHeaterModeServer initialized: setting currentMode to 3');
    this.state.currentMode = 2;
    this.reactTo(this.agent.get(MatterbridgeOnOffServer).events.onOff$Changed, this.handleOnOffChange);
  }

  // Dead Front OnOff Cluster
  protected handleOnOffChange(onOff: boolean) {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    if (onOff === false) {
      device.log.info('***OnOffServer changed to OFF: setting Dead Front state to Manufacturer Specific');
      this.state.currentMode = 2;
    }
  }

  override changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    const supportedMode = this.state.supportedModes.find((supportedMode) => supportedMode.mode === request.newMode);
    if (supportedMode) {
      device.log.info(`WaterHeaterModeServer: changeToMode called with mode ${supportedMode.mode} = ${supportedMode.label}`);
      this.state.currentMode = request.newMode;
      return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Success' };
    } else {
      device.log.error(`WaterHeaterModeServer: changeToMode called with invalid mode ${request.newMode}`);
      return { status: ModeBase.ModeChangeStatus.InvalidInMode, statusText: 'Invalid mode' };
    }
  }
}
