import base64
from PIL import Image
import numpy as np 
from io import BytesIO

def preprocess_image(image_data):
    image_bytes = base64.b64decode(image_data)
    
    image = Image.open(BytesIO(image_bytes))
    
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    image = image.resize((224, 224))
    
    image_array = np.array(image, dtype=np.float32) / 255.0
    image_array = image_array.transpose((2, 0, 1))
    image_array = image_array[np.newaxis, :]
    
    return image_array