import { io, type Socket } from 'socket.io-client'
import { SOCKET_NAMESPACE } from '@skytrace/shared'

export function apiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

/**
 * Opens the live stream connection.
 *
 * Reconnection is deliberately aggressive at first and then backs off: a dropped
 * connection is usually a transient network blip, but a server that is down should not be
 * hammered by every open tab.
 */
export function createStreamSocket(): Socket {
  return io(`${apiBaseUrl()}${SOCKET_NAMESPACE}`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
    autoConnect: true,
  })
}
