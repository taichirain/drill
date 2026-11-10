import { ref, onUnmounted } from 'vue';

export function useTimer(durationSeconds: number, onExpire: () => void) {
  const remaining = ref(durationSeconds);
  const elapsed = ref(0);
  const isRunning = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;
  let startTime = 0;

  function start() {
    if (isRunning.value) return;
    isRunning.value = true;
    startTime = Date.now();

    timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      elapsed.value = diff;
      remaining.value = Math.max(0, durationSeconds - diff);

      if (remaining.value <= 0) {
        stop();
        onExpire();
      }
    }, 1000);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    isRunning.value = false;
  }

  function sync(serverRemaining: number) {
    remaining.value = serverRemaining;
    durationSeconds = serverRemaining + elapsed.value;
    startTime = Date.now() - elapsed.value * 1000;
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  onUnmounted(stop);

  return {
    remaining,
    elapsed,
    isRunning,
    start,
    stop,
    sync,
    formattedTime: () => formatTime(remaining.value),
  };
}
