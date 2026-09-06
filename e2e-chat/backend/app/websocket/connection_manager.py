from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    # This class manages the WebSocket connections for the chat application. It keeps track of active connections and provides methods to connect, disconnect, and broadcast messages to all connected clients.
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

        #this websocket came from main.py fastapi and it is used to handle the websocket connection between the client and the server.
        
        #this dictionary will hold the active connections with user_id as key and WebSocket as value

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id in self.active_connections:
            old = self.active_connections[user_id]
            await old.close()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        # This method is called when a WebSocket connection is closed. It removes the connection from the active connections dictionary.
        self.active_connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: str):
        # This method sends a message to a specific user identified by user_id. It retrieves the WebSocket connection from the active connections dictionary and sends the message.
        connection = self.active_connections.get(user_id)
        if connection:
            await connection.send_text(message)
            return True
        return False # If the user is not connected, it returns False.