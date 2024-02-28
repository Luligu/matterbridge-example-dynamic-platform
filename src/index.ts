import { MatterServer } from '@project-chip/matter-node.js';
import { Format, Level, Logger } from '@project-chip/matter-node.js/log';
import { StorageBackendJsonFile, StorageManager } from '@project-chip/matter-node.js/storage';

import { Matterbridge } from '../../matterbridge/dist/index.js';
import { AnsiLogger } from 'node-ansi-logger';
import { ExampleMatterbridgeDynamicPlatform } from './platform.js';

/**
 * This is the standard interface for MatterBridge plugins.
 * Each plugin should export a default function that follows this signature.
 *
 * @param matterbridge - An instance of MatterBridge
 */
export default function initializePlugin(matterbridge: Matterbridge, log: AnsiLogger) {
  // set matter.js logger level and format
  Logger.defaultLogLevel = Level.DEBUG;
  Logger.format = Format.ANSI;

  // Do nothing just load @project-chip/matter-node.js for the Time Crypto Net Node variant
  const storageJson = new StorageBackendJsonFile('matterbridge-example');
  const storageManager = new StorageManager(storageJson);
  new MatterServer(storageManager);

  log.info('Matterbridge dynamic platform plugin example is loading...');

  const platform = new ExampleMatterbridgeDynamicPlatform(matterbridge, log);

  log.info('Matterbridge dynamic platform plugin example initialized successfully!');
  return platform;
}
