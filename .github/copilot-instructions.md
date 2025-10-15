# AI assistant guide for this codebase

This is a TypeScript ESM plugin for Matterbridge that showcases a Dynamic Platform exposing 58 virtual devices. Use this as your quick-start map to the repo.

## Architecture in one glance

- Entry point: `src/index.ts` exports `default function initializePlugin(matterbridge, log, config)` returning `ExampleMatterbridgeDynamicPlatform`.
- Core platform: `src/platform.ts` defines `ExampleMatterbridgeDynamicPlatform extends MatterbridgeDynamicPlatform`.
  - Version guard: constructor calls `verifyMatterbridgeVersion('3.3.0')` and throws with a helpful message if too old.
  - Device creation: in `onStart(reason?)` create devices via `new MatterbridgeEndpoint([deviceTypes...], { uniqueStorageKey }, debug)` → chain `.createDefault*ClusterServer()` → `.addRequiredClusterServers()` → `await this.addDevice(endpoint)`.
  - Commands: `endpoint.addCommandHandler('name', async ({ request }) => { ... })`.
  - Subscriptions: `await endpoint.subscribeAttribute(Cluster.id, 'attr', (newVal, oldVal, ctx) => { if (ctx.offline) return; ... }, endpoint.log)`.
  - `onConfigure()`: drives periodic "animation" (setInterval) updating attributes (e.g., RVC flow, appliance phases). Dead-front behavior is toggled via OnOff.
  - `onShutdown()`: cleans up resources and stops any ongoing processes.

## Configuration controls

- Default config: `matterbridge-example-dynamic-platform.config.json`; schema: `matterbridge-example-dynamic-platform.schema.json`.
- Keys you’ll use:
  - `whiteList`/`blackList`: filter which devices are exposed (by device display name).
  - `useInterval` (default true): enable periodic state updates in `onConfigure`.
  - `enableServerRvc` (default true): put Robot Vacuum Cleaner in server mode (Apple Home crashes if RVC is bridged).
  - `debug`, `unregisterOnShutdown`: development toggles.

## Project conventions and patterns

- ESM + NodeNext: `type: "module"`, `tsconfig.json` uses `module: nodenext`. Import local files with `.js` extension in src code and tests (e.g., `./index.js`).
- Units/encodings used throughout:
  - Temperature/humidity `measuredValue` in centi-units; illuminance uses `luxToMatter`/`matterToLux`; window coverings: 0=open, 10000=closed.
- When reacting to subscriptions, guard mutations with `if (context.offline) return;` (see fans/air purifier/air conditioner).
- Every endpoint has a stable `uniqueStorageKey`. After building, call `.addRequiredClusterServers()` before `addDevice`.
- Composed devices: use `.addChildDeviceType(name, [deviceType], options)` on an endpoint to create sub-endpoints (see Thermostat Auto with Flow/Temp/Humidity, Momentary switch, Oven/Cooktop/Refrigerator).

## Dev workflows that matter

- Build: `npm run build` (tsc). Production: `npm run buildProduction`. Watch: `npm run watch`.
- Test (Jest via ts-jest ESM): `npm test`, coverage: `npm run test:coverage`. Tests stage a local Matter environment and silence logs via `src/jestHelpers.ts`.
  - `src/platform.test.ts` expects 58 devices via `addBridgedEndpoint` calls; update the expected count if you add/remove devices.
- Lint/format: `npm run lint` (ESLint flat config + Prettier), `npm run format`.
- Run under Matterbridge: `npm start` invokes the `matterbridge` CLI. Helper scripts: `matterbridge:add|remove|enable|disable|list`.

## How to add a new device (pattern)

1. In `onStart`, build with the fluent API:
   - `const dev = new MatterbridgeEndpoint([onOffLight, bridgedNode, powerSource], { uniqueStorageKey: 'MyLight' }, !!this.config.debug)
.createDefaultIdentifyClusterServer()
.createDefaultBridgedDeviceBasicInformationClusterServer('My Light', 'MLT00099', 0xfff1, 'Matterbridge', 'My Light')
.createDefaultOnOffClusterServer()
.createDefaultPowerSourceWiredClusterServer()
.addRequiredClusterServers();`
2. `await this.addDevice(dev);`
3. Add handlers/subscriptions mirroring existing devices (e.g., `light`, `dimmer`, `fanDefault`).

## Files to study for examples

- `src/index.ts` (plugin entry point)
- `src/platform.ts` (all device patterns, handlers, subscriptions, attribute writes)
- `src/platform.test.ts` and `src/index.test.ts` (end-to-end device registration and command execution)
- `src/jestHelpers.ts` (Node/Server/Endpoint test scaffolding)

Questions or gaps? Tell me which area to expand (e.g., child endpoints, cluster APIs, or test helpers), and I’ll refine this guide.
