/* eslint-disable @typescript-eslint/no-empty-object-type */
import { Identity } from 'matterbridge/matter';
import { OperationalState } from 'matterbridge/matter/clusters';
import {
  Attribute,
  EventPriority,
  MutableCluster,
  OptionalAttribute,
  TlvArray,
  Event,
  TlvEnum,
  TlvNullable,
  TlvString,
  TlvUInt32,
  TlvUInt8,
  OptionalEvent,
  ClusterRegistry,
  TlvNoArguments,
  Command,
} from 'matterbridge/matter/types';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace OvenCavityOperationalState {
  /**
   * @see {@link Cluster}
   */
  export const ClusterInstance = MutableCluster({
    id: 0x48,
    name: 'OvenCavityOperationalState',
    revision: 2,

    attributes: {
      /**
       * Indicates a list of names of different phases that the device can go through for the selected function or
       * mode. The list may not be in sequence order. For example in a washing machine this could include items
       * such as "pre-soak", "rinse", and "spin". These phases are manufacturer specific and may change when a
       * different function or mode is selected.
       *
       * A null value indicates that the device does not present phases during its operation. When this
       * attribute’s value is null, the CurrentPhase attribute shall also be set to null.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.1
       */
      phaseList: Attribute(0x0, TlvNullable(TlvArray(TlvString, { maxLength: 32 }))),

      /**
       * This attribute represents the current phase of operation being performed by the server. This shall be the
       * positional index representing the value from the set provided in the PhaseList Attribute,
       *
       * where the first item in that list is an index of 0. Thus, this attribute shall have a maximum value that
       * is "length(PhaseList) - 1".
       *
       * Null if the PhaseList attribute is null or if the PhaseList attribute is an empty list.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.2
       */
      currentPhase: Attribute(0x1, TlvNullable(TlvUInt8)),

      /**
       * Indicates the estimated time left before the operation is completed, in seconds.
       *
       * A value of 0 (zero) means that the operation has completed.
       *
       * A value of null represents that there is no time currently defined until operation completion. This may
       * happen, for example, because no operation is in progress or because the completion time is unknown.
       *
       * Changes to this attribute shall only be marked as reportable in the following cases:
       *
       *   • If it has changed due to a change in the CurrentPhase or OperationalState attributes, or
       *
       *   • When it changes from 0 to any other value and vice versa, or
       *
       *   • When it changes from null to any other value and vice versa, or
       *
       *   • When it increases, or
       *
       *   • When there is any increase or decrease in the estimated time remaining that was due to progressing
       *     insight of the server’s control logic, or
       *
       *   • When it changes at a rate significantly different from one unit per second.
       *
       * Changes to this attribute merely due to the normal passage of time with no other dynamic change of device
       * state shall NOT be reported.
       *
       * As this attribute is not being reported during a regular countdown, clients SHOULD NOT rely on the
       * reporting of this attribute in order to keep track of the remaining duration.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.3
       */
      countdownTime: OptionalAttribute(0x2, TlvNullable(TlvUInt32.bound({ max: 259200 })), { default: null }),

      /**
       * This attribute describes the set of possible operational states that the device exposes. An operational
       * state is a fundamental device state such as Running or Error. Details of the phase of a device when, for
       * example, in a state of Running are provided by the CurrentPhase attribute.
       *
       * All devices shall, at a minimum, expose the set of states matching the commands that are also supported
       * by the cluster instance, in addition to Error. The set of possible device states are defined in the
       * OperationalStateEnum. A device type requiring implementation of this cluster shall define the set of
       * states that are applicable to that specific device type.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.4
       */
      operationalStateList: Attribute(0x3, TlvArray(OperationalState.TlvOperationalStateStruct), { default: [] }),

      /**
       * This attribute specifies the current operational state of a device. This shall be populated with a valid
       * OperationalStateID from the set of values in the OperationalStateList Attribute.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.5
       */
      operationalState: Attribute(0x4, TlvEnum<OperationalState.OperationalStateEnum>()),

      /**
       * This attribute shall specify the details of any current error condition being experienced on the device
       * when the OperationalState attribute is populated with Error. Please see ErrorStateStruct for general
       * requirements on the population of this attribute.
       *
       * When there is no error detected, this shall have an ErrorStateID of NoError.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.6
       */
      operationalError: Attribute(0x5, OperationalState.TlvErrorStateStruct),
    },

    commands: {
      /**
       * This command shall be supported if the device supports remotely stopping the operation.
       *
       * On receipt of this command, the device shall stop its operation if it is at a position where it is safe
       * to do so and/or permitted. Restart of the device following the receipt of the Stop command shall require
       * attended operation unless remote start is allowed by the device type and any jurisdiction governing
       * remote operation of the device.
       *
       * If this command is received when already in the Stopped state the device shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of NoError but take no further action.
       *
       * A device that is unable to honor the Stop command for whatever reason shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of CommandInvalidInState but take no further
       * action.
       *
       * Otherwise, on success:
       *
       *   • The OperationalState attribute shall be set to Stopped.
       *
       *   • The device shall respond with an OperationalCommandResponse command with an ErrorStateID of NoError.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.6.2
       */
      stop: Command(0x1, TlvNoArguments, 0x4, OperationalState.TlvOperationalCommandResponse),

      /**
       * This command shall be supported if the device supports remotely starting the operation. If this command
       * is supported, the 'Stop command shall also be supported.
       *
       * On receipt of this command, the device shall start its operation if it is safe to do so and the device is
       * in an operational state from which it can be started. There may be either regulatory or
       * manufacturer-imposed safety and security requirements that first necessitate some specific action at the
       * device before a Start command can be honored. In such instances, a device shall respond with a status
       * code of CommandInvalidInState if a Start command is received prior to the required on- device action.
       *
       * If this command is received when already in the Running state the device shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of NoError but take no further action.
       *
       * A device that is unable to honor the Start command for whatever reason shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of UnableToStartOrResume but take no further
       * action.
       *
       * Otherwise, on success:
       *
       *   • The OperationalState attribute shall be set to Running.
       *
       *   • The device shall respond with an OperationalCommandResponse command with an ErrorStateID of NoError.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.6.3
       */
      start: Command(0x2, TlvNoArguments, 0x4, OperationalState.TlvOperationalCommandResponse),
    },

    events: {
      /**
       * This event is generated when a reportable error condition is detected. A device that generates this event
       * shall also set the OperationalState attribute to Error, indicating an error condition.
       *
       * This event shall contain the following fields:
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.7.1
       */
      operationalError: Event(0x0, EventPriority.Critical, OperationalState.TlvOperationalErrorEvent),

      /**
       * This event SHOULD be generated when the overall operation ends, successfully or otherwise. For example,
       * the completion of a cleaning operation in a Robot Vacuum Cleaner, or the completion of a wash cycle in a
       * Washing Machine.
       *
       * It is highly recommended that appliances device types employing the Operational State cluster support
       * this event, even if it is optional. This assists clients in executing automations or issuing
       * notifications at critical points in the device operation cycles.
       *
       * This event shall contain the following fields:
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.7.2
       */
      operationCompletion: OptionalEvent(0x1, EventPriority.Info, OperationalState.TlvOperationCompletionEvent),
    },
  });

  /**
   * This cluster is derived from the Operational State cluster and provides an interface for monitoring the
   * operational state of an oven.
   *
   * @see {@link MatterSpecification.v14.Cluster} § 8.10
   */
  export interface Cluster extends Identity<typeof ClusterInstance> {}

  export const Cluster: Cluster = ClusterInstance;
  export const Complete = Cluster;
}

export type OvenCavityOperationalStateCluster = OvenCavityOperationalState.Cluster;
export const OvenCavityOperationalStateCluster = OvenCavityOperationalState.Cluster;
ClusterRegistry.register(OvenCavityOperationalState.Complete);
