/**
 * Explicit time-travel state machine.
 * TimeTravelController is the only place that should change this.
 */
export const TimeTravelState = {
  IDLE: "idle",
  SELECTED: "selected",
  ACCELERATING: "accelerating",
  APPROACHING: "approaching",
  ENTERING: "entering",
  TUNNEL: "tunnel",
  FLASH: "flash",
  BLACK: "black",
  NAVIGATING: "navigating",
};

export const TRAVEL_ORDER = [
  TimeTravelState.IDLE,
  TimeTravelState.SELECTED,
  TimeTravelState.ACCELERATING,
  TimeTravelState.APPROACHING,
  TimeTravelState.ENTERING,
  TimeTravelState.TUNNEL,
  TimeTravelState.FLASH,
  TimeTravelState.BLACK,
  TimeTravelState.NAVIGATING,
];
