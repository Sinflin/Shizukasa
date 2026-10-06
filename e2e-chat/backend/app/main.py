from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
from jose import JWTError, jwt
# WebSocket is a protocol that allows for full-duplex communication between a client and a server. 
#It is commonly used in real-time applications such as chat applications, online gaming, and collaborative tools.
from app.database import Base, engine
from app.websocket.connection_manager import ConnectionManager
from app.routers import auth, contact
from app.services.jwt_handler import decode_token


# Creates chat_app.db and all tables on first run — fine for dev,
# swap for Alembic migrations once the schema needs to evolve.
Base.metadata.create_all(bind=engine)
#Base.metadata.create_all(bind=engine) is a method that creates all the tables defined in the SQLAlchemy models in the database specified by the engine.

app = FastAPI(
    title="E2E Chat Application",
    description="End to End Chatting Website using WebSocket and FastAPI.",
)

# Allow the frontend (file:// origin or a dev server) to reach the API.
# We use allow_credentials=False because auth is done via the
# Authorization: Bearer header, NOT cookies — so credentials=True
# is not needed and would conflict with allow_origins=["*"].
# Tighten allowed_origins before deploying to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(contact.router)

manager = ConnectionManager()


@app.get("/")
def health_check():
    return {"message": "Server is running!"}


async def _authenticate_socket(websocket: WebSocket) -> str | None:
    """Waits for the client's first message — expects {"token": "..."}.
    Returns the verified phone_number (JWT sub) on success, or closes
    the connection and returns None on failure."""
    try:
        raw = await websocket.receive_text()
        data = json.loads(raw)
        token = data['token']
    except (json.JSONDecodeError, KeyError, TypeError):
        await websocket.send_text(json.dumps({"error": "invalid auth message format"}))
        await websocket.close(code = 4001)
        return None

    try:
        user_id = decode_token(token, expected_type = 'access')
    except JWTError:
        await websocket.send_text(json.dumps({"error": "invalid token"}))
        await websocket.close(code = 4001)
        return None


    await websocket.send_text(json.dumps({"message": "authenticated"}))
    return user_id





@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    user_id = await _authenticate_socket(websocket)
    if user_id is None:
        return #authentication failed, connection closed

    await manager.register(user_id, websocket)
    #Manager.register is a method that registers the authenticated WebSocket connection for the user. 
    #It adds the connection to the active connections dictionary in the ConnectionManager class.
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                to = data['to']
                message = data['message']
            except (json.JSONDecodeError, KeyError, TypeError):
                await websocket.send_text(json.dumps({"error": "invalid message format"}))
                continue
            await manager.send_to_user(to, json.dumps({
                "from": user_id, 
                "message": message
                }))
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id)
        
