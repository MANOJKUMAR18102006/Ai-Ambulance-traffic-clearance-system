// ──────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Change this IP to your computer's local network IP
// when testing on a physical device (e.g.,92.168.1.10)
// For Android emulator, use 10.0.2.2
// For iOS simulator, use localhost
// ──────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

const LOCAL_IP = '192.168.137.37'; // ← Your PC's local IP

const BASE_URL = `http://${LOCAL_IP}:5000`;

export const API_BASE = `${BASE_URL}/api`;
export { BASE_URL };
