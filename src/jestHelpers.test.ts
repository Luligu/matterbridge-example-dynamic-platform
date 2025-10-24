import { jest } from '@jest/globals';
import { Matterbridge, MatterbridgeEndpoint, onOffOutlet } from 'matterbridge';
import { Endpoint, Environment, ServerNode } from 'matterbridge/matter';
import { AggregatorEndpoint } from 'matterbridge/matter/endpoints';

import {
  addDevice,
  consoleDebugSpy,
  consoleErrorSpy,
  consoleInfoSpy,
  consoleLogSpy,
  consoleWarnSpy,
  createMatterbridgeEnvironment,
  createTestEnvironment,
  deleteDevice,
  destroyMatterbridgeEnvironment,
  loggerLogSpy,
  setDebug,
  setupTest,
  startMatterbridgeEnvironment,
  startServerNode,
  stopMatterbridgeEnvironment,
  stopServerNode,
} from './jestHelpers.js';

process.argv.push('--debug');

setupTest('JestHelpers', false);

describe('Matterbridge instance', () => {
  let matterbridge: Matterbridge;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: Endpoint<AggregatorEndpoint>;

  beforeAll(async () => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should set debug mode', async () => {
    setDebug(true);
    expect(loggerLogSpy).toBeDefined();
    expect(consoleLogSpy).toBeDefined();
    expect(consoleDebugSpy).toBeDefined();
    expect(consoleInfoSpy).toBeDefined();
    expect(consoleWarnSpy).toBeDefined();
    expect(consoleErrorSpy).toBeDefined();
    setDebug(false);
  });

  test('should create a Matterbridge instance', async () => {
    matterbridge = await createMatterbridgeEnvironment('JestHelpers');
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
  });

  test('should start a Matterbridge instance', async () => {
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
    [server, aggregator] = await startMatterbridgeEnvironment(matterbridge);
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
  });

  test('should stop a Matterbridge instance', async () => {
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
    await stopMatterbridgeEnvironment(matterbridge, server, aggregator);
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
  });

  test('should destroy a Matterbridge instance', async () => {
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
    await destroyMatterbridgeEnvironment(matterbridge);
    expect(matterbridge).toBeDefined();
    expect(matterbridge).toBeInstanceOf(Matterbridge);
  });
});

describe('Matter.js instance', () => {
  let environment: Environment;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: Endpoint<AggregatorEndpoint>;
  let device: MatterbridgeEndpoint;

  beforeAll(async () => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should set debug mode', async () => {
    setDebug(true);
    expect(loggerLogSpy).toBeDefined();
    expect(consoleLogSpy).toBeDefined();
    expect(consoleDebugSpy).toBeDefined();
    expect(consoleInfoSpy).toBeDefined();
    expect(consoleWarnSpy).toBeDefined();
    expect(consoleErrorSpy).toBeDefined();
    setDebug(false);
  });

  test('should create a matter.js environment', async () => {
    environment = createTestEnvironment('JestHelpers');
    expect(environment).toBeDefined();
  });

  test('should start a matter.js server node', async () => {
    [server, aggregator] = await startServerNode('JestHelpers', 6000, environment);
    expect(server).toBeDefined();
    expect(aggregator).toBeDefined();
  });

  test('should add a device to a matter.js server node', async () => {
    device = new MatterbridgeEndpoint(onOffOutlet, { id: 'outlet1' });
    expect(await addDevice(aggregator, device)).toBeTruthy();
  });

  test('should delete a device from a matter.js server node', async () => {
    expect(await deleteDevice(aggregator, device)).toBeTruthy();
  });

  test('should stop a matter.js server node', async () => {
    await stopServerNode(server);
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(ServerNode);
  });
});
