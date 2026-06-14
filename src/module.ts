/**
 * This file contains the class ExampleMatterbridgeDynamicPlatform.
 *
 * @file module.ts
 * @author Luca Liguori
 * @version 2.0.0
 * @license Apache-2.0
 *
 * Copyright 2023, 2024, 2025, 2026 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// oxlint-disable complexity max-lines-per-function

import {
  aggregator,
  airPurifier,
  airQualitySensor,
  bridgedNode,
  colorTemperatureLight,
  contactSensor,
  windowCovering,
  dimmableLight,
  mountedDimmableLoadControl,
  dimmablePlugInUnit,
  doorLock,
  electricalSensor,
  extendedColorLight,
  fan,
  flowSensor,
  genericSwitch,
  getSemtag,
  humiditySensor,
  lightSensor,
  MatterbridgeDynamicPlatform,
  MatterbridgeEndpoint,
  modeSelect,
  occupancySensor,
  onOffLight,
  mountedOnOffControl,
  onOffPlugInUnit,
  onOffLightSwitch,
  type PlatformConfig,
  type PlatformMatterbridge,
  powerSource,
  pressureSensor,
  pump,
  rainSensor,
  smokeCoAlarm,
  temperatureSensor,
  thermostat,
  waterFreezeDetector,
  waterLeakDetector,
  waterValve,
} from 'matterbridge';
import {
  AirConditioner,
  BasicVideoPlayer,
  BatteryStorage,
  type CastingVideoPlayer,
  Cooktop,
  Dishwasher,
  Evse,
  ExtractorHood,
  HeatPump,
  IrrigationSystem,
  LaundryDryer,
  LaundryWasher,
  MicrowaveOven,
  Oven,
  Refrigerator,
  RoboticVacuumCleaner,
  SoilSensor,
  SolarPower,
  Speaker,
  WaterHeater,
} from 'matterbridge/devices';
import { type AnsiLogger, debugStringify } from 'matterbridge/logger';
import { AreaNamespaceTag, LocationTag, NumberTag, PositionTag, RefrigeratorTag, SwitchesTag, UINT16_MAX, UINT32_MAX } from 'matterbridge/matter';
// import { ThermostatServer } from 'matterbridge/matter/behaviors';
import {
  AirQuality,
  BooleanState,
  BridgedDeviceBasicInformation,
  CarbonDioxideConcentrationMeasurement,
  CarbonMonoxideConcentrationMeasurement,
  ColorControl,
  Descriptor,
  DeviceEnergyManagement,
  DoorLock,
  ElectricalEnergyMeasurement,
  ElectricalPowerMeasurement,
  EnergyEvse,
  EnergyEvseMode,
  FanControl,
  FlowMeasurement,
  FormaldehydeConcentrationMeasurement,
  Identify,
  IlluminanceMeasurement,
  LevelControl,
  NitrogenDioxideConcentrationMeasurement,
  OccupancySensing,
  OnOff,
  OperationalState,
  OvenMode,
  OzoneConcentrationMeasurement,
  Pm1ConcentrationMeasurement,
  Pm10ConcentrationMeasurement,
  Pm25ConcentrationMeasurement,
  PowerSource,
  PressureMeasurement,
  RadonConcentrationMeasurement,
  RelativeHumidityMeasurement,
  RvcCleanMode,
  RvcOperationalState,
  RvcRunMode,
  SmokeCoAlarm,
  TemperatureMeasurement,
  Thermostat,
  TotalVolatileOrganicCompoundsConcentrationMeasurement,
  WindowCovering,
} from 'matterbridge/matter/clusters';
import { fireAndForget, getEnumDescription, isValidBoolean, isValidNumber, isValidObject, isValidString } from 'matterbridge/utils';

/**
 * Convert an illuminance value in lux to the Matter encoded representation used by the
 * IlluminanceMeasurement cluster. The Matter spec encodes illuminance logarithmically
 * as: value = round( 10000 * log10(lux) ), constrained to the range 0x0000 - 0xFFFE.
 * (0xFFFF is reserved / invalid.) Values at or below 0 lux are encoded as 0.
 *
 * Edge cases handled:
 *  - NaN / non‑finite / negative inputs -> treated as 0
 *  - Very large inputs -> capped at 0xFFFE
 *  - lux == 0 -> returns 0 (avoids -Infinity from log10(0))
 *
 * @param {number} lux Illuminance in lux (>= 0). Fractional values allowed.
 * @returns {number} Encoded Matter illuminance value (0 .. 0xFFFE)
 */
function luxToMatter(lux: number): number {
  // istanbul ignore next: defensive check
  if (!Number.isFinite(lux) || lux <= 0) return 0;
  const encoded = 10000 * Math.log10(lux);
  // istanbul ignore next: defensive check
  if (!Number.isFinite(encoded) || encoded < 0) return 0; // extra safety
  return Math.round(Math.min(encoded, 0xfffe));
}

/**
 * Convert a Matter encoded illuminance value back to lux. This is the inverse of
 * luxToMatter: lux = 10 ^ (value / 10000). Results are rounded to the nearest integer
 * lux for simplicity.
 *
 * Edge cases handled:
 *  - NaN / non‑finite / negative inputs -> treated as 0
 *  - Inputs > 0xFFFE are capped at 0xFFFE (0xFFFF is invalid per spec)
 *
 * @param {number} value Encoded Matter illuminance value (0 .. 0xFFFE)
 * @returns {number} Illuminance in lux (integer, >= 0)
 */
function matterToLux(value: number): number {
  // istanbul ignore next: defensive check
  if (!Number.isFinite(value) || value <= 0) return 0;
  const v = Math.min(value, 0xfffe);
  const lux = Math.pow(10, v / 10000);
  return Math.round(lux < 0 ? 0 : lux);
}

export type DynamicPlatformConfig = PlatformConfig & {
  whiteList: string[];
  blackList: string[];
  useInterval: boolean;
  enableServerRvc: boolean;
};

/**
 * This is the standard interface for Matterbridge plugins.
 * Each plugin should export a default function that follows this signature.
 *
 * @param {PlatformMatterbridge} matterbridge - The Matterbridge instance.
 * @param {AnsiLogger} log - The logger instance.
 * @param {PlatformConfig} config - The platform configuration.
 * @returns {ExampleMatterbridgeDynamicPlatform} The initialized platform.
 */
export default function initializePlugin(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: PlatformConfig): ExampleMatterbridgeDynamicPlatform {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return new ExampleMatterbridgeDynamicPlatform(matterbridge, log, config as DynamicPlatformConfig);
}

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  door: MatterbridgeEndpoint | undefined;
  occupancy: MatterbridgeEndpoint | undefined;
  illuminance: MatterbridgeEndpoint | undefined;
  temperature: MatterbridgeEndpoint | undefined;
  humidity: MatterbridgeEndpoint | undefined;
  pressure: MatterbridgeEndpoint | undefined;
  flow: MatterbridgeEndpoint | undefined;
  soil: MatterbridgeEndpoint | undefined;
  irrigation: IrrigationSystem | undefined;
  irrigationSystem: IrrigationSystem | undefined;
  select: MatterbridgeEndpoint | undefined;
  climate: MatterbridgeEndpoint | undefined;
  switch: MatterbridgeEndpoint | undefined;
  mountedOnOffSwitch: MatterbridgeEndpoint | undefined;
  mountedDimmerSwitch: MatterbridgeEndpoint | undefined;
  mountedOnOffSwitchLegacy: MatterbridgeEndpoint | undefined;
  mountedDimmerSwitchLegacy: MatterbridgeEndpoint | undefined;
  lightOnOff: MatterbridgeEndpoint | undefined;
  dimmer: MatterbridgeEndpoint | undefined;
  light: MatterbridgeEndpoint | undefined;
  lightXY: MatterbridgeEndpoint | undefined;
  lightHS: MatterbridgeEndpoint | undefined;
  lightCT: MatterbridgeEndpoint | undefined;
  outlet: MatterbridgeEndpoint | undefined;
  outletEnergy: MatterbridgeEndpoint | undefined;
  outletEnergyApparent: MatterbridgeEndpoint | undefined;
  smartOutlet: MatterbridgeEndpoint | undefined;
  smartBridgedOutlet: MatterbridgeEndpoint | undefined;
  coverLift: MatterbridgeEndpoint | undefined;
  coverLiftTilt: MatterbridgeEndpoint | undefined;
  lock: MatterbridgeEndpoint | undefined;
  userPinLock: MatterbridgeEndpoint | undefined;
  thermoAuto: MatterbridgeEndpoint | undefined;
  thermoAutoOccupancy: MatterbridgeEndpoint | undefined;
  thermoAutoPresets: MatterbridgeEndpoint | undefined;
  thermoHeat: MatterbridgeEndpoint | undefined;
  thermoCool: MatterbridgeEndpoint | undefined;
  fanBase: MatterbridgeEndpoint | undefined;
  fanOnHigh: MatterbridgeEndpoint | undefined;
  fanDefault: MatterbridgeEndpoint | undefined;
  fanComplete: MatterbridgeEndpoint | undefined;
  waterLeak: MatterbridgeEndpoint | undefined;
  waterFreeze: MatterbridgeEndpoint | undefined;
  rain: MatterbridgeEndpoint | undefined;
  smokeCo: MatterbridgeEndpoint | undefined;
  smokeOnly: MatterbridgeEndpoint | undefined;
  coOnly: MatterbridgeEndpoint | undefined;
  airQuality: MatterbridgeEndpoint | undefined;
  airPurifier: MatterbridgeEndpoint | undefined;
  pump: MatterbridgeEndpoint | undefined;
  valve: MatterbridgeEndpoint | undefined;
  momentarySwitch: MatterbridgeEndpoint | undefined;
  latchingSwitch: MatterbridgeEndpoint | undefined;
  vacuum: MatterbridgeEndpoint | undefined;
  roboticVacuum: MatterbridgeEndpoint | undefined;
  waterHeater: MatterbridgeEndpoint | undefined;
  evse: MatterbridgeEndpoint | undefined;
  laundryWasher: MatterbridgeEndpoint | undefined;
  laundryDryer: MatterbridgeEndpoint | undefined;
  dishwasher: MatterbridgeEndpoint | undefined;
  extractorHood: MatterbridgeEndpoint | undefined;
  solarPower: SolarPower | undefined;
  batteryStorage: MatterbridgeEndpoint | undefined;
  heatPump: MatterbridgeEndpoint | undefined;
  microwaveOven: MatterbridgeEndpoint | undefined;
  oven: Oven | undefined;
  cooktop: Cooktop | undefined;
  refrigerator: Refrigerator | undefined;
  airConditioner: AirConditioner | undefined;
  basicVideoPlayer: BasicVideoPlayer | undefined;
  castingVideoPlayer: CastingVideoPlayer | undefined;
  speaker: Speaker | undefined;

  phase: number = 0;
  genericSwitchLastEvent: 'Single' | 'Double' | 'Long' | 'Press' | 'Release' = 'Release';

  intervalOnOff = false;
  intervalLevel = 1;
  intervalColorTemperature = 147;

  fanModeLookup = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart'];
  fanDirectionLookup = ['Forward', 'Reverse'];

  constructor(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    override config: DynamicPlatformConfig,
  ) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.9.0')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "3.9.0". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }

    this.log.info('Initializing platform:', this.config.name);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Wait for the platform to start
    await this.ready;
    await this.clearSelect();

    // *********************** Create a door device ***********************
    this.door = new MatterbridgeEndpoint([contactSensor, bridgedNode, powerSource], { id: 'Door' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Door', 'DOO00001', 0xfff1, 'Matterbridge', 'Matterbridge Door')
      .createDefaultBooleanStateClusterServer(true)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(90, PowerSource.BatChargeLevel.Ok, 2990, 'AA', 1, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();

    this.door = await this.addDevice(this.door);

    // *********************** Create an occupancy device ***********************
    this.occupancy = new MatterbridgeEndpoint([occupancySensor, bridgedNode, powerSource], { id: 'Occupancy' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Occupancy', 'OCC00002', 0xfff1, 'Matterbridge', 'Matterbridge Occupancy')
      .createDefaultOccupancySensingClusterServer(false)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 2950, 'AA', 1, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();

    this.occupancy = await this.addDevice(this.occupancy);

    // *********************** Create an illuminance device ***********************
    this.illuminance = new MatterbridgeEndpoint([lightSensor, bridgedNode, powerSource], { id: 'Illuminance' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Illuminance', 'ILL00003', 0xfff1, 'Matterbridge', 'Matterbridge Illuminance')
      .createDefaultIlluminanceMeasurementClusterServer(luxToMatter(1))
      .createDefaultPowerSourceReplaceableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 3100, 'AA', 1, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();

    this.illuminance = await this.addDevice(this.illuminance);

    // *********************** Create an temperature device ***********************
    this.temperature = new MatterbridgeEndpoint([temperatureSensor, bridgedNode, powerSource], { id: 'Temperature' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Temperature', 'TEM00004', 0xfff1, 'Matterbridge', 'Matterbridge Temperature')
      .createDefaultTemperatureMeasurementClusterServer(1000)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 3100, 'AA', 1, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();

    this.temperature = await this.addDevice(this.temperature);

    // *********************** Create an humidity device ***********************
    this.humidity = new MatterbridgeEndpoint([humiditySensor, bridgedNode, powerSource], { id: 'Humidity' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Humidity', 'HUM00005', 0xfff1, 'Matterbridge', 'Matterbridge Humidity')
      .createDefaultRelativeHumidityMeasurementClusterServer(1000)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 3100, 'AA', 1, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();

    this.humidity = await this.addDevice(this.humidity);

    // *********************** Create a pressure device ***********************
    this.pressure = new MatterbridgeEndpoint([pressureSensor, bridgedNode, powerSource], { id: 'Pressure' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Pressure', 'PRE00006', 0xfff1, 'Matterbridge', 'Matterbridge Pressure')
      .createDefaultPressureMeasurementClusterServer(9000)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 3050, 'AA', 1, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();

    this.pressure = await this.addDevice(this.pressure);

    // *********************** Create a flow device ***********************
    this.flow = new MatterbridgeEndpoint([flowSensor, bridgedNode, powerSource], { id: 'Flow' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Flow', 'FLO00007', 0xfff1, 'Matterbridge', 'Matterbridge Flow')
      .createDefaultFlowMeasurementClusterServer(10)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(80, PowerSource.BatChargeLevel.Ok, 3050, 'AA', 1, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();

    this.flow = await this.addDevice(this.flow);

    // *********************** Create a SoilSensor device ***********************
    this.soil = new SoilSensor('Soil Sensor', 'SOI000067', { soilMoistureMeasuredValue: 45, temperatureMeasuredValue: 3500, batteryPowered: true });

    this.soil = await this.addDevice(this.soil);

    // *********************** Create a IrrigationSystem device ***********************
    this.irrigation = new IrrigationSystem('Irrigation System', 'IRR000068', { singleZone: true, batteryPowered: true, flowMeasuredValue: 15 });

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.irrigation = (await this.addDevice(this.irrigation)) as IrrigationSystem | undefined;

    // *********************** Create a IrrigationSystem device with 4 zones ***********************
    this.irrigationSystem = new IrrigationSystem('Irrigation System 4 zones', 'IRR000069', { flowMeasuredValue: 60 })
      .addZone(NumberTag.One)
      .addZone(NumberTag.Two)
      .addZone(NumberTag.Three)
      .addZone(NumberTag.Four);

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.irrigationSystem = (await this.addDevice(this.irrigationSystem)) as IrrigationSystem | undefined;

    // *********************** Create a compound climate device ***********************
    this.climate = new MatterbridgeEndpoint([bridgedNode, powerSource], { id: 'Climate' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Climate', 'CLI00008', 0xfff1, 'Matterbridge', 'Matterbridge Climate')
      .createDefaultPowerSourceReplaceableBatteryClusterServer(90, PowerSource.BatChargeLevel.Ok, 2990, '2 x AA', 2, PowerSource.BatReplaceability.UserReplaceable)
      .addRequiredClusterServers();
    fireAndForget(this.climate.addFixedLabel('composed', 'Compound device'), this.log, `Failed to add fixed label`);
    this.climate.addChildDeviceType('Temperature', temperatureSensor).createDefaultTemperatureMeasurementClusterServer(2100, -5000, 10000).addRequiredClusterServers();
    this.climate.addChildDeviceType('Humidity', humiditySensor).createDefaultRelativeHumidityMeasurementClusterServer(5000, 0, 10000).addRequiredClusterServers();
    this.climate.addChildDeviceType('Pressure', pressureSensor).createDefaultPressureMeasurementClusterServer(9000).addRequiredClusterServers();

    this.climate = await this.addDevice(this.climate);

    // *********************** Create a select device ***********************
    this.select = new MatterbridgeEndpoint([modeSelect, bridgedNode, powerSource], { id: 'Select' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Select', 'SEL00009', 0xfff1, 'Matterbridge', 'Matterbridge Select')
      .createDefaultModeSelectClusterServer(
        'Night mode',
        [
          { label: 'Led ON', mode: 1, semanticTags: [] },
          { label: 'Led OFF', mode: 2, semanticTags: [] },
        ],
        1,
        1,
      )
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.select = await this.addDevice(this.select);

    this.select?.addCommandHandler('changeToMode', ({ request: { newMode } }) => {
      this.log.info(`Command changeToMode called newMode:${newMode}`);
    });

    // *********************** Create a switch device ***********************
    this.switch = new MatterbridgeEndpoint([onOffLightSwitch, bridgedNode, powerSource], { id: 'Switch' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Switch', 'SWI00010', 0xfff1, 'Matterbridge', 'Matterbridge Switch')
      .createDefaultOnOffClusterServer() // Extraneous cluster added for Apple Home compatibility
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusters();

    this.switch = await this.addDevice(this.switch);

    // The cluster attributes are set by MatterbridgeOnOffServer
    this.switch?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.switch?.addCommandHandler('on', () => {
      this.switch?.log.info('Command on called');
    });
    this.switch?.addCommandHandler('off', () => {
      this.switch?.log.info('Command off called');
    });

    // *********************** Create a mounted onOff switch device ***********************
    this.mountedOnOffSwitch = new MatterbridgeEndpoint([mountedOnOffControl, bridgedNode, powerSource], { id: 'mountedOnOffControl' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('OnOff Mounted Switch', 'OMS00011', 0xfff1, 'Matterbridge', 'Matterbridge OnOff Mounted Switch')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.mountedOnOffSwitch = await this.addDevice(this.mountedOnOffSwitch);

    // The cluster attributes are set by MatterbridgeOnOffServer
    this.mountedOnOffSwitch?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.mountedOnOffSwitch?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedOnOffSwitch?.addCommandHandler('on', () => {
      this.mountedOnOffSwitch?.log.info('Command on called');
    });
    this.mountedOnOffSwitch?.addCommandHandler('off', () => {
      this.mountedOnOffSwitch?.log.info('Command off called');
    });

    // *********************** Create a legacy mounted onOff switch device ***********************
    this.mountedOnOffSwitchLegacy = new MatterbridgeEndpoint(
      [mountedOnOffControl, onOffPlugInUnit, bridgedNode, powerSource],
      { id: 'OnOffMountedSwitchLegacy' },
      this.config.debug,
    )
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('OnOff Mounted Switch Legacy', 'OMSL00011', 0xfff1, 'Matterbridge', 'Matterbridge OnOff Mounted Switch Legacy')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.mountedOnOffSwitchLegacy = await this.addDevice(this.mountedOnOffSwitchLegacy);

    // The cluster attributes are set by MatterbridgeOnOffServer
    this.mountedOnOffSwitchLegacy?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.mountedOnOffSwitchLegacy?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedOnOffSwitchLegacy?.addCommandHandler('on', () => {
      this.mountedOnOffSwitchLegacy?.log.info('Command on called');
    });
    this.mountedOnOffSwitchLegacy?.addCommandHandler('off', () => {
      this.mountedOnOffSwitchLegacy?.log.info('Command off called');
    });

    // *********************** Create a mounted dimmer switch device ***********************
    this.mountedDimmerSwitch = new MatterbridgeEndpoint([mountedDimmableLoadControl, bridgedNode, powerSource], { id: 'DimmerMountedSwitch' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Dimmer Mounted Switch', 'DMS00012', 0xfff1, 'Matterbridge', 'Matterbridge Dimmer Mounted Switch')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.mountedDimmerSwitch = await this.addDevice(this.mountedDimmerSwitch);

    // The cluster attributes are set by MatterbridgeOnOffServer and MatterbridgeLevelControlServer
    this.mountedDimmerSwitch?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.mountedDimmerSwitch?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedDimmerSwitch?.addCommandHandler('on', () => {
      this.mountedDimmerSwitch?.log.info('Command on called');
    });
    this.mountedDimmerSwitch?.addCommandHandler('off', () => {
      this.mountedDimmerSwitch?.log.info('Command off called');
    });
    this.mountedDimmerSwitch?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.mountedDimmerSwitch?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.mountedDimmerSwitch?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.mountedDimmerSwitch?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // *********************** Create a legacy mounted dimmer switch device ***********************
    this.mountedDimmerSwitchLegacy = new MatterbridgeEndpoint(
      [mountedDimmableLoadControl, dimmablePlugInUnit, bridgedNode, powerSource],
      { id: 'DimmerMountedSwitchLegacy' },
      this.config.debug,
    )
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Dimmer Mounted Switch Legacy', 'DMSL00012', 0xfff1, 'Matterbridge', 'Matterbridge Dimmer Mounted Switch Legacy')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.mountedDimmerSwitchLegacy = await this.addDevice(this.mountedDimmerSwitchLegacy);

    // The cluster attributes are set by MatterbridgeOnOffServer and MatterbridgeLevelControlServer
    this.mountedDimmerSwitchLegacy?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.mountedDimmerSwitchLegacy?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedDimmerSwitchLegacy?.addCommandHandler('on', () => {
      this.mountedDimmerSwitchLegacy?.log.info('Command on called');
    });
    this.mountedDimmerSwitchLegacy?.addCommandHandler('off', () => {
      this.mountedDimmerSwitchLegacy?.log.info('Command off called');
    });
    this.mountedDimmerSwitchLegacy?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.mountedDimmerSwitchLegacy?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.mountedDimmerSwitchLegacy?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.mountedDimmerSwitchLegacy?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // *********************** Create a on off light device ***********************
    this.lightOnOff = new MatterbridgeEndpoint([onOffLight, bridgedNode, powerSource], { id: 'Light (on/off)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (on/off)', 'LON00013', 0xfff1, 'Matterbridge', 'Matterbridge Light on/off')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.lightOnOff = await this.addDevice(this.lightOnOff);

    // The cluster attributes are set by MatterbridgeOnOffServer
    this.lightOnOff?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.lightOnOff?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightOnOff?.addCommandHandler('on', () => {
      this.lightOnOff?.log.info('Command on called');
    });
    this.lightOnOff?.addCommandHandler('off', () => {
      this.lightOnOff?.log.info('Command off called');
    });

    // *********************** Create a dimmer device ***********************
    this.dimmer = new MatterbridgeEndpoint([dimmableLight, bridgedNode, powerSource], { id: 'Dimmer' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Dimmer', 'DMR00014', 0xfff1, 'Matterbridge', 'Matterbridge Dimmer')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.dimmer = await this.addDevice(this.dimmer);

    // The cluster attributes are set by MatterbridgeOnOffServer and MatterbridgeLevelControlServer
    this.dimmer?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.dimmer?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.dimmer?.addCommandHandler('on', () => {
      this.dimmer?.log.info('Command on called');
    });
    this.dimmer?.addCommandHandler('off', () => {
      this.dimmer?.log.info('Command off called');
    });
    this.dimmer?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.dimmer?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.dimmer?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.dimmer?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // *********************** Create a light device with XY, HS and CT color control ***********************
    this.light = new MatterbridgeEndpoint([extendedColorLight, bridgedNode, powerSource], { id: 'Light (XY, HS, CT)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (XY, HS, CT)', 'LXC00015', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.light = await this.addDevice(this.light);

    // The cluster attributes are set by MatterbridgeOnOffServer, MatterbridgeLevelControlServer and MatterbridgeColorControlServer
    this.light?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.light?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.light?.addCommandHandler('on', () => {
      this.light?.log.info('Command on called');
    });
    this.light?.addCommandHandler('off', () => {
      this.light?.log.info('Command off called');
    });
    this.light?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.light?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.light?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.light?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.light?.addCommandHandler('moveToColor', ({ request: { colorX, colorY } }) => {
      this.light?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.light?.addCommandHandler('moveToHueAndSaturation', ({ request: { hue, saturation } }) => {
      this.light?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}`);
    });
    this.light?.addCommandHandler('moveToHue', ({ request: { hue } }) => {
      this.light?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.light?.addCommandHandler('moveToSaturation', ({ request: { saturation } }) => {
      this.light?.log.debug(`Command moveToSaturation called request: saturation ${saturation}}`);
    });
    this.light?.addCommandHandler('moveToColorTemperature', ({ request: { colorTemperatureMireds } }) => {
      this.light?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create a light device with HS and CT color control ***********************
    this.lightHS = new MatterbridgeEndpoint([colorTemperatureLight, bridgedNode, powerSource], { id: 'Light (HS, CT)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (HS, CT)', 'LHC00016', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createHsColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.lightHS = await this.addDevice(this.lightHS);

    // The cluster attributes are set by MatterbridgeOnOffServer, MatterbridgeLevelControlServer and MatterbridgeColorControlServer
    this.lightHS?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.lightHS?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightHS?.addCommandHandler('on', () => {
      this.lightHS?.log.info('Command on called');
    });
    this.lightHS?.addCommandHandler('off', () => {
      this.lightHS?.log.info('Command off called');
    });
    this.lightHS?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.lightHS?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightHS?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.lightHS?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightHS?.addCommandHandler('moveToHueAndSaturation', ({ request: { hue, saturation } }) => {
      this.lightHS?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}}`);
    });
    this.lightHS?.addCommandHandler('moveToHue', ({ request: { hue } }) => {
      this.lightHS?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.lightHS?.addCommandHandler('moveToSaturation', ({ request: { saturation } }) => {
      this.lightHS?.log.debug(`Command moveToSaturation called request: saturation ${saturation}`);
    });
    this.lightHS?.addCommandHandler('moveToColorTemperature', ({ request: { colorTemperatureMireds } }) => {
      this.lightHS?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create a light device with XY and CT color control ***********************
    this.lightXY = new MatterbridgeEndpoint([extendedColorLight, bridgedNode, powerSource], { id: 'Light (XY, CT)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (XY, CT)', 'LXT00017', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createXyColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.lightXY = await this.addDevice(this.lightXY);

    // The cluster attributes are set by MatterbridgeOnOffServer, MatterbridgeLevelControlServer and MatterbridgeColorControlServer
    this.lightXY?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.lightXY?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightXY?.addCommandHandler('on', () => {
      this.lightXY?.log.info('Command on called');
    });
    this.lightXY?.addCommandHandler('off', () => {
      this.lightXY?.log.info('Command off called');
    });
    this.lightXY?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.lightXY?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightXY?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.lightXY?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightXY?.addCommandHandler('moveToColor', ({ request: { colorX, colorY } }) => {
      this.lightXY?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.lightXY?.addCommandHandler('moveToColorTemperature', ({ request: { colorTemperatureMireds } }) => {
      this.lightXY?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create a light device with CT color control ***********************
    this.lightCT = new MatterbridgeEndpoint([colorTemperatureLight, bridgedNode, powerSource], { id: 'Light (CT)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (CT)', 'LCT00018', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createCtColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.lightCT = await this.addDevice(this.lightCT);

    // The cluster attributes are set by MatterbridgeOnOffServer, MatterbridgeLevelControlServer and MatterbridgeColorControlServer
    this.lightCT?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.lightCT?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightCT?.addCommandHandler('on', () => {
      this.lightCT?.log.info('Command on called');
    });
    this.lightCT?.addCommandHandler('off', () => {
      this.lightCT?.log.info('Command off called');
    });
    this.lightCT?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.lightCT?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightCT?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.lightCT?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightCT?.addCommandHandler('moveToColorTemperature', ({ request: { colorTemperatureMireds } }) => {
      this.lightCT?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create an outlet device ***********************
    this.outlet = new MatterbridgeEndpoint([onOffPlugInUnit, bridgedNode, powerSource], { id: 'Outlet' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Outlet', 'OUT00019', 0xfff1, 'Matterbridge', 'Matterbridge Outlet')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.outlet = await this.addDevice(this.outlet);

    // The cluster attributes are set by MatterbridgeOnOffServer
    this.outlet?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.outlet?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outlet?.addCommandHandler('on', () => {
      this.outlet?.log.info('Command on called');
    });
    this.outlet?.addCommandHandler('off', () => {
      this.outlet?.log.info('Command off called');
    });

    // *********************** Create an outlet device with energy measurements ***********************
    this.outletEnergy = new MatterbridgeEndpoint([onOffPlugInUnit, electricalSensor, bridgedNode, powerSource], { id: 'OutletEnergy' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultElectricalEnergyMeasurementClusterServer(0, 0)
      .createDefaultElectricalPowerMeasurementClusterServer(220_000, 0, 0, 50_000)
      .createDefaultBridgedDeviceBasicInformationClusterServer('OutletEnergy', 'OEN00019', 0xfff1, 'Matterbridge', 'Matterbridge Outlet With Energy')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.outletEnergy = await this.addDevice(this.outletEnergy);

    // The cluster attributes are set by MatterbridgeOnOffServer
    this.outletEnergy?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.outletEnergy?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outletEnergy?.addCommandHandler('on', () => {
      this.outletEnergy?.log.info('Command on called');
    });
    this.outletEnergy?.addCommandHandler('off', () => {
      this.outletEnergy?.log.info('Command off called');
    });

    // *********************** Create an outlet device with apparent energy measurements ***********************
    this.outletEnergyApparent = new MatterbridgeEndpoint([onOffPlugInUnit, electricalSensor, bridgedNode, powerSource], { id: 'OutletEnergyApparent' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultElectricalEnergyMeasurementClusterServer(0, 0)
      .createApparentElectricalPowerMeasurementClusterServer(220_000, 0, 0, 50_000)
      .createDefaultBridgedDeviceBasicInformationClusterServer('OutletEnergyApparent', 'OEA00019', 0xfff1, 'Matterbridge', 'Matterbridge Outlet With Apparent Energy')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.outletEnergyApparent = await this.addDevice(this.outletEnergyApparent);

    // The cluster attributes are set by MatterbridgeOnOffServer
    this.outletEnergyApparent?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.outletEnergyApparent?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outletEnergyApparent?.addCommandHandler('on', () => {
      this.outletEnergyApparent?.log.info('Command on called');
    });
    this.outletEnergyApparent?.addCommandHandler('off', () => {
      this.outletEnergyApparent?.log.info('Command off called');
    });

    // *********************** Create an smart outlet device with 4 sockets ***********************
    this.smartOutlet = new MatterbridgeEndpoint([electricalSensor, bridgedNode, powerSource], { id: 'SmartOutlet' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Smart outlet', 'SOU00063', 0xfff1, 'Matterbridge', 'Matterbridge Smart Outlet')
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultElectricalEnergyMeasurementClusterServer(0, 0)
      .createDefaultElectricalPowerMeasurementClusterServer(220_000, 0, 0, 50_000)
      .addRequiredClusterServers();
    fireAndForget(this.smartOutlet.addFixedLabel('composed', 'Compound device'), this.log, `Failed to add fixed label`);

    this.smartOutlet
      .addChildDeviceTypeWithClusterServer('Socket 1', onOffPlugInUnit, [OnOff.id], {
        id: 'Socket1',
        tagList: [getSemtag(NumberTag.One)],
      })
      .addRequiredClusterServers();
    this.smartOutlet
      .addChildDeviceTypeWithClusterServer('Socket 2', onOffPlugInUnit, [OnOff.id], {
        id: 'Socket2',
        tagList: [getSemtag(NumberTag.Two)],
      })
      .addRequiredClusterServers();
    this.smartOutlet
      .addChildDeviceTypeWithClusterServer('Socket 3', onOffPlugInUnit, [OnOff.id], {
        id: 'Socket3',
        tagList: [getSemtag(NumberTag.Three)],
      })
      .addRequiredClusterServers();
    this.smartOutlet
      .addChildDeviceTypeWithClusterServer('Socket 4', onOffPlugInUnit, [OnOff.id], {
        id: 'Socket4',
        tagList: [getSemtag(NumberTag.Four)],
      })
      .addRequiredClusterServers();

    this.smartOutlet = await this.addDevice(this.smartOutlet);

    // *********************** Create a bridged smart outlet device with 4 plugs ***********************
    this.smartBridgedOutlet = new MatterbridgeEndpoint([aggregator, bridgedNode, powerSource], { id: 'BridgedOutlet' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Bridged outlet', 'BOU00064', 0xfff1, 'Matterbridge', 'Matterbridge Bridged Outlet')
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();
    fireAndForget(this.smartBridgedOutlet.addFixedLabel('composed', 'Bridged device'), this.log, `Failed to add fixed label`);
    this.smartBridgedOutlet
      .addChildDeviceTypeWithClusterServer('Plug 1', [onOffPlugInUnit, bridgedNode], [OnOff.id], {
        id: 'Plug1',
        tagList: [getSemtag(NumberTag.One)],
      })
      .createDefaultBridgedDeviceBasicInformationClusterServer('Plug 1', 'BOU00064-1', 0xfff1, 'Matterbridge', 'Matterbridge Bridged Outlet')
      .addRequiredClusterServers();
    this.smartBridgedOutlet
      .addChildDeviceTypeWithClusterServer('Plug 2', [onOffPlugInUnit, bridgedNode], [OnOff.id], {
        id: 'Plug2',
        tagList: [getSemtag(NumberTag.Two)],
      })
      .createDefaultBridgedDeviceBasicInformationClusterServer('Plug 2', 'BOU00064-2', 0xfff1, 'Matterbridge', 'Matterbridge Bridged Outlet')
      .addRequiredClusterServers();
    this.smartBridgedOutlet
      .addChildDeviceTypeWithClusterServer('Plug 3', [onOffPlugInUnit, bridgedNode], [OnOff.id], {
        id: 'Plug3',
        tagList: [getSemtag(NumberTag.Three)],
      })
      .createDefaultBridgedDeviceBasicInformationClusterServer('Plug 3', 'BOU00064-3', 0xfff1, 'Matterbridge', 'Matterbridge Bridged Outlet')
      .addRequiredClusterServers();
    this.smartBridgedOutlet
      .addChildDeviceTypeWithClusterServer('Plug 4', [onOffPlugInUnit, bridgedNode], [OnOff.id], {
        id: 'Plug4',
        tagList: [getSemtag(NumberTag.Four)],
      })
      .createDefaultBridgedDeviceBasicInformationClusterServer('Plug 4', 'BOU00064-4', 0xfff1, 'Matterbridge', 'Matterbridge Bridged Outlet')
      .addRequiredClusterServers();

    this.smartBridgedOutlet = await this.addDevice(this.smartBridgedOutlet);

    // *********************** Create a window covering device ***********************
    // Matter uses 10000 = fully closed   0 = fully opened
    this.coverLift = new MatterbridgeEndpoint([windowCovering, bridgedNode, powerSource], { id: 'CoverLift' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Cover lift', 'COV00020', 0xfff1, 'Matterbridge', 'Matterbridge Cover')
      .createDefaultWindowCoveringClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.coverLift = await this.addDevice(this.coverLift);

    // The cluster attributes are set by MatterbridgeLiftWindowCoveringServer.  The implementation shall handle the movement (i.e. the currentPosition).
    this.coverLift?.addCommandHandler('identify', ({ request: { identifyTime }, attributes }) => {
      attributes.identifyTime = 0;
      attributes.identifyType = Identify.IdentifyType.None;
      this.coverLift?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.coverLift?.addCommandHandler('stopMotion', ({ attributes }) => {
      this.coverLift?.log.info(`Command stopMotion called`);
      attributes.targetPositionLiftPercent100ths = attributes.currentPositionLiftPercent100ths;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLift?.log.info(`Command stopMotion executed`);
    });

    this.coverLift?.addCommandHandler('downOrClose', ({ attributes }) => {
      this.coverLift?.log.info(`Command downOrClose called`);
      attributes.currentPositionLiftPercent100ths = 10000;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLift?.log.info(`Command downOrClose executed`);
    });

    this.coverLift?.addCommandHandler('upOrOpen', ({ attributes }) => {
      this.coverLift?.log.info(`Command upOrOpen called`);
      attributes.currentPositionLiftPercent100ths = 0;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLift?.log.info(`Command upOrOpen executed`);
    });

    this.coverLift?.addCommandHandler('goToLiftPercentage', ({ request: { liftPercent100thsValue }, attributes }) => {
      this.coverLift?.log.info(`Command goToLiftPercentage called with liftPercent100thsValue:${liftPercent100thsValue}`);
      attributes.currentPositionLiftPercent100ths = liftPercent100thsValue;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLift?.log.info(`Command goToLiftPercentage with ${liftPercent100thsValue} executed`);
    });

    // *********************** Create a tilt window covering device ***********************
    // Matter uses 10000 = fully closed   0 = fully opened
    this.coverLiftTilt = new MatterbridgeEndpoint([windowCovering, bridgedNode, powerSource], { id: 'CoverLiftTilt' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Cover lift and tilt', 'CLT00021', 0xfff1, 'Matterbridge', 'Matterbridge Cover')
      .createDefaultLiftTiltWindowCoveringClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.coverLiftTilt = await this.addDevice(this.coverLiftTilt);

    // The cluster attributes are set by MatterbridgeLiftTiltWindowCoveringServer. The implementation shall handle the movement (i.e. the currentPosition).
    this.coverLiftTilt?.addCommandHandler('identify', ({ request: { identifyTime }, attributes }) => {
      this.coverLiftTilt?.log.info(`Command identify called identifyTime:${identifyTime}`);
      attributes.identifyTime = 0;
      attributes.identifyType = Identify.IdentifyType.None;
    });

    this.coverLiftTilt?.addCommandHandler('stopMotion', ({ attributes }) => {
      this.coverLiftTilt?.log.info(`Command stopMotion called`);
      attributes.targetPositionLiftPercent100ths = attributes.currentPositionLiftPercent100ths;
      attributes.targetPositionTiltPercent100ths = attributes.currentPositionTiltPercent100ths;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLiftTilt?.log.info(`Command stopMotion executed`);
    });

    this.coverLiftTilt?.addCommandHandler('downOrClose', ({ attributes }) => {
      this.coverLiftTilt?.log.info(`Command downOrClose called`);
      attributes.currentPositionLiftPercent100ths = 10000;
      attributes.currentPositionTiltPercent100ths = 10000;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLiftTilt?.log.info(`Command downOrClose executed`);
    });

    this.coverLiftTilt?.addCommandHandler('upOrOpen', ({ attributes }) => {
      this.coverLiftTilt?.log.info(`Command upOrOpen called`);
      attributes.currentPositionLiftPercent100ths = 0;
      attributes.currentPositionTiltPercent100ths = 0;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLiftTilt?.log.info(`Command upOrOpen executed`);
    });

    this.coverLiftTilt?.addCommandHandler('goToLiftPercentage', ({ request: { liftPercent100thsValue }, attributes }) => {
      this.coverLiftTilt?.log.info(`Command goToLiftPercentage called with liftPercent100thsValue:${liftPercent100thsValue}`);
      attributes.currentPositionLiftPercent100ths = liftPercent100thsValue;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLiftTilt?.log.info(`Command goToLiftPercentage with ${liftPercent100thsValue} executed`);
    });

    this.coverLiftTilt?.addCommandHandler('goToTiltPercentage', ({ request: { tiltPercent100thsValue }, attributes }) => {
      this.coverLiftTilt?.log.info(`Command goToTiltPercentage called with tiltPercent100thsValue:${tiltPercent100thsValue}`);
      attributes.currentPositionTiltPercent100ths = tiltPercent100thsValue;
      attributes.operationalStatus = {
        global: WindowCovering.MovementStatus.Stopped,
        lift: WindowCovering.MovementStatus.Stopped,
        tilt: WindowCovering.MovementStatus.Stopped,
      };
      this.coverLiftTilt?.log.info(`Command goToTiltPercentage with ${tiltPercent100thsValue} executed`);
    });

    // *********************** Create a lock device ***********************
    this.lock = new MatterbridgeEndpoint([doorLock, bridgedNode, powerSource], { id: 'Lock' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Lock', 'LOC00022', 0xfff1, 'Matterbridge', 'Matterbridge Lock')
      .createDefaultDoorLockClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(30)
      .addRequiredClusterServers();

    this.lock = await this.addDevice(this.lock);

    // The cluster attributes are set by MatterbridgeDoorLockServer
    this.lock?.addCommandHandler('Identify.identify', ({ request: { identifyTime } }) => {
      this.lock?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lock?.addCommandHandler('DoorLock.lockDoor', () => {
      this.lock?.log.info('Command lockDoor called');
    });
    this.lock?.addCommandHandler('DoorLock.unlockDoor', () => {
      this.lock?.log.info('Command unlockDoor called');
    });
    this.lock?.subscribeAttribute(
      DoorLock.id,
      'operatingMode',
      (value) => {
        this.lock?.log.info(`Subscribe operatingMode called with: ${getEnumDescription(DoorLock.OperatingMode, value)}`);
      },
      this.lock.log,
    );

    // *********************** Create a lock device with User and Pin features ***********************
    this.userPinLock = new MatterbridgeEndpoint([doorLock, bridgedNode, powerSource], { id: 'UserPinLock' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Lock with User and Pin', 'LUP00070', 0xfff1, 'Matterbridge', 'Matterbridge Lock')
      .createUserPinDoorLockClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(95)
      .addRequiredClusterServers();

    this.userPinLock = await this.addDevice(this.userPinLock);
    await this.userPinLock?.setAttribute(PowerSource, 'batChargeState', PowerSource.BatChargeState.IsCharging);

    // The cluster attributes are set by MatterbridgeDoorLockServer
    this.userPinLock?.addCommandHandler('Identify.identify', ({ request: { identifyTime } }) => {
      this.userPinLock?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.userPinLock?.addCommandHandler('DoorLock.lockDoor', () => {
      this.userPinLock?.log.info('Command lockDoor called');
    });
    this.userPinLock?.addCommandHandler('DoorLock.unlockDoor', () => {
      this.userPinLock?.log.info('Command unlockDoor called');
    });
    this.userPinLock?.subscribeAttribute(
      DoorLock,
      'operatingMode',
      (value) => {
        this.userPinLock?.log.info(`Subscribe operatingMode called with: ${getEnumDescription(DoorLock.OperatingMode, value)}`);
      },
      this.userPinLock.log,
    );
    this.userPinLock?.subscribeAttribute(
      DoorLock,
      'wrongCodeEntryLimit',
      (value) => {
        this.userPinLock?.log.info(`Subscribe wrongCodeEntryLimit called with: ${value}`);
      },
      this.userPinLock.log,
    );
    this.userPinLock?.subscribeAttribute(
      DoorLock,
      'userCodeTemporaryDisableTime',
      (value) => {
        this.userPinLock?.log.info(`Subscribe userCodeTemporaryDisableTime called with: ${value}`);
      },
      this.userPinLock.log,
    );

    // *********************** Create a thermostat with AutoMode device ***********************
    this.thermoAuto = new MatterbridgeEndpoint([thermostat, bridgedNode, powerSource], { id: 'Thermostat (AutoMode)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (Auto)', 'TAU00023', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat')
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 4700)
      .addRequiredClusterServers();

    this.thermoAuto
      .addChildDeviceType('Flow', flowSensor)
      .createDefaultFlowMeasurementClusterServer(1 * 10)
      .addRequiredClusterServers();

    this.thermoAuto
      .addChildDeviceType('Temperature', temperatureSensor)
      .createDefaultTemperatureMeasurementClusterServer(21 * 100)
      .addRequiredClusterServers();

    this.thermoAuto
      .addChildDeviceType('Humidity', humiditySensor)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .addRequiredClusterServers();

    this.thermoAuto = await this.addDevice(this.thermoAuto);

    // The cluster attributes are set by MatterbridgeThermostatServer
    this.thermoAuto?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.thermoAuto?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoAuto?.addCommandHandler('triggerEffect', ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoAuto?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoAuto?.addCommandHandler('setpointRaiseLower', ({ request: { mode, amount } }) => {
      const lookupSetpointAdjustMode = ['Heat', 'Cool', 'Both'];
      this.thermoAuto?.log.info(`Command setpointRaiseLower called with mode: ${lookupSetpointAdjustMode[mode]} amount: ${amount / 10}`);
    });
    this.thermoAuto?.subscribeAttribute(
      Thermostat,
      'systemMode',
      (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoAuto?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoAuto.log,
    );
    this.thermoAuto?.subscribeAttribute(
      Thermostat.id,
      'occupiedHeatingSetpoint',
      (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );
    this.thermoAuto?.subscribeAttribute(
      Thermostat.id,
      'occupiedCoolingSetpoint',
      (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );

    // *********************** Create a thermostat with AutoMode and Occupancy device ***********************
    this.thermoAutoOccupancy = new MatterbridgeEndpoint([thermostat, bridgedNode, powerSource], { id: 'Thermostat (AutoModeOccupancy)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (AutoOccupancy)', 'TAO00058', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat Presets')
      .createDefaultThermostatClusterServer(20, 18, 22, 1, 0, 35, 15, 50, 10, 30, false, 20.5)
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.thermoAutoOccupancy = await this.addDevice(this.thermoAutoOccupancy);

    this.thermoAutoOccupancy?.subscribeAttribute(
      Thermostat,
      'systemMode',
      (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoAutoOccupancy?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoAutoOccupancy.log,
    );
    this.thermoAutoOccupancy?.subscribeAttribute(
      Thermostat.id,
      'occupiedHeatingSetpoint',
      (value) => {
        this.thermoAutoOccupancy?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoAutoOccupancy.log,
    );
    this.thermoAutoOccupancy?.subscribeAttribute(
      Thermostat.id,
      'occupiedCoolingSetpoint',
      (value) => {
        this.thermoAutoOccupancy?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoAutoOccupancy.log,
    );
    this.thermoAutoOccupancy?.subscribeAttribute(
      Thermostat.id,
      'unoccupiedHeatingSetpoint',
      (value) => {
        this.thermoAutoOccupancy?.log.info('Subscribe unoccupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoAutoOccupancy.log,
    );
    this.thermoAutoOccupancy?.subscribeAttribute(
      Thermostat.id,
      'unoccupiedCoolingSetpoint',
      (value) => {
        this.thermoAutoOccupancy?.log.info('Subscribe unoccupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoAutoOccupancy.log,
    );

    // *********************** Create a thermostat with AutoMode and Presets device ***********************
    const presets_List = [
      {
        presetHandle: new Uint8Array([0]),
        presetScenario: Thermostat.PresetScenario.Occupied,
        name: 'Home',
        coolingSetpoint: 2300,
        heatingSetpoint: 2200,
        builtIn: true,
      },
      {
        presetHandle: new Uint8Array([1]),
        presetScenario: Thermostat.PresetScenario.Unoccupied,
        name: 'Away',
        coolingSetpoint: 2600,
        heatingSetpoint: 1800,
        builtIn: true,
      },
      {
        presetHandle: new Uint8Array([2]),
        presetScenario: Thermostat.PresetScenario.Sleep,
        name: 'Sleep',
        coolingSetpoint: 2100,
        heatingSetpoint: 1800,
        builtIn: true,
      },
      {
        presetHandle: new Uint8Array([3]),
        presetScenario: Thermostat.PresetScenario.Wake,
        name: 'Wake',
        coolingSetpoint: 2400,
        heatingSetpoint: 1900,
        builtIn: true,
      },
      {
        presetHandle: new Uint8Array([4]),
        presetScenario: Thermostat.PresetScenario.Vacation,
        name: 'Vacation',
        coolingSetpoint: 2700,
        heatingSetpoint: 1600,
        builtIn: true,
      },
      {
        presetHandle: new Uint8Array([5]),
        presetScenario: Thermostat.PresetScenario.GoingToSleep,
        name: 'GoingToSleep',
        coolingSetpoint: 2200,
        heatingSetpoint: 1850,
        builtIn: true,
      },
    ];

    const presetTypeDefinitions = [
      {
        presetScenario: Thermostat.PresetScenario.Occupied,
        numberOfPresets: presets_List.filter((p) => p.presetScenario === Thermostat.PresetScenario.Occupied).length,
        presetTypeFeatures: {
          automatic: false,
          supportsNames: true,
        },
      },
      {
        presetScenario: Thermostat.PresetScenario.Unoccupied,
        numberOfPresets: presets_List.filter((p) => p.presetScenario === Thermostat.PresetScenario.Unoccupied).length,
        presetTypeFeatures: {
          automatic: false,
          supportsNames: true,
        },
      },
      {
        presetScenario: Thermostat.PresetScenario.Sleep,
        numberOfPresets: presets_List.filter((p) => p.presetScenario === Thermostat.PresetScenario.Sleep).length,
        presetTypeFeatures: {
          automatic: false,
          supportsNames: true,
        },
      },
      {
        presetScenario: Thermostat.PresetScenario.Wake,
        numberOfPresets: presets_List.filter((p) => p.presetScenario === Thermostat.PresetScenario.Wake).length,
        presetTypeFeatures: {
          automatic: false,
          supportsNames: true,
        },
      },
      {
        presetScenario: Thermostat.PresetScenario.Vacation,
        numberOfPresets: presets_List.filter((p) => p.presetScenario === Thermostat.PresetScenario.Vacation).length,
        presetTypeFeatures: {
          automatic: false,
          supportsNames: true,
        },
      },
      {
        presetScenario: Thermostat.PresetScenario.GoingToSleep,
        numberOfPresets: presets_List.filter((p) => p.presetScenario === Thermostat.PresetScenario.GoingToSleep).length,
        presetTypeFeatures: {
          automatic: false,
          supportsNames: true,
        },
      },
    ];

    this.thermoAutoPresets = new MatterbridgeEndpoint([thermostat, bridgedNode, powerSource], { id: 'Thermostat (AutoModePresets)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (AutoModePresets)', 'TAP00058', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat With Presets')
      .createDefaultPresetsThermostatClusterServer(20, 18, 22, 1, 0, 35, 15, 50, 10, 30, false, 20.5, undefined, presets_List, presetTypeDefinitions)
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    // istanbul ignore else
    if (this.thermoAutoPresets) {
      this.thermoAutoPresets
        .addChildDeviceType('Temperature', temperatureSensor)
        .createDefaultTemperatureMeasurementClusterServer(21 * 100)
        .addRequiredClusterServers();

      this.thermoAutoPresets
        .addChildDeviceType('Humidity', humiditySensor)
        .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
        .addRequiredClusterServers();

      this.thermoAutoPresets = await this.addDevice(this.thermoAutoPresets);
    }

    // The cluster attributes are set by MatterbridgeThermostatServer
    this.thermoAutoPresets?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.thermoAutoPresets?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoAutoPresets?.addCommandHandler('triggerEffect', ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoAutoPresets?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoAutoPresets?.addCommandHandler('setpointRaiseLower', ({ request: { mode, amount } }) => {
      const lookupSetpointAdjustMode = ['Heat', 'Cool', 'Both'];
      this.thermoAutoPresets?.log.info(`Command setpointRaiseLower called with mode: ${lookupSetpointAdjustMode[mode]} amount: ${amount / 10}`);
    });
    // Mirror the Matter SetActivePresetRequest command into the activePresetHandle attribute and update setpoints
    this.thermoAutoPresets?.addCommandHandler('setActivePresetRequest', ({ request: { presetHandle } }) => {
      this.thermoAutoPresets?.log.info(`Command setActivePresetRequest called with presetHandle: ${presetHandle ? `0x${Buffer.from(presetHandle).toString('hex')}` : 'null'}`);
    });
    this.thermoAutoPresets?.subscribeAttribute(
      Thermostat,
      'systemMode',
      (newValue, oldValue) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoAutoPresets?.log.info(`Subscribe systemMode called with: ${lookupSystemMode[newValue]} (old value: ${lookupSystemMode[oldValue]})`);
      },
      this.thermoAutoPresets.log,
    );
    this.thermoAutoPresets?.subscribeAttribute(
      Thermostat.id,
      'occupiedHeatingSetpoint',
      (newValue, oldValue) => {
        this.thermoAutoPresets?.log.info(`Subscribe occupiedHeatingSetpoint called with: ${newValue / 100} (old value: ${oldValue / 100})`);
      },
      this.thermoAutoPresets.log,
    );
    this.thermoAutoPresets?.subscribeAttribute(
      Thermostat.id,
      'occupiedCoolingSetpoint',
      (newValue, oldValue) => {
        this.thermoAutoPresets?.log.info(`Subscribe occupiedCoolingSetpoint called with: ${newValue / 100} (old value: ${oldValue / 100})`);
      },
      this.thermoAutoPresets.log,
    );
    this.thermoAutoPresets?.subscribeAttribute(
      Thermostat.id,
      'activePresetHandle',
      (newValue, oldValue) => {
        this.thermoAutoPresets?.log.info(
          `Subscribe activePresetHandle called with: ${newValue ? `0x${Buffer.from(newValue).toString('hex')}` : 'null'} (old value: ${oldValue ? `0x${Buffer.from(oldValue).toString('hex')}` : 'null'})`,
        );
      },
      this.thermoAutoPresets.log,
    );
    this.thermoAutoPresets?.subscribeAttribute(
      Thermostat.id,
      'presets',
      (newValue, oldValue) => {
        this.thermoAutoPresets?.log.info(`Subscribe presets called with: ${debugStringify(newValue)} (old value: ${debugStringify(oldValue)})`);
      },
      this.thermoAutoPresets.log,
    );

    // *********************** Create a thermostat with Heat device ***********************
    this.thermoHeat = new MatterbridgeEndpoint([thermostat, bridgedNode, powerSource], { id: 'Thermostat (Heat)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (Heat)', 'THE00024', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat')
      .createDefaultHeatingThermostatClusterServer(20, 18, 5, 35)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 6010, 'AA 1.5V', 4)
      .addRequiredClusterServers();

    this.thermoHeat
      .addChildDeviceType('TemperatureIN', [temperatureSensor], {
        tagList: [
          { mfgCode: null, namespaceId: LocationTag.Indoor.namespaceId, tag: LocationTag.Indoor.tag, label: null },
          { mfgCode: null, namespaceId: NumberTag.One.namespaceId, tag: NumberTag.One.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(21 * 100);

    this.thermoHeat
      .addChildDeviceType('TemperatureOUT', [temperatureSensor], {
        tagList: [
          { mfgCode: null, namespaceId: LocationTag.Outdoor.namespaceId, tag: LocationTag.Outdoor.tag, label: null },
          { mfgCode: null, namespaceId: NumberTag.Two.namespaceId, tag: NumberTag.Two.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(15 * 100);

    this.thermoHeat = await this.addDevice(this.thermoHeat);

    // The cluster attributes are set by MatterbridgeThermostatServer
    this.thermoHeat?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.thermoHeat?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoHeat?.addCommandHandler('triggerEffect', ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoHeat?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoHeat?.subscribeAttribute(
      Thermostat,
      'systemMode',
      (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoHeat?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoHeat.log,
    );
    this.thermoHeat?.subscribeAttribute(
      Thermostat.id,
      'occupiedHeatingSetpoint',
      (value) => {
        this.thermoHeat?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoHeat.log,
    );

    // *********************** Create a thermostat with Cool device ***********************
    this.thermoCool = new MatterbridgeEndpoint([thermostat, bridgedNode, powerSource], { id: 'Thermostat (Cool)' }, this.config.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (Cool)', 'TCO00025', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat')
      .createDefaultCoolingThermostatClusterServer(20, 18, 5, 35)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(40, PowerSource.BatChargeLevel.Ok, 5080, 'AA 1.5V', 4)
      .addRequiredClusterServers();

    this.thermoCool = await this.addDevice(this.thermoCool);

    // The cluster attributes are set by MatterbridgeThermostatServer
    this.thermoCool?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.thermoCool?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoCool?.addCommandHandler('triggerEffect', ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoCool?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoCool?.subscribeAttribute(
      Thermostat,
      'systemMode',
      (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoCool?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoCool.log,
    );
    this.thermoCool?.subscribeAttribute(
      Thermostat.id,
      'occupiedCoolingSetpoint',
      (value) => {
        this.thermoCool?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoCool.log,
    );

    // *********************** Create a airPurifier device ***********************
    this.airPurifier = new MatterbridgeEndpoint([airPurifier, bridgedNode, powerSource], { id: 'Air purifier' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Air purifier', 'AIR00026', 0xfff1, 'Matterbridge', 'Matterbridge Air purifier')
      .createDefaultIdentifyClusterServer()
      .createDefaultFanControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultActivatedCarbonFilterMonitoringClusterServer()
      .createDefaultHepaFilterMonitoringClusterServer()
      .addRequiredClusterServers();
    fireAndForget(this.airPurifier.addFixedLabel('composed', 'Compound device'), this.log, `Failed to add fixed label`);
    this.airPurifier.addChildDeviceType('AirQuality', airQualitySensor).createDefaultAirQualityClusterServer(AirQuality.AirQualityEnum.Good).addRequiredClusterServers();
    this.airPurifier
      .addChildDeviceType('Temperature', temperatureSensor)
      .createDefaultTemperatureMeasurementClusterServer(20 * 100)
      .addRequiredClusterServers();
    this.airPurifier
      .addChildDeviceType('Humidity', humiditySensor)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .addRequiredClusterServers();

    this.airPurifier = await this.addDevice(this.airPurifier);

    this.airPurifier?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.airPurifier?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    // Apple sends Off, High and Auto
    this.airPurifier?.subscribeAttribute(
      FanControl.id,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) =>
        void (async (): Promise<void> => {
          this.airPurifier?.log.info(
            `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
          );
          if (context.fabric === undefined) return; // Do not set attributes when offline
          // istanbul ignore else
          if (newValue === FanControl.FanMode.Off) {
            await this.airPurifier?.setAttribute(FanControl.id, 'percentSetting', 0, this.airPurifier?.log);
            await this.airPurifier?.setAttribute(FanControl.id, 'percentCurrent', 0, this.airPurifier?.log);
          } else if (newValue === FanControl.FanMode.Low) {
            await this.airPurifier?.setAttribute(FanControl.id, 'percentSetting', 33, this.airPurifier?.log);
            await this.airPurifier?.setAttribute(FanControl.id, 'percentCurrent', 33, this.airPurifier?.log);
          } else if (newValue === FanControl.FanMode.Medium) {
            await this.airPurifier?.setAttribute(FanControl.id, 'percentSetting', 66, this.airPurifier?.log);
            await this.airPurifier?.setAttribute(FanControl.id, 'percentCurrent', 66, this.airPurifier?.log);
            // oxlint-disable-next-line typescript/no-deprecated
          } else if (newValue === FanControl.FanMode.High || newValue === FanControl.FanMode.On || newValue === FanControl.FanMode.Auto) {
            await this.airPurifier?.setAttribute(FanControl.id, 'percentSetting', 100, this.airPurifier?.log);
            await this.airPurifier?.setAttribute(FanControl.id, 'percentCurrent', 100, this.airPurifier?.log);
          }
        })(),
      this.airPurifier.log,
    );
    this.airPurifier?.subscribeAttribute(
      FanControl.id,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) =>
        void (async (): Promise<void> => {
          this.airPurifier?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.fabric === undefined ? 'offline' : 'online'}`);
          if (context.fabric === undefined) return; // Do not set attributes when offline
          if (isValidNumber(newValue, 0, 100)) await this.airPurifier?.setAttribute(FanControl.id, 'percentCurrent', newValue, this.airPurifier?.log);
        })(),
      this.airPurifier.log,
    );

    // *********************** Create a pump device ***********************
    this.pump = new MatterbridgeEndpoint([pump, bridgedNode, powerSource], { id: 'Pump' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Pump', 'PUM00028', 0xfff1, 'Matterbridge', 'Matterbridge Pump')
      .createDefaultIdentifyClusterServer()
      .createOnOffClusterServer()
      .createLevelControlClusterServer()
      .createDefaultPumpConfigurationAndControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.pump = await this.addDevice(this.pump);

    this.pump?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.pump?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.pump?.addCommandHandler('on', () => {
      this.pump?.log.info('Command on called');
    });
    this.pump?.addCommandHandler('off', () => {
      this.pump?.log.info('Command off called');
    });
    this.pump?.addCommandHandler('moveToLevel', ({ request: { level } }) => {
      this.pump?.log.info(`Command moveToLevel called request: ${level}`);
    });
    this.pump?.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      this.pump?.log.info(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // *********************** Create a waterValve device ***********************
    this.valve = new MatterbridgeEndpoint([waterValve, bridgedNode, powerSource], { id: 'Water valve' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Water valve', 'WAV00029', 0xfff1, 'Matterbridge', 'Matterbridge Water valve')
      .createDefaultIdentifyClusterServer()
      .createDefaultValveConfigurationAndControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.valve = await this.addDevice(this.valve);

    this.valve?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.valve?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    // *********************** Create a default off low medium high auto fan device with Auto and Step features ***********************
    this.fanDefault = new MatterbridgeEndpoint([fan, bridgedNode, powerSource], { id: 'Fan off low medium high auto' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan', 'FAN00030', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultFanControlClusterServer()
      .addRequiredClusterServers();

    this.fanDefault = await this.addDevice(this.fanDefault);

    this.fanDefault?.subscribeAttribute(
      FanControl,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) =>
        void (async (): Promise<void> => {
          this.fanDefault?.log.info(
            `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
          );
          if (context.fabric === undefined) return; // Do not set attributes when offline
          // istanbul ignore else
          if (newValue === FanControl.FanMode.Off) {
            await this.fanDefault?.setAttribute(FanControl, 'percentSetting', 0, this.fanDefault?.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', 0, this.fanDefault?.log);
          } else if (newValue === FanControl.FanMode.Low) {
            await this.fanDefault?.setAttribute(FanControl, 'percentSetting', 33, this.fanDefault?.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', 33, this.fanDefault?.log);
          } else if (newValue === FanControl.FanMode.Medium) {
            await this.fanDefault?.setAttribute(FanControl, 'percentSetting', 66, this.fanDefault?.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', 66, this.fanDefault?.log);
          } else if (newValue === FanControl.FanMode.High) {
            await this.fanDefault?.setAttribute(FanControl, 'percentSetting', 100, this.fanDefault?.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', 100, this.fanDefault?.log);
            // oxlint-disable-next-line typescript/no-deprecated
          } else if (newValue === FanControl.FanMode.On) {
            await this.fanDefault?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.High, this.fanDefault?.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentSetting', 100, this.fanDefault?.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', 100, this.fanDefault?.log);
          } else if (newValue === FanControl.FanMode.Auto) {
            await this.fanDefault?.setAttribute(FanControl, 'percentSetting', null, this.fanDefault?.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', 50, this.fanDefault?.log);
          }
        })(),
      this.fanDefault.log,
    );
    this.fanDefault?.subscribeAttribute(
      FanControl,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) =>
        void (async (): Promise<void> => {
          this.fanDefault?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.fabric === undefined ? 'offline' : 'online'}`);
          if (context.fabric === undefined) return; // Do not set attributes when offline
          if (isValidNumber(newValue, 0, 100)) await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', newValue, this.fanDefault?.log);
          if (isValidNumber(newValue, 0, 0)) await this.fanDefault?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Off, this.fanDefault?.log);
          if (isValidNumber(newValue, 1, 33)) await this.fanDefault?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Low, this.fanDefault?.log);
          if (isValidNumber(newValue, 34, 66)) await this.fanDefault?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Medium, this.fanDefault?.log);
          if (isValidNumber(newValue, 67, 100)) await this.fanDefault?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.High, this.fanDefault?.log);
          if (newValue === null) await this.fanDefault?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Auto, this.fanDefault?.log);
        })(),
      this.fanDefault.log,
    );

    // *********************** Create a off low medium high fan device with no features ***********************
    this.fanBase = new MatterbridgeEndpoint([fan, bridgedNode, powerSource], { id: 'Fan off low medium high' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan base', 'FBA00031', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .createBaseFanControlClusterServer()
      .addRequiredClusterServers();

    this.fanBase = await this.addDevice(this.fanBase);

    this.fanBase?.subscribeAttribute(
      FanControl,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) =>
        void (async (): Promise<void> => {
          this.fanBase?.log.info(
            `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
          );
          if (context.fabric === undefined) return; // Do not set attributes when offline
          // istanbul ignore else
          if (newValue === FanControl.FanMode.Off) {
            await this.fanBase?.setAttribute(FanControl, 'percentSetting', 0, this.fanBase?.log);
            await this.fanBase?.setAttribute(FanControl, 'percentCurrent', 0, this.fanBase?.log);
          } else if (newValue === FanControl.FanMode.Low) {
            await this.fanBase?.setAttribute(FanControl, 'percentSetting', 33, this.fanBase?.log);
            await this.fanBase?.setAttribute(FanControl, 'percentCurrent', 33, this.fanBase?.log);
          } else if (newValue === FanControl.FanMode.Medium) {
            await this.fanBase?.setAttribute(FanControl, 'percentSetting', 66, this.fanBase?.log);
            await this.fanBase?.setAttribute(FanControl, 'percentCurrent', 66, this.fanBase?.log);
          } else if (newValue === FanControl.FanMode.High) {
            await this.fanBase?.setAttribute(FanControl, 'percentSetting', 100, this.fanBase?.log);
            await this.fanBase?.setAttribute(FanControl, 'percentCurrent', 100, this.fanBase?.log);
            // oxlint-disable-next-line typescript/no-deprecated
          } else if (newValue === FanControl.FanMode.On) {
            await this.fanBase?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.High, this.fanBase?.log);
            await this.fanBase?.setAttribute(FanControl, 'percentSetting', 100, this.fanBase?.log);
            await this.fanBase?.setAttribute(FanControl, 'percentCurrent', 100, this.fanBase?.log);
          } else if (newValue === FanControl.FanMode.Auto) {
            await this.fanBase?.setAttribute(FanControl, 'percentSetting', null, this.fanBase?.log);
            await this.fanBase?.setAttribute(FanControl, 'percentCurrent', 50, this.fanBase?.log);
          }
        })(),
      this.fanBase.log,
    );
    this.fanBase?.subscribeAttribute(
      FanControl,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) =>
        void (async (): Promise<void> => {
          this.fanBase?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.fabric === undefined ? 'offline' : 'online'}`);
          if (context.fabric === undefined) return; // Do not set attributes when offline
          if (isValidNumber(newValue, 0, 100)) await this.fanBase?.setAttribute(FanControl, 'percentCurrent', newValue, this.fanBase?.log);
          if (isValidNumber(newValue, 0, 0)) await this.fanBase?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Off, this.fanBase?.log);
          if (isValidNumber(newValue, 1, 33)) await this.fanBase?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Low, this.fanBase?.log);
          if (isValidNumber(newValue, 34, 66)) await this.fanBase?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Medium, this.fanBase?.log);
          if (isValidNumber(newValue, 67, 100)) await this.fanBase?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.High, this.fanBase?.log);
        })(),
      this.fanBase.log,
    );

    // *********************** Create a off high fan device with no features ***********************
    this.fanOnHigh = new MatterbridgeEndpoint([fan, bridgedNode, powerSource], { id: 'Fan off high' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan off high', 'FOH00032', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .createOnOffFanControlClusterServer()
      .addRequiredClusterServers();

    this.fanOnHigh = await this.addDevice(this.fanOnHigh);

    this.fanOnHigh?.subscribeAttribute(
      FanControl,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) =>
        void (async (): Promise<void> => {
          this.fanOnHigh?.log.info(
            `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
          );
          if (context.fabric === undefined) return; // Do not set attributes when offline
          // istanbul ignore else
          if (newValue === FanControl.FanMode.Off) {
            await this.fanOnHigh?.setAttribute(FanControl, 'percentSetting', 0, this.fanOnHigh?.log);
            await this.fanOnHigh?.setAttribute(FanControl, 'percentCurrent', 0, this.fanOnHigh?.log);
          } else if (newValue === FanControl.FanMode.High) {
            await this.fanOnHigh?.setAttribute(FanControl, 'percentSetting', 100, this.fanOnHigh?.log);
            await this.fanOnHigh?.setAttribute(FanControl, 'percentCurrent', 100, this.fanOnHigh?.log);
            // oxlint-disable-next-line typescript/no-deprecated
          } else if (newValue === FanControl.FanMode.On) {
            await this.fanOnHigh?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.High, this.fanOnHigh?.log);
            await this.fanOnHigh?.setAttribute(FanControl, 'percentSetting', 100, this.fanOnHigh?.log);
            await this.fanOnHigh?.setAttribute(FanControl, 'percentCurrent', 100, this.fanOnHigh?.log);
          }
        })(),
      this.fanOnHigh.log,
    );
    this.fanOnHigh?.subscribeAttribute(
      FanControl,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) =>
        void (async (): Promise<void> => {
          this.fanOnHigh?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.fabric === undefined ? 'offline' : 'online'}`);
          if (context.fabric === undefined) return; // Do not set attributes when offline
          if (isValidNumber(newValue, 0, 100)) {
            // oxlint-disable-next-line no-param-reassign
            if (newValue > 0) newValue = 100; // OnOff fan control only supports 0 and 100
            await this.fanOnHigh?.setAttribute(FanControl, 'percentCurrent', newValue, this.fanOnHigh?.log);
            await this.fanOnHigh?.setAttribute(FanControl, 'percentSetting', newValue, this.fanOnHigh?.log);
            await this.fanOnHigh?.setAttribute(FanControl, 'fanMode', newValue === 0 ? FanControl.FanMode.Off : FanControl.FanMode.High, this.fanOnHigh?.log);
          }
        })(),
      this.fanOnHigh.log,
    );

    // ******************** Create a Off Low Med High Auto fan device with features MultiSpeed, Auto, Step, Rocking, Wind, AirflowDirection ********************
    this.fanComplete = new MatterbridgeEndpoint([fan, bridgedNode, powerSource], { id: 'Fan complete' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan complete', 'FCO00033', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .createCompleteFanControlClusterServer()
      .addRequiredClusterServers();

    this.fanComplete = await this.addDevice(this.fanComplete);

    this.fanComplete?.subscribeAttribute(
      FanControl,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) =>
        void (async (): Promise<void> => {
          this.fanComplete?.log.info(
            `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
          );
          if (context.fabric === undefined) return; // Do not set attributes when offline
          // istanbul ignore else
          if (newValue === FanControl.FanMode.Off) {
            await this.fanComplete?.setAttribute(FanControl, 'percentSetting', 0, this.fanComplete?.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', 0, this.fanComplete?.log);
          } else if (newValue === FanControl.FanMode.Low) {
            await this.fanComplete?.setAttribute(FanControl, 'percentSetting', 33, this.fanComplete?.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', 33, this.fanComplete?.log);
          } else if (newValue === FanControl.FanMode.Medium) {
            await this.fanComplete?.setAttribute(FanControl, 'percentSetting', 66, this.fanComplete?.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', 66, this.fanComplete?.log);
          } else if (newValue === FanControl.FanMode.High) {
            await this.fanComplete?.setAttribute(FanControl, 'percentSetting', 100, this.fanComplete?.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', 100, this.fanComplete?.log);
            // oxlint-disable-next-line typescript/no-deprecated
          } else if (newValue === FanControl.FanMode.On) {
            await this.fanComplete?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.High, this.fanComplete?.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentSetting', 100, this.fanComplete?.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', 100, this.fanComplete?.log);
          } else if (newValue === FanControl.FanMode.Auto) {
            await this.fanComplete?.setAttribute(FanControl, 'percentSetting', null, this.fanComplete?.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', 50, this.fanComplete?.log);
          }
        })(),
      this.fanComplete?.log,
    );
    this.fanComplete?.subscribeAttribute(
      FanControl,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) =>
        void (async (): Promise<void> => {
          this.fanComplete?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.fabric === undefined ? 'offline' : 'online'}`);
          if (context.fabric === undefined) return; // Do not set attributes when offline
          if (isValidNumber(newValue, 0, 100)) await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', newValue, this.fanComplete?.log);
          if (isValidNumber(newValue, 0, 0)) await this.fanComplete?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Off, this.fanComplete?.log);
          if (isValidNumber(newValue, 1, 33)) await this.fanComplete?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Low, this.fanComplete?.log);
          if (isValidNumber(newValue, 34, 66)) await this.fanComplete?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Medium, this.fanComplete?.log);
          if (isValidNumber(newValue, 67, 100)) await this.fanComplete?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.High, this.fanComplete?.log);
          if (newValue === null) await this.fanComplete?.setAttribute(FanControl, 'fanMode', FanControl.FanMode.Auto, this.fanComplete?.log);
        })(),
      this.fanComplete?.log,
    );
    this.fanComplete?.subscribeAttribute(
      FanControl,
      'rockSetting',
      (newValue: object, oldValue: object, context) => {
        this.fanComplete?.log.info(
          `Rock setting changed from ${debugStringify(oldValue)} to ${debugStringify(newValue)} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
        );
      },
      this.fanComplete?.log,
    );
    this.fanComplete?.subscribeAttribute(
      FanControl,
      'windSetting',
      (newValue: object, oldValue: object, context) => {
        this.fanComplete?.log.info(
          `Wind setting changed from ${debugStringify(oldValue)} to ${debugStringify(newValue)} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
        );
      },
      this.fanComplete?.log,
    );
    this.fanComplete?.subscribeAttribute(
      FanControl,
      'airflowDirection',
      (newValue: number, oldValue: number, context) => {
        this.fanComplete?.log.info(
          `Airflow direction changed from ${this.fanDirectionLookup[oldValue]} to ${this.fanDirectionLookup[newValue]} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
        );
      },
      this.fanComplete?.log,
    );

    // *********************** Create a waterLeakDetector device ***********************
    this.waterLeak = new MatterbridgeEndpoint([waterLeakDetector, bridgedNode, powerSource], { id: 'Water leak detector' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Water leak detector', 'WLD00034', 0xfff1, 'Matterbridge', 'Matterbridge WaterLeakDetector')
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();

    this.waterLeak = await this.addDevice(this.waterLeak);

    // *********************** Create a waterFreezeDetector device ***********************
    this.waterFreeze = new MatterbridgeEndpoint([waterFreezeDetector, bridgedNode, powerSource], { id: 'Water freeze detector' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Water freeze detector', 'WFD00035', 0xfff1, 'Matterbridge', 'Matterbridge WaterFreezeDetector')
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();

    this.waterFreeze = await this.addDevice(this.waterFreeze);

    // *********************** Create a rainSensor device ***********************
    this.rain = new MatterbridgeEndpoint([rainSensor, bridgedNode, powerSource], { id: 'Rain sensor' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Rain sensor', 'RAI00036', 0xfff1, 'Matterbridge', 'Matterbridge RainSensor')
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultIdentifyClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .createDefaultBooleanStateConfigurationClusterServer()
      .addRequiredClusterServers();

    this.rain = await this.addDevice(this.rain);

    // *********************** Create a smokeCoAlarm device ***********************
    this.smokeCo = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { id: 'SmokeCo alarm sensor' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('SmokeCo alarm sensor', 'SCA00037', 0xfff1, 'Matterbridge', 'Matterbridge SmokeCo Sensor')
      .createDefaultIdentifyClusterServer()
      .createDefaultSmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer()
      .createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(100);

    this.smokeCo = await this.addDevice(this.smokeCo);

    // *********************** Create a smokeCoAlarm smoke only device ***********************
    this.smokeOnly = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { id: 'Smoke alarm sensor' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Smoke alarm sensor', 'SAL00038', 0xfff1, 'Matterbridge', 'Matterbridge Smoke Sensor')
      .createDefaultIdentifyClusterServer()
      .createSmokeOnlySmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer();

    this.smokeOnly = await this.addDevice(this.smokeOnly);

    // *********************** Create a smokeCoAlarm co only device ***********************
    this.coOnly = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { id: 'Co alarm sensor' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Co alarm sensor', 'COA00039', 0xfff1, 'Matterbridge', 'Matterbridge Co Sensor')
      .createDefaultIdentifyClusterServer()
      .createCoOnlySmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer()
      .createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(100);

    this.coOnly = await this.addDevice(this.coOnly);

    // *********************** Create an airQuality device ***********************
    this.airQuality = new MatterbridgeEndpoint([airQualitySensor, bridgedNode, powerSource], { id: 'Air quality sensor' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Air quality sensor', 'AQS00040', 0xfff1, 'Matterbridge', 'Matterbridge Air Quality Sensor')
      .createDefaultPowerSourceReplaceableBatteryClusterServer(50, PowerSource.BatChargeLevel.Warning, 2900, 'CR2450', 1)
      .addRequiredClusterServers()
      .addClusterServers([TemperatureMeasurement.id, RelativeHumidityMeasurement.id]) // Apple Home doesn't show the optional TemperatureMeasurement cluster server
      .createDefaultAirQualityClusterServer(AirQuality.AirQualityEnum.Good)
      .createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(10) // Apple Home requires Ppm unit here
      .createDefaultCarbonDioxideConcentrationMeasurementClusterServer(400) // Apple Home requires Ppm unit here
      .createDefaultNitrogenDioxideConcentrationMeasurementClusterServer(1) // Apple Home requires Ugm3 unit here
      .createDefaultOzoneConcentrationMeasurementClusterServer(1) // Apple Home requires Ugm3 unit here
      .createDefaultFormaldehydeConcentrationMeasurementClusterServer(1) // Apple Home doesn't support Formaldehyde!
      .createDefaultPm1ConcentrationMeasurementClusterServer(100) // Apple Home doesn't support Pm1!
      .createDefaultPm25ConcentrationMeasurementClusterServer(100) // Apple Home requires Ugm3 unit here
      .createDefaultPm10ConcentrationMeasurementClusterServer(100) // Apple Home requires Ugm3 unit here
      .createDefaultRadonConcentrationMeasurementClusterServer(100) // Apple Home doesn't support Radon!
      .createDefaultTvocMeasurementClusterServer(100); // Apple Home requires Ugm3 unit here

    this.airQuality = await this.addDevice(this.airQuality);

    // *********************** Create a momentary switch ***********************
    this.momentarySwitch = new MatterbridgeEndpoint([bridgedNode, powerSource], { id: 'Momentary switch composed' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Momentary switch', 'MOS00041', 0xfff1, 'Matterbridge', 'Matterbridge Momentary Switch')
      .createDefaultPowerSourceReplaceableBatteryClusterServer(50, PowerSource.BatChargeLevel.Ok, 2900, 'CR2450', 1);
    fireAndForget(this.momentarySwitch.addFixedLabel('composed', 'Compound device'), this.log, `Failed to add fixed label`);

    this.momentarySwitch
      .addChildDeviceType('Momentary switch 1', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.One.namespaceId, tag: NumberTag.One.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Left.namespaceId, tag: PositionTag.Left.tag, label: null },
          { mfgCode: null, namespaceId: AreaNamespaceTag.LivingRoom.namespaceId, tag: AreaNamespaceTag.LivingRoom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultSwitchClusterServer();

    this.momentarySwitch
      .addChildDeviceType('Momentary switch 2', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Two.namespaceId, tag: NumberTag.Two.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Middle.namespaceId, tag: PositionTag.Middle.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Left.namespaceId, tag: PositionTag.Left.tag, label: null },
          { mfgCode: null, namespaceId: AreaNamespaceTag.LivingRoom.namespaceId, tag: AreaNamespaceTag.LivingRoom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultSwitchClusterServer();

    this.momentarySwitch
      .addChildDeviceType('Momentary switch 3', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Three.namespaceId, tag: NumberTag.Three.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Left.namespaceId, tag: PositionTag.Left.tag, label: null },
          { mfgCode: null, namespaceId: AreaNamespaceTag.LivingRoom.namespaceId, tag: AreaNamespaceTag.LivingRoom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultSwitchClusterServer();

    const switch4 = this.momentarySwitch
      .addChildDeviceType('Momentary switch 4', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Four.namespaceId, tag: NumberTag.Four.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Right.namespaceId, tag: PositionTag.Right.tag, label: null },
          { mfgCode: null, namespaceId: SwitchesTag.Custom.namespaceId, tag: SwitchesTag.Custom.tag, label: 'Turn on' },
          { mfgCode: null, namespaceId: AreaNamespaceTag.Bedroom.namespaceId, tag: AreaNamespaceTag.Bedroom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultMomentarySwitchClusterServer();

    const switch5 = this.momentarySwitch
      .addChildDeviceType('Momentary switch 5', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Five.namespaceId, tag: NumberTag.Five.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Middle.namespaceId, tag: PositionTag.Middle.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Right.namespaceId, tag: PositionTag.Right.tag, label: null },
          { mfgCode: null, namespaceId: SwitchesTag.Custom.namespaceId, tag: SwitchesTag.Custom.tag, label: 'Turn off' },
          { mfgCode: null, namespaceId: AreaNamespaceTag.Bedroom.namespaceId, tag: AreaNamespaceTag.Bedroom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultMomentarySwitchClusterServer();

    const switch6 = this.momentarySwitch
      .addChildDeviceType('Momentary switch 6', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Seven.namespaceId, tag: NumberTag.Seven.tag, label: null }, // Intentionally use seven here to show when the controllers use it
          { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Right.namespaceId, tag: PositionTag.Right.tag, label: null },
          { mfgCode: null, namespaceId: SwitchesTag.Custom.namespaceId, tag: SwitchesTag.Custom.tag, label: 'Toggle' },
          { mfgCode: null, namespaceId: AreaNamespaceTag.Bedroom.namespaceId, tag: AreaNamespaceTag.Bedroom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultMomentarySwitchClusterServer();

    this.momentarySwitch = await this.addDevice(this.momentarySwitch);

    if (this.momentarySwitch) {
      // This is just a test. No effect so far on any controller
      await switch4.addFixedLabel('name', 'Switch 4');
      await switch4.addFixedLabel('room', 'Living Room');
      await switch4.addFixedLabel('switch', 'Switch 4');
      await switch4.addFixedLabel('button', 'Button 4');
      await switch5.addFixedLabel('name', 'Switch 5');
      await switch5.addFixedLabel('room', 'Living Room');
      await switch5.addFixedLabel('switch', 'Switch 5');
      await switch5.addFixedLabel('button', 'Button 5');
      await switch6.addFixedLabel('name', 'Switch 6');
      await switch6.addFixedLabel('room', 'Living Room');
      await switch6.addFixedLabel('switch', 'Switch 6');
      await switch6.addFixedLabel('button', 'Button 6');
    }

    // *********************** Create a latching switch *****************************/
    this.latchingSwitch = new MatterbridgeEndpoint([genericSwitch, bridgedNode, powerSource], { id: 'Latching switch' }, this.config.debug)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Latching switch', 'LAS00042', 0xfff1, 'Matterbridge', 'Matterbridge LatchingSwitch')
      .createDefaultIdentifyClusterServer()
      .createDefaultLatchingSwitchClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(10, PowerSource.BatChargeLevel.Critical, 2850, 'CR2032', 1);

    this.latchingSwitch = await this.addDevice(this.latchingSwitch);

    // *********************** Create a vacuum *****************************
    /*
    The RVC is supported correctly by the Home app (all commands work).

    The bad news is that right now the Apple Home app only shows the RVC as a single device (not bridged) or a single device in the bridge.

    If the RVC is in a bridge with other devices, the whole Home app crashes... so don't try it. If your controller is Apple Home use server mode for the RVC.
    */
    this.roboticVacuum = new RoboticVacuumCleaner(
      this.config.enableServerRvc ? 'Robot Vacuum Server' : 'Robot Vacuum',
      'RVC00043',
      this.config.enableServerRvc ? 'server' : undefined,
      1, // currentRunMode
      [
        { label: 'Idle', mode: 1, modeTags: [{ value: RvcRunMode.ModeTag.Idle }] },
        { label: 'Cleaning', mode: 2, modeTags: [{ value: RvcRunMode.ModeTag.Cleaning }] },
        { label: 'Mapping', mode: 3, modeTags: [{ value: RvcRunMode.ModeTag.Mapping }] },
        { label: 'SpotCleaning', mode: 4, modeTags: [{ value: RvcRunMode.ModeTag.Cleaning }, { value: RvcRunMode.ModeTag.Max }] },
      ], // supportedRunModes
      1, // currentCleanMode
      [
        { label: 'Vacuum', mode: 1, modeTags: [{ value: RvcCleanMode.ModeTag.Vacuum }] },
        { label: 'Mop', mode: 2, modeTags: [{ value: RvcCleanMode.ModeTag.Mop }] },
        { label: 'Clean', mode: 3, modeTags: [{ value: RvcCleanMode.ModeTag.DeepClean }] },
      ], // supportedCleanModes
      null, // currentPhase
      null, // phaseList
      undefined, // operationalState
      undefined, // operationalStateList
      [
        {
          areaId: 1,
          mapId: 1,
          areaInfo: { locationInfo: { locationName: 'Living', floorNumber: 0, areaType: AreaNamespaceTag.LivingRoom.tag }, landmarkInfo: null },
        },
        {
          areaId: 2,
          mapId: 1,
          areaInfo: { locationInfo: { locationName: 'Kitchen', floorNumber: 0, areaType: AreaNamespaceTag.Kitchen.tag }, landmarkInfo: null },
        },
        {
          areaId: 3,
          mapId: 2,
          areaInfo: { locationInfo: { locationName: 'Bedroom', floorNumber: 1, areaType: AreaNamespaceTag.Bedroom.tag }, landmarkInfo: null },
        },
        {
          areaId: 4,
          mapId: 2,
          areaInfo: { locationInfo: { locationName: 'Bathroom', floorNumber: 1, areaType: AreaNamespaceTag.Bathroom.tag }, landmarkInfo: null },
        },
      ], // supportedAreas
      [], // selectedAreas
      1, // currentArea
      [
        {
          mapId: 1,
          name: 'Ground floor',
        },
        {
          mapId: 2,
          name: 'First floor',
        },
      ], // supportedMaps
    );
    if (this.config.enableServerRvc) {
      this.log.notice('RVC is in server mode so it has its own QR code (it shows in the "Devices" panel of the Home page)');
    }
    this.roboticVacuum = await this.addDevice(this.roboticVacuum);

    // *********************** Create a water heater ***************************
    this.waterHeater = new WaterHeater('Water Heater', 'WHT00044', 50, 60, 20, 80, undefined, 85, 220_000, 1_000, 220_000, 12_000_000, 500_000, 3_000_000);
    this.waterHeater = await this.addDevice(this.waterHeater);

    // *********************** Create an Evse ***************************
    this.evse = new Evse(
      'Evse',
      'EVS00045',
      1,
      [
        { label: 'On demand', mode: 1, modeTags: [{ value: EnergyEvseMode.ModeTag.Manual }] },
        { label: 'Scheduled', mode: 2, modeTags: [{ value: EnergyEvseMode.ModeTag.TimeOfUse }] },
        { label: 'Solar Charging', mode: 3, modeTags: [{ value: EnergyEvseMode.ModeTag.SolarCharging }] },
        { label: 'Solar Charging Scheduled', mode: 4, modeTags: [{ value: EnergyEvseMode.ModeTag.SolarCharging }, { value: EnergyEvseMode.ModeTag.TimeOfUse }] },
      ],
      EnergyEvse.State.PluggedInCharging,
      EnergyEvse.SupplyState.ChargingEnabled,
      EnergyEvse.FaultState.NoError,
      220_000, // 220 volt
      10_000, // 10 ampere
      2_200_000, // 2200 watt
      1_000_000, // 1 kWh
      500_000, // 500 Wh
      32_000_000, // 32 kWh
    );
    this.evse = await this.addDevice(this.evse);

    // *********************** Create a SolarPower **************************
    this.solarPower = new SolarPower(
      'Solar Power',
      'SOL00046',
      220_000, // 220 volt
      10_000, // 10 ampere
      2200_000, // 2200 watt
      2_200_000, // 2.2 kWh
      0, // 0 kWh
      500_000, // 500 Wh
    );
    this.solarPower.addPanel('Panel 1', NumberTag.One);
    this.solarPower.addPanel('Panel 2', NumberTag.Two);
    this.solarPower.addPanel('Panel 3', NumberTag.Three);
    this.solarPower.addPanel('Panel 4', NumberTag.Four);

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.solarPower = (await this.addDevice(this.solarPower)) as SolarPower | undefined;

    // *********************** Create a BatteryStorage **************************
    this.batteryStorage = new BatteryStorage(
      'Battery Storage',
      'BST00047',
      75,
      PowerSource.BatChargeLevel.Ok,
      220_000, // 220 volt
      10_000, // 10 ampere
      2_200_000, // 2200 watt
      1_000_000, // 1 kWh
      2_000_000, // 2 kWh
      -2_000_000, // -2 kWh
      3_000_000, // 3 kWh
    );
    this.batteryStorage = await this.addDevice(this.batteryStorage);

    // *********************** Create an HeatPump **************************
    this.heatPump = new HeatPump(
      'Heat Pump',
      'HPU00048',
      220_000, // 220 volt
      10_000, // 10 ampere
      2_200_000, // 2200 watt
      1_000_000, // 1 kWh
      500_000, // 500 watt
      3_000_000, // 3 kWh
    );
    this.heatPump = await this.addDevice(this.heatPump);

    // *********************** Create a LaundryWasher **************************
    this.laundryWasher = new LaundryWasher('Laundry Washer', 'LWA00049');
    this.laundryWasher = await this.addDevice(this.laundryWasher);

    // *********************** Create a LaundryDryer **************************
    this.laundryDryer = new LaundryDryer('Laundry Dryer', 'LDR00050');
    this.laundryDryer = await this.addDevice(this.laundryDryer);

    // *********************** Create a Dishwasher **************************
    this.dishwasher = new Dishwasher('Dishwasher', 'DSW00051');
    this.dishwasher = await this.addDevice(this.dishwasher);

    // *********************** Create an Extractor Hood **************************
    this.extractorHood = new ExtractorHood('Extractor Hood', 'EXH00052');
    this.extractorHood = await this.addDevice(this.extractorHood);

    // *********************** Create an Microwave Oven **************************
    this.microwaveOven = new MicrowaveOven('Microwave Oven', 'MWO00053');
    this.microwaveOven = await this.addDevice(this.microwaveOven);

    // *********************** Create an Oven **************************
    this.oven = new Oven('Oven', 'OVN00054');
    this.oven.addCabinet(
      'Upper Cabinet',
      [{ mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: PositionTag.Top.label }],
      2, // currentMode
      [
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
      ], // supportedModes
      180 * 100, // targetTemperature
      100 * 100, // minTemperature
      300 * 100, // maxTemperature
      10 * 100, // stepTemperature
      20 * 100, // currentTemperature
      OperationalState.OperationalStateEnum.Stopped, // operationalState
      2, // currentPhase
      ['pre-heating', 'pre-heated', 'cooling down'], // phaseList
    );
    this.oven.addCabinet(
      'Lower Cabinet',
      [{ mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: PositionTag.Bottom.label }],
      3, // currentMode
      [
        { label: 'Convection', mode: 1, modeTags: [{ value: OvenMode.ModeTag.Convection }] },
        { label: 'Clean', mode: 2, modeTags: [{ value: OvenMode.ModeTag.Clean }] },
        { label: 'Steam', mode: 3, modeTags: [{ value: OvenMode.ModeTag.Steam }] },
      ], // supportedModes
      200 * 100, // targetTemperature
      100 * 100, // minTemperature
      300 * 100, // maxTemperature
      10 * 100, // stepTemperature
      200 * 100, // currentTemperature
      OperationalState.OperationalStateEnum.Running, // operationalState
      1, // currentPhase
      ['pre-heating', 'pre-heated', 'cooling down'], // phaseList
    );
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.oven = (await this.addDevice(this.oven)) as Oven | undefined;

    // *********************** Create an Cooktop **************************
    this.cooktop = new Cooktop('Cooktop', 'CKT00055');
    this.cooktop.addSurface('Surface Top Left', [
      { mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: PositionTag.Top.label },
      { mfgCode: null, namespaceId: PositionTag.Left.namespaceId, tag: PositionTag.Left.tag, label: PositionTag.Left.label },
    ]);
    this.cooktop.addSurface('Surface Top Right', [
      { mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: PositionTag.Top.label },
      { mfgCode: null, namespaceId: PositionTag.Right.namespaceId, tag: PositionTag.Right.tag, label: PositionTag.Right.label },
    ]);
    this.cooktop.addSurface('Surface Bottom Left', [
      { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: PositionTag.Bottom.label },
      { mfgCode: null, namespaceId: PositionTag.Left.namespaceId, tag: PositionTag.Left.tag, label: PositionTag.Left.label },
    ]);
    this.cooktop.addSurface('Surface Bottom Right', [
      { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: PositionTag.Bottom.label },
      { mfgCode: null, namespaceId: PositionTag.Right.namespaceId, tag: PositionTag.Right.tag, label: PositionTag.Right.label },
    ]);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.cooktop = (await this.addDevice(this.cooktop)) as Cooktop | undefined;

    // *********************** Create an Refrigerator **************************
    const refrigerator = new Refrigerator('Refrigerator', 'REF00056');
    refrigerator.addCabinet(
      'Refrigerator Top', // name
      [
        { mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: 'Refrigerator Top' },
        { mfgCode: null, namespaceId: RefrigeratorTag.Refrigerator.namespaceId, tag: RefrigeratorTag.Refrigerator.tag, label: RefrigeratorTag.Refrigerator.label },
      ], // tagList
      12 * 100, // targetTemperature
      5 * 100, // minTemperature
      20 * 100, // maxTemperature
      1 * 100, // stepTemperature
      1200, // currentTemperature
    );
    refrigerator.addCabinet(
      'Freezer Bottom', // name
      [
        { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: 'Freezer Bottom' },
        { mfgCode: null, namespaceId: RefrigeratorTag.Freezer.namespaceId, tag: RefrigeratorTag.Freezer.tag, label: RefrigeratorTag.Freezer.label },
      ], // tagList
      -18 * 100, // targetTemperature
      -30 * 100, // minTemperature
      -10 * 100, // maxTemperature
      1 * 100, // stepTemperature
      -1800, // currentTemperature
    );
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.refrigerator = (await this.addDevice(refrigerator)) as Refrigerator | undefined;

    // *********************** Create a airConditioner device ***********************
    this.airConditioner = new AirConditioner('Air Conditioner', 'ACO00027', {
      localTemperature: 20,
      occupiedCoolingSetpoint: 18,
      occupiedHeatingSetpoint: 22,
      fanMode: FanControl.FanMode.Auto,
    })
      .createDefaultTemperatureMeasurementClusterServer(20 * 100)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .addRequiredClusterServers();

    this.airConditioner = await this.addDevice(this.airConditioner);

    this.airConditioner?.addCommandHandler('identify', ({ request: { identifyTime } }) => {
      this.airConditioner?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    // Dead front OnOff cluster
    this.airConditioner?.addCommandHandler('on', async () => {
      this.airConditioner?.log.info('Command on called');
      await this.airConditioner?.setAttribute(Thermostat.id, 'localTemperature', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(TemperatureMeasurement.id, 'measuredValue', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', 50 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', 50, this.airConditioner?.log);
    });
    this.airConditioner?.addCommandHandler('off', async () => {
      this.airConditioner?.log.info('Command off called');
      await this.airConditioner?.setAttribute(Thermostat.id, 'localTemperature', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(TemperatureMeasurement.id, 'measuredValue', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', null, this.airConditioner?.log);
    });
    // Fan component of AirConditioner
    this.airConditioner?.subscribeAttribute(
      FanControl.id,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) =>
        void (async (): Promise<void> => {
          this.airConditioner?.log.info(
            `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.fabric === undefined ? 'offline' : 'online'}`,
          );
          if (context.fabric === undefined) return; // Do not set attributes when offline
          if (newValue === FanControl.FanMode.Off) {
            await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', 0, this.airConditioner?.log);
            await this.airConditioner?.setAttribute(FanControl.id, 'percentCurrent', 0, this.airConditioner?.log);
          } else if (newValue === FanControl.FanMode.Low) {
            await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', 33, this.airConditioner?.log);
            await this.airConditioner?.setAttribute(FanControl.id, 'percentCurrent', 33, this.airConditioner?.log);
          } else if (newValue === FanControl.FanMode.Medium) {
            await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', 66, this.airConditioner?.log);
            await this.airConditioner?.setAttribute(FanControl.id, 'percentCurrent', 66, this.airConditioner?.log);
          } else if (newValue === FanControl.FanMode.High) {
            await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', 100, this.airConditioner?.log);
            await this.airConditioner?.setAttribute(FanControl.id, 'percentCurrent', 100, this.airConditioner?.log);
            // oxlint-disable-next-line typescript/no-deprecated
          } else if (newValue === FanControl.FanMode.On) {
            await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', 100, this.airConditioner?.log);
            await this.airConditioner?.setAttribute(FanControl.id, 'percentCurrent', 100, this.airConditioner?.log);
          } else if (newValue === FanControl.FanMode.Auto) {
            await this.airConditioner?.setAttribute(FanControl.id, 'percentSetting', 50, this.airConditioner?.log);
            await this.airConditioner?.setAttribute(FanControl.id, 'percentCurrent', 50, this.airConditioner?.log);
          }
        })(),
      this.airConditioner?.log,
    );
    this.airConditioner?.subscribeAttribute(
      FanControl.id,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) =>
        void (async (): Promise<void> => {
          this.airConditioner?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.fabric === undefined ? 'offline' : 'online'}`);
          if (context.fabric === undefined) return; // Do not set attributes when offline
          if (isValidNumber(newValue, 0, 100)) await this.airConditioner?.setAttribute(FanControl.id, 'percentCurrent', newValue, this.airConditioner?.log);
        })(),
      this.airConditioner?.log,
    );

    // *********************** Create a basic video player device ***********************
    this.basicVideoPlayer = new BasicVideoPlayer('BasicVideoPlayer', 'BVP00062');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.basicVideoPlayer = (await this.addDevice(this.basicVideoPlayer)) as BasicVideoPlayer | undefined;
    this.basicVideoPlayer
      ?.addCommandHandler('MediaPlayback.play', () => {
        this.basicVideoPlayer?.log.info(`Command play called`);
      })
      .addCommandHandler('MediaPlayback.pause', () => {
        this.basicVideoPlayer?.log.info(`Command pause called`);
      })
      .addCommandHandler('MediaPlayback.stop', () => {
        this.basicVideoPlayer?.log.info(`Command stop called`);
      })
      .addCommandHandler('MediaPlayback.previous', () => {
        this.basicVideoPlayer?.log.info(`Command previous called`);
      })
      .addCommandHandler('MediaPlayback.next', () => {
        this.basicVideoPlayer?.log.info(`Command next called`);
      })
      .addCommandHandler('MediaPlayback.skipForward', () => {
        this.basicVideoPlayer?.log.info(`Command skipForward called`);
      })
      .addCommandHandler('MediaPlayback.skipBackward', () => {
        this.basicVideoPlayer?.log.info(`Command skipBackward called`);
      })
      .addCommandHandler('KeypadInput.sendKey', ({ request: { keyCode } }) => {
        this.basicVideoPlayer?.log.info(`Command sendKey with ${keyCode} called`);
      });

    // *********************** Create a casting video player device ***********************
    // this.castingVideoPlayer = new CastingVideoPlayer('CastingVideoPlayer', 'CVP00063');
    // this.castingVideoPlayer = (await this.addDevice(this.castingVideoPlayer)) as CastingVideoPlayer | undefined;

    // *********************** Create a Speaker device ***********************
    this.speaker = new Speaker('Speaker', 'SPE00057', false, 100);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    this.speaker = (await this.addDevice(this.speaker)) as Speaker | undefined;
  }

  // This is just a helper to execute the intervals callbacks immediately without waiting for the interval time, useful for testing
  intervals: { interval: NodeJS.Timeout; callback: () => Promise<void> }[] = [];

  addInterval(callback: () => Promise<void>, intervalTime: number): NodeJS.Timeout {
    // istanbul ignore next line because we want fireAndForget here to avoid unhandled promise rejections if the callback fails
    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    const interval = setInterval(() => fireAndForget(callback(), this.log, `Failed to execute interval callback`), intervalTime);
    this.intervals.push({ interval, callback });
    return interval;
  }

  async executeIntervals(times: number, pauseTime: number = 100): Promise<void> {
    for (let i = 0; i < times; i += 1) {
      for (const { callback } of this.intervals) {
        // oxlint-disable-next-line promise/prefer-await-to-callbacks
        await callback();
      }
      if (pauseTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, pauseTime));
      }
    }
  }

  clearIntervals(): void {
    this.intervals.forEach(({ interval }) => clearInterval(interval));
    this.intervals = [];
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('onConfigure called');

    // Use interval for appliances animation
    if (this.config.useInterval) {
      this.addInterval(async () => {
        this.log.info(`Appliances animation phase ${this.phase}`);

        // Dead front and onOff for Appliances
        if (this.phase === 0) {
          // Set dead front onOff true for Appliances: brings the appliances out of the "dead front" state
          if (this.airConditioner || this.laundryWasher || this.laundryDryer || this.dishwasher) this.log.info(`Set appliances dead front OnOff to true`);
          await this.airConditioner?.setAttribute(OnOff.id, 'onOff', true, this.airConditioner.log);
          await this.laundryWasher?.setAttribute(OnOff.id, 'onOff', true, this.laundryWasher.log);
          await this.laundryDryer?.setAttribute(OnOff.id, 'onOff', true, this.laundryDryer.log);
          await this.dishwasher?.setAttribute(OnOff.id, 'onOff', true, this.dishwasher.log);

          // Set offOnly onOff cluster to true for Cooktop and the Surfaces: brings the appliances on
          this.cooktop?.log.info(`Set Cooktop offOnly onOff clusters to true`);
          await this.cooktop?.setAttribute(OnOff.id, 'onOff', true, this.cooktop.log);
          await this.cooktop?.getChildEndpointById('SurfaceTopLeft')?.setAttribute(OnOff.id, 'onOff', true, this.cooktop?.log);
          await this.cooktop?.getChildEndpointById('SurfaceTopRight')?.setAttribute(OnOff.id, 'onOff', true, this.cooktop?.log);
        }

        if (this.roboticVacuum) {
          // RvcRunMode: 1 = Idle 2 = Cleaning 3 = Mapping 4 = Cleaning + Max
          // RvcCleanMode 1 = Vacuum 2 = Mop 3 = Clean
          if (this.phase === 0) {
            this.roboticVacuum.log.info(`RVC: Reset to Idle, Vacuum, Docked`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batPercentRemaining', 200, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batChargeState', PowerSource.BatChargeState.IsAtFullCharge, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batVoltage', 6000, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 1, this.roboticVacuum.log); // Idle
            await this.roboticVacuum.setAttribute('RvcCleanMode', 'currentMode', 1, this.roboticVacuum.log); // Vacuum
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Docked, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
          }
          if (this.phase === 1) {
            this.roboticVacuum.log.info(`RVC: start cleaning...`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batChargeState', PowerSource.BatChargeState.IsNotCharging, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batVoltage', 5900, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 2, this.roboticVacuum.log); // Cleaning
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Running, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('ServiceArea', 'currentArea', 1, this.roboticVacuum.log); // Living
            await this.roboticVacuum.setAttribute('ServiceArea', 'estimatedEndTime', Math.floor(Date.now() / 1000) + 300, this.roboticVacuum.log); // Epoch time in seconds
          }
          if (this.phase === 2) {
            this.roboticVacuum.log.info(`RVC: pause cleaning...`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batPercentRemaining', 180, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 2, this.roboticVacuum.log); // Cleaning
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Paused, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
          }
          if (this.phase === 3) {
            this.roboticVacuum.log.info(`RVC: resume cleaning...`);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 2, this.roboticVacuum.log); // Cleaning
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Running, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('ServiceArea', 'currentArea', 2, this.roboticVacuum.log); // Kitchen
            await this.roboticVacuum.setAttribute('ServiceArea', 'estimatedEndTime', Math.floor(Date.now() / 1000) + 180, this.roboticVacuum.log); // Epoch time in seconds
          }
          if (this.phase === 4) {
            this.roboticVacuum.log.info(`RVC: stop cleaning...`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batPercentRemaining', 160, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 1, this.roboticVacuum.log); // Idle
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Stopped, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('ServiceArea', 'estimatedEndTime', null, this.roboticVacuum.log); // A value of null means that the operation has completed.
          }
          if (this.phase === 5) {
            this.roboticVacuum.log.info(`RVC: going home...`);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 1, this.roboticVacuum.log); // Idle
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.SeekingCharger, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
          }
          if (this.phase === 6) {
            this.roboticVacuum.log.info(`RVC: charging...`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batPercentRemaining', 180, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batChargeState', PowerSource.BatChargeState.IsCharging, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batVoltage', 6100, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 1, this.roboticVacuum.log); // Idle
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Charging, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('ServiceArea', 'currentArea', 1, this.roboticVacuum.log); // Living
          }
          if (this.phase === 7) {
            this.roboticVacuum.log.info(`RVC: charging...`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batPercentRemaining', 190, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 1, this.roboticVacuum.log); // Idle
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Charging, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
          }
          if (this.phase === 8) {
            this.roboticVacuum.log.info(`RVC: docked...`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batPercentRemaining', 200, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batChargeState', PowerSource.BatChargeState.IsAtFullCharge, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batVoltage', 6000, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 1, this.roboticVacuum.log); // Idle
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Docked, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.NoError }, this.roboticVacuum.log);
          }
          if (this.phase === 9) {
            this.roboticVacuum.log.info(`RVC: error DustBinFull...`);
            await this.roboticVacuum.setAttribute('PowerSource', 'batPercentRemaining', 200, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batChargeState', PowerSource.BatChargeState.IsAtFullCharge, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('PowerSource', 'batVoltage', 6000, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcRunMode', 'currentMode', 1, this.roboticVacuum.log); // Idle
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalState', RvcOperationalState.OperationalState.Error, this.roboticVacuum.log);
            await this.roboticVacuum.setAttribute('RvcOperationalState', 'operationalError', { errorStateId: RvcOperationalState.ErrorState.DustBinFull }, this.roboticVacuum.log);
          }
        }

        if (this.oven) {
          const upperCabinet = this.oven.getChildEndpointById('UpperCabinet');
          const lowerCabinet = this.oven.getChildEndpointById('LowerCabinet');
          if (this.phase === 0) {
            await upperCabinet?.setAttribute('OvenMode', 'currentMode', 3, upperCabinet.log);
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Stopped, upperCabinet.log);
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 2, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 190 * 100, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 2000, upperCabinet.log);

            await lowerCabinet?.setAttribute('OvenMode', 'currentMode', 3, lowerCabinet.log);
            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Stopped, lowerCabinet.log);
            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 2, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 210 * 100, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 2000, lowerCabinet.log);
          }
          if (this.phase === 1) {
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Running, upperCabinet.log);
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 0, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 200 * 100, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 5000, upperCabinet.log);

            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Running, lowerCabinet.log);
            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 0, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 220 * 100, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 5000, lowerCabinet.log);
          }
          if (this.phase === 2) {
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Running, upperCabinet.log);
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 1, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 190 * 100, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 19000, upperCabinet.log);

            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Running, lowerCabinet.log);
            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 1, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 200 * 100, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 20000, lowerCabinet.log);
          }
          if (this.phase === 8) {
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Stopped, upperCabinet.log);
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 2, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 190 * 100, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 10000, upperCabinet.log);

            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Stopped, lowerCabinet.log);
            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 2, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 200 * 100, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 10000, lowerCabinet.log);
          }
          if (this.phase === 9) {
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Stopped, upperCabinet.log);
            await upperCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 2, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 190 * 100, upperCabinet.log);
            await upperCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 5000, upperCabinet.log);

            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'operationalState', OperationalState.OperationalStateEnum.Stopped, lowerCabinet.log);
            await lowerCabinet?.setAttribute('OvenCavityOperationalState', 'currentPhase', 2, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureControl', 'temperatureSetpoint', 200 * 100, lowerCabinet.log);
            await lowerCabinet?.setAttribute('TemperatureMeasurement', 'measuredValue', 5000, lowerCabinet.log);
          }
        }

        if (this.heatPump) {
          const optOutState = this.heatPump?.getAttribute('DeviceEnergyManagement', 'optOutState', this.heatPump.log);
          if (optOutState === DeviceEnergyManagement.OptOutState.NoOptOut)
            await this.heatPump?.setAttribute('DeviceEnergyManagement', 'optOutState', DeviceEnergyManagement.OptOutState.LocalOptOut, this.heatPump.log);
          if (optOutState === DeviceEnergyManagement.OptOutState.LocalOptOut)
            await this.heatPump?.setAttribute('DeviceEnergyManagement', 'optOutState', DeviceEnergyManagement.OptOutState.GridOptOut, this.heatPump.log);
          if (optOutState === DeviceEnergyManagement.OptOutState.GridOptOut)
            await this.heatPump?.setAttribute('DeviceEnergyManagement', 'optOutState', DeviceEnergyManagement.OptOutState.OptOut, this.heatPump.log);
          if (optOutState === DeviceEnergyManagement.OptOutState.OptOut)
            await this.heatPump?.setAttribute('DeviceEnergyManagement', 'optOutState', DeviceEnergyManagement.OptOutState.NoOptOut, this.heatPump.log);
        }

        if (this.refrigerator) {
          if (this.phase === 0) {
            const refrigerator = this.refrigerator.getChildEndpointById('RefrigeratorTop');
            // 1 Auto 2 RapidCool
            await this.refrigerator.setAttribute('RefrigeratorAndTemperatureControlledCabinetMode', 'currentMode', 1, this.refrigerator.log);
            await refrigerator?.setAttribute('TemperatureControl', 'temperatureSetpoint', 9 * 100, refrigerator.log);
            await refrigerator?.setAttribute('TemperatureMeasurement', 'measuredValue', 1200, refrigerator.log);

            // 1 Auto 2 RapidFreeze
            const freezer = this.refrigerator.getChildEndpointById('FreezerBottom');
            await this.refrigerator.setAttribute('RefrigeratorAndTemperatureControlledCabinetMode', 'currentMode', 1, this.refrigerator.log);
            await freezer?.setAttribute('TemperatureControl', 'temperatureSetpoint', -18 * 100, freezer.log);
            await freezer?.setAttribute('TemperatureMeasurement', 'measuredValue', -1000, freezer.log);
          }
          if (this.phase === 1) await this.refrigerator.setDoorOpenState(true);
          if (this.phase === 2) await this.refrigerator.triggerDoorOpenState(true);
          if (this.phase === 4) await this.refrigerator.setDoorOpenState(false);
          if (this.phase === 4) await this.refrigerator.triggerDoorOpenState(false);
          if (this.phase === 5) {
            const refrigerator = this.refrigerator.getChildEndpointById('RefrigeratorTop');
            // 1 Auto 2 RapidCool
            await this.refrigerator.setAttribute('RefrigeratorAndTemperatureControlledCabinetMode', 'currentMode', 2, this.refrigerator.log);
            await refrigerator?.setAttribute('TemperatureControl', 'temperatureSetpoint', 10 * 100, refrigerator.log);
            await refrigerator?.setAttribute('TemperatureMeasurement', 'measuredValue', 1000, refrigerator.log);

            const freezer = this.refrigerator.getChildEndpointById('FreezerBottom');
            // 1 Auto 2 RapidFreeze
            await this.refrigerator.setAttribute('RefrigeratorAndTemperatureControlledCabinetMode', 'currentMode', 2, this.refrigerator.log);
            await freezer?.setAttribute('TemperatureControl', 'temperatureSetpoint', -24 * 100, freezer.log);
            await freezer?.setAttribute('TemperatureMeasurement', 'measuredValue', -1500, freezer.log);
          }
          if (this.phase === 6) await this.refrigerator.setDoorOpenState(true);
          if (this.phase === 7) await this.refrigerator.triggerDoorOpenState(true);
          if (this.phase === 9) await this.refrigerator.setDoorOpenState(false);
          if (this.phase === 9) await this.refrigerator.triggerDoorOpenState(false);
        }
        this.phase += 1;
        this.phase = this.phase >= 10 ? 0 : this.phase;
      }, 10 * 1000);
    }

    // Use interval for sensor updates
    if (this.config.useInterval) {
      this.addInterval(
        async () => {
          let value = this.door?.getAttribute(BooleanState.id, 'stateValue', this.door.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.door?.setAttribute(BooleanState.id, 'stateValue', value, this.door.log);
            this.door?.log.info(`Set door stateValue to ${value}`);
          }

          const occupancyValue = this.occupancy?.getAttribute(OccupancySensing, 'occupancy', this.occupancy.log);
          if (isValidObject(occupancyValue, 1)) {
            occupancyValue.occupied = !occupancyValue.occupied;
            await this.occupancy?.setAttribute(OccupancySensing.id, 'occupancy', occupancyValue, this.occupancy.log);
            this.occupancy?.log.info(`Set occupancy to ${occupancyValue.occupied}`);
          }

          value = this.illuminance?.getAttribute(IlluminanceMeasurement.id, 'measuredValue', this.illuminance.log);
          if (isValidNumber(value, 0, 0xfffe)) {
            value = matterToLux(value);
            value = value + 10 < 500 ? value + 10 : 1;
            await this.illuminance?.setAttribute(IlluminanceMeasurement.id, 'measuredValue', luxToMatter(value), this.illuminance.log);
            this.illuminance?.log.info(`Set illuminance measuredValue to ${value}`);
          }

          value = this.temperature?.getAttribute(TemperatureMeasurement.id, 'measuredValue', this.temperature.log);
          if (isValidNumber(value, 0, 0xfffe)) {
            value = value + 100 < 3000 ? value + 100 : 1000;
            await this.temperature?.setAttribute(TemperatureMeasurement.id, 'measuredValue', value, this.temperature.log);
            await this.climate?.getChildEndpointById('Temperature')?.setAttribute(TemperatureMeasurement.id, 'measuredValue', value, this.climate.log);
            this.temperature?.log.info(`Set temperature measuredValue to ${value}`);
          }

          value = this.humidity?.getAttribute(RelativeHumidityMeasurement.id, 'measuredValue', this.humidity.log);
          if (isValidNumber(value, 0, 0xfffe)) {
            value = value + 100 < 10000 ? value + 100 : 100;
            await this.humidity?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', value, this.humidity.log);
            await this.climate?.getChildEndpointById('Humidity')?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', value, this.climate.log);
            this.humidity?.log.info(`Set humidity measuredValue to ${value}`);
          }

          value = this.pressure?.getAttribute(PressureMeasurement.id, 'measuredValue', this.pressure.log);
          if (isValidNumber(value, 0, 0xfffe)) {
            value = value + 10 < 9900 ? value + 10 : 8600;
            await this.pressure?.setAttribute(PressureMeasurement.id, 'measuredValue', value, this.pressure.log);
            await this.climate?.getChildEndpointById('Pressure')?.setAttribute(PressureMeasurement.id, 'measuredValue', value, this.climate.log);
            this.pressure?.log.info(`Set pressure measuredValue to ${value}`);
          }

          value = this.flow?.getAttribute(FlowMeasurement.id, 'measuredValue', this.flow.log);
          if (isValidNumber(value, 0, 0xfffe)) {
            value = value + 1 < 50 ? value + 1 : 1;
            await this.flow?.setAttribute(FlowMeasurement.id, 'measuredValue', value, this.flow.log);
            this.flow?.log.info(`Set flow measuredValue to ${value}`);
          }
        },
        60 * 1000 + 900,
      );
    }

    // Set switch to off
    await this.switch?.setAttribute(OnOff.id, 'onOff', this.intervalOnOff, this.switch.log);
    await this.mountedOnOffSwitch?.setAttribute(OnOff.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitch.log);
    await this.mountedOnOffSwitchLegacy?.setAttribute(OnOff.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitchLegacy.log);
    this.switch?.log.info(`Set switch initial onOff to ${this.intervalOnOff}`);
    if (this.config.useInterval) {
      // Toggle switch onOff every minute
      this.addInterval(
        async () => {
          await this.switch?.setAttribute(OnOff.id, 'onOff', this.intervalOnOff, this.switch.log);
          await this.mountedOnOffSwitch?.setAttribute(OnOff.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitch.log);
          await this.mountedOnOffSwitchLegacy?.setAttribute(OnOff.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitchLegacy.log);
          this.log.info(`Set switches onOff to ${this.intervalOnOff}`);
          this.intervalOnOff = !this.intervalOnOff;
        },
        60 * 1000 + 100,
      );
    }

    // Set light on/off to off
    await this.lightOnOff?.setAttribute(OnOff.id, 'onOff', false, this.lightOnOff.log);
    this.lightOnOff?.log.info('Set light initial onOff to false.');

    // Set dimmer on/off to off
    await this.dimmer?.setAttribute(OnOff.id, 'onOff', false, this.dimmer.log);
    await this.dimmer?.setAttribute(LevelControl.id, 'currentLevel', 1, this.dimmer.log);
    await this.mountedDimmerSwitch?.setAttribute(OnOff.id, 'onOff', false, this.mountedDimmerSwitch.log);
    await this.mountedDimmerSwitch?.setAttribute(LevelControl.id, 'currentLevel', 1, this.mountedDimmerSwitch.log);
    await this.mountedDimmerSwitchLegacy?.setAttribute(OnOff.id, 'onOff', false, this.mountedDimmerSwitchLegacy.log);
    await this.mountedDimmerSwitchLegacy?.setAttribute(LevelControl.id, 'currentLevel', 1, this.mountedDimmerSwitchLegacy.log);
    this.dimmer?.log.info(`Set dimmer initial onOff to false, currentLevel to 1.`);

    // Set light to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.light?.setAttribute(OnOff.id, 'onOff', false, this.light.log);
    await this.light?.setAttribute(LevelControl.id, 'currentLevel', 200, this.light.log);
    await this.light?.setAttribute(ColorControl.id, 'currentHue', 0, this.light.log);
    await this.light?.setAttribute(ColorControl.id, 'currentSaturation', 128, this.light.log);
    await this.light?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.light?.log.info('Set light initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light XY to true, level to 100% and XY to red
    await this.lightXY?.setAttribute(OnOff.id, 'onOff', true, this.lightXY.log);
    await this.lightXY?.setAttribute(LevelControl.id, 'currentLevel', 254, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControl.id, 'currentX', 0.7006 * 65536, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControl.id, 'currentY', 0.2993 * 65536, this.lightXY.log);
    await this.lightXY?.configureColorControlMode(ColorControl.ColorMode.CurrentXAndCurrentY);
    this.lightXY?.log.info('Set light XY initial onOff to true, currentLevel to 254, X to 0.7006 and Y to 0.2993.');

    // Set light HS to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.lightHS?.setAttribute(OnOff.id, 'onOff', false, this.lightHS.log);
    await this.lightHS?.setAttribute(LevelControl.id, 'currentLevel', 1, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControl.id, 'currentHue', 0, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControl.id, 'currentSaturation', 128, this.lightHS.log);
    await this.lightHS?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.lightHS?.log.info('Set light HS initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light CT to true, level to 50% and colorTemperatureMireds to 250
    await this.lightCT?.setAttribute(OnOff.id, 'onOff', true, this.lightCT.log);
    await this.lightCT?.setAttribute(LevelControl.id, 'currentLevel', 128, this.lightCT.log);
    await this.lightCT?.setAttribute(ColorControl.id, 'colorTemperatureMireds', 250, this.lightCT.log);
    await this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
    this.lightCT?.log.info('Set light CT initial onOff to true, currentLevel to 128, colorTemperatureMireds to 250.');

    if (this.config.useInterval) {
      this.addInterval(
        async () => {
          this.intervalLevel += 10;
          if (this.intervalLevel >= 250) {
            this.intervalLevel = 1;
            await this.lightOnOff?.setAttribute(OnOff.id, 'onOff', false, this.lightOnOff.log);
            await this.dimmer?.setAttribute(OnOff.id, 'onOff', false, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(OnOff.id, 'onOff', false, this.mountedDimmerSwitch.log);
            await this.mountedDimmerSwitchLegacy?.setAttribute(OnOff.id, 'onOff', false, this.mountedDimmerSwitchLegacy.log);
            await this.light?.setAttribute(OnOff.id, 'onOff', false, this.light.log);
            await this.lightXY?.setAttribute(OnOff.id, 'onOff', false, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOff.id, 'onOff', false, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOff.id, 'onOff', false, this.lightCT.log);
            this.log.info('Set lights onOff to false');
          } else {
            await this.lightOnOff?.setAttribute(OnOff.id, 'onOff', true, this.lightOnOff?.log);
            await this.dimmer?.setAttribute(OnOff.id, 'onOff', true, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(OnOff.id, 'onOff', true, this.mountedDimmerSwitch.log);
            await this.mountedDimmerSwitchLegacy?.setAttribute(OnOff.id, 'onOff', true, this.mountedDimmerSwitchLegacy.log);
            await this.light?.setAttribute(OnOff.id, 'onOff', true, this.light.log);
            await this.lightXY?.setAttribute(OnOff.id, 'onOff', true, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOff.id, 'onOff', true, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOff.id, 'onOff', true, this.lightCT.log);
            this.log.info('Set lights onOff to true');
            await this.dimmer?.setAttribute(LevelControl.id, 'currentLevel', this.intervalLevel, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(LevelControl.id, 'currentLevel', this.intervalLevel, this.mountedDimmerSwitch.log);
            await this.mountedDimmerSwitchLegacy?.setAttribute(LevelControl.id, 'currentLevel', this.intervalLevel, this.mountedDimmerSwitchLegacy.log);
            await this.light?.setAttribute(LevelControl.id, 'currentLevel', this.intervalLevel, this.light.log);
            await this.lightXY?.setAttribute(LevelControl.id, 'currentLevel', this.intervalLevel, this.lightXY.log);
            await this.lightHS?.setAttribute(LevelControl.id, 'currentLevel', this.intervalLevel, this.lightHS.log);
            await this.lightCT?.setAttribute(LevelControl.id, 'currentLevel', this.intervalLevel, this.lightCT.log);
            this.log.info(`Set lights currentLevel to ${this.intervalLevel}`);
          }
          this.intervalColorTemperature += 50;
          if (this.intervalColorTemperature > 500) {
            this.intervalColorTemperature = 147;
          }
          await this.light?.setAttribute(ColorControl.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.light.log);
          await this.lightHS?.setAttribute(ColorControl.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightHS.log);
          await this.lightXY?.setAttribute(ColorControl.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightXY.log);
          await this.lightCT?.setAttribute(ColorControl.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightCT.log);
          await this.light?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          await this.lightHS?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          await this.lightXY?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          await this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
          this.log.info(`Set lights colorTemperatureMireds to ${this.intervalColorTemperature}`);
        },
        60 * 1000 + 200,
      );
    }

    // Set outlet to off
    this.outlet?.log.info('Set outlet initial onOff to false');
    await this.outlet?.setAttribute(OnOff.id, 'onOff', false, this.outlet.log);

    this.outletEnergy?.log.info('Set outlet initial onOff to false and energy/power to 0');
    await this.outletEnergy?.setAttribute(OnOff.id, 'onOff', false, this.outletEnergy.log);
    await this.outletEnergy?.setAttribute(ElectricalEnergyMeasurement.id, 'cumulativeEnergyImported', { energy: 0 }, this.outletEnergy.log);
    await this.outletEnergy?.setAttribute(ElectricalPowerMeasurement.id, 'voltage', 220_000, this.outletEnergy.log);
    await this.outletEnergy?.setAttribute(ElectricalPowerMeasurement.id, 'activeCurrent', 0, this.outletEnergy.log);
    await this.outletEnergy?.setAttribute(ElectricalPowerMeasurement.id, 'activePower', 0, this.outletEnergy.log);

    this.outletEnergyApparent?.log.info('Set outlet initial onOff to false and apparent energy/power to 0');
    await this.outletEnergyApparent?.setAttribute(OnOff.id, 'onOff', false, this.outletEnergyApparent.log);
    await this.outletEnergyApparent?.setAttribute(ElectricalEnergyMeasurement.id, 'cumulativeEnergyImported', { energy: 0 }, this.outletEnergyApparent.log);
    await this.outletEnergyApparent?.setAttribute(ElectricalPowerMeasurement.id, 'voltage', 220_000, this.outletEnergyApparent.log);
    await this.outletEnergyApparent?.setAttribute(ElectricalPowerMeasurement.id, 'apparentCurrent', 0, this.outletEnergyApparent.log);
    await this.outletEnergyApparent?.setAttribute(ElectricalPowerMeasurement.id, 'apparentPower', 0, this.outletEnergyApparent.log);

    if (this.config.useInterval) {
      // Toggle outlet onOff every minute
      this.addInterval(
        async () => {
          let state = this.outlet?.getAttribute(OnOff.id, 'onOff', this.outlet.log);
          if (isValidBoolean(state)) {
            this.outlet?.log.info(`Set outlet onOff to ${!state}`);
            await this.outlet?.setAttribute(OnOff.id, 'onOff', !state, this.outlet.log);
          }
          state = this.outletEnergy?.getAttribute(OnOff.id, 'onOff', this.outletEnergy.log);
          if (isValidBoolean(state)) {
            this.outletEnergy?.log.info(`Set outlet onOff to ${!state}`);
            await this.outletEnergy?.setAttribute(OnOff.id, 'onOff', !state, this.outletEnergy.log);
            if (state) {
              await this.outletEnergy?.setAttribute(ElectricalPowerMeasurement.id, 'activeCurrent', 0, this.outletEnergy.log);
              await this.outletEnergy?.setAttribute(ElectricalPowerMeasurement.id, 'activePower', 0, this.outletEnergy.log);
            } else {
              await this.outletEnergy?.setAttribute(ElectricalPowerMeasurement.id, 'activeCurrent', 100_000, this.outletEnergy.log);
              await this.outletEnergy?.setAttribute(ElectricalPowerMeasurement.id, 'activePower', 220_000_000, this.outletEnergy.log);
              const energy = this.outletEnergy?.getAttribute(ElectricalEnergyMeasurement, 'cumulativeEnergyImported', this.outletEnergy.log);
              if (isValidObject(energy, 1)) {
                if (typeof energy.energy === 'bigint') energy.energy += 5000n;
                else energy.energy += 5000;
                await this.outletEnergy?.setAttribute(ElectricalEnergyMeasurement.id, 'cumulativeEnergyImported', energy, this.outletEnergy.log);
              }
              await this.outletEnergy?.setAttribute(ElectricalEnergyMeasurement.id, 'cumulativeEnergyImported', { energy: 0 }, this.outletEnergy.log);
            }
          }
          state = this.outletEnergyApparent?.getAttribute(OnOff.id, 'onOff', this.outletEnergyApparent.log);
          if (isValidBoolean(state)) {
            this.outletEnergyApparent?.log.info(`Set outlet onOff to ${!state}`);
            await this.outletEnergyApparent?.setAttribute(OnOff.id, 'onOff', !state, this.outletEnergyApparent.log);
            if (state) {
              await this.outletEnergyApparent?.setAttribute(ElectricalPowerMeasurement.id, 'apparentCurrent', 0, this.outletEnergyApparent.log);
              await this.outletEnergyApparent?.setAttribute(ElectricalPowerMeasurement.id, 'apparentPower', 0, this.outletEnergyApparent.log);
            } else {
              await this.outletEnergyApparent?.setAttribute(ElectricalPowerMeasurement.id, 'apparentCurrent', 100_000, this.outletEnergyApparent.log);
              await this.outletEnergyApparent?.setAttribute(ElectricalPowerMeasurement.id, 'apparentPower', 220_000_000, this.outletEnergyApparent.log);
              const energy = this.outletEnergyApparent?.getAttribute(ElectricalEnergyMeasurement, 'cumulativeEnergyImported', this.outletEnergyApparent.log);
              if (isValidObject(energy, 1)) {
                if (typeof energy.energy === 'bigint') energy.energy += 5000n;
                else energy.energy += 5000;
                await this.outletEnergyApparent?.setAttribute(ElectricalEnergyMeasurement.id, 'cumulativeEnergyImported', energy, this.outletEnergyApparent.log);
              }
            }
          }
          state = this.smartOutlet?.getChildEndpointById('Socket1')?.getAttribute(OnOff.id, 'onOff', this.smartOutlet.log);
          if (isValidBoolean(state)) {
            this.smartOutlet?.log.info(`Set smart outlets onOff`);
            await this.smartOutlet?.getChildEndpointById('Socket1')?.setAttribute(OnOff.id, 'onOff', !state, this.smartOutlet.log);
            await this.smartOutlet?.getChildEndpointById('Socket2')?.setAttribute(OnOff.id, 'onOff', state, this.smartOutlet.log);
            await this.smartOutlet?.getChildEndpointById('Socket3')?.setAttribute(OnOff.id, 'onOff', !state, this.smartOutlet.log);
            await this.smartOutlet?.getChildEndpointById('Socket4')?.setAttribute(OnOff.id, 'onOff', state, this.smartOutlet.log);
          }
        },
        60 * 1000 + 300,
      );
    }

    // Set cover to target = current position and status to stopped (current position is persisted in the cluster)
    await this.coverLift?.setWindowCoveringTargetAsCurrentAndStopped();
    this.coverLift?.log.info('Set cover initial targetPositionLiftPercent100ths = currentPositionLiftPercent100ths and operationalStatus to Stopped.');
    if (this.config.useInterval) {
      // Increment cover position every minute
      this.addInterval(
        async () => {
          let position = this.coverLift?.getAttribute(WindowCovering.id, 'currentPositionLiftPercent100ths', this.coverLift.log);
          if (isValidNumber(position, 0, 10000)) {
            position = position > 9000 ? 0 : position + 1000;
            await this.coverLift?.setAttribute(WindowCovering.id, 'targetPositionLiftPercent100ths', position, this.coverLift.log);
            await this.coverLift?.setAttribute(WindowCovering.id, 'currentPositionLiftPercent100ths', position, this.coverLift.log);
            await this.coverLift?.setAttribute(
              WindowCovering.id,
              'operationalStatus',
              { global: WindowCovering.MovementStatus.Stopped, lift: WindowCovering.MovementStatus.Stopped, tilt: WindowCovering.MovementStatus.Stopped },
              this.coverLift.log,
            );
            this.coverLift?.log.info(`Set cover current and target positionLiftPercent100ths to ${position} and operationalStatus to Stopped`);
          }
        },
        60 * 1000 + 400,
      );
    }

    // Set lock to Locked
    await this.lock?.setAttribute(DoorLock.id, 'lockState', DoorLock.LockState.Locked, this.lock.log);
    this.lock?.log.info('Set lock initial lockState to Locked');
    if (this.config.useInterval) {
      // Toggle lock every minute
      this.addInterval(
        async () => {
          const status = this.lock?.getAttribute(DoorLock, 'lockState', this.lock.log);
          if (isValidNumber(status, DoorLock.LockState.Locked, DoorLock.LockState.Unlocked)) {
            await this.lock?.setAttribute(DoorLock.id, 'lockState', status === DoorLock.LockState.Locked ? DoorLock.LockState.Unlocked : DoorLock.LockState.Locked, this.lock.log);
            this.lock?.log.info(`Set lock lockState to ${status === DoorLock.LockState.Locked ? 'Locked' : 'Unlocked'}`);
          }
        },
        60 * 1000 + 500,
      );
    }

    // Set local to 16°C
    await this.thermoAuto?.setAttribute(Thermostat.id, 'localTemperature', 16 * 100, this.thermoAuto.log);
    await this.thermoAuto?.setAttribute(Thermostat.id, 'systemMode', Thermostat.SystemMode.Auto, this.thermoAuto.log);

    // istanbul ignore next if cause no runningState attribute before 3.3.3
    if (this.thermoAuto?.hasAttributeServer(Thermostat.id, 'thermostatRunningState')) {
      const runningState = this.thermoAuto?.getAttribute(Thermostat.id, 'thermostatRunningState', this.thermoAuto.log);
      await this.thermoAuto?.setAttribute(Thermostat.id, 'thermostatRunningState', { ...runningState, heat: true }, this.thermoAuto.log);
    }

    this.thermoAuto?.log.info('Set thermostat initial localTemperature to 16°C, mode Auto and heat runningState to true');
    const temperature = this.thermoAuto?.getChildEndpointById('Temperature');
    await temperature?.setAttribute(TemperatureMeasurement.id, 'measuredValue', 16 * 100, this.thermoAuto?.log);
    const humidity = this.thermoAuto?.getChildEndpointById('Humidity');
    await humidity?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', 50 * 100, this.thermoAuto?.log);
    const flow = this.thermoAuto?.getChildEndpointById('Flow');
    await flow?.setAttribute(FlowMeasurement.id, 'measuredValue', 10, this.thermoAuto?.log);
    this.thermoAuto?.log.info('Set thermostat ext temperature to 16°C, ext humidity to 50% and ext valve flow to 10');

    await this.thermoAutoOccupancy?.setAttribute(Thermostat.id, 'occupancy', { occupied: true }, this.thermoAutoOccupancy.log);
    await this.thermoAutoOccupancy?.setAttribute(Thermostat.id, 'systemMode', Thermostat.SystemMode.Auto, this.thermoAutoOccupancy.log);
    this.thermoAutoOccupancy?.log.info('Set thermostat occupancy to true and mode Auto');

    if (this.config.useInterval) {
      // Increment localTemperature every minute
      this.addInterval(
        async () => {
          let temperature = this.thermoAuto?.getAttribute(Thermostat.id, 'localTemperature', this.thermoAuto.log);
          if (isValidNumber(temperature, 1600, 2400)) {
            temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
            await this.thermoAuto?.setAttribute(Thermostat.id, 'localTemperature', temperature, this.thermoAuto.log);

            await this.thermoHeat?.setAttribute(Thermostat.id, 'localTemperature', temperature, this.thermoHeat.log);
            const tempIn = this.thermoHeat?.getChildEndpointById('TemperatureIN');
            await tempIn?.setAttribute(TemperatureMeasurement.id, 'measuredValue', temperature - 50, this.thermoHeat?.log);
            const tempOut = this.thermoHeat?.getChildEndpointById('TemperatureOUT');
            await tempOut?.setAttribute(TemperatureMeasurement.id, 'measuredValue', temperature - 400, this.thermoHeat?.log);

            await this.thermoCool?.setAttribute(Thermostat.id, 'localTemperature', temperature, this.thermoCool.log);
            const temp = this.thermoCool?.getChildEndpointById('Temperature');
            await temp?.setAttribute(TemperatureMeasurement.id, 'measuredValue', temperature, this.thermoCool?.log);
            const humidity = this.thermoCool?.getChildEndpointById('Humidity');
            await humidity?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', 50 * 100, this.thermoCool?.log);
            const flow = this.thermoCool?.getChildEndpointById('Flow');
            await flow?.setAttribute(FlowMeasurement.id, 'measuredValue', 10, this.thermoCool?.log);
            this.thermoAuto?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
            this.thermoHeat?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
            this.thermoCool?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
          }

          let temperatureOccupancy = this.thermoAutoOccupancy?.getAttribute(Thermostat.id, 'localTemperature', this.thermoAutoOccupancy.log);
          if (isValidNumber(temperatureOccupancy, 1600, 2400)) {
            // Change temperature between 16°C and 24°C
            temperatureOccupancy = temperatureOccupancy + 100 > 2400 ? 1600 : temperatureOccupancy + 100;
            await this.thermoAutoOccupancy?.setAttribute(Thermostat.id, 'localTemperature', temperatureOccupancy, this.thermoAutoOccupancy.log);
            await this.thermoAutoOccupancy?.setAttribute(Thermostat.id, 'outdoorTemperature', temperatureOccupancy + 100, this.thermoAutoOccupancy.log);
            // Toggle occupancy
            const occupancyValue = this.thermoAutoOccupancy?.getAttribute(Thermostat, 'occupancy', this.thermoAutoOccupancy.log);
            if (isValidObject(occupancyValue, 1)) {
              occupancyValue.occupied = !occupancyValue.occupied;
              await this.thermoAutoOccupancy?.setAttribute(Thermostat.id, 'occupancy', occupancyValue, this.thermoAutoOccupancy.log);
              this.thermoAutoOccupancy?.log.info(`Set thermostat occupancy to ${occupancyValue.occupied}`);
            }
          }

          // istanbul ignore next if cause no runningState attribute before 3.3.3
          if (this.thermoAuto?.hasAttributeServer(Thermostat.id, 'thermostatRunningState')) {
            const runningState = this.thermoAuto?.getAttribute(Thermostat.id, 'thermostatRunningState', this.thermoAuto.log);
            runningState.heat = !runningState?.heat;
            runningState.cool = !runningState?.cool;
            await this.thermoAuto?.setAttribute(Thermostat.id, 'thermostatRunningState', runningState, this.thermoAuto.log);
          }
        },
        60 * 1000 + 600,
      );
    }

    // Set airConditioner to on
    await this.airConditioner?.setAttribute(OnOff.id, 'onOff', true, this.airConditioner.log);
    await this.airConditioner?.setAttribute(Thermostat.id, 'localTemperature', 2000, this.airConditioner.log);
    if (this.config.useInterval) {
      // Increment airConditioner localTemperature every minute
      this.addInterval(
        async () => {
          let temperature = this.airConditioner?.getAttribute(Thermostat.id, 'localTemperature', this.airConditioner.log);
          if (isValidNumber(temperature, 1600, 2400)) {
            temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
            await this.airConditioner?.setAttribute(Thermostat.id, 'localTemperature', temperature, this.airConditioner.log);
            await this.airConditioner?.setAttribute(TemperatureMeasurement.id, 'measuredValue', temperature, this.airConditioner.log);
            await this.airConditioner?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', 50 * 100, this.airConditioner.log);
            this.airConditioner?.log.info(`Set airConditioner localTemperature to ${temperature / 100}°C`);
          }
        },
        60 * 1000 + 550,
      );
    }

    // Set fan to auto
    this.fanBase?.log.info('Set fan initial fanMode to Off, percentCurrent and percentSetting to 0');
    await this.fanBase?.setAttribute(FanControl.id, 'fanMode', FanControl.FanMode.Off, this.fanBase.log);
    await this.fanBase?.setAttribute(FanControl.id, 'percentCurrent', 0, this.fanBase.log);
    await this.fanBase?.setAttribute(FanControl.id, 'percentSetting', 0, this.fanBase.log);
    await this.fanDefault?.setAttribute(FanControl.id, 'fanMode', FanControl.FanMode.Auto, this.fanDefault.log);
    await this.fanDefault?.setAttribute(FanControl.id, 'percentCurrent', 0, this.fanDefault.log);
    await this.fanDefault?.setAttribute(FanControl.id, 'percentSetting', 0, this.fanDefault.log);
    await this.fanComplete?.setAttribute(FanControl.id, 'fanMode', FanControl.FanMode.Auto, this.fanComplete.log);
    await this.fanComplete?.setAttribute(FanControl.id, 'percentCurrent', 0, this.fanComplete.log);
    await this.fanComplete?.setAttribute(FanControl.id, 'percentSetting', 0, this.fanComplete.log);
    if (this.config.useInterval) {
      // Increment fan percentCurrent every minute
      this.addInterval(
        async () => {
          let mode = this.fanBase?.getAttribute(FanControl, 'fanMode', this.fanBase.log);
          let value = this.fanBase?.getAttribute(FanControl, 'percentCurrent', this.fanBase.log);
          mode = this.fanDefault?.getAttribute(FanControl, 'fanMode', this.fanDefault.log);
          value = this.fanDefault?.getAttribute(FanControl, 'percentCurrent', this.fanDefault.log);
          if (isValidNumber(mode, FanControl.FanMode.Off, FanControl.FanMode.Auto) && mode === FanControl.FanMode.Auto && isValidNumber(value, 0, 100)) {
            value = value + 10 >= 100 ? 0 : value + 10;
            await this.fanDefault?.setAttribute(FanControl, 'percentCurrent', value, this.fanDefault.log);
            await this.fanDefault?.setAttribute(FanControl, 'percentSetting', value, this.fanDefault.log);
            this.fanDefault?.log.info(`Set fan percentCurrent and percentSetting to ${value}`);
          }
          mode = this.fanComplete?.getAttribute(FanControl, 'fanMode', this.fanComplete.log);
          value = this.fanComplete?.getAttribute(FanControl, 'percentCurrent', this.fanComplete.log);
          if (isValidNumber(mode, FanControl.FanMode.Off, FanControl.FanMode.Auto) && mode === FanControl.FanMode.Auto && isValidNumber(value, 0, 100)) {
            value = value + 10 >= 100 ? 0 : value + 10;
            await this.fanComplete?.setAttribute(FanControl, 'percentCurrent', value, this.fanComplete.log);
            await this.fanComplete?.setAttribute(FanControl, 'percentSetting', value, this.fanComplete.log);
            this.fanComplete?.log.info(`Set fan percentCurrent and percentSetting to ${value}`);
          }
        },
        60 * 1000 + 700,
      );
    }

    // Set waterLeak to false
    await this.waterLeak?.setAttribute(BooleanState.id, 'stateValue', false, this.waterLeak.log);
    if (this.config.useInterval) {
      // Toggle waterLeak every minute
      this.addInterval(
        async () => {
          let value = this.waterLeak?.getAttribute(BooleanState.id, 'stateValue', this.waterLeak.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.waterLeak?.setAttribute(BooleanState.id, 'stateValue', value, this.waterLeak.log);
            this.waterLeak?.log.info(`Set waterLeak stateValue to ${value}`);
          }
        },
        60 * 1000 + 800,
      );
    }

    // Set waterFreeze to false
    await this.waterFreeze?.setAttribute(BooleanState.id, 'stateValue', false, this.waterFreeze.log);
    if (this.config.useInterval) {
      // Toggle waterFreeze every minute
      this.addInterval(
        async () => {
          let value = this.waterFreeze?.getAttribute(BooleanState.id, 'stateValue', this.waterFreeze.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.waterFreeze?.setAttribute(BooleanState.id, 'stateValue', value, this.waterFreeze.log);
            this.waterFreeze?.log.info(`Set waterFreeze stateValue to ${value}`);
          }
        },
        60 * 1000 + 900,
      );
    }

    // Set rain to false
    await this.rain?.setAttribute(BooleanState.id, 'stateValue', false, this.rain.log);
    if (this.config.useInterval) {
      // Toggle rain every minute
      this.addInterval(
        async () => {
          let value = this.rain?.getAttribute(BooleanState.id, 'stateValue', this.rain.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.rain?.setAttribute(BooleanState.id, 'stateValue', value, this.rain.log);
            this.rain?.log.info(`Set rain stateValue to ${value}`);
          }
        },
        60 * 1000 + 1000,
      );
    }

    // Set smoke to Normal
    await this.smokeCo?.setAttribute(SmokeCoAlarm.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smokeCo.log);
    await this.smokeCo?.setAttribute(SmokeCoAlarm.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smokeCo.log);
    await this.smokeOnly?.setAttribute(SmokeCoAlarm.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smokeOnly.log);
    await this.coOnly?.setAttribute(SmokeCoAlarm.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.coOnly.log);
    if (this.config.useInterval) {
      // Toggle smoke every minute
      this.addInterval(
        async () => {
          let value = this.smokeCo?.getAttribute(SmokeCoAlarm, 'smokeState', this.smokeCo.log);
          if (isValidNumber(value, SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Critical)) {
            value = value === SmokeCoAlarm.AlarmState.Normal ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
            await this.smokeCo?.setAttribute(SmokeCoAlarm, 'smokeState', value, this.smokeCo.log);
            await this.smokeCo?.setAttribute(SmokeCoAlarm, 'coState', value, this.smokeCo.log);
            await this.smokeOnly?.setAttribute(SmokeCoAlarm, 'smokeState', value, this.smokeOnly.log);
            await this.coOnly?.setAttribute(SmokeCoAlarm, 'coState', value, this.coOnly.log);
            this.smokeCo?.log.info(`Set smoke smokeState and coState to ${value}`);
          }
        },
        60 * 1000 + 1100,
      );
    }

    // Set air quality to Normal
    await this.airQuality?.setAttribute(AirQuality, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    await this.airQuality?.setAttribute(TemperatureMeasurement, 'measuredValue', 2150, this.airQuality.log);
    await this.airQuality?.setAttribute(RelativeHumidityMeasurement.id, 'measuredValue', 5500, this.airQuality.log);
    await this.airQuality?.setAttribute(CarbonMonoxideConcentrationMeasurement.id, 'measuredValue', 10, this.airQuality.log);
    await this.airQuality?.setAttribute(CarbonDioxideConcentrationMeasurement.id, 'measuredValue', 400, this.airQuality.log);
    await this.airQuality?.setAttribute(NitrogenDioxideConcentrationMeasurement.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality?.setAttribute(OzoneConcentrationMeasurement.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality?.setAttribute(FormaldehydeConcentrationMeasurement.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality?.setAttribute(Pm1ConcentrationMeasurement.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(Pm25ConcentrationMeasurement.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(Pm10ConcentrationMeasurement.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(RadonConcentrationMeasurement.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(TotalVolatileOrganicCompoundsConcentrationMeasurement.id, 'measuredValue', 100, this.airQuality.log);

    if (this.config.useInterval) {
      // Toggle air quality every minute
      this.addInterval(
        async () => {
          let value = this.airQuality?.getAttribute(AirQuality, 'airQuality', this.airQuality?.log);
          if (isValidNumber(value, AirQuality.AirQualityEnum.Good, AirQuality.AirQualityEnum.ExtremelyPoor)) {
            value = value >= AirQuality.AirQualityEnum.ExtremelyPoor ? AirQuality.AirQualityEnum.Good : value + 1;
            await this.airQuality?.setAttribute(AirQuality, 'airQuality', value, this.airQuality.log);
            this.airQuality?.log.info(`Set air quality to ${value}`);
          }
        },
        60 * 1000 + 1100,
      );
    }

    if (this.config.useInterval) {
      // Trigger the switches every minute
      this.genericSwitchLastEvent = 'Release';
      this.addInterval(
        async () => {
          // console.error('Entering generic switch interval triggered', this.genericSwitchLastEvent);
          if (this.genericSwitchLastEvent === 'Release') {
            this.genericSwitchLastEvent = 'Single';
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch1')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch2')?.triggerSwitchEvent('Double', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch3')?.triggerSwitchEvent('Long', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch4')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch5')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch6')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
          } else if (this.genericSwitchLastEvent === 'Single') {
            this.genericSwitchLastEvent = 'Double';
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch1')?.triggerSwitchEvent('Double', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch2')?.triggerSwitchEvent('Long', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch3')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
          } else if (this.genericSwitchLastEvent === 'Double') {
            this.genericSwitchLastEvent = 'Long';
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch1')?.triggerSwitchEvent('Long', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch2')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointById('Momentaryswitch3')?.triggerSwitchEvent('Double', this.momentarySwitch?.log);
          } else if (this.genericSwitchLastEvent === 'Long') {
            this.genericSwitchLastEvent = 'Press';
            await this.latchingSwitch?.triggerSwitchEvent('Press', this.latchingSwitch?.log);
          } else if (this.genericSwitchLastEvent === 'Press') {
            this.genericSwitchLastEvent = 'Release';
            await this.latchingSwitch?.triggerSwitchEvent('Release', this.latchingSwitch?.log);
          }
          // console.error('Exiting generic switch interval triggered', this.genericSwitchLastEvent);
        },
        60 * 1000 + 1900,
      );
    }
  }

  override async onShutdown(reason?: string): Promise<void> {
    this.clearIntervals();
    await super.onShutdown(reason);
    this.log.info('onShutdown called with reason:', reason ?? 'none');
    if (this.config.unregisterOnShutdown) await this.unregisterAllDevices(500);
  }

  async addDevice(device: MatterbridgeEndpoint): Promise<MatterbridgeEndpoint | undefined> {
    // istanbul ignore next defensive code, should not happen
    if (!device.serialNumber || !device.deviceName) return undefined;
    this.setSelectDevice(device.serialNumber, device.deviceName, undefined, 'hub');
    if (this.validateDevice(device.deviceName)) {
      device.softwareVersion = Number.parseInt(this.version.replace(/\D/g, ''));
      device.softwareVersionString = this.version === '' ? 'Unknown' : this.version;
      device.hardwareVersion = Number.parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, ''));
      device.hardwareVersionString = this.matterbridge.matterbridgeVersion;
      device.softwareVersion = isValidNumber(device.softwareVersion, 0, UINT32_MAX) ? device.softwareVersion : undefined;
      device.softwareVersionString = isValidString(device.softwareVersionString) ? device.softwareVersionString.slice(0, 64) : undefined;
      device.hardwareVersion = isValidNumber(device.hardwareVersion, 0, UINT16_MAX) ? device.hardwareVersion : undefined;
      device.hardwareVersionString = isValidString(device.hardwareVersionString) ? device.hardwareVersionString.slice(0, 64) : undefined;
      const options = device.getClusterServerOptions(BridgedDeviceBasicInformation.id);
      if (options) {
        options.softwareVersion = device.softwareVersion ?? 1;
        options.softwareVersionString = device.softwareVersionString ?? '1.0.0';
        options.hardwareVersion = device.hardwareVersion ?? 1;
        options.hardwareVersionString = device.hardwareVersionString ?? '1.0.0';
      }
      // We need to add bridgedNode device type and BridgedDeviceBasicInformation cluster for single class devices that doesn't add it in childbridge mode.
      if (device.mode === undefined && !device.deviceTypes.has(bridgedNode.code)) {
        device.deviceTypes.set(bridgedNode.code, bridgedNode);
        const options = device.getClusterServerOptions(Descriptor);
        if (options?.deviceTypeList) {
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          const deviceTypeList = options.deviceTypeList as { deviceType: number; revision: number }[];
          if (!deviceTypeList.find((dt) => dt.deviceType === bridgedNode.code)) {
            deviceTypeList.push({ deviceType: bridgedNode.code, revision: bridgedNode.revision });
          }
        }
        device.createDefaultBridgedDeviceBasicInformationClusterServer(
          device.deviceName,
          device.serialNumber,
          device.vendorId,
          device.vendorName,
          device.productName,
          device.softwareVersion,
          device.softwareVersionString,
          device.hardwareVersion,
          device.hardwareVersionString,
        );
      }

      await this.registerDevice(device);
      return device;
    } else {
      return undefined;
    }
  }
}
