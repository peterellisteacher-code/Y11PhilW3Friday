'use strict';

// Tiny pub/sub for cross-scene events.
// Channels:
//   lesson:complete  { lesson, digit, podCode }
//   evidence:earned  { card, lesson }
//   vault:unlocked   { podCode }
//   hud:announce     { message, assertive: boolean }
const EventBus = (() => {
  const handlers = {};
  return {
    on(event, fn) {
      (handlers[event] = handlers[event] || []).push(fn);
      return () => this.off(event, fn);
    },
    off(event, fn) {
      handlers[event] = (handlers[event] || []).filter(h => h !== fn);
    },
    emit(event, payload) {
      (handlers[event] || []).forEach(fn => {
        try { fn(payload); } catch (e) { console.warn(`EventBus[${event}] handler threw`, e); }
      });
    },
  };
})();

// Live-region announcer — wires hud:announce to the screen-reader regions
// declared in index.html. Setting textContent triggers AT announcement.
EventBus.on('hud:announce', ({ message, assertive = false }) => {
  const id = assertive ? 'hud-assertive' : 'hud-polite';
  const el = document.getElementById(id);
  if (el) el.textContent = message;
});

// Convenience helper used throughout the game
function announce(message, assertive = false) {
  EventBus.emit('hud:announce', { message, assertive });
}
