import { ref, onUnmounted } from 'vue';

export function useWebSocket(url: string) {
  const ws = ref<WebSocket | null>(null);
  const connected = ref(false);
  const messages = ref<string[]>([]);
  const error = ref<string | null>(null);

  function connect() {
    if (ws.value?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(url);
    ws.value = socket;

    socket.onopen = () => {
      connected.value = true;
      error.value = null;
    };

    socket.onmessage = (event) => {
      messages.value.push(event.data);
    };

    socket.onerror = () => {
      error.value = 'WebSocket 连接出错';
    };

    socket.onclose = () => {
      connected.value = false;
    };
  }

  function send(data: string) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(data);
    }
  }

  function disconnect() {
    ws.value?.close();
    ws.value = null;
    connected.value = false;
  }

  onUnmounted(disconnect);

  return { ws, connected, messages, error, connect, send, disconnect };
}
