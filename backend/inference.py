import onnxruntime as ort
import numpy as np
import os

BASE_DIR = os.path.dirname(__file__)
session = ort.InferenceSession(os.path.join(BASE_DIR, "..", "notebook", "arch1_ft.onnx"))

CATEGORIES =  ["empty", "coyote", "reptile or amphibian", "western spotted skunk", "american robin", "leporidae family", "invertebrate", "northern raccoon", "striped skunk", "domestic dog", "human", "small mammal", "gray fox", "other bird"]

MIN_CONFIDENCE = 0.45

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

def predict(image, debug_image=None):
    if debug_image:
        debug_path = os.path.join(BASE_DIR, "debug_frame.jpg")
        debug_image.save(debug_path)

    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    
    outputs = session.run([output_name], {input_name: image})
    
    logits = outputs[0][0]
    probabilities = softmax(logits)
    
    predicted_index = probabilities.argmax()
    confidence = float(probabilities[predicted_index])

    if confidence < MIN_CONFIDENCE:
        return {
            "animal": "empty",
            "confidence": confidence
        }
    
    predicted_category = CATEGORIES[predicted_index]

    return {
        "animal": predicted_category,
        "confidence": confidence
    }