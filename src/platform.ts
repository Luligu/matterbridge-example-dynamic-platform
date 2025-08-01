/**
 * This file contains the class ExampleMatterbridgeDynamicPlatform.
 *
 * @file platform.ts
 * @author Luca Liguori
 * @version 1.2.5
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

import {
  Matterbridge,
  MatterbridgeEndpoint,
  MatterbridgeDynamicPlatform,
  PlatformConfig,
  airQualitySensor,
  bridgedNode,
  colorTemperatureLight,
  coverDevice,
  dimmableLight,
  doorLockDevice,
  fanDevice,
  flowSensor,
  humiditySensor,
  onOffLight,
  onOffOutlet,
  onOffSwitch,
  powerSource,
  rainSensor,
  smokeCoAlarm,
  temperatureSensor,
  thermostatDevice,
  waterFreezeDetector,
  waterLeakDetector,
  airPurifier,
  pumpDevice,
  waterValve,
  genericSwitch,
  airConditioner,
  cooktop,
  microwaveOven,
  oven,
  refrigerator,
  onOffMountedSwitch,
  dimmableMountedSwitch,
  extendedColorLight,
} from 'matterbridge';
import { RoboticVacuumCleaner, LaundryWasher, WaterHeater, Evse, SolarPower, BatteryStorage, LaundryDryer, HeatPump, Dishwasher, ExtractorHood } from 'matterbridge/devices';
import { isValidBoolean, isValidNumber, isValidString } from 'matterbridge/utils';
import { AnsiLogger, debugStringify } from 'matterbridge/logger';
import { AreaNamespaceTag, LocationTag, NumberTag, PositionTag, SwitchesTag, UINT16_MAX, UINT32_MAX } from 'matterbridge/matter';
import {
  PowerSource,
  BooleanState,
  OnOff,
  LevelControl,
  AirQuality,
  CarbonDioxideConcentrationMeasurement,
  CarbonMonoxideConcentrationMeasurement,
  FlowMeasurement,
  ColorControl,
  DoorLock,
  FanControl,
  FormaldehydeConcentrationMeasurement,
  NitrogenDioxideConcentrationMeasurement,
  OzoneConcentrationMeasurement,
  Pm10ConcentrationMeasurement,
  Pm1ConcentrationMeasurement,
  Pm25ConcentrationMeasurement,
  RadonConcentrationMeasurement,
  RelativeHumidityMeasurement,
  RelativeHumidityMeasurementCluster,
  SmokeCoAlarm,
  TemperatureMeasurement,
  Thermostat,
  ThermostatCluster,
  TotalVolatileOrganicCompoundsConcentrationMeasurement,
  WindowCovering,
  EnergyEvseMode,
  EnergyEvse,
  RvcRunMode,
  RvcCleanMode,
  ConcentrationMeasurement,
  Descriptor,
  BridgedDeviceBasicInformation,
} from 'matterbridge/matter/clusters';

import { Appliances } from './appliances.js';

export class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {
  switch: MatterbridgeEndpoint | undefined;
  mountedOnOffSwitch: MatterbridgeEndpoint | undefined;
  mountedDimmerSwitch: MatterbridgeEndpoint | undefined;
  lightOnOff: MatterbridgeEndpoint | undefined;
  dimmer: MatterbridgeEndpoint | undefined;
  light: MatterbridgeEndpoint | undefined;
  lightXY: MatterbridgeEndpoint | undefined;
  lightHS: MatterbridgeEndpoint | undefined;
  lightCT: MatterbridgeEndpoint | undefined;
  outlet: MatterbridgeEndpoint | undefined;
  coverLift: MatterbridgeEndpoint | undefined;
  coverLiftTilt: MatterbridgeEndpoint | undefined;
  lock: MatterbridgeEndpoint | undefined;
  thermoAuto: MatterbridgeEndpoint | undefined;
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
  airConditioner: MatterbridgeEndpoint | undefined;
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
  solarPower: MatterbridgeEndpoint | undefined;
  batteryStorage: MatterbridgeEndpoint | undefined;
  heatPump: MatterbridgeEndpoint | undefined;

  switchInterval: NodeJS.Timeout | undefined;
  lightInterval: NodeJS.Timeout | undefined;
  outletInterval: NodeJS.Timeout | undefined;
  coverInterval: NodeJS.Timeout | undefined;
  lockInterval: NodeJS.Timeout | undefined;
  thermoInterval: NodeJS.Timeout | undefined;
  fanInterval: NodeJS.Timeout | undefined;
  waterLeakInterval: NodeJS.Timeout | undefined;
  waterFreezeInterval: NodeJS.Timeout | undefined;
  rainInterval: NodeJS.Timeout | undefined;
  smokeInterval: NodeJS.Timeout | undefined;
  airQualityInterval: NodeJS.Timeout | undefined;
  airConditionerInterval: NodeJS.Timeout | undefined;
  genericSwitchInterval: NodeJS.Timeout | undefined;
  genericSwitchLastEvent: 'Single' | 'Double' | 'Long' | 'Press' | 'Release' = 'Release';

  intervalOnOff = false;
  intervalLevel = 0;
  intervalColorTemperature = 147;

  bridgedDevices = new Map<string, MatterbridgeEndpoint>();

  fanModeLookup = ['Off', 'Low', 'Medium', 'High', 'On', 'Auto', 'Smart'];
  fanDirectionLookup = ['Forward', 'Reverse'];

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.2.0')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "3.2.0". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }

    this.log.info('Initializing platform:', this.config.name);
    if (config.whiteList === undefined) config.whiteList = [];
    if (config.blackList === undefined) config.blackList = [];
    if (config.enableRVC !== undefined) delete config.enableRVC;
    if (config.enableServerRvc === undefined) config.enableServerRvc = true;
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Wait for the platform to start
    await this.ready;
    await this.clearSelect();

    // *********************** Create a switch device ***********************
    this.switch = new MatterbridgeEndpoint([onOffSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Switch' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Switch', '0x23452164', 0xfff1, 'Matterbridge', 'Matterbridge Switch')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70);

    this.switch = await this.addDevice(this.switch);

    this.switch?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.switch?.addCommandHandler('on', async () => {
      await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.switch.log);
      this.switch?.log.info('Command on called');
    });
    this.switch?.addCommandHandler('off', async () => {
      await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.switch.log);
      this.switch?.log.info('Command off called');
    });

    // *********************** Create a mounted onOff switch device ***********************
    this.mountedOnOffSwitch = new MatterbridgeEndpoint([onOffMountedSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'OnOffMountedSwitch' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('OnOff Mounted Switch', '0x298242164', 0xfff1, 'Matterbridge', 'Matterbridge OnOff Mounted Switch')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70);

    this.mountedOnOffSwitch = await this.addDevice(this.mountedOnOffSwitch);

    this.mountedOnOffSwitch?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.mountedOnOffSwitch?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedOnOffSwitch?.addCommandHandler('on', async () => {
      await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.mountedOnOffSwitch.log);
      this.mountedOnOffSwitch?.log.info('Command on called');
    });
    this.mountedOnOffSwitch?.addCommandHandler('off', async () => {
      await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedOnOffSwitch.log);
      this.mountedOnOffSwitch?.log.info('Command off called');
    });

    // *********************** Create a mounted dimmer switch device ***********************
    this.mountedDimmerSwitch = new MatterbridgeEndpoint(
      [dimmableMountedSwitch, bridgedNode, powerSource],
      { uniqueStorageKey: 'DimmerMountedSwitch' },
      this.config.debug as boolean,
    )
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Dimmer Mounted Switch', '0x22145578864', 0xfff1, 'Matterbridge', 'Matterbridge Dimmer Mounted Switch')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.mountedDimmerSwitch = await this.addDevice(this.mountedDimmerSwitch);

    this.mountedDimmerSwitch?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.mountedDimmerSwitch?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.mountedDimmerSwitch?.addCommandHandler('on', async () => {
      await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.info('Command on called');
    });
    this.mountedDimmerSwitch?.addCommandHandler('off', async () => {
      await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.info('Command off called');
    });
    this.mountedDimmerSwitch?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.mountedDimmerSwitch?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.mountedDimmerSwitch.log);
      this.mountedDimmerSwitch?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // *********************** Create a on off light device ***********************
    this.lightOnOff = new MatterbridgeEndpoint([onOffLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (on/off)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (on/off)', '0x2342375564', 0xfff1, 'Matterbridge', 'Matterbridge Light on/off')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer();

    this.lightOnOff = await this.addDevice(this.lightOnOff);

    this.lightOnOff?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightOnOff?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightOnOff?.addCommandHandler('on', async () => {
      await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightOnOff?.log);
      this.lightOnOff?.log.info('Command on called');
    });
    this.lightOnOff?.addCommandHandler('off', async () => {
      await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff?.log);
      this.lightOnOff?.log.info('Command off called');
    });

    // *********************** Create a dimmer device ***********************
    this.dimmer = new MatterbridgeEndpoint([dimmableLight, bridgedNode, powerSource], { uniqueStorageKey: 'Dimmer' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Dimmer', '0x234554564', 0xfff1, 'Matterbridge', 'Matterbridge Dimmer')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 2990, '2 x AA', 2);

    this.dimmer = await this.addDevice(this.dimmer);

    this.dimmer?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.dimmer?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.dimmer?.addCommandHandler('on', async () => {
      await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.dimmer.log);
      this.dimmer?.log.info('Command on called');
    });
    this.dimmer?.addCommandHandler('off', async () => {
      await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
      this.dimmer?.log.info('Command off called');
    });
    this.dimmer?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
      this.dimmer?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.dimmer?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.dimmer.log);
      this.dimmer?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // *********************** Create a light device with XY, HS and CT color control ***********************
    this.light = new MatterbridgeEndpoint([extendedColorLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (XY, HS and CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (XY, HS and CT)', '0x23480564', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createDefaultColorControlClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70);

    this.light = await this.addDevice(this.light);

    this.light?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.light?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.light?.addCommandHandler('on', async () => {
      await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.light?.log);
      this.light?.log.info('Command on called');
    });
    this.light?.addCommandHandler('off', async () => {
      await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light?.log);
      this.light?.log.info('Command off called');
    });
    this.light?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light?.log);
      this.light?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.light?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.light?.log);
      this.light?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.light?.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentX', colorX, this.light?.log);
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentY', colorY, this.light?.log);
      this.light?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.light?.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.light?.log);
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.light?.log);
      this.light?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}`);
    });
    this.light?.addCommandHandler('moveToHue', async ({ request: { hue } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.light?.log);
      this.light?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.light?.addCommandHandler('moveToSaturation', async ({ request: { saturation } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.light?.log);
      this.light?.log.debug(`Command moveToSaturation called request: saturation ${saturation}}`);
    });
    this.light?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.light?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.light?.log);
      this.light?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create a light device with HS and CT color control ***********************
    this.lightHS = new MatterbridgeEndpoint([colorTemperatureLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (HS, CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (HS, CT)', '0x25097564', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createHsColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();

    this.lightHS = await this.addDevice(this.lightHS);

    this.lightHS?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightHS?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightHS?.addCommandHandler('on', async () => {
      await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightHS?.log);
      this.lightHS?.log.info('Command on called');
    });
    this.lightHS?.addCommandHandler('off', async () => {
      await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS?.log);
      this.lightHS?.log.info('Command off called');
    });
    this.lightHS?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightHS?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightHS?.addCommandHandler('moveToHueAndSaturation', async ({ request: { hue, saturation } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.lightHS?.log);
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToHueAndSaturation called request: hue ${hue} saturation ${saturation}}`);
    });
    this.lightHS?.addCommandHandler('moveToHue', async ({ request: { hue } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', hue, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToHue called request: hue ${hue}`);
    });
    this.lightHS?.addCommandHandler('moveToSaturation', async ({ request: { saturation } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', saturation, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToSaturation called request: saturation ${saturation}`);
    });
    this.lightHS?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightHS?.log);
      this.lightHS?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create a light device with XY and CT color control ***********************
    this.lightXY = new MatterbridgeEndpoint([extendedColorLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (XY, CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (XY, CT)', '0x23497564', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createXyColorControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();

    this.lightXY = await this.addDevice(this.lightXY);

    this.lightXY?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightXY?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightXY?.addCommandHandler('on', async () => {
      await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY?.log);
      this.lightXY?.log.info('Command on called');
    });
    this.lightXY?.addCommandHandler('off', async () => {
      await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightXY?.log);
      this.lightXY?.log.info('Command off called');
    });
    this.lightXY?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightXY?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightXY?.addCommandHandler('moveToColor', async ({ request: { colorX, colorY } }) => {
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentX', colorX, this.lightXY?.log);
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentY', colorY, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToColor called request: X ${colorX / 65536} Y ${colorY / 65536}`);
    });
    this.lightXY?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightXY?.log);
      this.lightXY?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create a light device with CT color control ***********************
    this.lightCT = new MatterbridgeEndpoint([colorTemperatureLight, bridgedNode, powerSource], { uniqueStorageKey: 'Light (CT)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Light (CT)', '0x23480749', 0xfff1, 'Matterbridge', 'Matterbridge Light')
      .createDefaultOnOffClusterServer()
      .createDefaultLevelControlClusterServer()
      .createCtColorControlClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70);

    this.lightCT = await this.addDevice(this.lightCT);

    this.lightCT?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lightCT?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lightCT?.addCommandHandler('on', async () => {
      await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT?.log);
      this.lightCT?.log.info('Command on called');
    });
    this.lightCT?.addCommandHandler('off', async () => {
      await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightCT?.log);
      this.lightCT?.log.info('Command off called');
    });
    this.lightCT?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToLevel called request: ${level}`);
    });
    this.lightCT?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', level, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToLevelWithOnOff called request: ${level}`);
    });
    this.lightCT?.addCommandHandler('moveToColorTemperature', async ({ request: { colorTemperatureMireds } }) => {
      await this.lightCT?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', colorTemperatureMireds, this.lightCT?.log);
      this.lightCT?.log.debug(`Command moveToColorTemperature called request: ${colorTemperatureMireds}`);
    });

    // *********************** Create an outlet device ***********************
    this.outlet = new MatterbridgeEndpoint([onOffOutlet, bridgedNode, powerSource], { uniqueStorageKey: 'Outlet' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Outlet', '0x29252164', 0xfff1, 'Matterbridge', 'Matterbridge Outlet')
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceWiredClusterServer();

    this.outlet = await this.addDevice(this.outlet);

    this.outlet?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.outlet?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.outlet?.addCommandHandler('on', async () => {
      await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.outlet?.log);
      this.outlet?.log.info('Command on called');
    });
    this.outlet?.addCommandHandler('off', async () => {
      await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.outlet?.log);
      this.outlet?.log.info('Command off called');
    });

    // *********************** Create a window covering device ***********************
    // Matter uses 10000 = fully closed   0 = fully opened
    this.coverLift = new MatterbridgeEndpoint([coverDevice, bridgedNode, powerSource], { uniqueStorageKey: 'CoverLift' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Cover lift', 'CL01020564', 0xfff1, 'Matterbridge', 'Matterbridge Cover')
      .createDefaultWindowCoveringClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(86);

    this.coverLift = await this.addDevice(this.coverLift);

    this.coverLift?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.coverLift?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.coverLift?.addCommandHandler('stopMotion', async () => {
      await this.coverLift?.setWindowCoveringTargetAsCurrentAndStopped();
      this.coverLift?.log.info(`Command stopMotion called`);
    });

    this.coverLift?.addCommandHandler('downOrClose', async () => {
      await this.coverLift?.setWindowCoveringCurrentTargetStatus(10000, 10000, WindowCovering.MovementStatus.Stopped);
      this.coverLift?.log.info(`Command downOrClose called`);
    });

    this.coverLift?.addCommandHandler('upOrOpen', async () => {
      await this.coverLift?.setWindowCoveringCurrentTargetStatus(0, 0, WindowCovering.MovementStatus.Stopped);
      this.coverLift?.log.info(`Command upOrOpen called`);
    });

    this.coverLift?.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      await this.coverLift?.setWindowCoveringCurrentTargetStatus(liftPercent100thsValue, liftPercent100thsValue, WindowCovering.MovementStatus.Stopped);
      this.coverLift?.log.info(`Command goToLiftPercentage ${liftPercent100thsValue} called`);
    });

    // *********************** Create a tilt window covering device ***********************
    // Matter uses 10000 = fully closed   0 = fully opened
    this.coverLiftTilt = new MatterbridgeEndpoint([coverDevice, bridgedNode, powerSource], { uniqueStorageKey: 'CoverLiftTilt' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Cover lift and tilt', 'CLT01020554', 0xfff1, 'Matterbridge', 'Matterbridge Cover')
      .createDefaultLiftTiltWindowCoveringClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(86);

    this.coverLiftTilt = await this.addDevice(this.coverLiftTilt);

    this.coverLiftTilt?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.coverLiftTilt?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.coverLiftTilt?.addCommandHandler('stopMotion', async () => {
      await this.coverLiftTilt?.setWindowCoveringTargetAsCurrentAndStopped();
      this.coverLiftTilt?.log.info(`Command stopMotion called`);
    });

    this.coverLiftTilt?.addCommandHandler('downOrClose', async () => {
      await this.coverLiftTilt?.setWindowCoveringCurrentTargetStatus(10000, 10000, WindowCovering.MovementStatus.Stopped);
      this.coverLiftTilt?.log.info(`Command downOrClose called`);
    });

    this.coverLiftTilt?.addCommandHandler('upOrOpen', async () => {
      await this.coverLiftTilt?.setWindowCoveringCurrentTargetStatus(0, 0, WindowCovering.MovementStatus.Stopped);
      this.coverLiftTilt?.log.info(`Command upOrOpen called`);
    });

    this.coverLiftTilt?.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      await this.coverLiftTilt?.setWindowCoveringCurrentTargetStatus(liftPercent100thsValue, liftPercent100thsValue, WindowCovering.MovementStatus.Stopped);
      this.coverLiftTilt?.log.info(`Command goToLiftPercentage ${liftPercent100thsValue} called`);
    });

    this.coverLiftTilt?.addCommandHandler('goToTiltPercentage', async ({ request: { tiltPercent100thsValue } }) => {
      const position = this.coverLiftTilt?.getAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.coverLiftTilt?.log);
      await this.coverLiftTilt?.setWindowCoveringTargetAndCurrentPosition(position, tiltPercent100thsValue);
      this.coverLiftTilt?.log.info(`Command goToTiltPercentage ${tiltPercent100thsValue} called`);
    });

    // *********************** Create a lock device ***********************
    this.lock = new MatterbridgeEndpoint([doorLockDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Lock' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Lock', '0x96352164', 0xfff1, 'Matterbridge', 'Matterbridge Lock')
      .createDefaultDoorLockClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(30);

    this.lock = await this.addDevice(this.lock);

    this.lock?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.lock?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.lock?.addCommandHandler('lockDoor', async () => {
      await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Locked, this.lock?.log);
      this.lock?.log.info('Command lockDoor called');
    });
    this.lock?.addCommandHandler('unlockDoor', async () => {
      await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Unlocked, this.lock?.log);
      this.lock?.log.info('Command unlockDoor called');
    });

    // *********************** Create a thermostat with AutoMode device ***********************
    this.thermoAuto = new MatterbridgeEndpoint([thermostatDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Thermostat (AutoMode)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (AutoMode)', '0x96382164A', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat')
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 4700);

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

    this.thermoAuto?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoAuto?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoAuto?.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoAuto?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    this.thermoAuto?.addCommandHandler('setpointRaiseLower', async ({ request: { mode, amount } }) => {
      const lookupSetpointAdjustMode = ['Heat', 'Cool', 'Both'];
      this.thermoAuto?.log.info(`Command setpointRaiseLower called with mode: ${lookupSetpointAdjustMode[mode]} amount: ${amount / 10}`);
      if (mode === Thermostat.SetpointRaiseLowerMode.Heat || mode === Thermostat.SetpointRaiseLowerMode.Both) {
        const setpoint = this.thermoAuto?.getAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', this.thermoAuto?.log) / 100 + amount / 10;
        await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'occupiedHeatingSetpoint', setpoint * 100, this.thermoAuto?.log);
        this.thermoAuto?.log.info('Set occupiedHeatingSetpoint:', setpoint);
      }
      if (mode === Thermostat.SetpointRaiseLowerMode.Cool || mode === Thermostat.SetpointRaiseLowerMode.Both) {
        const setpoint = this.thermoAuto?.getAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', this.thermoAuto?.log) / 100 + amount / 10;
        await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'occupiedCoolingSetpoint', setpoint * 100, this.thermoAuto?.log);
        this.thermoAuto?.log.info('Set occupiedCoolingSetpoint:', setpoint);
      }
    });
    await this.thermoAuto?.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoAuto?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoAuto.log,
    );
    await this.thermoAuto?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedHeatingSetpoint',
      (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );
    await this.thermoAuto?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedCoolingSetpoint',
      (value) => {
        this.thermoAuto?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoAuto.log,
    );

    // *********************** Create a thermostat with Heat device ***********************
    this.thermoHeat = new MatterbridgeEndpoint([thermostatDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Thermostat (Heat)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (Heat)', '0x96382164H', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat')
      .createDefaultHeatingThermostatClusterServer(20, 18, 5, 35)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(70, PowerSource.BatChargeLevel.Ok, 6010, 'AA 1.5V', 4);

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

    this.thermoHeat?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoHeat?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoHeat?.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoHeat?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    await this.thermoHeat?.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoHeat?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoHeat.log,
    );
    await this.thermoHeat?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedHeatingSetpoint',
      (value) => {
        this.thermoHeat?.log.info('Subscribe occupiedHeatingSetpoint called with:', value / 100);
      },
      this.thermoHeat.log,
    );

    // *********************** Create a thermostat with Cool device ***********************
    this.thermoCool = new MatterbridgeEndpoint([thermostatDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Thermostat (Cool)' }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer('Thermostat (Cool)', '0x96382164C', 0xfff1, 'Matterbridge', 'Matterbridge Thermostat')
      .createDefaultCoolingThermostatClusterServer(20, 18, 5, 35)
      .createDefaultPowerSourceReplaceableBatteryClusterServer(40, PowerSource.BatChargeLevel.Ok, 5080, 'AA 1.5V', 4);

    this.thermoCool = await this.addDevice(this.thermoCool);

    this.thermoCool?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.thermoCool?.log.info(`Command identify called identifyTime ${identifyTime}`);
    });
    this.thermoCool?.addCommandHandler('triggerEffect', async ({ request: { effectIdentifier, effectVariant } }) => {
      this.thermoCool?.log.info(`Command identify called effectIdentifier ${effectIdentifier} effectVariant ${effectVariant}`);
    });
    await this.thermoCool?.subscribeAttribute(
      ThermostatCluster.id,
      'systemMode',
      (value) => {
        const lookupSystemMode = ['Off', 'Auto', '', 'Cool', 'Heat', 'EmergencyHeat', 'Precooling', 'FanOnly', 'Dry', 'Sleep'];
        this.thermoCool?.log.info('Subscribe systemMode called with:', lookupSystemMode[value]);
      },
      this.thermoCool.log,
    );
    await this.thermoCool?.subscribeAttribute(
      ThermostatCluster.id,
      'occupiedCoolingSetpoint',
      (value) => {
        this.thermoCool?.log.info('Subscribe occupiedCoolingSetpoint called with:', value / 100);
      },
      this.thermoCool.log,
    );

    // *********************** Create a airPurifier device ***********************
    this.airPurifier = new MatterbridgeEndpoint(
      [airPurifier, temperatureSensor, humiditySensor, bridgedNode, powerSource],
      { uniqueStorageKey: 'Air purifier' },
      this.config.debug as boolean,
    )
      .createDefaultBridgedDeviceBasicInformationClusterServer('Air purifier', '0x96584864AP', 0xfff1, 'Matterbridge', 'Matterbridge Air purifier')
      .createDefaultIdentifyClusterServer()
      .createDefaultFanControlClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(20 * 100)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultActivatedCarbonFilterMonitoringClusterServer()
      .createDefaultHepaFilterMonitoringClusterServer();

    this.airPurifier = await this.addDevice(this.airPurifier);

    this.airPurifier?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airPurifier?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    // Apple sends Off and High
    await this.airPurifier?.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) => {
        this.airPurifier?.log.info(
          `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
        if (context.offline === true) return; // Do not set attributes when offline
        if (newValue === FanControl.FanMode.Off) {
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentSettings', 0, this.airPurifier?.log);
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentSettings', 33, this.airPurifier?.log);
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 33, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentSettings', 66, this.airPurifier?.log);
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 66, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.High) {
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentSettings', 100, this.airPurifier?.log);
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.airPurifier?.log);
        } else if (newValue === FanControl.FanMode.On) {
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentSettings', 100, this.airPurifier?.log);
          this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.airPurifier?.log);
        }
      },
      this.airPurifier.log,
    );
    await this.airPurifier?.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) => {
        this.airPurifier?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.offline === true ? 'offline' : 'online'}`);
        if (context.offline === true) return; // Do not set attributes when offline
        if (isValidNumber(newValue, 0, 100)) this.airPurifier?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.airPurifier?.log);
      },
      this.airPurifier.log,
    );

    // *********************** Create a airConditioner device ***********************
    this.airConditioner = new MatterbridgeEndpoint([airConditioner, bridgedNode, powerSource], { uniqueStorageKey: 'Air Conditioner' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Air Conditioner', '0x96382864AC', 0xfff1, 'Matterbridge', 'Matterbridge Air Conditioner')
      .createDefaultIdentifyClusterServer()
      .createDeadFrontOnOffClusterServer(true)
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultFanControlClusterServer(FanControl.FanMode.Auto)
      .createDefaultTemperatureMeasurementClusterServer(20 * 100)
      .createDefaultRelativeHumidityMeasurementClusterServer(50 * 100)
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.airConditioner = await this.addDevice(this.airConditioner);

    this.airConditioner?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.airConditioner?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.airConditioner?.addCommandHandler('on', async () => {
      this.airConditioner?.log.info('Command on called');
      await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 20 * 100, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.airConditioner?.log);
      // await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'speedSetting', 50, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.airConditioner?.log);
    });
    this.airConditioner?.addCommandHandler('off', async () => {
      this.airConditioner?.log.info('Command off called');
      await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', null, this.airConditioner?.log);
      // await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'speedSetting', null, this.airConditioner?.log);
      await this.airConditioner?.setAttribute(FanControl.Cluster.id, 'percentSetting', null, this.airConditioner?.log);
    });

    // *********************** Create a pumpDevice device ***********************
    this.pump = new MatterbridgeEndpoint([pumpDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Pump' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Pump', '0x96382864PUMP', 0xfff1, 'Matterbridge', 'Matterbridge Pump')
      .createDefaultIdentifyClusterServer()
      .createOnOffClusterServer()
      .createLevelControlClusterServer()
      .createDefaultPumpConfigurationAndControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();

    this.pump = await this.addDevice(this.pump);

    this.pump?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.pump?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });
    this.pump?.addCommandHandler('on', async () => {
      this.pump?.log.info('Command on called');
    });
    this.pump?.addCommandHandler('off', async () => {
      this.pump?.log.info('Command off called');
    });
    this.pump?.addCommandHandler('moveToLevel', async ({ request: { level } }) => {
      this.pump?.log.info(`Command moveToLevel called request: ${level}`);
    });
    this.pump?.addCommandHandler('moveToLevelWithOnOff', async ({ request: { level } }) => {
      this.pump?.log.info(`Command moveToLevelWithOnOff called request: ${level}`);
    });

    // *********************** Create a waterValve device ***********************
    this.valve = new MatterbridgeEndpoint([waterValve, bridgedNode, powerSource], { uniqueStorageKey: 'Water valve' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Water valve', '0x96382864WV', 0xfff1, 'Matterbridge', 'Matterbridge Water valve')
      .createDefaultIdentifyClusterServer()
      .createDefaultValveConfigurationAndControlClusterServer()
      .createDefaultPowerSourceWiredClusterServer();

    this.valve = await this.addDevice(this.valve);

    this.valve?.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.valve?.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    // *********************** Create a default off low medium high auto fan device ***********************
    this.fanDefault = new MatterbridgeEndpoint([fanDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Fan off low medium high auto' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan', 'FAN_980545631228', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .addRequiredClusterServers();

    this.fanDefault = await this.addDevice(this.fanDefault);

    await this.fanDefault?.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) => {
        this.fanDefault?.log.info(
          `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
        if (context.offline === true) return; // Do not set attributes when offline
        if (newValue === FanControl.FanMode.Off) {
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fanDefault?.log);
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fanDefault?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', 33, this.fanDefault?.log);
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 33, this.fanDefault?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', 66, this.fanDefault?.log);
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 66, this.fanDefault?.log);
        } else if (newValue === FanControl.FanMode.High) {
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fanDefault?.log);
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fanDefault?.log);
        } else if (newValue === FanControl.FanMode.On) {
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fanDefault?.log);
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fanDefault?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.fanDefault?.log);
          this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 50, this.fanDefault?.log);
        }
      },
      this.fanDefault.log,
    );
    await this.fanDefault?.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) => {
        this.fanDefault?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.offline === true ? 'offline' : 'online'}`);
        if (context.offline === true) return; // Do not set attributes when offline
        if (isValidNumber(newValue, 0, 100)) this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.fanDefault?.log);
      },
      this.fanDefault.log,
    );

    // *********************** Create a base fan device ***********************
    this.fanBase = new MatterbridgeEndpoint([fanDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Fan off low medium high' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan base', 'FANB_980545631228', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .createBaseFanControlClusterServer()
      .addRequiredClusterServers();

    this.fanBase = await this.addDevice(this.fanBase);

    await this.fanBase?.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) => {
        this.fanBase?.log.info(
          `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
        if (context.offline === true) return; // Do not set attributes when offline
        if (newValue === FanControl.FanMode.Off) {
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fanBase?.log);
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fanBase?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentSetting', 33, this.fanBase?.log);
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 33, this.fanBase?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentSetting', 66, this.fanBase?.log);
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 66, this.fanBase?.log);
        } else if (newValue === FanControl.FanMode.High) {
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fanBase?.log);
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fanBase?.log);
        } else if (newValue === FanControl.FanMode.On) {
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fanBase?.log);
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fanBase?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.fanBase?.log);
          this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 50, this.fanBase?.log);
        }
      },
      this.fanBase.log,
    );
    await this.fanBase?.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) => {
        this.fanBase?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.offline === true ? 'offline' : 'online'}`);
        if (context.offline === true) return; // Do not set attributes when offline
        if (isValidNumber(newValue, 0, 100)) this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.fanBase?.log);
      },
      this.fanBase.log,
    );

    // *********************** Create a On High fan device ***********************
    this.fanOnHigh = new MatterbridgeEndpoint([fanDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Fan off high' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan off high', 'FANOH_980545631228', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .createOnOffFanControlClusterServer()
      .addRequiredClusterServers();

    this.fanOnHigh = await this.addDevice(this.fanOnHigh);

    await this.fanOnHigh?.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) => {
        this.fanOnHigh?.log.info(
          `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
        if (context.offline === true) return; // Do not set attributes when offline
        if (newValue === FanControl.FanMode.Off) {
          this.fanOnHigh?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fanOnHigh?.log);
          this.fanOnHigh?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fanOnHigh?.log);
        } else if (newValue === FanControl.FanMode.High) {
          this.fanOnHigh?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fanOnHigh?.log);
          this.fanOnHigh?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fanOnHigh?.log);
        }
      },
      this.fanOnHigh.log,
    );
    await this.fanOnHigh?.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) => {
        this.fanOnHigh?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.offline === true ? 'offline' : 'online'}`);
        if (context.offline === true) return; // Do not set attributes when offline
        if (isValidNumber(newValue, 0, 100)) {
          if (newValue > 0) newValue = 100; // OnOff fan control only supports 0 and 100
          this.fanOnHigh?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.fanOnHigh?.log);
          this.fanOnHigh?.setAttribute(FanControl.Cluster.id, 'percentSetting', newValue, this.fanOnHigh?.log);
        }
      },
      this.fanOnHigh.log,
    );

    // ******************** Create a complete fan device ********************
    this.fanComplete = new MatterbridgeEndpoint([fanDevice, bridgedNode, powerSource], { uniqueStorageKey: 'Fan complete' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Fan complete', 'FANC_980995631228', 0xfff1, 'Matterbridge', 'Matterbridge Fan')
      .createDefaultPowerSourceWiredClusterServer()
      .createCompleteFanControlClusterServer()
      .addRequiredClusterServers();

    this.fanComplete = await this.addDevice(this.fanComplete);

    await this.fanComplete?.subscribeAttribute(
      FanControl.Cluster.id,
      'fanMode',
      (newValue: FanControl.FanMode, oldValue: FanControl.FanMode, context) => {
        this.fanComplete?.log.info(
          `Fan mode changed from ${this.fanModeLookup[oldValue]} to ${this.fanModeLookup[newValue]} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
        if (context.offline === true) return; // Do not set attributes when offline
        if (newValue === FanControl.FanMode.Off) {
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fanComplete?.log);
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fanComplete?.log);
        } else if (newValue === FanControl.FanMode.Low) {
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', 33, this.fanComplete?.log);
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 33, this.fanComplete?.log);
        } else if (newValue === FanControl.FanMode.Medium) {
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', 66, this.fanComplete?.log);
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 66, this.fanComplete?.log);
        } else if (newValue === FanControl.FanMode.High) {
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fanComplete?.log);
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fanComplete?.log);
        } else if (newValue === FanControl.FanMode.On) {
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', 100, this.fanComplete?.log);
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 100, this.fanComplete?.log);
        } else if (newValue === FanControl.FanMode.Auto) {
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', 50, this.fanComplete?.log);
          this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 50, this.fanComplete?.log);
        }
      },
      this.fanComplete?.log,
    );
    await this.fanComplete?.subscribeAttribute(
      FanControl.Cluster.id,
      'percentSetting',
      (newValue: number | null, oldValue: number | null, context) => {
        this.fanComplete?.log.info(`Percent setting changed from ${oldValue} to ${newValue} context: ${context.offline === true ? 'offline' : 'online'}`);
        if (context.offline === true) return; // Do not set attributes when offline
        if (isValidNumber(newValue, 0, 100)) this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', newValue, this.fanComplete?.log);
      },
      this.fanComplete?.log,
    );
    await this.fanComplete?.subscribeAttribute(
      FanControl.Cluster.id,
      'rockSetting',
      (newValue: object, oldValue: object, context) => {
        this.fanComplete?.log.info(
          `Rock setting changed from ${debugStringify(oldValue)} to ${debugStringify(newValue)} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
      },
      this.fanComplete?.log,
    );
    await this.fanComplete?.subscribeAttribute(
      FanControl.Cluster.id,
      'windSetting',
      (newValue: object, oldValue: object, context) => {
        this.fanComplete?.log.info(
          `Wind setting changed from ${debugStringify(oldValue)} to ${debugStringify(newValue)} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
      },
      this.fanComplete?.log,
    );
    await this.fanComplete?.subscribeAttribute(
      FanControl.Cluster.id,
      'airflowDirection',
      (newValue: number, oldValue: number, context) => {
        this.fanComplete?.log.info(
          `Airflow direction changed from ${this.fanDirectionLookup[oldValue]} to ${this.fanDirectionLookup[newValue]} context: ${context.offline === true ? 'offline' : 'online'}`,
        );
      },
      this.fanComplete?.log,
    );

    // *********************** Create a waterLeakDetector device ***********************
    this.waterLeak = new MatterbridgeEndpoint([waterLeakDetector, bridgedNode, powerSource], { uniqueStorageKey: 'Water leak detector' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Water leak detector', 'serial_98745631222', 0xfff1, 'Matterbridge', 'Matterbridge WaterLeakDetector')
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();

    this.waterLeak = await this.addDevice(this.waterLeak);

    // *********************** Create a waterFreezeDetector device ***********************
    this.waterFreeze = new MatterbridgeEndpoint([waterFreezeDetector, bridgedNode, powerSource], { uniqueStorageKey: 'Water freeze detector' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Water freeze detector', 'serial_98745631223', 0xfff1, 'Matterbridge', 'Matterbridge WaterFreezeDetector')
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .addRequiredClusterServers()
      .addOptionalClusterServers();

    this.waterFreeze = await this.addDevice(this.waterFreeze);

    // *********************** Create a rainSensor device ***********************
    this.rain = new MatterbridgeEndpoint([rainSensor, bridgedNode, powerSource], { uniqueStorageKey: 'Rain sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Rain sensor', 'serial_98745631224', 0xfff1, 'Matterbridge', 'Matterbridge RainSensor')
      .createDefaultPowerSourceRechargeableBatteryClusterServer()
      .createDefaultIdentifyClusterServer()
      .createDefaultBooleanStateClusterServer(false)
      .createDefaultBooleanStateConfigurationClusterServer();

    this.rain = await this.addDevice(this.rain);

    // *********************** Create a smokeCoAlarm device ***********************
    this.smokeCo = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { uniqueStorageKey: 'SmokeCo alarm sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('SmokeCo alarm sensor', 'serial_94745631225', 0xfff1, 'Matterbridge', 'Matterbridge SmokeCoAlarm')
      .createDefaultIdentifyClusterServer()
      .createDefaultSmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer()
      .createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(100);

    this.smokeCo = await this.addDevice(this.smokeCo);

    // *********************** Create a smokeCoAlarm smoke only device ***********************
    this.smokeOnly = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { uniqueStorageKey: 'Smoke alarm sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Smoke alarm sensor', 'serial_94755661225', 0xfff1, 'Matterbridge', 'Matterbridge SmokeCoAlarm')
      .createDefaultIdentifyClusterServer()
      .createSmokeOnlySmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer();

    this.smokeOnly = await this.addDevice(this.smokeOnly);

    // *********************** Create a smokeCoAlarm co only device ***********************
    this.coOnly = new MatterbridgeEndpoint([smokeCoAlarm, bridgedNode, powerSource], { uniqueStorageKey: 'Co alarm sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Co alarm sensor', 'serial_947456317488', 0xfff1, 'Matterbridge', 'Matterbridge SmokeCoAlarm')
      .createDefaultIdentifyClusterServer()
      .createCoOnlySmokeCOAlarmClusterServer(SmokeCoAlarm.AlarmState.Normal)
      .createDefaultPowerSourceReplaceableBatteryClusterServer()
      .createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(100);

    this.coOnly = await this.addDevice(this.coOnly);

    // *********************** Create an airQuality device ***********************
    this.airQuality = new MatterbridgeEndpoint([airQualitySensor, bridgedNode, powerSource], { uniqueStorageKey: 'Air quality sensor' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Air quality sensor', 'serial_987484318322', 0xfff1, 'Matterbridge', 'Matterbridge Air Quality Sensor')
      .createDefaultPowerSourceReplaceableBatteryClusterServer(50, PowerSource.BatChargeLevel.Warning, 2900, 'CR2450', 1)
      .addRequiredClusterServers()
      .addClusterServers([TemperatureMeasurement.Cluster.id, RelativeHumidityMeasurement.Cluster.id])
      .createDefaultCarbonMonoxideConcentrationMeasurementClusterServer(10)
      .createDefaultCarbonDioxideConcentrationMeasurementClusterServer(400)
      .createDefaultNitrogenDioxideConcentrationMeasurementClusterServer(1)
      .createDefaultOzoneConcentrationMeasurementClusterServer(1)
      .createDefaultFormaldehydeConcentrationMeasurementClusterServer(1, ConcentrationMeasurement.MeasurementUnit.Ugm3)
      .createDefaultPm1ConcentrationMeasurementClusterServer(100, ConcentrationMeasurement.MeasurementUnit.Ugm3)
      .createDefaultPm25ConcentrationMeasurementClusterServer(100, ConcentrationMeasurement.MeasurementUnit.Ugm3)
      .createDefaultPm10ConcentrationMeasurementClusterServer(100, ConcentrationMeasurement.MeasurementUnit.Ugm3)
      .createDefaultRadonConcentrationMeasurementClusterServer(100, ConcentrationMeasurement.MeasurementUnit.Ugm3)
      .createDefaultTvocMeasurementClusterServer(100, ConcentrationMeasurement.MeasurementUnit.Ugm3);

    this.airQuality = await this.addDevice(this.airQuality);

    // *********************** Create a momentary switch ***********************
    this.momentarySwitch = new MatterbridgeEndpoint([bridgedNode, powerSource], { uniqueStorageKey: 'Momentary switch composed' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        'Momentary switch  (Top-1 Middle-2 Bottom-3)',
        'serial_947942331225',
        0xfff1,
        'Matterbridge',
        'Matterbridge MomentarySwitch',
      )
      .createDefaultIdentifyClusterServer()
      .createDefaultPowerSourceReplaceableBatteryClusterServer(50, PowerSource.BatChargeLevel.Ok, 2900, 'CR2450', 1);

    this.momentarySwitch
      .addChildDeviceType('Momentary switch 1', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.One.namespaceId, tag: NumberTag.One.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultSwitchClusterServer();

    this.momentarySwitch
      .addChildDeviceType('Momentary switch 2', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Two.namespaceId, tag: NumberTag.Two.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Middle.namespaceId, tag: PositionTag.Middle.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultSwitchClusterServer();

    this.momentarySwitch
      .addChildDeviceType('Momentary switch 3', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Three.namespaceId, tag: NumberTag.Three.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultSwitchClusterServer();

    const switch4 = this.momentarySwitch
      .addChildDeviceType('Momentary switch 4', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Four.namespaceId, tag: NumberTag.Four.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: null },
          { mfgCode: null, namespaceId: SwitchesTag.Custom.namespaceId, tag: SwitchesTag.Custom.tag, label: 'Turn on' },
          { mfgCode: null, namespaceId: LocationTag.Indoor.namespaceId, tag: LocationTag.Indoor.tag, label: null },
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
          { mfgCode: null, namespaceId: SwitchesTag.Custom.namespaceId, tag: SwitchesTag.Custom.tag, label: 'Turn off' },
          { mfgCode: null, namespaceId: LocationTag.Indoor.namespaceId, tag: LocationTag.Indoor.tag, label: null },
          { mfgCode: null, namespaceId: AreaNamespaceTag.Bedroom.namespaceId, tag: AreaNamespaceTag.Bedroom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultMomentarySwitchClusterServer();

    const switch6 = this.momentarySwitch
      .addChildDeviceType('Momentary switch 6', [genericSwitch], {
        tagList: [
          { mfgCode: null, namespaceId: NumberTag.Seven.namespaceId, tag: NumberTag.Seven.tag, label: null },
          { mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: null },
          { mfgCode: null, namespaceId: SwitchesTag.Custom.namespaceId, tag: SwitchesTag.Custom.tag, label: 'Toggle' },
          { mfgCode: null, namespaceId: LocationTag.Indoor.namespaceId, tag: LocationTag.Indoor.tag, label: null },
          { mfgCode: null, namespaceId: AreaNamespaceTag.Bedroom.namespaceId, tag: AreaNamespaceTag.Bedroom.tag, label: null },
        ],
      })
      .createDefaultIdentifyClusterServer()
      .createDefaultMomentarySwitchClusterServer();

    this.momentarySwitch = await this.addDevice(this.momentarySwitch);

    if (this.momentarySwitch) {
      // No effect so far on any controller
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
    this.latchingSwitch = new MatterbridgeEndpoint([genericSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Latching switch' }, this.config.debug as boolean)
      .createDefaultBridgedDeviceBasicInformationClusterServer('Latching switch', 'serial_947442331225', 0xfff1, 'Matterbridge', 'Matterbridge LatchingSwitch')
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
      'Robot Vacuum',
      'RVC1238777820',
      this.config.enableServerRvc === true ? 'server' : undefined,
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
    if (this.config.enableServerRvc === true) {
      this.log.notice('RVC is in server mode');
    }
    this.roboticVacuum = await this.addDevice(this.roboticVacuum);

    // *********************** Create a water heater ***************************
    this.waterHeater = new WaterHeater('Water Heater', 'WH3456177820', 50, 60, 20, 80, undefined, 85, 220_000, 1_000, 220_000, 12_000_000, 500_000, 3_000_000);
    this.waterHeater = await this.addDevice(this.waterHeater);

    // *********************** Create an Evse ***************************
    this.evse = new Evse(
      'Evse',
      'EV3456127820',
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
      'SP3456127821',
      220_000, // 220 volt
      10_000, // 10 ampere
      2200_000, // 2200 watt
      2_200_000, // 2.2 kWh
      -10_000_000, // -10 kWh
      500_000, // 500 Wh
    );
    this.solarPower = await this.addDevice(this.solarPower);

    // *********************** Create a BatteryStorage **************************
    this.batteryStorage = new BatteryStorage(
      'Battery Storage',
      'BS3456127822',
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
      'HP1234567890',
      220_000, // 220 volt
      10_000, // 10 ampere
      2_200_000, // 2200 watt
      1_000_000, // 1 kWh
      500_000, // 500 watt
      3_000_000, // 3 kWh
    );
    this.heatPump = await this.addDevice(this.heatPump);

    // *********************** Create a LaundryWasher **************************
    this.laundryWasher = new LaundryWasher('Laundry Washer', 'LW1234567890');
    this.laundryWasher = await this.addDevice(this.laundryWasher);

    // *********************** Create a LaundryDryer **************************
    this.laundryDryer = new LaundryDryer('Laundry Dryer', 'LDW1235227890');
    this.laundryDryer = await this.addDevice(this.laundryDryer);

    // *********************** Create a Dishwasher **************************
    this.dishwasher = new Dishwasher('Dishwasher', 'DW1234567890');
    this.dishwasher = await this.addDevice(this.dishwasher);

    // *********************** Create an Extractor Hood **************************
    this.extractorHood = new ExtractorHood('Extractor Hood', 'EH1234567893');
    this.extractorHood = await this.addDevice(this.extractorHood);

    // *********************** Create the appliances **************************
    const refrigeratorDevice = new Appliances(refrigerator, 'Refrigerator', 'RE9987654322');
    refrigeratorDevice.addFixedLabel('composed', 'Refrigerator');
    await this.addDevice(refrigeratorDevice);

    const ovenDevice = new Appliances(oven, 'Oven', 'OV1298867891');
    ovenDevice.addFixedLabel('composed', 'Oven');
    await this.addDevice(ovenDevice);

    const microwaveOvenDevice = new Appliances(microwaveOven, 'Microwave Oven', 'MO1234567892');
    await this.addDevice(microwaveOvenDevice);

    const cooktopDevice = new Appliances(cooktop, 'Cooktop', 'CT1255887894');
    await this.addDevice(cooktopDevice);
  }

  override async onConfigure() {
    await super.onConfigure();
    this.log.info('onConfigure called');

    // Set switch to off
    await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.switch.log);
    await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitch.log);
    this.switch?.log.info(`Set switch initial onOff to ${this.intervalOnOff}`);
    if (this.config.useInterval) {
      // Toggle switch onOff every minute
      this.switchInterval = setInterval(
        async () => {
          await this.switch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.switch.log);
          await this.mountedOnOffSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.mountedOnOffSwitch.log);
          this.log.info(`Set switches onOff to ${this.intervalOnOff}`);
          this.intervalOnOff = !this.intervalOnOff;
        },
        60 * 1000 + 100,
      );
    }

    // Set light on/off to off
    await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff.log);
    this.lightOnOff?.log.info('Set light initial onOff to false.');

    // Set dimmer on/off to off
    await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
    await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 1, this.dimmer.log);
    await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedDimmerSwitch.log);
    await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 1, this.mountedDimmerSwitch.log);
    this.dimmer?.log.info(`Set dimmer initial onOff to false, currentLevel to 1.`);

    // Set light to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light.log);
    await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 200, this.light.log);
    await this.light?.setAttribute(ColorControl.Cluster.id, 'currentHue', 0, this.light.log);
    await this.light?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', 128, this.light.log);
    await this.light?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.light?.log.info('Set light initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light XY to true, level to 100% and XY to red
    await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY.log);
    await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 254, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentX', 0.7006 * 65536, this.lightXY.log);
    await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'currentY', 0.2993 * 65536, this.lightXY.log);
    await this.lightXY?.configureColorControlMode(ColorControl.ColorMode.CurrentXAndCurrentY);
    this.lightXY?.log.info('Set light XY initial onOff to true, currentLevel to 254, X to 0.7006 and Y to 0.2993.');

    // Set light HS to off, level to 0 and hue to 0 and saturation to 50% (pink color)
    await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS.log);
    await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 1, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentHue', 0, this.lightHS.log);
    await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'currentSaturation', 128, this.lightHS.log);
    await this.lightHS?.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
    this.lightHS?.log.info('Set light HS initial onOff to false, currentLevel to 1, hue to 0 and saturation to 50%.');

    // Set light CT to true, level to 50% and colorTemperatureMireds to 250
    await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT.log);
    await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', 128, this.lightCT.log);
    await this.lightCT?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', 250, this.lightCT.log);
    await this.lightCT?.configureColorControlMode(ColorControl.ColorMode.ColorTemperatureMireds);
    this.lightCT?.log.info('Set light CT initial onOff to true, currentLevel to 128, colorTemperatureMireds to 250.');

    if (this.config.useInterval) {
      this.lightInterval = setInterval(
        async () => {
          this.intervalLevel += 10;
          if (this.intervalLevel >= 250) {
            this.intervalLevel = 0;
            await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightOnOff.log);
            await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.mountedDimmerSwitch.log);
            await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.light.log);
            await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.lightCT.log);
            this.log.info('Set lights onOff to false');
          } else {
            await this.lightOnOff?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightOnOff?.log);
            await this.dimmer?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.mountedDimmerSwitch.log);
            await this.light?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.light.log);
            await this.lightXY?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightXY.log);
            await this.lightHS?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightHS.log);
            await this.lightCT?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.lightCT.log);
            this.log.info('Set lights onOff to true');
            await this.dimmer?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.dimmer.log);
            await this.mountedDimmerSwitch?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.mountedDimmerSwitch.log);
            await this.light?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.light.log);
            await this.lightXY?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.lightXY.log);
            await this.lightHS?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.lightHS.log);
            await this.lightCT?.setAttribute(LevelControl.Cluster.id, 'currentLevel', this.intervalLevel, this.lightCT.log);
            this.log.info(`Set lights currentLevel to ${this.intervalLevel}`);
          }
          this.intervalColorTemperature += 50;
          if (this.intervalColorTemperature > 500) {
            this.intervalColorTemperature = 147;
          }
          await this.light?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.light.log);
          await this.lightHS?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightHS.log);
          await this.lightXY?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightXY.log);
          await this.lightCT?.setAttribute(ColorControl.Cluster.id, 'colorTemperatureMireds', this.intervalColorTemperature, this.lightCT.log);
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
    await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.outlet.log);
    this.outlet?.log.info('Set outlet initial onOff to false');
    if (this.config.useInterval) {
      // Toggle outlet onOff every minute
      this.outletInterval = setInterval(
        async () => {
          const state = this.outlet?.getAttribute(OnOff.Cluster.id, 'onOff', this.outlet.log);
          if (isValidBoolean(state)) {
            await this.outlet?.setAttribute(OnOff.Cluster.id, 'onOff', !state, this.outlet.log);
            this.outlet?.log.info(`Set outlet onOff to ${!state}`);
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
      this.coverInterval = setInterval(
        async () => {
          let position = this.coverLift?.getAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.coverLift.log);
          if (isValidNumber(position, 0, 10000)) {
            position = position > 9000 ? 0 : position + 1000;
            await this.coverLift?.setAttribute(WindowCovering.Cluster.id, 'targetPositionLiftPercent100ths', position, this.coverLift.log);
            await this.coverLift?.setAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', position, this.coverLift.log);
            await this.coverLift?.setAttribute(
              WindowCovering.Cluster.id,
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
    await this.lock?.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Locked, this.lock.log);
    this.lock?.log.info('Set lock initial lockState to Locked');
    if (this.config.useInterval) {
      // Toggle lock every minute
      this.lockInterval = setInterval(
        async () => {
          const status = this.lock?.getAttribute(DoorLock.Cluster.id, 'lockState', this.lock.log);
          if (isValidNumber(status, DoorLock.LockState.Locked, DoorLock.LockState.Unlocked)) {
            await this.lock?.setAttribute(
              DoorLock.Cluster.id,
              'lockState',
              status === DoorLock.LockState.Locked ? DoorLock.LockState.Unlocked : DoorLock.LockState.Locked,
              this.lock.log,
            );
            this.lock?.log.info(`Set lock lockState to ${status === DoorLock.LockState.Locked ? 'Locked' : 'Unlocked'}`);
          }
        },
        60 * 1000 + 500,
      );
    }

    // Set local to 16°C
    await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'localTemperature', 16 * 100, this.thermoAuto.log);
    await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'systemMode', Thermostat.SystemMode.Auto, this.thermoAuto.log);
    this.thermoAuto?.log.info('Set thermostat initial localTemperature to 16°C and mode Auto');
    const temperature = this.thermoAuto?.getChildEndpointByName('Temperature');
    await temperature?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 16 * 100, this.thermoAuto?.log);
    const humidity = this.thermoAuto?.getChildEndpointByName('Humidity');
    await humidity?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.thermoAuto?.log);
    const flow = this.thermoAuto?.getChildEndpointByName('Flow');
    await flow?.setAttribute(FlowMeasurement.Cluster.id, 'measuredValue', 10, this.thermoAuto?.log);
    this.thermoAuto?.log.info('Set thermostat ext temperature to 16°C, ext humidity to 50% and ext valve flow to 10');

    if (this.config.useInterval) {
      // Increment localTemperature every minute
      this.thermoInterval = setInterval(
        async () => {
          let temperature = this.thermoAuto?.getAttribute(ThermostatCluster.id, 'localTemperature', this.thermoAuto.log);
          if (isValidNumber(temperature, 1600, 2400)) {
            temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
            await this.thermoAuto?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoAuto.log);

            await this.thermoHeat?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoHeat.log);
            const tempIn = this.thermoHeat?.getChildEndpointByName('TemperatureIN');
            await tempIn?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature - 50, this.thermoHeat?.log);
            const tempOut = this.thermoHeat?.getChildEndpointByName('TemperatureOUT');
            await tempOut?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature - 400, this.thermoHeat?.log);

            await this.thermoCool?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.thermoCool.log);
            const temp = this.thermoCool?.getChildEndpointByName('Temperature');
            await temp?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.thermoCool?.log);
            const humidity = this.thermoCool?.getChildEndpointByName('Humidity');
            await humidity?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.thermoCool?.log);
            const flow = this.thermoCool?.getChildEndpointByName('Flow');
            await flow?.setAttribute(FlowMeasurement.Cluster.id, 'measuredValue', 10, this.thermoCool?.log);
            this.thermoAuto?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
            this.thermoHeat?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
            this.thermoCool?.log.info(`Set thermostat localTemperature to ${temperature / 100}°C`);
          }
        },
        60 * 1000 + 600,
      );
    }

    // Set airConditioner to on
    await this.airConditioner?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.airConditioner.log);
    await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', 2000, this.airConditioner.log);
    if (this.config.useInterval) {
      // Increment airConditioner localTemperature every minute
      this.airConditionerInterval = setInterval(
        async () => {
          let temperature = this.airConditioner?.getAttribute(ThermostatCluster.id, 'localTemperature', this.airConditioner.log);
          if (isValidNumber(temperature, 1600, 2400)) {
            temperature = temperature + 100 > 2400 ? 1600 : temperature + 100;
            await this.airConditioner?.setAttribute(ThermostatCluster.id, 'localTemperature', temperature, this.airConditioner.log);
            await this.airConditioner?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.airConditioner.log);
            await this.airConditioner?.setAttribute(RelativeHumidityMeasurementCluster.id, 'measuredValue', 50 * 100, this.airConditioner.log);
            this.airConditioner?.log.info(`Set airConditioner localTemperature to ${temperature / 100}°C`);
          }
        },
        60 * 1000 + 550,
      );
    }

    // Set fan to auto
    this.fanBase?.log.info('Set fan initial fanMode to Off, percentCurrent and percentSetting to 0');
    await this.fanBase?.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Off, this.fanBase.log);
    await this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fanBase.log);
    await this.fanBase?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fanBase.log);
    await this.fanDefault?.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Auto, this.fanDefault.log);
    await this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fanDefault.log);
    await this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fanDefault.log);
    await this.fanComplete?.setAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Auto, this.fanComplete.log);
    await this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', 0, this.fanComplete.log);
    await this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', 0, this.fanComplete.log);
    if (this.config.useInterval) {
      // Increment fan percentCurrent every minute
      this.fanInterval = setInterval(
        async () => {
          let mode = this.fanBase?.getAttribute(FanControl.Cluster.id, 'fanMode', this.fanBase.log);
          let value = this.fanBase?.getAttribute(FanControl.Cluster.id, 'percentCurrent', this.fanBase.log);
          mode = this.fanDefault?.getAttribute(FanControl.Cluster.id, 'fanMode', this.fanDefault.log);
          value = this.fanDefault?.getAttribute(FanControl.Cluster.id, 'percentCurrent', this.fanDefault.log);
          if (isValidNumber(mode, FanControl.FanMode.Off, FanControl.FanMode.Auto) && mode === FanControl.FanMode.Auto && isValidNumber(value, 0, 100)) {
            value = value + 10 >= 100 ? 0 : value + 10;
            await this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentCurrent', value, this.fanDefault.log);
            await this.fanDefault?.setAttribute(FanControl.Cluster.id, 'percentSetting', value, this.fanDefault.log);
            this.fanDefault?.log.info(`Set fan percentCurrent and percentSetting to ${value}`);
          }
          mode = this.fanComplete?.getAttribute(FanControl.Cluster.id, 'fanMode', this.fanComplete.log);
          value = this.fanComplete?.getAttribute(FanControl.Cluster.id, 'percentCurrent', this.fanComplete.log);
          if (isValidNumber(mode, FanControl.FanMode.Off, FanControl.FanMode.Auto) && mode === FanControl.FanMode.Auto && isValidNumber(value, 0, 100)) {
            value = value + 10 >= 100 ? 0 : value + 10;
            await this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentCurrent', value, this.fanComplete.log);
            await this.fanComplete?.setAttribute(FanControl.Cluster.id, 'percentSetting', value, this.fanComplete.log);
            this.fanComplete?.log.info(`Set fan percentCurrent and percentSetting to ${value}`);
          }
        },
        60 * 1000 + 700,
      );
    }

    // Set waterLeak to false
    await this.waterLeak?.setAttribute(BooleanState.Cluster.id, 'stateValue', false, this.waterLeak.log);
    if (this.config.useInterval) {
      // Toggle waterLeak every minute
      this.waterLeakInterval = setInterval(
        async () => {
          let value = this.waterLeak?.getAttribute(BooleanState.Cluster.id, 'stateValue', this.waterLeak.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.waterLeak?.setAttribute(BooleanState.Cluster.id, 'stateValue', value, this.waterLeak.log);
            this.waterLeak?.log.info(`Set waterLeak stateValue to ${value}`);
          }
        },
        60 * 1000 + 800,
      );
    }

    // Set waterFreeze to false
    await this.waterFreeze?.setAttribute(BooleanState.Cluster.id, 'stateValue', false, this.waterFreeze.log);
    if (this.config.useInterval) {
      // Toggle waterFreeze every minute
      this.waterFreezeInterval = setInterval(
        async () => {
          let value = this.waterFreeze?.getAttribute(BooleanState.Cluster.id, 'stateValue', this.waterFreeze.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.waterFreeze?.setAttribute(BooleanState.Cluster.id, 'stateValue', value, this.waterFreeze.log);
            this.waterFreeze?.log.info(`Set waterFreeze stateValue to ${value}`);
          }
        },
        60 * 1000 + 900,
      );
    }

    // Set rain to false
    await this.rain?.setAttribute(BooleanState.Cluster.id, 'stateValue', false, this.rain.log);
    if (this.config.useInterval) {
      // Toggle rain every minute
      this.rainInterval = setInterval(
        async () => {
          let value = this.rain?.getAttribute(BooleanState.Cluster.id, 'stateValue', this.rain.log);
          if (isValidBoolean(value)) {
            value = !value;
            await this.rain?.setAttribute(BooleanState.Cluster.id, 'stateValue', value, this.rain.log);
            this.rain?.log.info(`Set rain stateValue to ${value}`);
          }
        },
        60 * 1000 + 1000,
      );
    }

    // Set smoke to Normal
    await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smokeCo.log);
    await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.smokeCo.log);
    await this.smokeOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', SmokeCoAlarm.AlarmState.Normal, this.smokeOnly.log);
    await this.coOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', SmokeCoAlarm.AlarmState.Normal, this.coOnly.log);
    if (this.config.useInterval) {
      // Toggle smoke every minute
      this.smokeInterval = setInterval(
        async () => {
          let value = this.smokeCo?.getAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', this.smokeCo.log);
          if (isValidNumber(value, SmokeCoAlarm.AlarmState.Normal, SmokeCoAlarm.AlarmState.Critical)) {
            value = value === SmokeCoAlarm.AlarmState.Normal ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
            await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', value, this.smokeCo.log);
            await this.smokeCo?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', value, this.smokeCo.log);
            await this.smokeOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', value, this.smokeOnly.log);
            await this.coOnly?.setAttribute(SmokeCoAlarm.Cluster.id, 'coState', value, this.coOnly.log);
            this.smokeCo?.log.info(`Set smoke smokeState and coState to ${value}`);
          }
        },
        60 * 1000 + 1100,
      );
    }

    // Set air quality to Normal
    await this.airQuality?.setAttribute(AirQuality.Cluster.id, 'airQuality', AirQuality.AirQualityEnum.Good, this.airQuality.log);
    await this.airQuality?.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', 2150, this.airQuality.log);
    await this.airQuality?.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', 5500, this.airQuality.log);
    await this.airQuality?.setAttribute(CarbonMonoxideConcentrationMeasurement.Cluster.id, 'measuredValue', 10, this.airQuality.log);
    await this.airQuality?.setAttribute(CarbonDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 400, this.airQuality.log);
    await this.airQuality?.setAttribute(NitrogenDioxideConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality?.setAttribute(OzoneConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality?.setAttribute(FormaldehydeConcentrationMeasurement.Cluster.id, 'measuredValue', 1, this.airQuality.log);
    await this.airQuality?.setAttribute(Pm1ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(Pm25ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(Pm10ConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(RadonConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);
    await this.airQuality?.setAttribute(TotalVolatileOrganicCompoundsConcentrationMeasurement.Cluster.id, 'measuredValue', 100, this.airQuality.log);

    if (this.config.useInterval) {
      // Toggle air quality every minute
      this.airQualityInterval = setInterval(
        async () => {
          let value = this.airQuality?.getAttribute(AirQuality.Cluster.id, 'airQuality', this.airQuality?.log);
          if (isValidNumber(value, AirQuality.AirQualityEnum.Good, AirQuality.AirQualityEnum.ExtremelyPoor)) {
            value = value >= AirQuality.AirQualityEnum.ExtremelyPoor ? AirQuality.AirQualityEnum.Good : value + 1;
            await this.airQuality?.setAttribute(AirQuality.Cluster.id, 'airQuality', value, this.airQuality.log);
            this.airQuality?.log.info(`Set air quality to ${value}`);
          }
        },
        60 * 1000 + 1100,
      );
    }

    // Set dead front onOff on for Appliances: brings the appliances out of the "dead front" state
    const airConditionerDevice = this.bridgedDevices.get('Air Conditioner');
    await airConditionerDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, airConditionerDevice.log);

    const laundryWasherDevice = this.bridgedDevices.get('Laundry Washer');
    await laundryWasherDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, laundryWasherDevice.log);

    const laundryDryerDevice = this.bridgedDevices.get('Laundry Dryer');
    await laundryDryerDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, laundryDryerDevice.log);

    const dishwasherDevice = this.bridgedDevices.get('Dishwasher');
    await dishwasherDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, dishwasherDevice.log);
    this.log.info(`Set appliances dead front OnOff to on`);

    // Set onOff only on for Appliances: brings the appliances on
    const cooktopDevice = this.bridgedDevices.get('Cooktop');
    await cooktopDevice?.setAttribute(OnOff.Cluster.id, 'onOff', true, cooktopDevice.log);
    cooktopDevice?.log.info(`Set Cooktop onOff only OnOff to on`);
    const surface1 = cooktopDevice?.getChildEndpointByName('Surface1');
    await surface1?.setAttribute(OnOff.Cluster.id, 'onOff', true, surface1.log);
    surface1?.log.info(`Set Surface 1 onOff only OnOff to on`);
    const surface2 = cooktopDevice?.getChildEndpointByName('Surface2');
    await surface2?.setAttribute(OnOff.Cluster.id, 'onOff', true, surface2.log);
    surface2?.log.info(`Set Surface 2 onOff only OnOff to on`);

    if (this.config.useInterval) {
      // Trigger the switches every minute
      this.genericSwitchLastEvent = 'Release';
      this.genericSwitchInterval = setInterval(
        async () => {
          // console.error('Entering generic switch interval triggered', this.genericSwitchLastEvent);
          if (this.genericSwitchLastEvent === 'Release') {
            this.genericSwitchLastEvent = 'Single';
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch1')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch2')?.triggerSwitchEvent('Double', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch3')?.triggerSwitchEvent('Long', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch4')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch5')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch6')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
          } else if (this.genericSwitchLastEvent === 'Single') {
            this.genericSwitchLastEvent = 'Double';
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch1')?.triggerSwitchEvent('Double', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch2')?.triggerSwitchEvent('Long', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch3')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
          } else if (this.genericSwitchLastEvent === 'Double') {
            this.genericSwitchLastEvent = 'Long';
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch1')?.triggerSwitchEvent('Long', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch2')?.triggerSwitchEvent('Single', this.momentarySwitch?.log);
            await this.momentarySwitch?.getChildEndpointByName('Momentaryswitch3')?.triggerSwitchEvent('Double', this.momentarySwitch?.log);
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

  override async onShutdown(reason?: string) {
    clearInterval(this.switchInterval);
    clearInterval(this.lightInterval);
    clearInterval(this.outletInterval);
    clearInterval(this.coverInterval);
    clearInterval(this.lockInterval);
    clearInterval(this.thermoInterval);
    clearInterval(this.fanInterval);
    clearInterval(this.waterLeakInterval);
    clearInterval(this.waterFreezeInterval);
    clearInterval(this.rainInterval);
    clearInterval(this.smokeInterval);
    clearInterval(this.airQualityInterval);
    clearInterval(this.airConditionerInterval);
    clearInterval(this.genericSwitchInterval);
    await super.onShutdown(reason);
    this.log.info('onShutdown called with reason:', reason ?? 'none');
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices(500);
  }

  async addDevice(device: MatterbridgeEndpoint): Promise<MatterbridgeEndpoint | undefined> {
    if (!device.serialNumber || !device.deviceName) return;
    this.setSelectDevice(device.serialNumber, device.deviceName, undefined, 'hub');
    if (this.validateDevice(device.deviceName)) {
      device.softwareVersion = parseInt(this.version.replace(/\D/g, ''));
      device.softwareVersionString = this.version === '' ? 'Unknown' : this.version;
      device.hardwareVersion = parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, ''));
      device.hardwareVersionString = this.matterbridge.matterbridgeVersion;
      device.softwareVersion = isValidNumber(device.softwareVersion, 0, UINT32_MAX) ? device.softwareVersion : undefined;
      device.softwareVersionString = isValidString(device.softwareVersionString) ? device.softwareVersionString.slice(0, 64) : undefined;
      device.hardwareVersion = isValidNumber(device.hardwareVersion, 0, UINT16_MAX) ? device.hardwareVersion : undefined;
      device.hardwareVersionString = isValidString(device.hardwareVersionString) ? device.hardwareVersionString.slice(0, 64) : undefined;
      const options = device.getClusterServerOptions(BridgedDeviceBasicInformation.Cluster.id);
      if (options) {
        options.softwareVersion = device.softwareVersion || 1;
        options.softwareVersionString = device.softwareVersionString || '1.0.0';
        options.hardwareVersion = device.hardwareVersion || 1;
        options.hardwareVersionString = device.hardwareVersionString || '1.0.0';
      }
      // We need to add bridgedNode device type and BridgedDeviceBasicInformation cluster for single class devices that doesn't add it in childbridge mode.
      if (device.mode === undefined && !device.deviceTypes.has(bridgedNode.code)) {
        device.deviceTypes.set(bridgedNode.code, bridgedNode);
        const options = device.getClusterServerOptions(Descriptor.Cluster.id);
        if (options) {
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
      this.bridgedDevices.set(device.deviceName, device);
      return device;
    } else {
      return undefined;
    }
  }
}
