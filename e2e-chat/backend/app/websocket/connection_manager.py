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

    async def register(self, user_id: str,websocket : WebSocket):
        #This method registers a new WebSocket connection for a user. 
        #It adds the connection to the active connections dictionary and accepts the WebSocket connection.
        """Registers an already-accepted, already-authenticated socket.
        Call websocket.accept() yourself before this — accept has to
        happen first so the client can send its auth message at all."""
        if user_id in self.active_connections:
            old = self.active_connections[user_id]
            await old.close()
            #this code checks if the user_id is already present in the active connections dictionary. 
            # If it is, it retrieves the old WebSocket connection and closes it to ensure that only one connection per user is maintained.
        else:
            await websocket.accept()
            self.active_connections[user_id] = websocket
        #This code accepts the new WebSocket connection and adds it to the active connections dictionary with the user_id as the key.
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