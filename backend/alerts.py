import time

CONFIDENCE_THRESHOLD = 0.7
COOLDOWN_SECONDS = 10
selected_categories = []
last_alert_time = 0

def update_categories(categories):
    global selected_categories
    selected_categories = categories

def should_send_alert(prediction):
    global last_alert_time
    
    if prediction["confidence"] < CONFIDENCE_THRESHOLD:
        return None
    
    if prediction["animal"] not in selected_categories:
        return None
    
    current_time = time.time()
    if current_time - last_alert_time < COOLDOWN_SECONDS:
        return None
    
    last_alert_time = current_time
    return {
        "alert" : True,
        "animal": prediction["animal"],
        "confidence": prediction["confidence"],
        "message": f"{prediction['animal'].capitalize()} detected near your area"
    }