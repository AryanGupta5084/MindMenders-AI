# sentiment_analysis_service.py
# A simple Flask API that provides sentiment analysis using a pre-trained BERT model.
# It's designed to be run as a separate microservice.

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import BertTokenizer, BertForSequenceClassification
import numpy as np
import json
import os
from dotenv import load_dotenv

# Load environment variables from a .env file if it exists.
load_dotenv()

# --- App Initialization ---
app = Flask(__name__)
CORS(app) # Enable Cross-Origin Resource Sharing for all routes.

# --- Model & Globals ---
# We'll initialize these as None and load them up when the app starts.
# This way, we only load the model into memory once.
model = None
tokenizer = None
config = None
label_encoder_classes = None
# Automatically detect if a GPU is available, otherwise fall back to CPU.
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


# --- Helper Functions ---

# This function handles loading the saved BERT model, tokenizer,
# and all the necessary configuration files from the 'model/' directory.
def load_model_and_config():
    global model, tokenizer, config, label_encoder_classes
    try:
        print("Attempting to load model and configuration...")
        with open('model/model_config.json', 'r') as f:
            config = json.load(f)
        
        # Load the fine-tuned model and tokenizer from the 'best_model' directory.
        model = BertForSequenceClassification.from_pretrained('model/best_model')
        tokenizer = BertTokenizer.from_pretrained('model/best_model')
        
        # Move the model to the selected device (GPU or CPU).
        model.to(device)
        # Set the model to evaluation mode (disables dropout, etc.).
        model.eval()
        
        # Load the class labels (e.g., 'happy', 'sad', 'suicidal').
        label_encoder_classes = np.load('model/label_encoder_classes.npy', allow_pickle=True).tolist()
        
        print(f"Model and tokenizer loaded successfully. Running on {device}.")
        return True
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        print("   Please ensure the 'model/' directory contains all necessary files.")
        return False

# Prepares a given text string so it's in the right format for the BERT model.
def preprocess_text(text):
    # This is the standard way to tokenize text for BERT.
    return tokenizer(
        text,
        add_special_tokens=True,
        max_length=config['max_length'], # Make sure it fits the model's expected input size.
        padding='max_length',
        truncation=True,
        return_tensors='pt' # Return PyTorch tensors.
    )


# --- API Endpoints ---

# A simple health check endpoint.
# Useful for services like Kubernetes or Docker to know if the app is running.
@app.route('/healthz', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200


# The main endpoint for analyzing text.
@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    try:
        # First, a sanity check to make sure our model is actually loaded.
        if model is None:
            print("ERROR: /analyze called but model is not loaded.")
            return jsonify({'error': 'Model not loaded, please check server logs.'}), 500

        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Step 1: Translate the input text to English, as the model expects it.
        english_text = text 

        # Step 2: Preprocess the text and run it through the model.
        encoding = preprocess_text(english_text)
        input_ids = encoding['input_ids'].to(device)
        attention_mask = encoding['attention_mask'].to(device)

        # We use torch.no_grad() to tell PyTorch we're not training, which saves memory and speeds things up.
        with torch.no_grad():
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            # Apply softmax to get probabilities.
            predictions = torch.nn.functional.softmax(outputs.logits, dim=1)

        # Step 3: Extract the results.
        confidence, predicted_idx = torch.max(predictions, dim=1)
        predicted_emotion = label_encoder_classes[predicted_idx.item()]
        confidence = confidence.item()
        
        # Get the confidence threshold from environment variables, defaulting to 0.75
        # This allows us to tune the sensitivity without changing the code.
        SUICIDAL_CONFIDENCE_THRESHOLD = float(os.getenv('SUICIDAL_CONFIDENCE_THRESHOLD', 0.75))

        # This is a critical business rule: flag for immediate help if the model
        # detects suicidal intent with a confidence level above our configured threshold.
        needs_immediate_help = predicted_emotion == 'suicidal' and confidence > SUICIDAL_CONFIDENCE_THRESHOLD

        # Step 4: Send the response back.
        return jsonify({
            'emotion': predicted_emotion,
            'confidence': confidence,
            'needs_immediate_help': needs_immediate_help
        })

    except Exception as e:
        # Generic error handler.
        # We return a standardized English error string.
        # The calling Node.js service (chatController) is responsible for translating this error message for the user.
        print(f"Internal server error: {str(e)}")
        return jsonify({'error': "Internal server error analyzing sentiment."}), 500


# --- Main Execution Block ---

if __name__ == '__main__':
    # We must load the model *before* we start the server.
    if load_model_and_config():
        # Get the port from environment variables, with a default of 5001.
        port = int(os.getenv('SENTIMENT_SERVICE_PORT', 5001))
        print(f"🚀 Starting server on port {port}...")
        app.run(host='0.0.0.0', port=port, debug=True)
    else:
        print("❌ Model loading failed. Shutting down.")
