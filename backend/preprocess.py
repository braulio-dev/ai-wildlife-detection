import base64
from PIL import Image, ImageOps
import numpy as np 
from io import BytesIO


def preprocess_image(image_data):
    # Remove data URL prefix if present
    if "," in image_data:
        image_data = image_data.split(",")[1]

    image_bytes = base64.b64decode(image_data)
    image = Image.open(BytesIO(image_bytes))
    
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Pad the image to 288x288 with black background
    image = ImageOps.pad(image, (288, 288), color=(0, 0, 0))

    pil_debug = image.copy()
    
    # Normalize pixel values to [0, 1]
    image_array = np.array(image, dtype=np.float32) / 255.0

    # Statistic Normalization (crucial for ONNX model)
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    image_array = (image_array - mean) / std


    image_array = image_array.transpose((2, 0, 1))
    image_array = np.expand_dims(image_array, axis=0)
    
    return image_array, pil_debug