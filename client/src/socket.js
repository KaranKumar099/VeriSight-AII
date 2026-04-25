import { io } from "socket.io-client";
import { API_BASE } from "./api";

export function createAnalyticsSocket() {
  return io(API_BASE, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800
  });
}
