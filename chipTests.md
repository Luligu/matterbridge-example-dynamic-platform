## Chip tests

### Create and start the container (Linux, macOS, and Windows)

Run the `luligu/matterbridge:chip-test` docker image:

- frontend on port 8585
- plugin mapped to .
- container test logs directory mapped on ./temp directory

```shell
node scripts/run-chip-tests.mjs --start
```

### Run all configured tests inside the container

```shell
node scripts/run-chip-tests.mjs
```

### Manually run the tests inside the container

Open a shell in the container

```shell
docker exec -it chip-test bash
```

In the shell:

```bash
# Generic device composition and conformance (see Known Issues below for TC_DeviceBasicComposition)
python3 src/python_testing/TC_DeviceBasicComposition.py
python3 src/python_testing/TC_DeviceConformance.py
python3 src/python_testing/TC_DefaultWarnings.py --bool-arg pixit_allow_default_vendor_id:true
```

### Stop the container

```shell
node scripts/run-chip-tests.mjs --stop
```

### Known Issues

1. `TC_DeviceBasicComposition.py` — `test_TC_DESC_2_1` fails on the Venetian Blind Closure device example
   (`Closure`, `DeviceType 560`, endpoint 18) and its Lift/Tilt Closure Panel children (`DeviceType 561`,
   endpoints 19/20). Their `TagList` attributes carry tags from the Matter 1.6 Closure namespace family
   (`0x44` Closure, `0x45` Closure Panel, `0x46` Closure Covering), but the `connectedhomeip` checkout
   bundled in `luligu/matterbridge:chip-test` (`1.6.0` branch) has an accepted-namespace whitelist in
   `TC_DeviceBasicComposition.py` that stops at `0x43` (Switches) — none of `0x44`-`0x48` are in it, even
   though all five are already defined in that same checkout's bundled data model
   (`data_model/1.6/allfiles.zip/namespaces/Namespace-Closure*.xml`). Because `fail_current_test()` aborts
   the check on the first offending endpoint it iterates to (iteration order varies run to run), only one
   endpoint is ever reported per run, but the gap affects every endpoint using these namespaces. Verified
   with `chip-tool descriptor read tag-list 0x12344321 {18,19,20}` and
   `chip-tool descriptor read device-type-list 0x12344321 {18,19,20}`. This is a gap in the bundled test
   suite, not a plugin defect — the plugin's tags are correct per the Matter 1.6 spec. Filed upstream:
   [project-chip/connectedhomeip#73479](https://github.com/project-chip/connectedhomeip/issues/73479).
   Expected to resolve once that issue is fixed and the Docker image ships an updated `connectedhomeip`
   checkout. Not marked `"skip": true` in `chipTests.json` since the rest of the file's sub-tests still
   provide useful coverage; only `test_TC_DESC_2_1` is affected.
