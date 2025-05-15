/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Matterbridge
import { Matterbridge, MatterbridgeServer, MatterbridgeEndpoint, roboticVacuumCleaner, dishwasher } from 'matterbridge';

// Matter.js implementations nad overrides

// Matter.js
import { MaybePromise, LogLevel as MatterLogLevel, LogFormat as MatterLogFormat, DeviceTypeId, VendorId, ServerNode, Endpoint } from 'matterbridge/matter';
import { ModeBase, OperationalState, PowerSource, RvcRunMode, RvcCleanMode, RvcOperationalState, ServiceArea, Actions } from 'matterbridge/matter/clusters';
import { ActionsServer, RvcCleanModeBehavior, RvcOperationalStateBehavior, RvcRunModeBehavior, ServiceAreaBehavior } from 'matterbridge/matter/behaviors';
import { AnsiLogger, LogLevel, TimestampFormat } from 'matterbridge/logger';

export class Robot extends MatterbridgeEndpoint {
  constructor(name: string, serial: string) {
    super(roboticVacuumCleaner, { uniqueStorageKey: `${name}-${serial}` }, true);
    this.createDefaultIdentifyClusterServer()
      .createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Matterbridge Robot Vacuum Cleaner')
      .createDefaultRvcRunModeClusterServer()
      .createDefaultRvcOperationalStateClusterServer()
      .createDefaultRvcCleanModeClusterServer()
      .createDefaultServiceAreaClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 5900);
  }

  /**
   * Creates a default RvcRunMode Cluster Server.
   *
   * @param {number} [currentMode] - The current mode of the RvcRunMode cluster. Defaults to 1 (Idle).
   * @param {RvcRunMode.ModeOption[]} [supportedModes] - The supported modes for the RvcRunMode cluster. Defaults to a predefined set of modes.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultRvcRunModeClusterServer(currentMode?: number, supportedModes?: RvcRunMode.ModeOption[]): this {
    this.behaviors.require(MatterbridgeRvcRunModeServer, {
      supportedModes: supportedModes ?? [
        { label: 'Idle', mode: 1, modeTags: [{ value: RvcRunMode.ModeTag.Idle }] },
        { label: 'Cleaning', mode: 2, modeTags: [{ value: RvcRunMode.ModeTag.Cleaning }] },
        { label: 'Mapping', mode: 3, modeTags: [{ value: RvcRunMode.ModeTag.Mapping }] },
        { label: 'SpotCleaning', mode: 4, modeTags: [{ value: RvcRunMode.ModeTag.Cleaning }, { value: RvcRunMode.ModeTag.Max }] },
      ],
      currentMode: currentMode ?? 1,
    });
    return this;
  }

  /**
   * Creates a default RvcCleanMode Cluster Server.
   *
   * @param {number} [currentMode] - The current mode of the RvcCleanMode cluster. Defaults to 1 (Vacuum).
   * @param {RvcCleanMode.ModeOption[]} [supportedModes] - The supported modes for the RvcCleanMode cluster. Defaults to a predefined set of modes.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultRvcCleanModeClusterServer(currentMode?: number, supportedModes?: RvcCleanMode.ModeOption[]): this {
    this.behaviors.require(MatterbridgeRvcCleanModeServer, {
      supportedModes: supportedModes ?? [
        { label: 'Vacuum', mode: 1, modeTags: [{ value: RvcCleanMode.ModeTag.Vacuum }] },
        { label: 'Mop', mode: 2, modeTags: [{ value: RvcCleanMode.ModeTag.Mop }] },
        { label: 'Clean', mode: 3, modeTags: [{ value: RvcCleanMode.ModeTag.DeepClean }] },
      ],
      currentMode: currentMode ?? 1,
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
   * @param {string[] | null} [phaseList] - The list of phases for the RvcOperationalState cluster. Defaults to null.
   * @param {number | null} [currentPhase] - The current phase of the RvcOperationalState cluster. Defaults to null.
   * @param {RvcOperationalState.OperationalStateStruct[]} [operationalStateList] - The list of operational states for the RvcOperationalState cluster. Defaults to a predefined set of states.
   * @param {RvcOperationalState.OperationalState} [operationalState] - The current operational state of the RvcOperationalState cluster. Defaults to Docked.
   * @param {RvcOperationalState.ErrorStateStruct} [operationalError] - The current operational error of the RvcOperationalState cluster. Defaults to NoError.
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultRvcOperationalStateClusterServer(
    phaseList: string[] | null = null,
    currentPhase: number | null = null,
    operationalStateList?: RvcOperationalState.OperationalStateStruct[],
    operationalState?: RvcOperationalState.OperationalState,
    operationalError?: RvcOperationalState.ErrorStateStruct,
  ): this {
    this.behaviors.require(MatterbridgeRvcOperationalStateServer, {
      phaseList,
      currentPhase,
      operationalStateList: operationalStateList ?? [
        { operationalStateId: RvcOperationalState.OperationalState.Stopped, operationalStateLabel: 'Stopped' },
        { operationalStateId: RvcOperationalState.OperationalState.Running, operationalStateLabel: 'Running' },
        { operationalStateId: RvcOperationalState.OperationalState.Paused, operationalStateLabel: 'Paused' },
        { operationalStateId: RvcOperationalState.OperationalState.Error, operationalStateLabel: 'Error' },
        { operationalStateId: RvcOperationalState.OperationalState.SeekingCharger, operationalStateLabel: 'SeekingCharger' }, // Y RVC Pause Compatibility N RVC Resume Compatibility
        { operationalStateId: RvcOperationalState.OperationalState.Charging, operationalStateLabel: 'Charging' }, // N RVC Pause Compatibility Y RVC Resume Compatibility
        { operationalStateId: RvcOperationalState.OperationalState.Docked, operationalStateLabel: 'Docked' }, // N RVC Pause Compatibility Y RVC Resume Compatibility
      ],
      operationalState: operationalState ?? RvcOperationalState.OperationalState.Docked,
      operationalError: operationalError ?? { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' },
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
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    for (const area of newAreas) {
      const supportedArea = this.state.supportedAreas.find((supportedArea) => supportedArea.areaId === area);
      if (!supportedArea) {
        device.log.error('MatterbridgeServiceAreaServer selectAreas called with unsupported area:', area);
        return { status: ServiceArea.SelectAreasStatus.UnsupportedArea, statusText: 'Unsupported areas' };
      }
    }
    // device.selectAreas({ newAreas });
    this.state.selectedAreas = newAreas;
    this.state.currentArea = newAreas[0];
    device.log.info(`***MatterbridgeServiceAreaServer selectAreas called with: ${newAreas.map((area) => area.toString()).join(', ')}`);
    return { status: ServiceArea.SelectAreasStatus.Success, statusText: 'Succesfully selected new areas' };
  }
}

/** ************************************************************** RvcRunMode ***********************************************************/

/*
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
*/

// RvcRunModeServer
export class MatterbridgeRvcRunModeServer extends RvcRunModeBehavior /* .with(RvcRunMode.Feature.OnOff)*/ {
  override initialize() {
    this.state.currentMode = 1; // RvcRunMode.ModeTag.Idle
  }

  override changeToMode({ newMode }: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    const changedMode = this.state.supportedModes.find((mode) => mode.mode === newMode);
    if (!changedMode) {
      device.log.error('MatterbridgeRvcRunModeServer changeToMode called with unsupported newMode:', newMode);
      return { status: ModeBase.ModeChangeStatus.InvalidInMode, statusText: 'Invalid mode' };
    }
    device.changeToMode({ newMode });
    this.state.currentMode = newMode;
    if (changedMode.modeTags.find((tag) => tag.value === RvcRunMode.ModeTag.Cleaning)) {
      device.log.info('***MatterbridgeRvcRunModeServer changeToMode called with newMode Cleaning => Running');
      this.agent.get(MatterbridgeRvcOperationalStateServer).state.operationalState = RvcOperationalState.OperationalState.Running;
      return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Running' };
    } else if (changedMode.modeTags.find((tag) => tag.value === RvcRunMode.ModeTag.Idle)) {
      device.log.info('***MatterbridgeRvcRunModeServer changeToMode called with newMode Idle => Docked');
      this.agent.get(MatterbridgeRvcOperationalStateServer).state.operationalState = RvcOperationalState.OperationalState.Docked;
      return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Docked' };
    }
    device.log.info(`***MatterbridgeRvcRunModeServer changeToMode called with newMode ${newMode} => ${changedMode.label}`);
    this.agent.get(MatterbridgeRvcOperationalStateServer).state.operationalState = RvcOperationalState.OperationalState.Running;
    return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Success' };
  }
}

/** ************************************************************** RvcCleanMode ***********************************************************/

/*
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
*/

// RvcCleanModeServer
export class MatterbridgeRvcCleanModeServer extends RvcCleanModeBehavior /* .with(RvcRunMode.Feature.OnOff)*/ {
  override initialize() {
    this.state.currentMode = 1; // RvcCleanMode.ModeTag.Vacuum
  }

  override changeToMode({ newMode }: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    const supported = this.state.supportedModes.find((mode) => mode.mode === newMode);
    if (!supported) {
      device.log.error('***MatterbridgeRvcCleanModeServer changeToMode called with unsupported newMode:', newMode);
      return { status: ModeBase.ModeChangeStatus.InvalidInMode, statusText: 'Invalid mode' };
    }
    device.changeToMode({ newMode });
    this.state.currentMode = newMode;
    device.log.info(`***MatterbridgeRvcCleanModeServer changeToMode called with newMode ${newMode} => ${supported.label}`);
    return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Success' };
  }
}

/** ************************************************************** RvcOperationalState ***********************************************************/

/*
// RvcOperationalStateInterface
export namespace RvcOperationalStateInterface {
  export interface Base {
    pause(): MaybePromise<RvcOperationalState.OperationalCommandResponse>;
    resume(): MaybePromise<RvcOperationalState.OperationalCommandResponse>;
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
*/

// RvcOperationalStateServer
export class MatterbridgeRvcOperationalStateServer extends RvcOperationalStateBehavior {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    device.log.info('***MatterbridgeRvcOperationalStateServer initialized: setting operational state to Docked');
    this.state.operationalState = RvcOperationalState.OperationalState.Docked;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
  }

  override pause(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    device.log.info('MatterbridgeRvcOperationalStateServer: pause called setting operational state to Paused and currentMode to Idle');
    this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 1; // RvcRunMode.ModeTag.Idle
    this.state.operationalState = RvcOperationalState.OperationalState.Paused;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override resume(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    device.log.info('MatterbridgeRvcOperationalStateServer: resume called setting operational state to Running and currentMode to Cleaning');
    this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 2; // RvcRunMode.ModeTag.Cleaning
    this.state.operationalState = RvcOperationalState.OperationalState.Running;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override goHome(): MaybePromise<OperationalState.OperationalCommandResponse> {
    // const device = this.agent.get(MatterbridgeServer).state.deviceCommand;
    const device = this.endpoint.stateOf(MatterbridgeServer).deviceCommand;
    device.log.info('MatterbridgeRvcOperationalStateServer: goHome called setting operational state to Docked and currentMode to Idle');
    this.agent.get(MatterbridgeRvcRunModeServer).state.currentMode = 1; // RvcRunMode.ModeTag.Idle
    this.state.operationalState = RvcOperationalState.OperationalState.Docked;
    this.state.operationalError = { errorStateId: RvcOperationalState.ErrorState.NoError, errorStateLabel: 'No Error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }
}

function createEndpointActionsClusterServer(endpoint: Endpoint, endpointLists: Actions.EndpointList[]) {
  endpoint.behaviors.require(ActionsServer, {
    actionList: [],
    endpointLists,
  });
  return endpoint;
}

if (process.argv.includes('-testRobot')) {
  // Create a MatterbridgeEdge instance
  const matterbridge = await Matterbridge.loadInstance(false);
  matterbridge.log = new AnsiLogger({ logName: 'Matterbridge', logTimestampFormat: TimestampFormat.TIME_MILLIS, logLevel: LogLevel.DEBUG });

  // Setup matter environment
  matterbridge.environment.vars.set('log.level', MatterLogLevel.DEBUG);
  matterbridge.environment.vars.set('log.format', MatterLogFormat.ANSI);
  matterbridge.environment.vars.set('path.root', 'matterstorage');
  matterbridge.environment.vars.set('runtime.signals', true);
  matterbridge.environment.vars.set('runtime.exitcode', true);
  matterbridge.environment.vars.set('mdns.networkInterface', 'Wi-Fi');

  // Start the Matter storage
  await (matterbridge as any).startMatterStorage();

  // Create the Matter server
  // const deviceType = roboticVacuumCleaner; // Change this to the desired device type
  const deviceType = dishwasher; // Change this to the desired device type
  const context = await (matterbridge as any).createServerNodeContext(
    'Matterbridge',
    deviceType.name,
    DeviceTypeId(deviceType.code),
    VendorId(0xfff1),
    'Matterbridge',
    0x8000,
    'Matterbridge device',
  );
  const server = (await (matterbridge as any).createServerNode(context)) as ServerNode<ServerNode.RootEndpoint>;

  // Create the Matterbridge aggregator
  /*
  const aggregator = (await (matterbridge as any).createAggregatorNode(context)) as Endpoint<AggregatorEndpoint>;
  createEndpointActionsClusterServer(aggregator, [
    {
      endpointListId: 1,
      name: 'Living room',
      type: Actions.EndpointListType.Room,
      endpoints: [EndpointNumber(1)],
    },
  ]);
  await server.add(aggregator);
  */

  // Create an outlet
  /*
  const outlet = new MatterbridgeEndpoint(onOffOutlet, { uniqueStorageKey: 'Outlet' }, true)
    .createDefaultIdentifyClusterServer()
    .createDefaultBridgedDeviceBasicInformationClusterServer('Outlet', '99914248654', 0xfff1, 'Matterbridge', 'Matterbridge Outlet')
    .createDefaultOnOffClusterServer()
    .createDefaultGroupsClusterServer()
    .createDefaultPowerSourceRechargeableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 5900)
    .addRequiredClusterServers();
  await aggregator.add(outlet);
  */

  // Create a smoke alarm
  /*
  const smoke = new MatterbridgeEndpoint(smokeCoAlarm, { uniqueStorageKey: 'Smoke' }, true)
    .createDefaultIdentifyClusterServer()
    .createDefaultBridgedDeviceBasicInformationClusterServer('Smoke', '999142888654', 0xfff1, 'Matterbridge', 'Matterbridge Smoke')
    .createDefaultPowerSourceRechargeableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 6500)
    .addRequiredClusterServers()
    .addOptionalClusterServers();
  await aggregator.add(smoke);
  */

  /*
  // Create a new Robot instance
  const device = new Robot('Robot Vacuum', '99914248654');
  createEndpointActionsClusterServer(device, [
    {
      endpointListId: 1,
      name: 'Living room',
      type: Actions.EndpointListType.Room,
      endpoints: [EndpointNumber(2)],
    },
  ]);
  await aggregator.add(device);
  // await server.add(device);
  // logEndpoint(EndpointServer.forEndpoint(device));
  */

  /*
  // Create a new dishwasher instance
  const device = new Appliances(deviceType, 'Dish Washer', '97754248654');
  // await aggregator.add(device);
  await server.add(device);
  // logEndpoint(EndpointServer.forEndpoint(device));

  // Start the server node and log the server node endpoint
  await (matterbridge as any).startServerNode(server);
  logEndpoint(EndpointServer.forEndpoint(server));
  */

  // await server.close();
  // await server.env.get(MdnsService)[Symbol.asyncDispose](); // loadInstance(false) so destroyInstance() does not stop the mDNS service
}
