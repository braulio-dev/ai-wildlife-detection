import onnxruntime as ort

session = ort.InferenceSession("backend/models/model.onnx")

CATEGORIES =  ["empty", "coyote", "reptile or amphibian", "western spotted skunk", "american robin", "leporidae family", "invertebrate", "northern raccoon", "striped skunk", "domestic dog", "human", "small mammal", "gray fox", "other bird"]

def predict(image):
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    
    outputs = session.run([output_name], {input_name: image})
    
    probabilities = outputs[0][0]
    
    predicted_index = probabilities.argmax()
    
    predicted_category = CATEGORIES[predicted_index]

    return {
        "animal": predicted_category,
        "confidence": float(probabilities[predicted_index])
    }