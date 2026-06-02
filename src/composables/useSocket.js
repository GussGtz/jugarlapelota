import { onMounted, onUnmounted } from 'vue'
import { connectSocket, disconnectSocket, requestNotificationPermission } from '@/services/socket'

export function useSocket() {
  onMounted(async () => {
    await requestNotificationPermission()
    connectSocket()
  })
  onUnmounted(() => disconnectSocket())
}
