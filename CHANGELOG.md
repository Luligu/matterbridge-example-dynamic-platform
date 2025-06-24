# Changelog

All notable changes to this project will be documented in this file.

If you like this project and find it useful, please consider giving it a star on GitHub at https://github.com/Luligu/matterbridge-example-dynamic-platform and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="120">
</a>

## [1.2.5] - 2025-06-25

### Added

- [DevContainer]: Added support for the **Matterbridge Dev Container** with an optimized named volume for `node_modules`.
- [GitHub]: Added GitHub issue templates for bug reports and feature requests.
- [ESLint]: Refactored the flat config.
- [ESLint]: Added the plugins `eslint-plugin-promise`, `eslint-plugin-jsdoc`, and `@vitest/eslint-plugin`.
- [Jest]: Refactored the flat config.
- [Vitest]: Added Vitest for TypeScript project testing. It will replace Jest, which does not work correctly with ESM module mocks.
- [JSDoc]: Added missing JSDoc comments, including `@param` and `@returns` tags.

### Changed

- [package]: Require matterbridge 3.0.6.
- [package]: Updated package to Automator v. 2.0.1.
- [package]: Updated dependencies.
- [storage]: Bumped `node-storage-manager` to 2.0.0.
- [logger]: Bumped `node-ansi-logger` to 3.1.1.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.2.4] - 2025-06-13

### Added

- [npm]: The dev of matterbridge-example-dynamic-platform is published with tag **dev** on **npm** each day at 00:00 UTC if there is a new commit.

### Changed

- [package]: Require matterbridge 3.0.6.
- [package]: Updated package.
- [package]: Updated dependencies.
- [subscribe]: Prevent attribute setting when context is offline for air purifier and fan.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.2.3] - 2025-05-25

### Added

- [platform]: Added a cover device with both lift and tilt (supported by the Home app).
- [platform]: Added evse (EV charger) device type (not supported by the Home app).

### Changed

- [package]: Require matterbridge 3.0.5.
- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.2.2] - 2025-05-19

### Added

- [package]: Added waterHeater device type (not supported by Alexa and Apple Home)

### Changed

- [package]: Changed the RVC from local implementation to the new RoboticVacuumCleaner class from matterbridge.
- [package]: Require matterbridge 3.0.3.
- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.2.1] - 2025-05-15

### Changed

- [package]: Require matterbridge 3.0.1.
- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.2.0] - 2025-04-30

### Added

- [platform]: Added Robot Vacuum Cleaner device (supported by SmartThings, Alexa, Home Assistant and partially by Apple Home). Read carefully the readme please and also https://github.com/Luligu/matterbridge/discussions/264.
- [platform]: Added OnOff Mounted Switch device (supported by SmartThings, Alexa, Home Assistant).
- [platform]: Added Dimmer Mounted Switch device (supported by SmartThings, Alexa, Home Assistant).
- [platform]: Added Laundry Washer device (supported by SmartThings, Alexa and Home Assistant).
- [platform]: Added Laundry Dryer device (supported by SmartThings, Alexa and Home Assistant).
- [platform]: Added Dishwasher device (supported by SmartThings, Alexa and Home Assistant).
- [platform]: Added Refrigerator device (supported by SmartThings, Alexa and Home Assistant).
- [platform]: Added Oven device (supported by SmartThings, Alexa and Home Assistant).
- [platform]: Added Microwave Oven device (supported by SmartThings, Alexa and Home Assistant).
- [platform]: Added Extractor Hood device (supported by SmartThings, Alexa and Home Assistant).
- [platform]: Added Cooktop device (supported by SmartThings, Alexa and Home Assistant).

### Changed

- [package]: Require matterbridge 3.0.0.
- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.9] - 2025-04-07

### Added

- [platform]: Added select devices for the frontend Devices panel in the home page.
- [config]: Added enableConcentrationMeasurements option to fix the Apple Home issue: Air Quality devices and all SmokeCoAlarm sensors (with or without Smoke and Co) don't show up in the Home app if any of the concentration measurements clusters is present (Carbon Monoxide Concentration Measurements included).
- [platform]: Added smoke only SmokeCoAlarm sensor (supported by Apple Home 18.4).
- [platform]: Added co only SmokeCoAlarm sensor (supported by Apple Home 18.4).

### Changed

- [package]: Require matterbridge 2.2.7.
- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.8] - 2025-03-05

### Changed

- [package]: Require matterbridge 2.2.0.
- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.7] - 2025-02-11

### Added

- [platform]: Added generic momentary switch device.
- [platform]: Added generic latching switch device.
- [platform]: Added chaining provided by the new MatterbridgeEndpoint api.

### Changed

- [package]: Updated package.
- [package]: Updated dependencies.
- [package]: Require matterbridge 2.1.5.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.6] - 2025-02-02

### Changed

- [package]: Require matterbridge 2.1.0.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.4] - 2024-12-21

### Added

- [platform]: Added call to super.OnConfigure() and super.OnShutDown() to check endpoints numbers.

### Changed

- [package]: Updated dependencies.
- [package]: Updated package.

### Fixed

- [thermostat]: Fixed temperature

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.3] - 2024-12-16

### Added

- [package]: Added thermostat Heat only with two external temperature sensors (tagged like Indoor and Outdoor).
- [package]: Added thermostat Cool only.
- [package]: Added an airPurifier device with temperature and humidity sensor (supported by Apple Home).
- [package]: Added a pumpDevice device.
- [package]: Added a waterValve device.

### Changed

- [package]: Require matterbridge 1.6.7.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.2] - 2024-12-12

### Added

- [package]: Added the Matter 1.3 airConditioner device (not supported by Apple Home).
- [package]: Require matterbridge 1.6.6.
- [package]: Added Jest test with 100% coverage.

### Changed

- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.1.0] - 2024-11-25

### Changed

- [package]: Verified to work with matterbridge edge (matter.js new API).
- [package]: Require matterbridge 1.6.2
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.0.24] - 2024-11-10

### Changed

- [package]: Update to matterbridge edge.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.0.23] - 2024-10-28

### Changed

- [package]: Upgrade to matterbridge 1.6.0.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.0.22] - 2024-10-01

### Changed

- [package]: Upgrade to new workflows.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.0.21] - 2024-09-19

### Fixed

- [Dimmer] Fixed command handler

### Changed

- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.0.20] - 2024-09-08

### Fixed

- [Switch] Fixed command handler

### Changed

- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.0.19] - 2024-09-04

### Added

- [plugin] Added:
- a light with onOff
- a light with onOff, levelControl
- an air quality device

### Changed

- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

## [1.0.18] - 2024-09-03

### Added

- [plugin] Added:
- a light with onOff, levelControl and colorControl (with HS only) clusters
- a light with onOff, levelControl and colorControl (with XY only) clusters
- a light with onOff, levelControl and colorControl (with CT only) clusters
- a fan with FanControl cluster
- a rainSensor device
- a waterFreezeDetector device
- a waterLeakDetector device
- a smokeCoAlarm device

### Changed

- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

<!-- Commented out section
## [1.1.2] - 2024-03-08

### Added

- [Feature 1]: Description of the feature.
- [Feature 2]: Description of the feature.

### Changed

- [Feature 3]: Description of the change.
- [Feature 4]: Description of the change.

### Deprecated

- [Feature 5]: Description of the deprecation.

### Removed

- [Feature 6]: Description of the removal.

### Fixed

- [Bug 1]: Description of the bug fix.
- [Bug 2]: Description of the bug fix.

### Security

- [Security 1]: Description of the security improvement.
-->
