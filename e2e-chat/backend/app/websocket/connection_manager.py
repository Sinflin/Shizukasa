from fastapi import WebSocket, WebSocketDisconnect
#websocket is a protocol that allows for full-duplex communication between a client and a server.
# It is commonly used in real-time applications such as chat applications, online gaming, and collaborative tools. 
#In this code snippet, the WebSocket class from the FastAPI framework is imported to handle WebSocket connections.
class ConnectionManager:
    # This class manages the WebSocket connections for the chat application. It keeps track of active connections and provides methods to connect, disconnect, and broadcast messages to all connected clients.
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

        #this websocket came from main.py fastapi and it is used to handle the websocket connection between the client and the server.
        
        #this dictionary will hold the active connections with user_id as key and WebSocket as value

    async def register(self, user_id: str, websocket: WebSocket):
        """Registers an already-accepted, already-authenticated socket.
        websocket.accept() must be called before this — accept has to
        happen first so the client can send its auth message at all."""
        if user_id in self.active_connections:
            # Close the stale connection from a previous session.
            old = self.active_connections[user_id]
            try:
                await old.close(code=4002) # 4002 = "another session has logged in" No need to send a message, the client will know from the close code.
            except Exception:
                pass  # already closed — ignore
        # Always store the new socket (whether replacing or new user).
        self.active_connections[user_id] = websocket
    def disconnect(self, user_id: str, websocket: WebSocket):
        # Only remove OUR socket. A newer login may already have replaced it.
        if self.active_connections.get(user_id) is websocket:
            del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, message: str) -> bool:
        ws = self.active_connections.get(user_id)
        if ws is None:
            return False
        try:
            await ws.send_text(message)
            return True
        except Exception:
            return False  # dead socket: caller keeps the message queued

        #Fuck man it is taking too long to complete this project 
        #Well i stil finish this