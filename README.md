# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge dynamic platform example plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-example-dynamic-platform.svg)](https://www.npmjs.com/package/matterbridge-example-dynamic-platform)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-example-dynamic-platform.svg)](https://www.npmjs.com/package/matterbridge-example-dynamic-platform)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge/latest?label=docker%20version)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge?label=docker%20pulls)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-example-dynamic-platform/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/matterbridge-example-dynamic-platform/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/matterbridge-example-dynamic-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/matterbridge-example-dynamic-platformr)
[![tested with Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![styled with Oxc](https://img.shields.io/badge/formatted_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/formatter.html)
[![linted with Oxc](https://img.shields.io/badge/linted_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/linter.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TypeScript Native](https://img.shields.io/badge/TypeScript_Native-3178C6?logo=typescript&logoColor=white)](https://github.com/microsoft/typescript-go)
[![ESM](https://img.shields.io/badge/ESM-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![matterbridge.io](https://img.shields.io/badge/matterbridge.io-online-brightgreen)](https://matterbridge.io)

[![powered by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![powered by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![powered by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![powered by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

Matterbridge dynamic platform example plugin is a template to develop your own plugin using the dynamic platform.

It exposes 70 virtual devices:

- a door contact sensor
- a motion sensor
- an illuminance sensor
- a temperature sensor
- a humidity sensor
- a pressure sensor
- a flow sensor
- a climate sensor with temperature, humidity and pressure
- a mode select device
- a switch with onOff cluster
- a light with onOff
- a light with onOff and levelControl (dimmer)
- a light with onOff, levelControl and colorControl (with XY, HS and CT) clusters
- a light with onOff, levelControl and colorControl (with HS and CT) clusters
- a light with onOff, levelControl and colorControl (with XY and CT) clusters
- a light with onOff, levelControl and colorControl (with CT only) clusters
- an outlet (plug) with onOff cluster
- an outlet (plug) with onOff cluster, energy measurements and power measurements
- an outlet (plug) with onOff cluster, apparent energy measurements and power measurements
- a smart outlet with an energy meter and four individually controllable sockets (with tagList 1, 2, 3 and 4)
- a bridged outlet with four individually controllable plugs that expose their names
- a cover with windowCovering cluster and lift feature
- a cover with windowCovering cluster and both lift and tilt features
- a lock with doorLock cluster
- a thermostat auto mode (i.e. with Auto Heat and Cool features) with thermostat cluster and 3 sub endpoints with flowMeasurement cluster, temperatureMeasurement cluster
  and relativeHumidityMeasurement cluster (to show how to create a composed device with sub endpoints)
- a thermostat with auto mode (i.e. with Auto Heat and Cool features), occupancy and outdoorTemperature
- a thermostat auto mode with presets (Home, Away, Sleep, Wake, Vacation and GoingToSleep modes) including 3 sub endpoints with flow, temperature and humidity sensors
- a thermostat heat only with two external temperature sensors (tagged like Indoor and Outdoor)
- a thermostat cool only
- a fan with Off High presets
- a fan with Off Low Med High presets
- a fan with Off Low Med High Auto presets and step
- a fan with all the features MultiSpeed, Auto, Step, Rock, Wind and AirflowDirection and mode Off Low Med High Auto.
- a rain sensor device
- a water freeze detector device
- a water leak detector device
- a smokeCoAlarm (with smoke and co features) sensor (supported by Apple Home)
- a smokeCoAlarm (with smoke only feature) sensor (supported by Apple Home)
- a smokeCoAlarm (with co only feature) sensor (supported by Apple Home)
- an airConditioner device
- an airPurifier device with temperature and humidity sensor (supported by Apple Home)
- a pump device
- a waterValve device
- an airQuality device with all concentration measurements clusters (supported by Apple Home with the concentration measurements from version 18.5)
- a momentary switch composed by three switches with Single Double Long (tagged with One Two Three and Top Middle Bottom) and three switches with Single only.
- a latching switch
- a Robot Vacuum Cleaner device (supported by SmartThings, Alexa, Home Assistant and partially by Apple Home). Read also <https://github.com/Luligu/matterbridge/discussions/264>.
- an onOff Mounted Switch device (supported by SmartThings, Alexa, Home Assistant)
- a onOff Mounted Switch legacy device (supported by all controllers)
- a dimmer Mounted Switch device (supported by SmartThings, Alexa, Home Assistant)
- a dimmer Mounted Switch legacy device (supported by all controllers)
- a laundry Washer device (supported by SmartThings, Alexa and Home Assistant)
- a laundry Dryer device (supported by SmartThings, Alexa and Home Assistant)
- a dishwasher device (supported by SmartThings, Alexa and Home Assistant)
- a refrigerator device (supported by SmartThings, Alexa and Home Assistant)
- an oven device (supported by SmartThings, Alexa and Home Assistant)
- a microwave Oven device (supported by SmartThings, Alexa and Home Assistant)
- an extractor Hood device (supported by SmartThings, Alexa and Home Assistant)
- a cooktop device (supported by SmartThings, Alexa and Home Assistant)
- a water heater device (supported by SmartThings and Home Assistant)
- a car charger device (supported by Home Assistant)
- a solar power device
- a battery storage device
- a heat pump device
- a basic video player (supported by SmartThings)
- a speaker device (supported by SmartThings)
- a soil sensor (Matter 1.5.0)
- an irrigation system (Matter 1.5.0)
- an irrigation system with four zones (Matter 1.5.0)

All these devices continuously change their state and position. The plugin also shows how to use all the command handlers (so you can control all the devices), how to subscribe to attributes, and how to trigger events.

If you want to write your own plugin, the easiest way to get started is to clone the [Matterbridge Plugin Template](https://github.com/Luligu/matterbridge-plugin-template). It has **Dev Container support for an instant development environment**, with all tools and extensions (like Node.js, npm, TypeScript, ESLint, Prettier, Jest, and Vitest) already loaded and configured.

If you like this project and find it useful, please consider giving it a star on [GitHub](https://github.com/Luligu/matterbridge-example-dynamic-platform) and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="120"></a>

## Prerequisites

### Matterbridge

See the guidelines on [Matterbridge](https://github.com/Luligu/matterbridge/blob/main/README.md) for more information.

## Repository setup

> **Note:** This repository uses a new toolchain. It replaces the traditional TypeScript / ESLint / Prettier / Jest stack with a faster, lighter setup.

- **No `typescript` package** — replaced by [TypeScript Native](https://github.com/microsoft/typescript-go). The `typescript` package is kept only as a publish-time dependency while tsgo is still in preview.
- **No ESLint, no Prettier** — replaced by the [oxc](https://oxc.rs) stack: [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting and [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for formatting.
- **No Jest** — replaced by [Vitest](https://vitest.dev), which is much faster and natively supports ESM without extra configuration.
- **Far fewer development dependencies** — the number of installed packages drops from **~600** to **~100**. A clean install is much faster.
- **Much faster linting and formatting** — oxlint and oxfmt run in a fraction of the time required by the ESLint / Prettier pipeline.
- **Much faster builds** — tsgo compiles the project in a fraction of the time required by the standard `tsc` build.
- **Editor support** — use the VS Code extensions for tsgo and oxc to get the same experience in the editor.

## Style guide

See also the [Style Guide](./STYLEGUIDE.md) for JSDoc, naming, and logging conventions used in this repository.
