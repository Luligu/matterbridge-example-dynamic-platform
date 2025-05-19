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
  WaterHeaterManagement,
  WaterHeaterMode,
} from 'matterbridge/matter/clusters';
import {
  WaterHeaterManagementServer,
  WaterHeaterModeServer,
} from 'matterbridge/matter/behaviors';

export class Energy extends MatterbridgeEndpoint {
  constructor(
    deviceType: DeviceTypeDefinition,
    name: string,
    serial: string,
    waterTemperature = 50,
    minHeatSetpointLimit = 20,
    maxHeatSetpointLimit = 80,
    heaterTypes: { immersionElement1?: boolean, immersionElement2?: boolean, heatPump?: boolean, boiler?: boolean, other?: boolean } = { immersionElement1: true },	      
    ) {
    super([deviceType, powerSource], { uniqueStorageKey: `${name}-${serial}` }, true);
    if (deviceType.code === waterHeater.code) {
      // Water Heater
    this.createDefaultIdentifyClusterServer()
      .createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Matterbridge Water Heater')
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultHeatingThermostatClusterServer(waterTemperature, waterTemperature, minHeatSetpointLimit, maxHeatSetpointLimit)
      .createDefaultWaterHeaterManagementClusterServer(heaterTypes)
      .createDefaultWaterHeaterModeClusterServer();
    } 
  }
}

  /**
   * Creates a default WaterHeaterManagement Cluster Server.
   *
   * @param {{{ immersionElement1?: boolean, immersionElement2?: boolean, heatPump?: boolean, boiler?: boolean, other?: boolean }} [heaterTypes] - Indicates the heat sources that the water heater can call on for heating. Defaults to { immersionElement1: true }.
   * @param {{ immersionElement1?: boolean, immersionElement2?: boolean, heatPump?: boolean, boiler?: boolean, other?: boolean }} [heatDemand] - Indicates if the water heater is heating water. Defaults to all heat sources unset.
   * @param {number} [tankPercentage] - The current tank percentage of the WaterHeaterManagement cluster. Defaults to 100.
   * @param {WaterHeaterManagement.BoostState} [boostState] - The current boost state of the WaterHeaterManagement cluster. Defaults to Inactive.
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultWaterHeaterManagementClusterServer(
    heaterTypes?: { immersionElement1?: boolean, immersionElement2?: boolean, heatPump?: boolean, boiler?: boolean, other?: boolean },
    heatDemand?: { immersionElement1?: boolean, immersionElement2?: boolean, heatPump?: boolean, boiler?: boolean, other?: boolean },
    tankPercentage?: number,
    boostState?: WaterHeaterManagement.BoostState,
  ): this {
    this.behaviors.require(MatterbridgeWaterHeaterManagementServer.with(WaterHeaterManagement.Feature.TankPercent), {
      heaterTypes: heaterTypes ?? { immersionElement1: true },
      heatDemand: heatDemand ?? {},
      tankPercentage: tankPercentage ?? 100,
      boostState: boostState ?? WaterHeaterManagement.BoostState.Inactive,
    });
    return this;
  }

  /**
   * Creates a default WaterHeaterMode Cluster Server.
   *
   * @param {number} [currentMode] - The current mode of the WaterHeaterMode cluster. Defaults to mode 1 (WaterHeaterMode.ModeTag.Auto).
   * @param {WaterHeaterMode.ModeOption[]} [supportedModes] - The supported modes for the WaterHeaterMode cluster. Defaults all cluster modes.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultWaterHeaterModeClusterServer(currentMode?: number, supportedModes?: WaterHeaterMode.ModeOption[]): this {
    this.behaviors.require(MatterbridgeWaterHeaterModeServer, {
      supportedModes: supportedModes ?? [
        { label: 'Auto', mode: 1, modeTags: [{ value: WaterHeaterMode.ModeTag.Auto }] },
        { label: 'Quick', mode: 2, modeTags: [{ value: WaterHeaterMode.ModeTag.Quick }] },
        { label: 'Quiet', mode: 3, modeTags: [{ value: WaterHeaterMode.ModeTag.Quiet }] },
        { label: 'LowNoise', mode: 4, modeTags: [{ value: WaterHeaterMode.ModeTag.LowNoise }] },
        { label: 'LowEnergy', mode: 5, modeTags: [{ value: WaterHeaterMode.ModeTag.LowEnergy }] },
        { label: 'Vacation', mode: 6, modeTags: [{ value: WaterHeaterMode.ModeTag.Vacation }] },
        { label: 'Min', mode: 7, modeTags: [{ value: WaterHeaterMode.ModeTag.Min }] },
        { label: 'Max', mode: 8, modeTags: [{ value: WaterHeaterMode.ModeTag.Max }] },
        { label: 'Night', mode: 9, modeTags: [{ value: WaterHeaterMode.ModeTag.Night }] },
        { label: 'Day', mode: 10, modeTags: [{ value: WaterHeaterMode.ModeTag.Day }] },
        { label: 'Off', mode: 11, modeTags: [{ value: WaterHeaterMode.ModeTag.Off }] },
        { label: 'Manual', mode: 12, modeTags: [{ value: WaterHeaterMode.ModeTag.Manual }] },
        { label: 'Timed', mode: 13, modeTags: [{ value: WaterHeaterMode.ModeTag.Timed }] },
      ],
      currentMode: currentMode ?? 1,
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
