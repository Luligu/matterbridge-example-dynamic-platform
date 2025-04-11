/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-empty-object-type */

// Matterbridge
import { MatterbridgeBehavior, MatterbridgeEndpoint, roboticVacuumCleaner } from 'matterbridge';

// Matter.js implementations
import { RvcOperationalState } from './implementations/roboticVacuumCleanerClusters.js';

// Matter.js
import { ClusterBehavior, MaybePromise } from 'matterbridge/matter';
import { Status } from 'matterbridge/matter/types';
import { ModeBase, OperationalState, PowerSource, RvcRunMode, RvcCleanMode, ServiceArea } from 'matterbridge/matter/clusters';
import { OnOffServer, ServiceAreaBehavior } from 'matterbridge/matter/behaviors';

export class Robot extends MatterbridgeEndpoint {
  constructor(name: string, serial: string) {
    super(roboticVacuumCleaner, { uniqueStorageKey: `${name}-${serial}` }, true);
    this.createDefaultIdentifyClusterServer()
      .createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Matterbridge Robot Vacuum Cleaner')
      .createDefaultOnOffClusterServer()
      .createDefaultRvcRunModeClusterServer()
      .createDefaultRvcOperationalStateClusterServer()
      .createDefaultRvcCleanModeClusterServer()
      .createDefaultServiceAreaClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 5900);
  }

  /**
   * Creates a default RvcRunMode Cluster Server.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultRvcRunModeClusterServer(): this {
    this.behaviors.require(MatterbridgeRvcRunModeServer, {
      supportedModes: [
        { label: 'Idle', mode: 1, modeTags: [{ value: RvcRunMode.ModeTag.Idle }] },
        { label: 'Cleaning', mode: 2, modeTags: [{ value: RvcRunMode.ModeTag.Cleaning }] },
        { label: 'Mapping', mode: 3, modeTags: [{ value: RvcRunMode.ModeTag.Mapping }] },
        { label: 'SpotCleaning', mode: 4, modeTags: [{ value: RvcRunMode.ModeTag.Cleaning }, { value: RvcRunMode.ModeTag.Max }] },
      ],
      currentMode: 1,
    });
    return this;
  }

  /**
   * Creates a default RvcCleanMode Cluster Server.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultRvcCleanModeClusterServer(): this {
    this.behaviors.require(MatterbridgeRvcCleanModeServer, {
      supportedModes: [
        { label: 'Vacuum', mode: 1, modeTags: [{ value: RvcCleanMode.ModeTag.Vacuum }] },
        { label: 'Mop', mode: 2, modeTags: [{ value: RvcCleanMode.ModeTag.Mop }] },
        { label: 'Clean', mode: 3, modeTags: [{ value: RvcCleanMode.ModeTag.DeepClean }] },
      ],
      currentMode: 1,
    });
    return this;
  }

  /**
   * Creates a default ServiceArea Cluster Server.
   *
   * @param {ServiceArea.Area[]} [supportedAreas] - The supported areas for the ServiceArea cluster. Defaults to a predefined set of areas.
   * @param {number[]} [selectedAreas] - The selected areas for the ServiceArea cluster. Defaults to an empty array (all areas allowed).
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultServiceAreaClusterServer(supportedAreas?: ServiceArea.Area[], selectedAreas?: number[]): this {
    this.behaviors.require(MatterbridgeServiceAreaServer, {
      supportedAreas: supportedAreas ?? [
        {
          areaId: 1,
          mapId: null,
          areaInfo: { locationInfo: { locationName: 'Living', floorNumber: null, areaType: null }, landmarkInfo: null },
        },
        {
          areaId: 2,
          mapId: null,
          areaInfo: { locationInfo: { locationName: 'Kitchen', floorNumber: null, areaType: null }, landmarkInfo: null },
        },
        {
          areaId: 3,
          mapId: null,
          areaInfo: { locationInfo: { locationName: 'Bedroom', floorNumber: null, areaType: null }, landmarkInfo: null },
        },
        {
          areaId: 4,
          mapId: null,
          areaInfo: { locationInfo: { locationName: 'Bathroom', floorNumber: null, areaType: null }, landmarkInfo: null },
        },
      ],
      selectedAreas: selectedAreas ?? [],
      currentArea: 1,
      estimatedEndTime: null,
    });
    return this;
  }

  /**
   * Creates a default RvcOperationalState Cluster Server.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultRvcOperationalStateClusterServer(): this {
    this.behaviors.require(MatterbridgeRvcOperationalStateServer, {
      phaseList: [],
      currentPhase: null,
      operationalStateList: [
        { operationalStateId: RvcOperationalState.OperationalState.Stopped, operationalStateLabel: 'Stopped' },
        { operationalStateId: RvcOperationalState.OperationalState.Running, operationalStateLabel: 'Running' },
        { operationalStateId: RvcOperationalState.OperationalState.Paused, operationalStateLabel: 'Paused' },
        { operationalStateId: RvcOperationalState.OperationalState.Error, operationalStateLabel: 'Error' },
        { operationalStateId: RvcOperationalState.OperationalState.SeekingCharger, operationalStateLabel: 'SeekingCharger' }, // Y RVC Pause Compatibility N RVC Resume Compatibility
        { operationalStateId: RvcOperationalState.OperationalState.Charging, operationalStateLabel: 'Charging' }, // N RVC Pause Compatibility Y RVC Resume Compatibility
        { operationalStateId: RvcOperationalState.OperationalState.Docked, operationalStateLabel: 'Docked' }, // N RVC Pause Compatibility Y RVC Resume Compatibility
      ],
      operationalState: RvcOperationalState.OperationalState.Docked,
      operationalError: { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' },
    });
    return this;
  }
}

/** ************************************************************** ServiceArea ***********************************************************/

// ServiceAreaServer
export class MatterbridgeServiceAreaServer extends ServiceAreaBehavior {
  override initialize() {
    //
  }

  override selectAreas({ newAreas }: ServiceArea.SelectAreasRequest): MaybePromise<ServiceArea.SelectAreasResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    for (const area of newAreas) {
      const supportedArea = this.state.supportedAreas.find((supportedArea) => supportedArea.areaId === area);
      if (!supportedArea) {
        device.log.error('MatterbridgeServiceAreaServer selectAreas called with unsupported area:', area);
        return { status: ServiceArea.SelectAreasStatus.UnsupportedArea, statusText: 'Unsupported areas' };
      }
    }
    // device.selectAreas({ newAreas });
    this.state.selectedAreas = newAreas;
    return { status: ServiceArea.SelectAreasStatus.Success, statusText: 'Succesfully selected new areas' };
  }
}

/** ************************************************************** RvcRunMode ***********************************************************/

// RvcRunModeInterface
export namespace RvcRunModeInterface {
  export interface Base {
    changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse>;
  }
}
export interface RvcRunModeInterface {
  components: [{ flags: {}; methods: RvcRunModeInterface.Base }];
}

// RvcRunModeBehavior
export const RvcRunModeBehavior = ClusterBehavior.withInterface<RvcRunModeInterface>().for(RvcRunMode.Cluster);
type RvcRunModeBehaviorType = InstanceType<typeof RvcRunModeBehavior>;
export interface RvcRunModeBehavior extends RvcRunModeBehaviorType {}
type RvcRunModeStateType = InstanceType<typeof RvcRunModeBehavior.State>;
export namespace RvcRunModeBehavior {
  export interface State extends RvcRunModeStateType {}
}

// RvcRunModeServer
export class MatterbridgeRvcRunModeServer extends RvcRunModeBehavior /* .with(RvcRunMode.Feature.OnOff)*/ {
  override initialize() {
    this.state.currentMode = 1; // RvcRunMode.ModeTag.Idle
  }

  override changeToMode({ newMode }: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    const supported = this.state.supportedModes.find((mode) => mode.mode === newMode);
    if (!supported) {
      device.log.error('MatterbridgeRvcRunModeServer changeToMode called with unsupported newMode:', newMode);
      return { status: Status.InvalidCommand, statusText: 'Invalid command' } as ModeBase.ChangeToModeResponse;
    }
    device.changeToMode({ newMode });
    this.state.currentMode = newMode;
    if (supported.modeTags.find((tag) => tag.value === RvcRunMode.ModeTag.Cleaning)) {
      device.log.info('***MatterbridgeRvcRunModeServer changeToMode called with newMode Cleaning => Running');
      this.agent.get(MatterbridgeRvcOperationalStateServer).state.operationalState = RvcOperationalState.OperationalState.Running;
      return { status: Status.Success, statusText: 'Running' } as ModeBase.ChangeToModeResponse;
    } else if (supported.modeTags.find((tag) => tag.value === RvcRunMode.ModeTag.Idle)) {
      device.log.info('***MatterbridgeRvcRunModeServer changeToMode called with newMode Idle => Docked');
      this.agent.get(MatterbridgeRvcOperationalStateServer).state.operationalState = RvcOperationalState.OperationalState.Docked;
      return { status: Status.Success, statusText: 'Docked' } as ModeBase.ChangeToModeResponse;
    }
    device.log.info(`***MatterbridgeRvcRunModeServer changeToMode called with newMode ${newMode} => ${supported.label}`);
    this.agent.get(MatterbridgeRvcOperationalStateServer).state.operationalState = RvcOperationalState.OperationalState.Running;
    return { status: Status.Success, statusText: 'Success' } as ModeBase.ChangeToModeResponse;
  }
}

/** ************************************************************** RvcCleanMode ***********************************************************/

// RvcCleanModeInterface
export namespace RvcCleanModeInterface {
  export interface Base {
    changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse>;
  }
}
export interface RvcCleanModeInterface {
  components: [{ flags: {}; methods: RvcCleanModeInterface.Base }];
}

// RvcCleanModeBehavior
export const RvcCleanModeBehavior = ClusterBehavior.withInterface<RvcCleanModeInterface>().for(RvcCleanMode.Cluster);
type RvcCleanModeBehaviorType = InstanceType<typeof RvcCleanModeBehavior>;
export interface RvcCleanModeBehavior extends RvcCleanModeBehaviorType {}
type RvcCleanModeStateType = InstanceType<typeof RvcCleanModeBehavior.State>;
export namespace RvcCleanModeBehavior {
  export interface State extends RvcCleanModeStateType {}
}

// RvcCleanModeServer
export class MatterbridgeRvcCleanModeServer extends RvcCleanModeBehavior /* .with(RvcRunMode.Feature.OnOff)*/ {
  override initialize() {
    this.state.currentMode = 1; // RvcCleanMode.ModeTag.Vacuum
  }

  override changeToMode({ newMode }: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    const supported = this.state.supportedModes.find((mode) => mode.mode === newMode);
    if (!supported) {
      device.log.error('***MatterbridgeRvcCleanModeServer changeToMode called with unsupported newMode:', newMode);
      return { status: Status.InvalidCommand, statusText: 'Invalid command' } as ModeBase.ChangeToModeResponse;
    }
    device.changeToMode({ newMode });
    this.state.currentMode = newMode;
    device.log.info(`***MatterbridgeRvcCleanModeServer changeToMode called with newMode ${newMode} => ${supported.label}`);
    return { status: Status.Success, statusText: 'Success' } as ModeBase.ChangeToModeResponse;
  }
}

/** ************************************************************** RvcOperationalState ***********************************************************/

// RvcOperationalStateInterface
export namespace RvcOperationalStateInterface {
  export interface Base {
    pause(): MaybePromise<RvcOperationalState.OperationalCommandResponse>;
    resume(): MaybePromise<RvcOperationalState.OperationalCommandResponse>;
    start(): MaybePromise<RvcOperationalState.OperationalCommandResponse>;
    stop(): MaybePromise<RvcOperationalState.OperationalCommandResponse>;
    goHome(): MaybePromise<RvcOperationalState.OperationalCommandResponse>;
  }
}
export interface RvcOperationalStateInterface {
  components: [{ flags: {}; methods: RvcOperationalStateInterface.Base }];
}

// RvcOperationalStateBehavior
export const RvcOperationalStateBehavior = ClusterBehavior.withInterface<RvcOperationalStateInterface>().for(RvcOperationalState.Cluster);
type RvcOperationalStateBehaviorType = InstanceType<typeof RvcOperationalStateBehavior>;
export interface RvcOperationalStateBehavior extends RvcOperationalStateBehaviorType {}
type RvcOperationalStateStateType = InstanceType<typeof RvcOperationalStateBehavior.State>;
export namespace RvcOperationalStateBehavior {
  export interface State extends RvcOperationalStateStateType {}
}

// RvcOperationalStateServer
export class MatterbridgeRvcOperationalStateServer extends RvcOperationalStateBehavior {
  override initialize() {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('***MatterbridgeRvcOperationalStateServer initialized: setting operational state to Docked');
    this.state.operationalState = RvcOperationalState.OperationalState.Docked;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    this.reactTo(this.agent.get(OnOffServer).events.onOff$Changed, this.handleOnOffChange);
  }

  protected handleOnOffChange(onOff: boolean) {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    if (onOff) {
      device.log.info('***OnOffServer changed to ON: setting operational state to Running');
      this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 2; // RvcRunMode.ModeTag.Cleaning
      this.state.operationalState = RvcOperationalState.OperationalState.Running;
      this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    } else {
      device.log.info('***OnOffServer changed to OFF: setting operational state to Docked');
      this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 1; // RvcRunMode.ModeTag.Idle
      this.state.operationalState = RvcOperationalState.OperationalState.Docked;
      this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    }
  }

  override pause(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeRvcOperationalStateServer: pause called setting operational state to Paused and currentMode to Idle');
    this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 1; // RvcRunMode.ModeTag.Idle
    this.state.operationalState = RvcOperationalState.OperationalState.Paused;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override resume(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeRvcOperationalStateServer: resume called setting operational state to Running and currentMode to Cleaning');
    this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 2; // RvcRunMode.ModeTag.Cleaning
    this.state.operationalState = RvcOperationalState.OperationalState.Running;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override goHome(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeRvcOperationalStateServer: goHome called setting operational state to Docked and currentMode to Idle');
    this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 1; // RvcRunMode.ModeTag.Idle
    this.state.operationalState = RvcOperationalState.OperationalState.Docked;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }
}
