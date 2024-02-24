/* eslint-disable @typescript-eslint/no-unused-vars */
import { CommissioningController, CommissioningServer, MatterServer, NodeCommissioningOptions } from '@project-chip/matter-node.js';
import { EndpointNumber, NodeId, VendorId } from '@project-chip/matter-node.js/datatype';
import { Aggregator, ComposedDevice, Device, DeviceClasses, DeviceTypeDefinition, DeviceTypes, Endpoint, NodeStateInformation, 
  OnOffPluginUnitDevice, PairedNode, getDeviceTypeDefinitionByCode } from '@project-chip/matter-node.js/device';
import { Format, Level, Logger } from '@project-chip/matter-node.js/log';
import { ManualPairingCodeCodec, QrCodeSchema } from '@project-chip/matter-node.js/schema';
import { StorageBackendDisk, StorageBackendJsonFile, StorageContext, StorageManager } from '@project-chip/matter-node.js/storage';
import { requireMinNodeVersion, getParameter, getIntParameter, hasParameter, singleton, ByteArray } from '@project-chip/matter-node.js/util';
import { logEndpoint } from '@project-chip/matter-node.js/device';
import { Crypto, CryptoNode } from '@project-chip/matter-node.js/crypto';
import { CommissioningOptions } from '@project-chip/matter.js/protocol';
import {
  AllClustersMap, AttributeInitialValues, BasicInformationCluster, BooleanState, ClusterServer, GeneralCommissioning,
  Identify, IdentifyCluster,
  IlluminanceMeasurement, IlluminanceMeasurementCluster,
  OccupancySensing, OccupancySensingCluster, OnOff,
  PowerSource, PowerSourceCluster, PressureMeasurement, RelativeHumidityMeasurement,
  TemperatureMeasurement, getClusterNameById, EventPriority, ActionsCluster, Actions, WindowCovering, WindowCoveringCluster, createDefaultGroupsClusterServer, 
  createDefaultScenesClusterServer
} from '@project-chip/matter-node.js/cluster';

import { 
  Matterbridge,
  MatterbridgeDevice,
  MatterbridgeDynamicPlatform,
  MatterbridgePlatform,
} from '../../matterbridge/dist/index.js'; 
import { AnsiLogger, REVERSE, REVERSEOFF } from 'node-ansi-logger';

/**
 * This is the standard interface for MatterBridge plugins.
 * Each plugin should export a default function that follows this signature.
 * 
 * @param matterbridge - An instance of MatterBridge
 */
export default function initializePlugin(matterbridge: Matterbridge, log: AnsiLogger) { 

  // Do nothing just load @project-chip/matter-node.js
  const storageJson = new StorageBackendJsonFile('matterbridge-example');
  const storageManager = new StorageManager(storageJson);
  const matterServer = new MatterServer(storageManager);

  log.info('My Plugin is loading...');

  //const platform = new ExampleMatterbridgePlatform(matterbridge, log);
  const platform = new ExampleMatterbridgeDynamicPlatform(matterbridge, log);

  log.info('My Plugin initialized successfully!');
  return platform
}

class ExampleMatterbridgePlatform extends MatterbridgePlatform {

  constructor(matterbridge: Matterbridge, log: AnsiLogger) {
    super(matterbridge, log);
    log.debug(`ExampleMatterbridgePlatform loaded (matterbridge is running on node v${matterbridge.nodeVersion})`);
  }

  override onStartPlatform(): void {
    this.log.info(`onStartPlatform called (matterbridge is running on node v${this.matterbridge.nodeVersion})`);

    const matterDevice1 = new MatterbridgeDevice(DeviceTypes.WINDOW_COVERING);
    matterDevice1.createDefaultIdentifyClusterServer();
    matterDevice1.createDefaultBasicInformationClusterServer('Device1', 'Device1 0x01020304', 0xfff1, 'Luligu', 0x0001, 'Device1');
    matterDevice1.createDefaultOnOffClusterServer();
    matterDevice1.createDefaultWindowCoveringClusterServer(0);
    this.registerDevice(matterDevice1)

    matterDevice1.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
    });

    matterDevice1.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      this.log.warn(`Command goToLiftPercentage called liftPercent100thsValue:${liftPercent100thsValue}`);
    });

    /*
    const matterDevice2: Device = new Device(DeviceTypes.CONTACT_SENSOR);
    matterDevice2.addClusterServer(createDefaultIdentifyClusterServer());
    matterDevice2.addClusterServer(createDefaultBasicInformationClusterServer('Device2', 'Device2 0x01450304', 0xfff1, 'Luligu', 0x0002, 'Device2 contact'));
    matterDevice2.addClusterServer(createDefaultBooleanStateClusterServer(true));
    //matterbridge.addDevice(matterDevice2);

    const composed1 = new ComposedDevice(DeviceTypes.WINDOW_COVERING, [matterDevice1]);
    matterbridge.addDevice(composed1 as unknown as Device);
    const composed2 = new ComposedDevice(DeviceTypes.CONTACT_SENSOR, [ matterDevice2]);
    matterbridge.addDevice(composed2 as unknown as Device);
    */
  }

  override onShutdown(): void {
    this.log.info(`onShutdown called (matterbridge is running on node v${this.matterbridge.nodeVersion})`);
  }
}

class ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform {

  constructor(matterbridge: Matterbridge, log: AnsiLogger) {
    super(matterbridge, log);
    log.debug(`ExampleMatterbridgeDynamicPlatform loaded (matterbridge is running on node v${matterbridge.nodeVersion})`);
  }

  override onStartDynamicPlatform(): void {
    this.log.info(`onStartDynamicPlatform called (matterbridge is running on node v${this.matterbridge.nodeVersion})`);

    const matterDevice1 = new MatterbridgeDevice(DeviceTypes.WINDOW_COVERING);
    matterDevice1.createDefaultIdentifyClusterServer();
    matterDevice1.createDefaultGroupsClusterServer();
    matterDevice1.createDefaultScenesClusterServer();
    matterDevice1.createDefaultBridgedDeviceBasicInformationClusterServer('BridgedDevice1', 'BridgedDevice1 0x01020564', 0xfff1, 'Luligu', 'BridgedDevice1');
    matterDevice1.createDefaultPowerSourceRechargableBatteryClusterServer(86);
    matterDevice1.createDefaultWindowCoveringClusterServer();
    this.registerDevice(matterDevice1)

    matterDevice1.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
    });
    matterDevice1.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
      this.log.warn(`Command goToLiftPercentage called liftPercent100thsValue:${liftPercent100thsValue}`);
    });

    const matterDevice2 = new MatterbridgeDevice(DeviceTypes.ON_OFF_LIGHT);
    matterDevice2.createDefaultIdentifyClusterServer();
    matterDevice2.createDefaultGroupsClusterServer();
    matterDevice2.createDefaultScenesClusterServer();
    matterDevice2.createDefaultBridgedDeviceBasicInformationClusterServer('BridgedDevice2', 'BridgedDevice2 0x23023304', 0xfff1, 'Luligu', 'BridgedDevice2');
    matterDevice2.createDefaultPowerSourceReplaceableBatteryClusterServer(70);
    matterDevice2.createDefaultOnOffClusterServer();
    this.registerDevice(matterDevice2)

    matterDevice2.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.warn(`Command identify called identifyTime:${identifyTime}`);
    });
    matterDevice2.addCommandHandler('on', async () => {
      this.log.warn('Command on called');
    });
    matterDevice2.addCommandHandler('off', async () => {
      this.log.warn('Command off called');
    });
  }

  override onShutdown(): void {
    this.log.info(`onShutdown called (matterbridge is running on node v${this.matterbridge.nodeVersion})`);
  }
}

