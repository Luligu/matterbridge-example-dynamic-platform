/**
 * This file contains the class Appliances.
 *
 * @file appliances.ts
 * @author Luca Liguori
 * @version 1.0.0
 * @license Apache-2.0
 *
 * Copyright 2025, 2026 Luca Liguori.
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
  DeviceTypeDefinition,
  MatterbridgeEndpoint,
  MatterbridgeServer,
  MatterbridgeOnOffServer,
  laundryWasher,
  laundryDryer,
  dishwasher,
  refrigerator,
  temperatureControlledCabinetCooler,
  oven,
  temperatureControlledCabinetHeater,
  microwaveOven,
  extractorHood,
  cooktop,
  cookSurface,
  powerSource,
} from 'matterbridge';
import { MaybePromise, PositionTag, RefrigeratorTag } from 'matterbridge/matter';
import {
  OperationalState,
  TemperatureControl,
  DishwasherMode,
  LaundryWasherControls,
  LaundryWasherMode,
  LaundryDryerControls,
  OvenMode,
  ModeBase,
  RefrigeratorAndTemperatureControlledCabinetMode,
  MicrowaveOvenMode,
  MicrowaveOvenControl,
} from 'matterbridge/matter/clusters';
import {
  DishwasherAlarmServer,
  DishwasherModeBehavior,
  LaundryDryerControlsServer,
  LaundryWasherControlsServer,
  LaundryWasherModeBehavior,
  MicrowaveOvenControlBehavior,
  MicrowaveOvenModeServer,
  OvenCavityOperationalStateBehavior,
  OvenModeBehavior,
  RefrigeratorAndTemperatureControlledCabinetModeBehavior,
  TemperatureControlBehavior,
} from 'matterbridge/matter/behaviors';

export class Appliances extends MatterbridgeEndpoint {
  constructor(deviceType: DeviceTypeDefinition, name: string, serial: string) {
    super([deviceType, powerSource], { uniqueStorageKey: `${name}-${serial}` }, true);
    if (deviceType.code === laundryWasher.code) {
      // Laundry Washer
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Laundry Washer');
      this.createDefaultPowerSourceWiredClusterServer();
      this.createDeadFrontOnOffClusterServer();
      // this.createNumberTemperatureControlClusterServer(4000, 2000, 8000, 1000);
      this.createLevelTemperatureControlClusterServer(3, ['Cold', '30°', '40°', '60°', '80°']);
      this.createDefaultLaundryWasherModeClusterServer();
      this.createSpinLaundryWasherControlsClusterServer(3, ['400', '800', '1200', '1600']);
      this.createDefaultOperationalStateClusterServer(OperationalState.OperationalStateEnum.Stopped);
    } else if (deviceType.code === laundryDryer.code) {
      // Laundry Dryer
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Laundry Dryer');
      this.createDefaultPowerSourceWiredClusterServer();
      this.createDeadFrontOnOffClusterServer();
      // this.createNumberTemperatureControlClusterServer(4000, 2000, 8000, 1000);
      this.createLevelTemperatureControlClusterServer(3, ['Cold', '30°', '40°', '60°', '80°']);
      this.createDefaultLaundryWasherModeClusterServer();
      this.createDefaultLaundryDryerControlsClusterServer(1);
      this.createDefaultOperationalStateClusterServer(OperationalState.OperationalStateEnum.Stopped);
    } else if (deviceType.code === dishwasher.code) {
      // Dishwasher (subborted by SmartThings, not supported by Home App)
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Dishwasher');
      this.createDefaultPowerSourceWiredClusterServer();
      this.createDeadFrontOnOffClusterServer();
      // this.createNumberTemperatureControlClusterServer(6000, 2000, 8000, 1000);
      this.createLevelTemperatureControlClusterServer(1, ['Cold', '30°', '40°', '60°']);
      this.createDefaultDishwasherModeClusterServer();
      this.createDefaultDishwasherAlarmClusterServer();
      this.createDefaultOperationalStateClusterServer(OperationalState.OperationalStateEnum.Stopped);
    } else if (deviceType.name === refrigerator.name) {
      // Refrigerator
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Refrigerator');
      this.createDefaultPowerSourceWiredClusterServer();

      // Temperature Controlled Cabinet Cooler
      const refrigerator = this.addChildDeviceType(
        'Refrigerator',
        temperatureControlledCabinetCooler,
        { tagList: [{ mfgCode: null, namespaceId: RefrigeratorTag.Refrigerator.namespaceId, tag: RefrigeratorTag.Refrigerator.tag, label: RefrigeratorTag.Refrigerator.label }] },
        true,
      );
      refrigerator.log.logName = `Refrigerator (cabinet Refrigerator)`;
      refrigerator.createDefaultIdentifyClusterServer();
      Appliances.createLevelTemperatureControlClusterServer(refrigerator, 2, ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']);
      refrigerator.createDefaultTemperatureMeasurementClusterServer(1000);
      Appliances.createDefaultRefrigeratorAndTemperatureControlledCabinetModeClusterServer(refrigerator, 1);

      // Temperature Controlled Cabinet Cooler
      const freezer = this.addChildDeviceType(
        'Freezer',
        temperatureControlledCabinetCooler,
        { tagList: [{ mfgCode: null, namespaceId: RefrigeratorTag.Freezer.namespaceId, tag: RefrigeratorTag.Freezer.tag, label: RefrigeratorTag.Freezer.label }] },
        true,
      );
      freezer.log.logName = `Refrigerator (cabinet Freezer)`;
      freezer.createDefaultIdentifyClusterServer();
      Appliances.createLevelTemperatureControlClusterServer(freezer, 2, ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']);
      freezer.createDefaultTemperatureMeasurementClusterServer(-2000);
      Appliances.createDefaultRefrigeratorAndTemperatureControlledCabinetModeClusterServer(freezer, 1);
    } else if (deviceType.name === oven.name) {
      // Oven
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Oven');
      this.createDefaultPowerSourceWiredClusterServer();

      // Temperature Controlled Cabinet Heater
      const cabinettop = this.addChildDeviceType(
        'Oven (top)',
        temperatureControlledCabinetHeater,
        { tagList: [{ mfgCode: null, namespaceId: PositionTag.Top.namespaceId, tag: PositionTag.Top.tag, label: PositionTag.Top.label }] },
        true,
      );
      cabinettop.log.logName = `Oven (top)`;
      cabinettop.createDefaultIdentifyClusterServer();
      Appliances.createLevelTemperatureControlClusterServer(cabinettop, 2, ['Defrost', '180°', '200°', '250°', '300°']);
      cabinettop.createDefaultTemperatureMeasurementClusterServer(20000);
      Appliances.createDefaultOvenModeClusterServer(cabinettop, 1);

      // Temperature Controlled Cabinet Cooler
      const cabinetbottom = this.addChildDeviceType(
        'Oven (bottom)',
        temperatureControlledCabinetHeater,
        { tagList: [{ mfgCode: null, namespaceId: PositionTag.Bottom.namespaceId, tag: PositionTag.Bottom.tag, label: PositionTag.Bottom.label }] },
        true,
      );
      cabinetbottom.log.logName = `Oven (bottom)`;
      cabinetbottom.createDefaultIdentifyClusterServer();
      Appliances.createLevelTemperatureControlClusterServer(cabinetbottom, 2, ['Defrost', '180°', '200°', '250°', '300°']);
      cabinetbottom.createDefaultTemperatureMeasurementClusterServer(30000);
      Appliances.createDefaultOvenModeClusterServer(cabinetbottom, 1);
    } else if (deviceType.name === microwaveOven.name) {
      // Microwave Oven
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Microwave Oven');
      this.createDefaultPowerSourceWiredClusterServer();
      this.createDefaultOperationalStateClusterServer(OperationalState.OperationalStateEnum.Stopped);
      this.createDefaultMicrowaveOvenModeClusterServer();
      this.createDefaultMicrowaveOvenControlClusterServer();
    } else if (deviceType.name === extractorHood.name) {
      // Extractor Hood
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Extractor Hood');
      this.createDefaultPowerSourceWiredClusterServer();
      this.createBaseFanControlClusterServer();
      this.createDefaultHepaFilterMonitoringClusterServer();
      this.createDefaultActivatedCarbonFilterMonitoringClusterServer();
    } else if (deviceType.name === cooktop.name) {
      // Cooktop
      this.createDefaultIdentifyClusterServer();
      this.createDefaultBasicInformationClusterServer(name, serial, 0xfff1, 'Matterbridge', 0x8000, 'Cooktop');
      this.createDefaultPowerSourceWiredClusterServer();
      this.createOffOnlyOnOffClusterServer(true);

      const cookSurface1 = this.addChildDeviceType(
        'Surface 1',
        cookSurface,
        { tagList: [{ mfgCode: null, namespaceId: PositionTag.Left.namespaceId, tag: PositionTag.Left.tag, label: PositionTag.Left.label }] },
        true,
      );
      cookSurface1.log.logName = `Cook surface (right)`;
      cookSurface1.createDefaultIdentifyClusterServer();
      Appliances.createLevelTemperatureControlClusterServer(cookSurface1, 2, ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']);
      cookSurface1.createDefaultTemperatureMeasurementClusterServer(10000);
      cookSurface1.createOffOnlyOnOffClusterServer(true);

      const cookSurface2 = this.addChildDeviceType(
        'Surface 2',
        cookSurface,
        { tagList: [{ mfgCode: null, namespaceId: PositionTag.Right.namespaceId, tag: PositionTag.Right.tag, label: PositionTag.Right.label }] },
        true,
      );
      cookSurface2.log.logName = `Cook surface (left)`;
      cookSurface2.createDefaultIdentifyClusterServer();
      Appliances.createLevelTemperatureControlClusterServer(cookSurface2, 3, ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']);
      cookSurface2.createDefaultTemperatureMeasurementClusterServer(12000);
      cookSurface2.createOffOnlyOnOffClusterServer(true);

      // Turn off cook surfaces when the cooktop is turned off
      this.eventsOf(MatterbridgeOnOffServer).onOff$Changed.on(async (value) => {
        if (!value) {
          this.log.notice('Turning off all cook surfaces');
          await cookSurface1.setStateOf(MatterbridgeOnOffServer, { onOff: false });
          await cookSurface2.setStateOf(MatterbridgeOnOffServer, { onOff: false });
        }
      });
    }
  }

  /**
   * Creates a default Oven Cavity Operational State Cluster Server.
   *
   * @param {OperationalState.OperationalStateEnum} operationalState - The initial operational state.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultOvenCavityOperationalStateClusterServer(operationalState: OperationalState.OperationalStateEnum = OperationalState.OperationalStateEnum.Stopped): this {
    this.behaviors.require(MatterbridgeOvenCavityOperationalStateServer, {
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
   * @param {MatterbridgeEndpoint} endpoint - The Matterbridge endpoint instance.
   * @param {number} currentMode - The current mode of the oven.
   *
   * @returns {MatterbridgeEndpoint} The current MatterbridgeEndpoint instance for chaining.
   */
  static createDefaultRefrigeratorAndTemperatureControlledCabinetModeClusterServer(endpoint: MatterbridgeEndpoint, currentMode?: number): MatterbridgeEndpoint {
    endpoint.behaviors.require(MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer, {
      supportedModes: [
        { label: 'Auto', mode: 0, modeTags: [{ value: RefrigeratorAndTemperatureControlledCabinetMode.ModeTag.Auto }] },
        { label: 'RapidCool', mode: 1, modeTags: [{ value: RefrigeratorAndTemperatureControlledCabinetMode.ModeTag.RapidCool }] },
        { label: 'RapidFreeze', mode: 2, modeTags: [{ value: RefrigeratorAndTemperatureControlledCabinetMode.ModeTag.RapidFreeze }] },
      ],
      currentMode,
    });
    return endpoint;
  }

  /**
   * Creates a default OvenMode Cluster Server.
   *
   * @param {MatterbridgeEndpoint} endpoint - The Matterbridge endpoint instance.
   * @param {number} currentMode - The current mode of the oven.
   *
   * @returns {MatterbridgeEndpoint} The current MatterbridgeEndpoint instance for chaining.
   */
  static createDefaultOvenModeClusterServer(endpoint: MatterbridgeEndpoint, currentMode?: number): MatterbridgeEndpoint {
    endpoint.behaviors.require(MatterbridgeOvenModeServer, {
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
    return endpoint;
  }

  /**
   * Creates a default Dishwasher Mode Cluster Server.
   *
   * @param {number} currentMode - The current mode of the oven.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultDishwasherModeClusterServer(currentMode?: number): this {
    this.behaviors.require(MatterbridgeDishwasherModeServer, {
      supportedModes: [
        { label: 'Light', mode: 1, modeTags: [{ value: DishwasherMode.ModeTag.Light }] },
        { label: 'Normal', mode: 2, modeTags: [{ value: DishwasherMode.ModeTag.Normal }] },
        { label: 'Heavy', mode: 3, modeTags: [{ value: DishwasherMode.ModeTag.Heavy }] },
      ],
      currentMode,
    });
    return this;
  }

  /**
   * Creates a default Laundry Washer Mode Cluster Server.
   *
   * @param {number} currentMode - The current mode of the oven.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultLaundryWasherModeClusterServer(currentMode?: number): this {
    this.behaviors.require(MatterbridgeLaundryWasherModeServer, {
      supportedModes: [
        { label: 'Delicate', mode: 1, modeTags: [{ value: LaundryWasherMode.ModeTag.Delicate }] },
        { label: 'Normal', mode: 2, modeTags: [{ value: LaundryWasherMode.ModeTag.Normal }] },
        { label: 'Heavy', mode: 3, modeTags: [{ value: LaundryWasherMode.ModeTag.Heavy }] },
        { label: 'Whites', mode: 4, modeTags: [{ value: LaundryWasherMode.ModeTag.Whites }] },
      ],
      currentMode,
    });
    return this;
  }

  /**
   * Creates a default MicrowaveOvenMode Cluster Server.
   * There is no changeToMode command in the spec, so this is not implemented.
   * The Microwave is controlled by the MicrowaveOvenControl cluster.
   *
   * @param {number} currentMode - The current mode of the oven. Default is 1.
   * @param {MicrowaveOvenMode.ModeOption[]} supportedModes - The supported modes. Default is an array of all modes.
   *
   * @returns {MatterbridgeEndpoint} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultMicrowaveOvenModeClusterServer(currentMode?: number, supportedModes?: MicrowaveOvenMode.ModeOption[]): this {
    this.behaviors.require(MicrowaveOvenModeServer, {
      supportedModes: supportedModes ?? [
        { label: 'Auto', mode: 1, modeTags: [{ value: MicrowaveOvenMode.ModeTag.Auto }] },
        { label: 'Quick', mode: 2, modeTags: [{ value: MicrowaveOvenMode.ModeTag.Quick }] },
        { label: 'Quiet', mode: 3, modeTags: [{ value: MicrowaveOvenMode.ModeTag.Quiet }] },
        { label: 'Min', mode: 4, modeTags: [{ value: MicrowaveOvenMode.ModeTag.Min }] },
        { label: 'Max', mode: 5, modeTags: [{ value: MicrowaveOvenMode.ModeTag.Max }] },
        { label: 'Normal', mode: 6, modeTags: [{ value: MicrowaveOvenMode.ModeTag.Normal }] },
        { label: 'Defrost', mode: 7, modeTags: [{ value: MicrowaveOvenMode.ModeTag.Defrost }] },
      ],
      currentMode: currentMode ?? 1,
    });
    return this;
  }

  /**
   * Creates a default MicrowaveOvenControl Cluster Server.
   *
   * @param {number} selectedWattIndex - The selected watt index. Default is 5.
   * @param {number[]} supportedWatts - The supported watt values. Default is [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].
   * @param {number} cookTime - The initial cook time. Default is 1.
   * @param {number} maxCookTime - The maximum cook time. Default is 60.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultMicrowaveOvenControlClusterServer(
    selectedWattIndex = 5,
    supportedWatts: number[] = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
    cookTime = 60, // 1 minute
    maxCookTime = 3600, // 1 hour
  ): this {
    this.behaviors.require(MatterbridgeMicrowaveOvenControlServer.with(MicrowaveOvenControl.Feature.PowerInWatts), {
      supportedWatts,
      selectedWattIndex,
      cookTime,
      maxCookTime,
    });
    return this;
  }

  /**
   * Creates a spin Laundry Washer Controls Cluster Server.
   *
   * @param {number} spinSpeedCurrent - The current spin speed. Default is undefined.
   * @param {string[]} spinSpeeds - The supported spin speeds. Default is ['400', '800', '1200', '1600'].
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createSpinLaundryWasherControlsClusterServer(spinSpeedCurrent?: number, spinSpeeds?: string[]): this {
    this.behaviors.require(LaundryWasherControlsServer.with(LaundryWasherControls.Feature.Spin), {
      spinSpeeds: spinSpeeds ?? ['400', '800', '1200', '1600'],
      spinSpeedCurrent, // Writable
    });
    return this;
  }

  /**
   * Creates a rinse Laundry Washer Controls Cluster Server.
   *
   * @param {LaundryWasherControls.NumberOfRinses} numberOfRinses - The number of rinses. Default is undefined.
   * @param {LaundryWasherControls.NumberOfRinses[]} supportedRinses  - The supported rinses. Default is [None, Normal, Extra, Max].
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createRinseLaundryWasherControlsClusterServer(numberOfRinses?: LaundryWasherControls.NumberOfRinses, supportedRinses?: LaundryWasherControls.NumberOfRinses[]): this {
    this.behaviors.require(LaundryWasherControlsServer.with(LaundryWasherControls.Feature.Rinse), {
      supportedRinses: supportedRinses ?? [
        LaundryWasherControls.NumberOfRinses.None,
        LaundryWasherControls.NumberOfRinses.Normal,
        LaundryWasherControls.NumberOfRinses.Extra,
        LaundryWasherControls.NumberOfRinses.Max,
      ],
      numberOfRinses, // Writable
    });
    return this;
  }

  /**
   * Creates a default Laundry Dryer Controls Cluster Server.
   *
   * @param {LaundryDryerControls.DrynessLevel} selectedDrynessLevel - The selected dryness level. Default is undefined.
   * @param {LaundryDryerControls.DrynessLevel[]} supportedDrynessLevels - The supported dryness levels. Default is [Low, Normal, Extra, Max].
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultLaundryDryerControlsClusterServer(selectedDrynessLevel?: LaundryDryerControls.DrynessLevel, supportedDrynessLevels?: LaundryDryerControls.DrynessLevel[]): this {
    this.behaviors.require(LaundryDryerControlsServer, {
      supportedDrynessLevels: supportedDrynessLevels ?? [
        LaundryDryerControls.DrynessLevel.Low,
        LaundryDryerControls.DrynessLevel.Normal,
        LaundryDryerControls.DrynessLevel.Extra,
        LaundryDryerControls.DrynessLevel.Max,
      ],
      selectedDrynessLevel, // Writable
    });
    return this;
  }

  /**
   * Creates a default Dishwasher Alarm Cluster Server.
   *
   * @returns {this} The current MatterbridgeEndpoint instance for chaining.
   */
  createDefaultDishwasherAlarmClusterServer(): this {
    this.behaviors.require(DishwasherAlarmServer, {
      mask: { inflowError: true, drainError: true, doorError: true, tempTooLow: true, tempTooHigh: true, waterLevelError: true },
      state: { inflowError: false, drainError: false, doorError: false, tempTooLow: false, tempTooHigh: false, waterLevelError: false },
      supported: { inflowError: true, drainError: true, doorError: true, tempTooLow: true, tempTooHigh: true, waterLevelError: true },
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
  static createLevelTemperatureControlClusterServer(
    endpoint: MatterbridgeEndpoint,
    selectedTemperatureLevel = 1,
    supportedTemperatureLevels = ['Cold', 'Warm', 'Hot'],
  ): MatterbridgeEndpoint {
    endpoint.behaviors.require(MatterbridgeLevelTemperatureControlServer.with(TemperatureControl.Feature.TemperatureLevel), {
      selectedTemperatureLevel,
      supportedTemperatureLevels,
    });
    return endpoint;
  }

  /**
   * Creates a TemperatureControl Cluster Server with feature TemperatureNumber.
   *
   * @param {number} temperatureSetpoint - The temperature setpoint * 100.
   * @param {number} minTemperature - The minimum temperature * 100.
   * @param {number} maxTemperature - The maximum temperature * 100.
   * @param {number} [step] - The step size for temperature changes, default is 1.
   
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
  static createNumberTemperatureControlClusterServer(
    endpoint: MatterbridgeEndpoint,
    temperatureSetpoint: number,
    minTemperature: number,
    maxTemperature: number,
    step = 1,
  ): MatterbridgeEndpoint {
    endpoint.behaviors.require(MatterbridgeNumberTemperatureControlServer.with(TemperatureControl.Feature.TemperatureNumber, TemperatureControl.Feature.TemperatureStep), {
      temperatureSetpoint,
      minTemperature,
      maxTemperature,
      step,
    });
    return endpoint;
  }
}

class MatterbridgeLevelTemperatureControlServer extends TemperatureControlBehavior.with(TemperatureControl.Feature.TemperatureLevel) {
  override initialize() {
    if (this.state.supportedTemperatureLevels.length >= 2) {
      const device = this.endpoint.stateOf(MatterbridgeServer);
      device.log.info('MatterbridgeLevelTemperatureControlServer initialized');
    }
  }

  override setTemperature(request: TemperatureControl.SetTemperatureRequest): MaybePromise {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    if (request.targetTemperatureLevel !== undefined && request.targetTemperatureLevel >= 0 && request.targetTemperatureLevel < this.state.supportedTemperatureLevels.length) {
      device.log.info(
        `MatterbridgeLevelTemperatureControlServer: setTemperature called setting selectedTemperatureLevel to ${request.targetTemperatureLevel}: ${this.state.supportedTemperatureLevels[request.targetTemperatureLevel]}`,
      );
      this.state.selectedTemperatureLevel = request.targetTemperatureLevel;
    } else {
      device.log.error(`MatterbridgeLevelTemperatureControlServer: setTemperature called with invalid targetTemperatureLevel ${request.targetTemperatureLevel}`);
    }
  }
}

class MatterbridgeNumberTemperatureControlServer extends TemperatureControlBehavior.with(TemperatureControl.Feature.TemperatureNumber) {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('MatterbridgeNumberTemperatureControlServer initialized');
  }

  override setTemperature(request: TemperatureControl.SetTemperatureRequest): MaybePromise {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    if (request.targetTemperature !== undefined && request.targetTemperature >= this.state.minTemperature && request.targetTemperature <= this.state.maxTemperature) {
      device.log.info(`MatterbridgeNumberTemperatureControlServer: setTemperature called setting temperatureSetpoint to ${request.targetTemperature}`);
      this.state.temperatureSetpoint = request.targetTemperature;
    } else {
      device.log.error(`MatterbridgeNumberTemperatureControlServer: setTemperature called with invalid targetTemperature ${request.targetTemperature}`);
    }
  }
}

class MatterbridgeMicrowaveOvenControlServer extends MicrowaveOvenControlBehavior.with(MicrowaveOvenControl.Feature.PowerInWatts) {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('MatterbridgeMicrowaveOvenControlServer initialized');
  }

  override setCookingParameters(request: MicrowaveOvenControl.SetCookingParametersRequest): MaybePromise {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    if (request.cookMode !== undefined) {
      device.log.info(`MatterbridgeMicrowaveOvenControlServer: setCookingParameters called setting cookMode to ${request.cookMode}`);
      this.endpoint.setStateOf(MicrowaveOvenModeServer, { currentMode: request.cookMode });
    } else {
      device.log.info(`MatterbridgeMicrowaveOvenControlServer: setCookingParameters called with no cookMode so set to Normal`);
      this.endpoint.setStateOf(MicrowaveOvenModeServer, { currentMode: 6 }); // Default to Normal mode
    }
    if (request.cookTime !== undefined && request.cookTime >= 0 && request.cookTime <= this.state.maxCookTime) {
      device.log.info(`MatterbridgeMicrowaveOvenControlServer: setCookingParameters called setting cookTime to ${request.cookTime}`);
      this.state.cookTime = request.cookTime;
    } else {
      device.log.info(`MatterbridgeMicrowaveOvenControlServer: setCookingParameters called with no cookTime so set to 30sec.`);
      this.state.cookTime = 30; // Default to 30 seconds
    }
    if (request.wattSettingIndex !== undefined && request.wattSettingIndex >= 0 && request.wattSettingIndex < this.state.supportedWatts.length) {
      device.log.info(`MatterbridgeMicrowaveOvenControlServer: setCookingParameters called setting selectedWattIndex to ${request.wattSettingIndex}`);
      this.state.selectedWattIndex = request.wattSettingIndex;
    } else {
      device.log.info(`MatterbridgeMicrowaveOvenControlServer: setCookingParameters called with no wattSettingIndex so set to the highest Watt setting for the selected CookMode`);
      this.state.selectedWattIndex = this.state.supportedWatts.length - 1; // Default the highest Watt setting for the selected CookMode
    }
  }
  override addMoreTime(request: MicrowaveOvenControl.AddMoreTimeRequest): MaybePromise {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    if (request.timeToAdd !== undefined && request.timeToAdd >= 0) {
      device.log.info(`MatterbridgeMicrowaveOvenControlServer: addMoreTime called setting cookTime to ${this.state.cookTime + request.timeToAdd}`);
      this.state.cookTime += request.timeToAdd;
    } else {
      device.log.error(`MatterbridgeMicrowaveOvenControlServer: addMoreTime called with invalid cookTime ${request.timeToAdd}`);
    }
  }
}

/** ************************************************************** OvenCavityOperationalState */

// Server for OvenCavityOperationalState
export class MatterbridgeOvenCavityOperationalStateServer extends OvenCavityOperationalStateBehavior {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('OvenCavityOperationalStateServer initialized: setting operational state to Stopped and operational error to No error');
    this.state.operationalState = OperationalState.OperationalStateEnum.Stopped;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
  }

  override stop(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('OvenCavityOperationalStateServer: stop called setting operational state to Stopped and operational error to No error');
    this.state.operationalState = OperationalState.OperationalStateEnum.Stopped;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }

  override start(): MaybePromise<OperationalState.OperationalCommandResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('OvenCavityOperationalStateServer: start called setting operational state to Running and operational error to No error');
    this.state.operationalState = OperationalState.OperationalStateEnum.Running;
    this.state.operationalError = { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' };
    return {
      commandResponseState: { errorStateId: OperationalState.ErrorState.NoError, errorStateLabel: 'No error', errorStateDetails: 'Fully operational' },
    } as OperationalState.OperationalCommandResponse;
  }
}

/** ************************************************************** RefrigeratorAndTemperatureControlledCabinetMode */
// Server for RefrigeratorAndTemperatureControlledCabinetMode
class MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer extends RefrigeratorAndTemperatureControlledCabinetModeBehavior {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer initialized: setting currentMode to 1');
    this.state.currentMode = 1;
  }
  override changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    const supportedMode = this.state.supportedModes.find((supportedMode) => supportedMode.mode === request.newMode);
    if (supportedMode) {
      device.log.info(`MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer: changeToMode called with mode ${supportedMode.mode} = ${supportedMode.label}`);
      this.state.currentMode = request.newMode;
      return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Success' };
    } else {
      device.log.info(`MatterbridgeRefrigeratorAndTemperatureControlledCabinetModeServer: changeToMode called with invalid mode ${request.newMode}`);
      return { status: ModeBase.ModeChangeStatus.InvalidInMode, statusText: 'Invalid mode' };
    }
  }
}

/** ************************************************************** OvenMode */
// Server for OvenMode
class MatterbridgeOvenModeServer extends OvenModeBehavior {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('OvenModeServer initialized: setting currentMode to 3');
    this.state.currentMode = 3;
  }
  override changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    const supportedMode = this.state.supportedModes.find((supportedMode) => supportedMode.mode === request.newMode);
    if (supportedMode) {
      device.log.info(`OvenModeServer: changeToMode called with mode ${supportedMode.mode} = ${supportedMode.label}`);
      this.state.currentMode = request.newMode;
      return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Success' };
    } else {
      device.log.info(`OvenModeServer: changeToMode called with invalid mode ${request.newMode}`);
      return { status: ModeBase.ModeChangeStatus.InvalidInMode, statusText: 'Invalid mode' };
    }
  }
}

/** ************************************************************** DishwasherMode */
// Server for DishwasherMode
class MatterbridgeDishwasherModeServer extends DishwasherModeBehavior {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('DishwasherModeServer initialized: setting currentMode to 3');
    this.state.currentMode = 2;
    this.reactTo(this.agent.get(MatterbridgeOnOffServer).events.onOff$Changed, this.handleOnOffChange);
  }

  // Dead Front OnOff Cluster
  protected handleOnOffChange(onOff: boolean) {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    if (onOff === false) {
      device.log.info('***OnOffServer changed to OFF: setting Dead Front state to Manufacturer Specific');
      this.state.currentMode = 2;
    }
  }

  override changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    const supportedMode = this.state.supportedModes.find((supportedMode) => supportedMode.mode === request.newMode);
    if (supportedMode) {
      device.log.info(`DishwasherModeServer: changeToMode called with mode ${supportedMode.mode} = ${supportedMode.label}`);
      this.state.currentMode = request.newMode;
      return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Success' };
    } else {
      device.log.error(`DishwasherModeServer: changeToMode called with invalid mode ${request.newMode}`);
      return { status: ModeBase.ModeChangeStatus.InvalidInMode, statusText: 'Invalid mode' };
    }
  }
}

/** ************************************************************** LaundryWasherMode */
// Server for LaundryWasherMode
class MatterbridgeLaundryWasherModeServer extends LaundryWasherModeBehavior {
  override initialize() {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info('LaundryWasherModeServer initialized: setting currentMode to 3');
    this.state.currentMode = 2;
    this.reactTo(this.agent.get(MatterbridgeOnOffServer).events.onOff$Changed, this.handleOnOffChange);
  }

  // Dead Front OnOff Cluster
  protected handleOnOffChange(onOff: boolean) {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    if (onOff === false) {
      device.log.notice('OnOffServer changed to OFF: setting Dead Front state to Manufacturer Specific');
      this.state.currentMode = 2;
    }
  }

  override changeToMode(request: ModeBase.ChangeToModeRequest): MaybePromise<ModeBase.ChangeToModeResponse> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    const supportedMode = this.state.supportedModes.find((supportedMode) => supportedMode.mode === request.newMode);
    if (supportedMode) {
      device.log.info(`LaundryWasherModeServer: changeToMode called with mode ${supportedMode.mode} = ${supportedMode.label}`);
      this.state.currentMode = request.newMode;
      return { status: ModeBase.ModeChangeStatus.Success, statusText: 'Success' };
    } else {
      device.log.error(`LaundryWasherModeServer: changeToMode called with invalid mode ${request.newMode}`);
      return { status: ModeBase.ModeChangeStatus.InvalidInMode, statusText: 'Invalid mode' };
    }
  }
}
