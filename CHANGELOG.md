# Changelog

All notable changes to this project will be documented in this file.

If you like this project and find it useful, please consider giving it a star on GitHub at https://github.com/Luligu/matterbridge-example-dynamic-platform and sponsoring it.

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
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
</a>

## [1.1.6] - 2025-02-02

### Changed

- [package]: Require matterbridge 2.1.0.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
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
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
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
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
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
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
</a>

## [1.1.0] - 2024-11-25

### Changed

- [package]: Verified to work with matterbridge edge (matter.js new API).
- [package]: Require matterbridge 1.6.2
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
</a>

## [1.0.24] - 2024-11-10

### Changed

- [package]: Update to matterbridge edge.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
</a>

## [1.0.23] - 2024-10-28

### Changed

- [package]: Upgrade to matterbridge 1.6.0.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
</a>

## [1.0.22] - 2024-10-01

### Changed

- [package]: Upgrade to new workflows.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
</a>

## [1.0.21] - 2024-09-19

### Fixed

- [Dimmer] Fixed command handler

### Changed

- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
</a>

## [1.0.20] - 2024-09-08

### Fixed

- [Switch] Fixed command handler

### Changed

- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
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
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
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
  <img src="./yellow-button.png" alt="Buy me a coffee" width="120">
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
