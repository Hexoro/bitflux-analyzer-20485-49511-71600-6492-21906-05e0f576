/**
 * Idle Detector Utility
 * Tracks user activity and fires callbacks after periods of inactivity
 */

export type IdleCallback = () => void;
export type IdleCleanup = () => void;

interface IdleDetectorOptions {
  /** Milliseconds of inactivity before triggering callback */
  idleMs: number;
  /** Events to track as user activity */
  events?: string[];
  /** Whether to fire only once or repeatedly */
  once?: boolean;
}

const DEFAULT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * Creates an idle detector that fires a callback after N ms of no user activity
 */
export function onIdle(
  callback: IdleCallback,
  options: IdleDetectorOptions | number
): IdleCleanup {
  const opts: IdleDetectorOptions = typeof options === 'number' 
    ? { idleMs: options } 
    : options;
  
  const { idleMs, events = DEFAULT_EVENTS, once = false } = opts;
  
  let timeoutId: number | null = null;
  let fired = false;
  let disposed = false;

  const resetTimer = () => {
    if (disposed) return;
    if (fired && once) return;
    
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      if (disposed) return;
      fired = true;
      callback();
    }, idleMs);
  };

  // Attach listeners
  events.forEach(event => {
    window.addEventListener(event, resetTimer, { passive: true, capture: true });
  });

  // Start initial timer
  resetTimer();

  // Return cleanup function
  return () => {
    disposed = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    events.forEach(event => {
      window.removeEventListener(event, resetTimer, { capture: true });
    });
  };
}

/**
 * Idle State Machine for test scheduling
 */
export type IdleState = 'active' | 'idle' | 'deep-idle';

interface IdleStateCallbacks {
  onIdle?: () => void;
  onDeepIdle?: () => void;
  onActive?: () => void;
}

export function createIdleStateMachine(
  idleMs: number,
  deepIdleMs: number,
  callbacks: IdleStateCallbacks
): IdleCleanup {
  let state: IdleState = 'active';
  let idleTimer: number | null = null;
  let deepIdleTimer: number | null = null;
  let disposed = false;

  const events = DEFAULT_EVENTS;

  const transitionTo = (newState: IdleState) => {
    if (disposed || state === newState) return;
    state = newState;
    
    if (newState === 'idle') {
      callbacks.onIdle?.();
    } else if (newState === 'deep-idle') {
      callbacks.onDeepIdle?.();
    } else if (newState === 'active') {
      callbacks.onActive?.();
    }
  };

  const clearTimers = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (deepIdleTimer !== null) {
      clearTimeout(deepIdleTimer);
      deepIdleTimer = null;
    }
  };

  const resetTimers = () => {
    if (disposed) return;
    
    // If we were idle/deep-idle, transition back to active
    if (state !== 'active') {
      transitionTo('active');
    }
    
    clearTimers();
    
    // Schedule idle transition
    idleTimer = window.setTimeout(() => {
      if (disposed) return;
      transitionTo('idle');
      
      // Schedule deep idle transition
      deepIdleTimer = window.setTimeout(() => {
        if (disposed) return;
        transitionTo('deep-idle');
      }, deepIdleMs - idleMs);
    }, idleMs);
  };

  // Attach listeners
  events.forEach(event => {
    window.addEventListener(event, resetTimers, { passive: true, capture: true });
  });

  // Start initial timers
  resetTimers();

  // Return cleanup
  return () => {
    disposed = true;
    clearTimers();
    events.forEach(event => {
      window.removeEventListener(event, resetTimers, { capture: true });
    });
  };
}
