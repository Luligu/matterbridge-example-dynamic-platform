/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Identity,
  DeviceClasses,
  DeviceTypeDefinition,
  MatterbridgeEndpoint,
  Status,
  Matterbridge,
  VendorId,
  DeviceTypeId,
  onOffLight,
  roboticVacuumCleaner,
  MatterbridgeBehavior,
  smokeCoAlarm,
  ClusterType,
} from 'matterbridge';
import { ClusterBehavior, MaybePromise, MdnsService, LogLevel as MatterLogLevel, LogFormat as MatterLogFormat, EndpointServer, logEndpoint } from 'matterbridge/matter';
import {
  Identify,
  FanControl,
  Groups,
  OperationalState,
  OnOff,
  ScenesManagement,
  Thermostat,
  TemperatureControl,
  DishwasherAlarm,
  DishwasherMode,
  LaundryWasherControls,
  LaundryWasherMode,
  TemperatureMeasurement,
  OvenMode,
  ModeBase,
  RefrigeratorAndTemperatureControlledCabinetMode,
} from 'matterbridge/matter/clusters';

import { OperationalStateBehavior, TemperatureControlBehavior } from 'matterbridge/matter/behaviors';
import { OvenCavityOperationalState } from './implementations/ovenCavityOperationalStateCluster.js';
import { AnsiLogger, TimestampFormat, LogLevel } from 'matterbridge/logger';
import { Robot } from './robot.js';
import { CarbonMonoxideConcentrationMeasurement, CarbonMonoxideConcentrationMeasurementServer } from './implementations/carbonMonoxideConcentrationMeasurement.js';

export class Appliances extends MatterbridgeEndpoint {
  /**
   * Conditions:
   * Cooler The device has cooling functionality.
   */
  static temperatureControlledCabinetCooler = DeviceTypeDefinition({
    name: 'MA-temperaturecontrolledcabinetcooler',
    code: 0x71,
    deviceClass: DeviceClasses.Simple,
    revision: 3,
    requiredServerClusters: [TemperatureControl.Cluster.id, RefrigeratorAndTemperatureControlledCabinetMode.Cluster.id],
    optionalServerClusters: [TemperatureMeasurement.Cluster.id],
  });

  /**
   * Conditions:
   * Heater The device has heating functionality.
   */
  static temperatureControlledCabinetHeater = DeviceTypeDefinition({
    name: 'MA-temperaturecontrolledcabinetheater',
    code: 0x71,
    deviceClass: DeviceClasses.Simple,
    revision: 3,
    requiredServerClusters: [TemperatureControl.Cluster.id, OvenMode.Cluster.id, OvenCavityOperationalState.Cluster.id],
    optionalServerClusters: [TemperatureMeasurement.Cluster.id],
  });

  /**
   * Cluster Restrictions:
   * On/Off Cluster: the DF (Dead Front) feature is required
   */
  static laundryWasher = DeviceTypeDefinition({
    name: 'MA-laundrywasher',
    code: 0x73,
    deviceClass: DeviceClasses.Simple,
    revision: 1,
    requiredServerClusters: [OperationalState.Cluster.id],
    optionalServerClusters: [Identify.Cluster.id, LaundryWasherMode.Cluster.id, OnOff.Cluster.id, LaundryWasherControls.Cluster.id, TemperatureControl.Cluster.id],
  });

  /**
   * Cluster Restrictions:
   * On/Off Cluster: the DF (Dead Front) feature is required
   */
  static dishwasher = DeviceTypeDefinition({
    name: 'MA-dishwasher',
    code: 0x75,
    deviceClass: DeviceClasses.Simple,
    revision: 1,
    requiredServerClusters: [OperationalState.Cluster.id],
    optionalServerClusters: [Identify.Cluster.id, OnOff.Cluster.id, TemperatureControl.Cluster.id, DishwasherMode.Cluster.id, DishwasherAlarm.Cluster.id],
  });

  constructor(deviceType: DeviceTypeDefinition, name: string, serial: string) {
    super(deviceType, { uniqueStorageKey: `${name}-${serial}` });
    if (deviceType.code === Appliances.laundryWasher.code) {
      // Laundry Washer
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Laundry Washer');
      // this.createNumberTemperatureControlClusterServer(4000, 2000, 8000, 1000);
      this.createLevelTemperatureControlClusterServer(1, ['Cold', '30°', '40°', '60°']);
      this.createDefaultOperationalStateClusterServer(OperationalState.OperationalStateEnum.Stopped);
    } else if (deviceType.code === Appliances.dishwasher.code) {
      // Dishwasher (subborted by SmartThings, not supported by Home App)
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Dishwasher');
      // this.createNumberTemperatureControlClusterServer(6000, 2000, 8000, 1000);
      this.createLevelTemperatureControlClusterServer(1, ['Cold', '30°', '40°', '60°']);
      this.createDefaultOperationalStateClusterServer(OperationalState.OperationalStateEnum.Stopped);
    } else if (deviceType.name === Appliances.temperatureControlledCabinetCooler.name) {
      // Temperature Controlled Cabinet Cooler
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Temperature Controlled Cabinet Cooler');
      this.createLevelTemperatureControlClusterServer(1, ['Cold', 'Warm', 'Hot']);
      this.createDefaultTemperatureMeasurementClusterServer(1500);
      this.createDefaultRefrigeratorAndTemperatureControlledCabinetModeClusterServer(1);
    } else if (deviceType.name === Appliances.temperatureControlledCabinetHeater.name) {
      // Temperature Controlled Cabinet Heater
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Temperature Controlled Cabinet Heater');
      this.createLevelTemperatureControlClusterServer(1, ['Cold', 'Warm', 'Hot']);
      this.createDefaultTemperatureMeasurementClusterServer(2500);
      this.createDefaultOvenModeClusterServer(3);
      this.createDefaultOvenCavityOperationalStateClusterServer(OperationalState.OperationalStateEnum.Stopped);
    }
  }

  /**
   * Creates a default OperationalState Cluster Server.
   *
   * @param {OperationalState.OperationalStateEnum} operationalState - The initial operational state.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultOperationalStateClusterServer(operationalState: OperationalState.OperationalStateEnum = OperationalState.OperationalStateEnum.Stopped): this {
    this.behaviors.require(MatterbridgeOperationalStateServer, {
      phaseList: [],
      currentPhase: null,
      operationalStateList: [
        { operationalStateId: OperationalState.OperationalStateEnum.Stopped, operationalStateLabel: 'Stopped' },
        { operationalStateId: OperationalState.OperationalStateEnum.Running, operationalStateLabel: 'Running' },
        { operationalStateId: OperationalState.OperationalStateEnum.Paused, operationalStateLabel: 'Paused' },
        { operationalStateId: OperationalState.OperationalStateEnum.Error, operationalStateLabel: 'Error' },
      ],
      operationalState,
      operationalError: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    });
    return this;
  }

  /**
   * Creates a default Oven Cavity Operational State Cluster Server.
   *
   * @param {OperationalState.OperationalStateEnum} operationalState - The initial operational state.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultOvenCavityOperationalStateClusterServer(operationalState: OperationalState.OperationalStateEnum = OperationalState.OperationalStateEnum.Stopped): this {
    this.behaviors.require(OvenCavityOperationalStateServer, {
      phaseList: [],
      currentPhase: null,
      operationalStateList: [
        { operationalStateId: OperationalState.OperationalStateEnum.Stopped, operationalStateLabel: 'Stopped' },
        { operationalStateId: OperationalState.OperationalStateEnum.Running, operationalStateLabel: 'Running' },
        { operationalStateId: OperationalState.OperationalStateEnum.Error, operationalStateLabel: 'Error' },
      ],
      operationalState,
      operationalError: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    });
    return this;
  }

  /**
   * Creates a default RefrigeratorAndTemperatureControlledCabinetMode Cluster Server.
   *
   * @param {number} currentMode - The current mode of the oven.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultRefrigeratorAndTemperatureControlledCabinetModeClusterServer(currentMode?: number): this {
    this.behaviors.require(RefrigeratorAndTemperatureControlledCabinetModeServer, {
      supportedModes: [
        { label: 'RapidCool', mode: 1, modeTags: [{ value: RefrigeratorAndTemperatureControlledCabinetMode.ModeTag.RapidCool }] },
        { label: 'RapidFreeze', mode: 2, modeTags: [{ value: RefrigeratorAndTemperatureControlledCabinetMode.ModeTag.RapidFreeze }] },
      ],
      currentMode,
    });
    return this;
  }

  /**
   * Creates a default OvenMode Cluster Server.
   *
   * @param {number} currentMode - The current mode of the oven.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultOvenModeClusterServer(currentMode?: number): this {
    this.behaviors.require(OvenModeServer, {
      supportedModes: [
        { label: 'Bake', mode: 1, modeTags: [{ value: OvenMode.ModeTag.Bake }] },
        { label: 'Convection', mode: 2, modeTags: [{ value: OvenMode.ModeTag.Convection }] },
        { label: 'Grill', mode: 3, modeTags: [{ value: OvenMode.ModeTag.Grill }] },
        { label: 'Roast', mode: 4, modeTags: [{ value: OvenMode.ModeTag.Roast }] },
        { label: 'Clean', mode: 5, modeTags: [{ value: OvenMode.ModeTag.Clean }] },
        { label: 'Convection Bake', mode: 6, modeTags: [{ value: OvenMode.ModeTag.ConvectionBake }] },
        { label: 'Convection Roast', mode: 7, modeTags: [{ value: OvenMode.ModeTag.ConvectionRoast }] },
        { label: 'Warming', mode: 8, modeTags: [{ value: OvenMode.ModeTag.Warming }] },
        { label: 'Proofing', mode: 9, modeTags: [{ value: OvenMode.ModeTag.Proofing }] },
        { label: 'Steam', mode: 10, modeTags: [{ value: OvenMode.ModeTag.Steam }] },
      ],
      currentMode,
    });
    return this;
  }

  /**
   * Creates a TemperatureControl Cluster Server with feature TemperatureLevel.
   *
   * @param {number} selectedTemperatureLevel - The selected temperature level.
   * @param {string[]} supportedTemperatureLevels - The supported temperature levels.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createLevelTemperatureControlClusterServer(selectedTemperatureLevel = 1, supportedTemperatureLevels = ['Cold', 'Warm', 'Hot']): this {
    this.behaviors.require(MatterbridgeLevelTemperatureControlServer.with(TemperatureControl.Feature.TemperatureLevel), {
      selectedTemperatureLevel,
      supportedTemperatureLevels,
    });
    return this;
  }

  /**
   * Creates a TemperatureControl Cluster Server with feature TemperatureNumber.
   *
   * @param {number} temperatureSetpoint - The temperature setpoint * 100.
   * @param {number} minTemperature - The minimum temperature * 100.
   * @param {number} maxTemperature - The maximum temperature * 100.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createNumberTemperatureControlClusterServer(temperatureSetpoint: number, minTemperature: number, maxTemperature: number, step = 1): this {
    this.behaviors.require(MatterbridgeNumberTemperatureControlServer.with(TemperatureControl.Feature.TemperatureNumber, TemperatureControl.Feature.TemperatureStep), {
      temperatureSetpoint,
      minTemperature,
      maxTemperature,
      step,
    });
    return this;
  }
}

class MatterbridgeOperationalStateServer extends OperationalStateBehavior {
  override initialize() {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeOperationalStateServer initialized: setting operational state to Docked');
    this.state.operationalState = OperationalState.OperationalStateEnum.Stopped;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
  }

  override pause(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeOperationalStateServer: pause called setting operational state to Paused and currentMode to Paused');
    this.state.operationalState = OperationalState.OperationalStateEnum.Paused;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override stop(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeOperationalStateServer: stop called setting operational state to Stopped and currentMode to Idle');
    this.state.operationalState = OperationalState.OperationalStateEnum.Stopped;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override start(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeOperationalStateServer: start called setting operational state to Running and currentMode to Running');
    this.state.operationalState = OperationalState.OperationalStateEnum.Running;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override resume(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeOperationalStateServer: resume called setting operational state to Running and currentMode to Cleaning');
    this.state.operationalState = OperationalState.OperationalStateEnum.Running;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }
}

class MatterbridgeLevelTemperatureControlServer extends TemperatureControlBehavior.with(TemperatureControl.Feature.TemperatureLevel) {
  override initialize() {
    if (this.state.supportedTemperatureLevels.length >= 2) {
      const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
      device.log.info('MatterbridgeLevelTemperatureControlServer initialized: setting selectedTemperatureLevel to 1');
      this.state.selectedTemperatureLevel = 1;
    }
  }

  override setTemperature(request: TemperatureControl.SetTemperatureRequest): MaybePromise {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    if (request.targetTemperatureLevel && request.targetTemperatureLevel >= 0 && request.targetTemperatureLevel < this.state.supportedTemperatureLevels.length) {
      device.log.info(
        `MatterbridgeLevelTemperatureControlServer: setTemperature called setting selectedTemperatureLevel to ${request.targetTemperatureLevel}: ${this.state.supportedTemperatureLevels[request.targetTemperatureLevel]}`,
      );
      this.state.selectedTemperatureLevel = request.targetTemperatureLevel;
    }
  }
}

class MatterbridgeNumberTemperatureControlServer extends TemperatureControlBehavior.with(TemperatureControl.Feature.TemperatureNumber) {
  override initialize() {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeNumberTemperatureControlServer initialized');
  }

  override setTemperature(request: TemperatureControl.SetTemperatureRequest): MaybePromise {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    if (request.targetTemperature && request.targetTemperature >= this.state.minTemperature && request.targetTemperature <= this.state.maxTemperature) {
      device.log.info(`MatterbridgeNumberTemperatureControlServer: setTemperature called setting temperatureSetpoint to ${request.targetTemperature}`);
      this.state.temperatureSetpoint = request.targetTemperature;
    }
  }
}

/** ************************************************************** OvenCavityOperationalState ***********************************************************/

// Interface for the OvenCavityOperationalState
export namespace OvenCavityOperationalStateInterface {
  export interface Base {
    stop(): MaybePromise<OperationalState.OperationalCommandResponse>;
    start(): MaybePromise<OperationalState.OperationalCommandResponse>;
  }
}
export interface OvenCavityOperationalStateInterface {
  components: [{ flags: {}; methods: OvenCavityOperationalStateInterface.Base }];
}

// Behavior for OvenCavityOperationalState
export const OvenCavityOperationalStateBehavior = ClusterBehavior.withInterface<OvenCavityOperationalStateInterface>().for(OvenCavityOperationalState.Cluster);

type OvenCavityOperationalStateBehaviorType = InstanceType<typeof OvenCavityOperationalStateBehavior>;
export interface OvenCavityOperationalStateBehavior extends OvenCavityOperationalStateBehaviorType {}
type OvenCavityOperationalStateStateType = InstanceType<typeof OvenCavityOperationalStateBehavior.State>;
export namespace OvenCavityOperationalStateBehavior {
  export interface State extends OvenCavityOperationalStateStateType {}
}

// Server for OvenCavityOperationalState
export class OvenCavityOperationalStateServer extends OvenCavityOperationalStateBehavior {
  override initialize() {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('OvenCavityOperationalStateServer initialized: setting operational state to Stopped and operational error to No error');
    this.state.operationalState = OperationalState.OperationalStateEnum.Stopped;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
  }

  override stop(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('OvenCavityOperationalStateServer: stop called setting operational state to Stopped and operational error to No error');
    this.state.operationalState = OperationalState.OperationalStateEnum.Stopped;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override start(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('OvenCavityOperationalStateServer: start called setting operational state to Running and operational error to No error');
    this.state.operationalState = OperationalState.OperationalStateEnum.Running;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }
}

/** ************************************************************** RefrigeratorAndTemperatureControlledCabinetMode ***********************************************************/

// Interface for the RefrigeratorAndTemperatureControlledCabinetMode
export namespace RefrigeratorAndTemperatureControlledCabinetModeInterface {
  export interface Base {
    changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse>;
  }
}
export interface RefrigeratorAndTemperatureControlledCabinetModeInterface {
  components: [{ flags: {}; methods: RefrigeratorAndTemperatureControlledCabinetModeInterface.Base }];
}

// Behavior for RefrigeratorAndTemperatureControlledCabinetMode
export const RefrigeratorAndTemperatureControlledCabinetModeBehavior = ClusterBehavior.withInterface<RefrigeratorAndTemperatureControlledCabinetModeInterface>().for(
  RefrigeratorAndTemperatureControlledCabinetMode.Cluster,
);
type RefrigeratorAndTemperatureControlledCabinetModeBehaviorType = InstanceType<typeof RefrigeratorAndTemperatureControlledCabinetModeBehavior>;
export interface RefrigeratorAndTemperatureControlledCabinetModeBehavior extends RefrigeratorAndTemperatureControlledCabinetModeBehaviorType {}
type StateType = InstanceType<typeof RefrigeratorAndTemperatureControlledCabinetModeBehavior.State>;
export namespace RefrigeratorAndTemperatureControlledCabinetModeBehavior {
  export interface State extends StateType {}
}

// Server for RefrigeratorAndTemperatureControlledCabinetMode
class RefrigeratorAndTemperatureControlledCabinetModeServer extends RefrigeratorAndTemperatureControlledCabinetModeBehavior {
  override initialize() {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer initialized: setting currentMode to 1');
    this.state.currentMode = 1;
  }
  override changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    if (this.state.supportedModes.find((mode) => mode.mode === request.newMode)) {
      device.log.info(`MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer: changeToMode called with mode ${request.newMode}`);
      this.state.currentMode = request.newMode;
      return { status: Status.Success, statusText: 'Success' } as ModeBase.ChangeToModeResponse;
    } else {
      device.log.info(`MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer: changeToMode called with invalid mode ${request.newMode}`);
      return { status: Status.InvalidCommand, statusText: 'Invalid mode' } as ModeBase.ChangeToModeResponse;
    }
  }
}

/** ************************************************************** OvenMode ***********************************************************/

// Interface for the OvenMode
export namespace OvenModeInterface {
  export interface Base {
    changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse>;
  }
}
export interface OvenModeInterface {
  components: [{ flags: {}; methods: OvenModeInterface.Base }];
}

// Behavior for OvenMode
export const OvenModeBehavior = ClusterBehavior.withInterface<OvenModeInterface>().for(OvenMode.Cluster);
type OvenModeBehaviorType = InstanceType<typeof OvenModeBehavior>;
export interface OvenModeBehavior extends OvenModeBehaviorType {}
type OvenModeStateType = InstanceType<typeof OvenModeBehavior.State>;
export namespace ROvenModeBehavior {
  export interface State extends OvenModeStateType {}
}

// Server for OvenMode
class OvenModeServer extends OvenModeBehavior {
  override initialize() {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    device.log.info('OvenModeServer initialized: setting currentMode to 3');
    this.state.currentMode = 3;
  }
  override changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.agent.get(MatterbridgeBehavior).state.deviceCommand;
    if (this.state.supportedModes.find((mode) => mode.mode === request.newMode)) {
      device.log.info(`OvenModeServer: changeToMode called with mode ${request.newMode}`);
      this.state.currentMode = request.newMode;
      return { status: Status.Success, statusText: 'Success' } as ModeBase.ChangeToModeResponse;
    } else {
      device.log.info(`OvenModeServer: changeToMode called with invalid mode ${request.newMode}`);
      return { status: Status.InvalidCommand, statusText: 'Invalid mode' } as ModeBase.ChangeToModeResponse;
    }
  }
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

  await (matterbridge as any).startMatterStorage();

  const deviceType = smokeCoAlarm; // Change this to the desired device type
  const context = await (matterbridge as any).createServerNodeContext(
    'Jest',
    deviceType.name,
    DeviceTypeId(deviceType.code),
    VendorId(0xfff1),
    'Matterbridge',
    0x8000,
    'Matterbridge device',
  );
  const server = await (matterbridge as any).createServerNode(context);

  /*
  const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: 'SmokeCo' }, true);
  device.addRequiredClusterServers();
  device.behaviors.require(CarbonMonoxideConcentrationMeasurementServer.with(CarbonMonoxideConcentrationMeasurement.Feature.LevelIndication), {
    levelValue: CarbonMonoxideConcentrationMeasurement.LevelValue.High,
    measurementMedium: CarbonMonoxideConcentrationMeasurement.MeasurementMedium.Air,
  });
  device.behaviors.require(CarbonMonoxideConcentrationMeasurementServer.with(CarbonMonoxideConcentrationMeasurement.Feature.NumericMeasurement), {
    measuredValue: 2000,
    minMeasuredValue: 500,
    maxMeasuredValue: 3500,
    uncertainty: 1,
    measurementUnit: CarbonMonoxideConcentrationMeasurement.MeasurementUnit.Ppm,
    measurementMedium: CarbonMonoxideConcentrationMeasurement.MeasurementMedium.Air,
  });
  */

  /*
  const device = new MatterbridgeEndpoint(deviceType, { uniqueStorageKey: 'OnOffLight' }, true);
  device.createDefaultOnOffClusterServer(true, false, 10, 14);
  device.addRequiredClusterServers();
  await server.add(device);
  logEndpoint(EndpointServer.forEndpoint(device));
  */

  const device = new Robot('Robot Vacuum', '99914248654');

  /*
  const dishwasher = new Appliances(Appliances.dishwasher, 'Dishwasher', '0987654321');
  await server.add(dishwasher);
  */

  await server.add(device);
  logEndpoint(EndpointServer.forEndpoint(device));

  await (matterbridge as any).startServerNode(server);

  logEndpoint(EndpointServer.forEndpoint(server));

  // await server.close();
  // await server.env.get(MdnsService)[Symbol.asyncDispose](); // loadInstance(false) so destroyInstance() does not stop the mDNS service
}
