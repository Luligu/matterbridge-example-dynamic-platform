# <img src="https://github.com/Luligu/matterbridge/blob/main/frontend/public/matterbridge%2064x64.png" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge dynamic platform example plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-example-dynamic-platform.svg)](https://www.npmjs.com/package/matterbridge-example-dynamic-platform)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-example-dynamic-platform.svg)](https://www.npmjs.com/package/matterbridge-example-dynamic-platform)

[![power by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![power by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![power by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![power by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

Matterbridge dynamic platform example plugin is a template to develop your own plugin using the dynamic platform.

It exposes:
- a switch with onOff cluster
- a light with onOff-levelControl-colorControl clusters
- an outlet with onOff cluster
- a cover with windowCovering cluster
- a lock with doorLock cluster
- a thermo with thermostat cluster and 2 sub endpoints with flowMeasurement cluster and temperatureMeasurement cluster (to show how to create a composed device with sub enpoints)

All these devices continuously change state and position. The plugin also shows how to use all the command handlers (you can control all the devices) and how to subscribe to attributes.

See the guidelines on [Matterbridge](https://github.com/Luligu/matterbridge/blob/main/README.md) for more information.
