from typing import Dict, List
from fastapi import WebSocket
import json


class ConnectionManager:
    """Aktif WebSocket bağlantılarını yönetir."""

    def __init__(self):
        # {match_id: {user_id: WebSocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, match_id: str, user_id: str):
        await websocket.accept()
        if match_id not in self.active_connections:
            self.active_connections[match_id] = {}
        self.active_connections[match_id][user_id] = websocket

    def disconnect(self, match_id: str, user_id: str):
        if match_id in self.active_connections:
            self.active_connections[match_id].pop(user_id, None)
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]

    async def broadcast(self, match_id: str, message: dict):
        """Maçtaki tüm oyunculara mesaj gönderir."""
        if match_id not in self.active_connections:
            return
        dead = []
        for uid, ws in self.active_connections[match_id].items():
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(match_id, uid)

    async def send_personal(self, match_id: str, user_id: str, message: dict):
        """Sadece belirli bir oyuncuya mesaj gönderir."""
        ws = self.active_connections.get(match_id, {}).get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                self.disconnect(match_id, user_id)

    def get_connected_users(self, match_id: str) -> List[str]:
        return list(self.active_connections.get(match_id, {}).keys())


manager = ConnectionManager()
