# Main Python Folder for the backend application
from fastapi import FastAPI,WebSocket,WebSocketDisconnect
from app.websocket.connection_manager import ConnectionManager
import json 

app = FastAPI(title = "E2E Chat Application", description = "This is a End to End Chatting Website using Websocket and Fastapi.")

manager = ConnectionManager()

@app.get("/")
def health_check():
    return {"message": "Server is running!"}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                to = data["to"]
                message = data["message"]
            except (json.JSONDecodeError, KeyError, TypeError):
                await websocket.send_text(json.dumps({"error": "invalid message format"}))
                continue
            await manager.send_to_user(to, json.dumps({
                "from": user_id,
                "message": message,
            }))
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id)