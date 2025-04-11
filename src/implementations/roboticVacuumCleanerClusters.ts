// Nothing to export right now

/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-namespace */

import { Identity } from 'matterbridge/matter';
import { OperationalState as OperationalStateNamespace } from 'matterbridge/matter/clusters';
import {
  Attribute,
  ClusterRegistry,
  Event,
  EventPriority,
  MutableCluster,
  OptionalAttribute,
  OptionalCommand,
  OptionalEvent,
  TlvArray,
  TlvEnum,
  TlvField,
  TlvNoArguments,
  TlvNullable,
  TlvObject,
  TlvOptionalField,
  TlvString,
  TlvUInt32,
  TlvUInt8,
  TypeFromSchema,
} from 'matterbridge/matter/types';

export namespace RvcOperationalState {
  /**
   * The values defined herein are applicable to this derived cluster of Operational State only and are additional to
   * the set of values defined in Operational State itself.
   *
   * RVC Pause Compatibility defines the compatibility of the states this cluster defines with the Pause command.
   *
   * ### Table 13. RVC Pause Compatibility
   *
   * RVC Resume Compatibility defines the compatibility of the states this cluster defines with the Resume command.
   *
   * ### Table 14. RVC Resume Compatibility
   *
   * While in the Charging or Docked states, the device shall NOT attempt to resume unless it transitioned to those
   * states while operating and can resume, such as, for example, if it is recharging while in a cleaning cycle. Else,
   * if the operational state is Charging or Docked but there’s no operation to resume or the operation can’t be
   * resumed, the device shall respond with an OperationalCommandResponse command with an ErrorStateID of
   * CommandInvalidInState but take no further action.
   *
   * @see {@link MatterSpecification.v14.Cluster} § 7.4.4.1
   */
  export enum OperationalState {
    /**
     * The device is stopped
     */
    Stopped = 0,

    /**
     * The device is operating
     */
    Running = 1,

    /**
     * The device is paused during an operation
     */
    Paused = 2,

    /**
     * The device is in an error state
     */
    Error = 3,

    /**
     * The device is en route to the charging dock
     */
    SeekingCharger = 64,

    /**
     * The device is charging
     */
    Charging = 65,

    /**
     * The device is on the dock, not charging
     */
    Docked = 66,
  }

  /**
   * The OperationalStateStruct is used to indicate a possible state of the device.
   *
   * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.2
   */
  export const TlvOperationalStateStruct = TlvObject({
    /**
     * This shall be populated with a value from the OperationalStateEnum.
     *
     * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.2.1
     */
    operationalStateId: TlvField(0, TlvEnum<OperationalState | OperationalStateNamespace.OperationalStateEnum>()),

    /**
     * This field shall be present if the OperationalStateID is from the set reserved for Manufacturer Specific
     * States, otherwise it shall NOT be present. If present, this shall contain a human-readable description of the
     * operational state.
     *
     * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.2.2
     */
    operationalStateLabel: TlvOptionalField(1, TlvString.bound({ maxLength: 64 })),
  });

  /**
   * The OperationalStateStruct is used to indicate a possible state of the device.
   *
   * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.2
   */
  export interface OperationalStateStruct extends TypeFromSchema<typeof TlvOperationalStateStruct> {}

  /**
   * The values defined herein are applicable to this derived cluster of Operational State only and are additional to
   * the set of values defined in Operational State itself.
   *
   * @see {@link MatterSpecification.v14.Cluster} § 7.4.4.2
   */
  export enum ErrorState {
    /**
     * The device is not in an error state
     */
    NoError = 0,

    /**
     * The device is unable to start or resume operation
     */
    UnableToStartOrResume = 1,

    /**
     * The device was unable to complete the current operation
     */
    UnableToCompleteOperation = 2,

    /**
     * The device cannot process the command in its current state
     */
    CommandInvalidInState = 3,

    /**
     * The device has failed to find or reach the charging dock
     */
    FailedToFindChargingDock = 64,

    /**
     * The device is stuck and requires manual intervention
     */
    Stuck = 65,

    /**
     * The device has detected that its dust bin is missing
     */
    DustBinMissing = 66,

    /**
     * The device has detected that its dust bin is full
     */
    DustBinFull = 67,

    /**
     * The device has detected that its water tank is empty
     */
    WaterTankEmpty = 68,

    /**
     * The device has detected that its water tank is missing
     */
    WaterTankMissing = 69,

    /**
     * The device has detected that its water tank lid is open
     */
    WaterTankLidOpen = 70,

    /**
     * The device has detected that its cleaning pad is missing
     */
    MopCleaningPadMissing = 71,
  }

  /**
   * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.4
   */
  export const TlvErrorStateStruct = TlvObject({
    /**
     * This shall be populated with a value from the ErrorStateEnum.
     *
     * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.4.1
     */
    errorStateId: TlvField(0, TlvEnum<ErrorState | OperationalStateNamespace.ErrorState>()),

    /**
     * This field shall be present if the ErrorStateID is from the set reserved for Manufacturer Specific Errors,
     * otherwise it shall NOT be present. If present, this shall contain a human-readable description of the
     * ErrorStateID; e.g. for a manufacturer specific ErrorStateID of "0x80" the ErrorStateLabel may contain "My
     * special error".
     *
     * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.4.2
     */
    errorStateLabel: TlvOptionalField(1, TlvString.bound({ maxLength: 64 })),

    /**
     * This shall be a human-readable string that provides details about the error condition. As an example, if the
     * ErrorStateID indicates that the device is a Robotic Vacuum that is stuck, the ErrorStateDetails contains
     * "left wheel blocked".
     *
     * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.4.3
     */
    errorStateDetails: TlvOptionalField(2, TlvString.bound({ maxLength: 64 })),
  });

  /**
   * @see {@link MatterSpecification.v14.Cluster} § 1.14.4.4
   */
  export interface ErrorStateStruct extends TypeFromSchema<typeof TlvErrorStateStruct> {}

  /**
   * Input to the RvcOperationalState operationalCommandResponse command
   *
   * @see {@link MatterSpecification.v14.Cluster} § 7.4.5
   */
  export const TlvOperationalCommandResponse = TlvObject({
    /**
     * This shall indicate the success or otherwise of the attempted command invocation. On a successful invocation
     * of the attempted command, the ErrorStateID shall be populated with NoError. Please see the individual command
     * sections for additional specific requirements on population.
     *
     * @see {@link MatterSpecification.v14.Cluster} § 1.14.6.5.1
     */
    commandResponseState: TlvField(0, TlvErrorStateStruct),
  });

  /**
   * Input to the RvcOperationalState operationalCommandResponse command
   *
   * @see {@link MatterSpecification.v14.Cluster} § 7.4.5
   */
  export interface OperationalCommandResponse extends TypeFromSchema<typeof TlvOperationalCommandResponse> {}

  /**
   * Body of the RvcOperationalState operationalError event
   *
   * @see {@link MatterSpecification.v14.Cluster} § 1.14.7.1
   */
  export const TlvOperationalErrorEvent = TlvObject({ errorState: TlvField(0, TlvErrorStateStruct) });

  /**
   * Body of the RvcOperationalState operationalError event
   *
   * @see {@link MatterSpecification.v14.Cluster} § 1.14.7.1
   */
  export interface OperationalErrorEvent extends TypeFromSchema<typeof TlvOperationalErrorEvent> {}

  /**
   * @see {@link Cluster}
   */
  export const ClusterInstance = MutableCluster({
    id: 0x61,
    name: 'RvcOperationalState',
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
      operationalStateList: Attribute(0x3, TlvArray(TlvOperationalStateStruct), { default: [] }),

      /**
       * This attribute specifies the current operational state of a device. This shall be populated with a valid
       * OperationalStateID from the set of values in the OperationalStateList Attribute.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.5
       */
      operationalState: Attribute(0x4, TlvEnum<OperationalState | OperationalStateNamespace.OperationalStateEnum>()),

      /**
       * This attribute shall specify the details of any current error condition being experienced on the device
       * when the OperationalState attribute is populated with Error. Please see ErrorStateStruct for general
       * requirements on the population of this attribute.
       *
       * When there is no error detected, this shall have an ErrorStateID of NoError.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.5.6
       */
      operationalError: Attribute(0x5, TlvErrorStateStruct),
    },

    commands: {
      pause: OptionalCommand(0x0, TlvNoArguments, 0x4, TlvOperationalCommandResponse),

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
      stop: OptionalCommand(0x1, TlvNoArguments, 0x4, TlvOperationalCommandResponse),

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
      start: OptionalCommand(0x2, TlvNoArguments, 0x4, TlvOperationalCommandResponse),

      /**
       * This command shall be supported if the device supports remotely resuming the operation. If this command
       * is supported, the Pause command shall also be supported.
       *
       * On receipt of this command, the device shall resume its operation from the point it was at when it
       * received the Pause command, or from the point when it was paused by means outside of this cluster (for
       * example by manual button press).
       *
       * If this command is received when already in the Running state the device shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of NoError but take no further action.
       *
       * A device that receives this command in any state which is not Resume-compatible shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of CommandInvalidInState and shall take no
       * further action.
       *
       * States are defined as Resume-compatible as follows:
       *
       *   • For states defined in this cluster specification, in Table 4, “Resume Compatibility”.
       *
       *   • For states defined by derived cluster specifications, in the corresponding specifications.
       *
       *   • For manufacturer-specific states, by the manufacturer.
       *
       * The following table defines the compatibility of this cluster’s states with the Resume command.
       *
       * ### Table 4. Resume Compatibility
       *
       * A device that is unable to honor the Resume command for any other reason shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of UnableToStartOrResume but take no further
       * action.
       *
       * Otherwise, on success:
       *
       *   • The OperationalState attribute shall be set to the most recent non-Error operational state prior to
       *     entering the Paused state.
       *
       *   • The device shall respond with an OperationalCommandResponse command with an ErrorStateID of NoError.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 1.14.6.4
       */
      resume: OptionalCommand(0x3, TlvNoArguments, 0x4, TlvOperationalCommandResponse),
      /**
       * On receipt of this command, the device shall start seeking the charging dock, if possible in the current
       * state of the device.
       *
       * If this command is received when already in the SeekingCharger state the device shall respond with an
       * OperationalCommandResponse command with an ErrorStateID of NoError but the command shall have no other
       * effect.
       *
       * A device that receives this command in any state which does not allow seeking the charger, such as
       * Charging or Docked, shall respond with an OperationalCommandResponse command with an ErrorStateID of
       * CommandInvalidInState and shall have no other effect.
       *
       * Otherwise, on success:
       *
       *   • The OperationalState attribute shall be set to SeekingCharger.
       *
       *   • The device shall respond with an OperationalCommandResponse command with an ErrorStateID of NoError.
       *
       * @see {@link MatterSpecification.v14.Cluster} § 7.4.5.1
       */
      goHome: OptionalCommand(0x80, TlvNoArguments, 0x4, TlvOperationalCommandResponse),
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
      operationalError: Event(0x0, EventPriority.Critical, TlvOperationalErrorEvent),

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
      operationCompletion: OptionalEvent(0x1, EventPriority.Info, OperationalStateNamespace.TlvOperationCompletionEvent),
    },
  });

  /**
   * This cluster is derived from the Operational State cluster and provides an interface for monitoring the
   * operational state of a robotic vacuum cleaner.
   *
   * @see {@link MatterSpecification.v14.Cluster} § 7.4
   */
  export interface Cluster extends Identity<typeof ClusterInstance> {}

  export const Cluster: Cluster = ClusterInstance;
  export const Complete = Cluster;
}

export type RvcOperationalStateCluster = RvcOperationalState.Cluster;
export const RvcOperationalStateCluster = RvcOperationalState.Cluster;
ClusterRegistry.register(RvcOperationalState.Complete);
