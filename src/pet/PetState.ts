export type PetState =
  | 'idle'
  | 'running'
  | 'happy_running'
  | 'barking'
  | 'sleeping'
  | 'worried'
  | 'scared'
  | 'tired'
  | 'jumping'
  | 'night_idle';

export interface PetContext {
  state: PetState;
  previousState: PetState;
  errorCount: number;
  isNightMode: boolean;
  typingStartTime: number | null;
  lastActivityTime: number;
  codingSessionStart: number;
  isVisible: boolean;
}

export const STATE_DURATIONS: Partial<Record<PetState, number>> = {
  barking: 1200,
};

export const TIMINGS = {
  IDLE_AFTER_MS:        6000,    // 6s no typing → idle
  FIDGET_AFTER_MS:      8000,    // 8s → bored fidget hop
  WANDER_AFTER_MS:      12000,   // 12s → start wander
  PRE_SLEEP_TIRED_MS:   22000,   // 22s → show tired before sleeping (after wander returns)
  SLEEP_AFTER_MS:       25000,   // 25s → sleep
  HAPPY_TYPING_MS:      4000,    // 4s typing → happy run
  TIRED_AFTER_MS:       7200000, // 2h session → tired
  TIRED_RESET_MS:       600000,  // 10min rest → reset tired
  SCARED_ERROR_COUNT:   5,       // errors >= 5 → scared
  WORRIED_ERROR_COUNT:  2,       // errors >= 2 → worried
  NIGHT_START_HOUR:     4,       // 4 AM
  NIGHT_END_HOUR:       6,       // 6 AM
  ANIMATION_SPEED_MS:   500,     // frame swap speed
  MOVEMENT_SPEED_MS:    500,     // state + movement tick speed
  NIGHT_CHECK_MS:       60000,   // check night mode every minute
};