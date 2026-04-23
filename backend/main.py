from fastapi import FastAPI, WebSocket
from fastapi.websockets import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from preprocess import preprocess_image
from inference import predict
from alerts import update_categories, should_send_alert

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            
            if "image" in data:
                image_data = data["image"]
                preprocessed_image, debug_pil = preprocess_image(image_data)
                prediction = predict(preprocessed_image, debug_image=debug_pil)
                alert = should_send_alert(prediction)
                
                await websocket.send_json({
                    "detection": prediction,
                    "alert": alert
                })
            
            elif "categories" in data:
                categories = data["categories"]
                update_categories(categories)
    except WebSocketDisconnect:
        print("WebSocket disconnected")