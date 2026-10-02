from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json

from app.database import Base, engine
from app.websocket.connection_manager import ConnectionManager
from app.routers import auth, contact

# Creates chat_app.db and all tables on first run — fine for dev,
# swap for Alembic migrations once the schema needs to evolve.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="E2E Chat Application",
    description="End to End Chatting Website using WebSocket and FastAPI.",
)

app.include_router(auth.router)
app.include_router(contact.router)

manager = ConnectionManager()


@app.get("/")
def health_check():
    return {"message": "Server is running!"}


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    # NOTE: this endpoint is still unauthenticated (Phase 1 behavior).
    # Phase 2b should require a valid access token here — see note below.
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