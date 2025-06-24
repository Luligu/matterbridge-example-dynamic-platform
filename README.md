# <img src="https://github.com/Luligu/matterbridge/blob/main/frontend/public/matterbridge%2064x64.png" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge dynamic platform example plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-example-dynamic-platform.svg)](https://www.npmjs.com/package/matterbridge-example-dynamic-platform)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-example-dynamic-platform.svg)](https://www.npmjs.com/package/matterbridge-example-dynamic-platform)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge?label=docker%20version&sort=semver)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge.svg)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-example-dynamic-platform/actions/workflows/build-matterbridge-plugin.yml/badge.svg)
![Coverage](https://img.shields.io/badge/Jest%20coverage-100%25-brightgreen)
![CodeQL](https://github.com/Luligu/matterbridge-example-dynamic-platform/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/matterbridge-example-dynamic-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/matterbridge-example-dynamic-platformr)

[![power by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![power by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![power by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![power by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

Matterbridge dynamic platform example plugin is a template to develop your own plugin using the dynamic platform.

It exposes 41 virtual devices:

- a switch with onOff cluster
- a light with onOff
- a light with onOff and levelControl (dimmer)
- a light with onOff, levelControl and colorControl (with XY, HS and CT) clusters
- a light with onOff, levelControl and colorControl (with HS and CT) clusters
- a light with onOff, levelControl and colorControl (with XY and CT) clusters
- a light with onOff, levelControl and colorControl (with CT only) clusters
- an outlet (plug) with onOff cluster
- a cover with windowCovering cluster and lift feature
- a cover with windowCovering cluster and both lift and tilt features
- a lock with doorLock cluster
- a thermo autoMode (i.e. with Auto Heat and Cool features) with thermostat cluster and 3 sub endpoints with flowMeasurement cluster, temperatureMeasurement cluster
  and relativeHumidityMeasurement cluster (to show how to create a composed device with sub endpoints)
- a thermo heat only with two external temperature sensors (tagged like Indoor and Outdoor)
- a thermo cool only
- a fan with FanControl cluster
- a rainSensor device
- a waterFreezeDetector device
- a waterLeakDetector device
- a smokeCoAlarm (with smoke and co features) sensor (supported by Apple Home)
- a smokeCoAlarm (with smoke only feature) sensor (supported by Apple Home)
- a smokeCoAlarm (with co only feature) sensor (supported by Apple Home)
- an airConditioner device
- an airPurifier device with temperature and humidity sensor (supported by Apple Home)
- a pumpDevice device
- a waterValve device
- an airQuality device with all concentration measurements clusters (supported by Apple Home with the concentration measurements from version 18.5)
- a momentary switch
- a latching switch
- a Robot Vacuum Cleaner device (supported by SmartThings, Alexa, Home Assistant and partially by Apple Home). Read also https://github.com/Luligu/matterbridge/discussions/264.
- a onOff Mounted Switch device (supported by SmartThings, Alexa, Home Assistant)
- a dimmer Mounted Switch device (supported by SmartThings, Alexa, Home Assistant)
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

All these devices continuously change state and position. The plugin also shows how to use all the command handlers (you can control all the devices), how to subscribe to attributes and how to trigger events.

If you like this project and find it useful, please consider giving it a star on GitHub at https://github.com/Luligu/matterbridge-example-dynamic-platform and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="120">
</a>

## Prerequisites

### Matterbridge

See the guidelines on [Matterbridge](https://github.com/Luligu/matterbridge/blob/main/README.md) for more information.
