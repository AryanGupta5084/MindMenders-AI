# train_model.py
# This script is responsible for training a sentiment analysis model.
# It uses the Hugging Face Transformers library (specifically, BERT) and PyTorch.
#
# --- Workflow ---
# 1. Loads a CSV dataset (expecting 'text' and 'emotion' columns).
# 2. Preprocesses the text data using NLTK for cleaning and lemmatization.
# 3. Augments the dataset to create more training examples.
# 4. Splits the data into training and validation sets.
# 5. Fine-tunes a pre-trained BERT model on the prepared data.
# 6. Saves the best-performing model, tokenizer, and configuration to the 'model/' directory.
#
# --- How to Run ---
# python train_model.py <path_to_your_dataset.csv>

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import BertTokenizer, BertForSequenceClassification
from torch.optim import AdamW
from transformers import get_scheduler
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import json
import os
import re
import sys

# --- NLTK Imports & Setup ---
# We're using the Natural Language Toolkit for text preprocessing.
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# --- THIS BLOCK HAS BEEN REPLACED FOR A MORE ROBUST SOLUTION ---
# This new block automatically downloads required NLTK data if it's missing.
def download_nltk_data():
    """Checks for and downloads required NLTK data packages."""
    required_packages = {
        'punkt': 'tokenizers/punkt',
        'wordnet': 'corpora/wordnet',
        'omw-1.4': 'corpora/omw-1.4',
        'punkt_tab': 'tokenizers/punkt_tab'
    }
    for pkg_id, path in required_packages.items():
        try:
            nltk.data.find(path)
            print(f"✅ NLTK package '{pkg_id}' already downloaded.")
        except LookupError:
            print(f"⬇️ Downloading NLTK package '{pkg_id}'...")
            nltk.download(pkg_id, quiet=True)
            print(f"✅ NLTK package '{pkg_id}' downloaded successfully.")

print("--- Checking NLTK data... ---")
download_nltk_data()
print("--- NLTK check complete. ---")
# -------------------------------------------------------------------


# Initialize the lemmatizer once, so we don't have to do it repeatedly.
lemmatizer = WordNetLemmatizer()


# --- Configuration ---
# It's good practice to have key parameters in one place for easy tweaking.
MODEL_NAME = 'bert-base-uncased'
MAX_LENGTH = 128
BATCH_SIZE = 16
NUM_EPOCHS = 10
OUTPUT_DIR = '/opt/render/model'


# --- PyTorch Dataset Class ---
# This class formats our data in a way that PyTorch's DataLoader can understand.
class EmotionDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=MAX_LENGTH):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        # The total number of samples in the dataset.
        return len(self.texts)
    
    def __getitem__(self, idx):
        # Fetches one sample of data.
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        # The tokenizer converts our raw text into numbers (token IDs) that the model can process.
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,      # Adds [CLS] and [SEP] tokens
            max_length=self.max_length,
            padding='max_length',         # Pad shorter sentences to max_length
            truncation=True,              # Truncate longer sentences
            return_tensors='pt'           # Return PyTorch tensors
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }

# --- Text Processing Functions ---

def preprocess_text(text):
    """
    Cleans and preprocesses a single string of text.
    - Converts to lowercase
    - Removes non-alphanumeric characters
    - Tokenizes and lemmatizes words
    """
    if not isinstance(text, str):
        return ""
    
    # 1. Convert to lowercase
    text = text.lower()
    
    # 2. Remove non-alphanumeric characters but keep spaces
    text = re.sub(r'[^a-z\s]', '', text)
    
    # 3. Tokenize (split text into a list of words)
    tokens = word_tokenize(text)
    
    # 4. Lemmatize each word (e.g., 'running' -> 'run', 'studies' -> 'study')
    # This helps the model by reducing vocabulary size.
    lemmatized_tokens = [lemmatizer.lemmatize(word) for word in tokens]
    
    # 5. Join the words back into a single string
    return ' '.join(lemmatized_tokens)


def augment_text(text):
    """
    Performs simple text augmentation to create more training data.
    This helps the model become more robust to variations in text.
    TODO: Could add more sophisticated techniques like back-translation.
    """
    augmented = []
    words = text.split()
    
    # Don't augment very short texts, it might remove all the meaning.
    if len(words) <= 3:
        return [text]
    
    # Always include the original text
    augmented.append(text)
    
    # Technique 1: Randomly remove one word
    if len(words) > 4:
        remove_idx = np.random.randint(0, len(words))
        aug_text = ' '.join(words[:remove_idx] + words[remove_idx+1:])
        augmented.append(aug_text)
    
    # Technique 2: Slightly shuffle word order (swap adjacent words)
    words_copy = words.copy()
    for i in range(len(words_copy)-1):
        if np.random.random() < 0.3:  # 30% chance to swap
            words_copy[i], words_copy[i+1] = words_copy[i+1], words_copy[i]
    aug_text = ' '.join(words_copy)
    augmented.append(aug_text)
    
    return augmented


def load_and_preprocess_data(file_path):
    """
    Loads the dataset from a CSV, preprocesses, and augments it.
    """
    print(f"--- Loading dataset from {file_path}... ---")
    try:
        df = pd.read_csv(file_path)
        print("✅ Dataset loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading dataset: {e}")
        raise
    
    # Basic data validation
    required_columns = {'text', 'emotion'}
    if not all(col in df.columns for col in required_columns):
        raise ValueError(f"Dataset must contain columns: {required_columns}")
    
    df = df.dropna(subset=['text', 'emotion'])
    
    # Apply our NLTK preprocessing to the 'text' column.
    print("--- Preprocessing texts with NLTK... ---")
    df['text'] = df['text'].apply(preprocess_text)
    df = df[df['text'].str.len() > 0]  # Remove any rows that became empty after cleaning.
    
    # Apply data augmentation
    print("--- Augmenting dataset... ---")
    augmented_texts = []
    augmented_emotions = []
    
    for text, emotion in zip(df['text'], df['emotion']):
        aug_texts = augment_text(text)
        augmented_texts.extend(aug_texts)
        augmented_emotions.extend([emotion] * len(aug_texts))
    
    print(f"Original dataset size: {len(df)}")
    print(f"Augmented dataset size: {len(augmented_texts)}")
    print("\nClass distribution after augmentation:")
    emotion_counts = pd.Series(augmented_emotions).value_counts()
    print(emotion_counts)
    
    return np.array(augmented_texts), np.array(augmented_emotions)


# --- Training & Evaluation Functions ---

def train_epoch(model, data_loader, optimizer, scheduler, device):
    """
    Performs one full pass over the training data.
    """
    model.train() # Set the model to training mode
    total_loss = 0
    correct_predictions = 0
    total_predictions = 0
    
    for batch in data_loader:
        # Move batch data to the correct device (GPU or CPU)
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['label'].to(device)
        
        optimizer.zero_grad() # Clear previous gradients
        
        # Forward pass: compute predicted outputs by passing inputs to the model
        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels
        )
        
        loss = outputs.loss
        total_loss += loss.item()
        
        # Calculate accuracy
        _, predicted = torch.max(outputs.logits, dim=1)
        correct_predictions += (predicted == labels).sum().item()
        total_predictions += labels.size(0)
        
        # Backward pass: compute gradient of the loss with respect to model parameters
        loss.backward()
        
        # Clip gradients to prevent them from exploding
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        
        # Perform a single optimization step (parameter update)
        optimizer.step()
        scheduler.step()
    
    avg_loss = total_loss / len(data_loader)
    accuracy = correct_predictions / total_predictions
    return avg_loss, accuracy


def evaluate(model, data_loader, device):
    """
    Evaluates the model on the validation data.
    """
    model.eval() # Set the model to evaluation mode
    total_loss = 0
    correct_predictions = 0
    total_predictions = 0
    
    # We don't need to calculate gradients during evaluation.
    with torch.no_grad():
        for batch in data_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )
            
            loss = outputs.loss
            total_loss += loss.item()
            
            _, predicted = torch.max(outputs.logits, dim=1)
            correct_predictions += (predicted == labels).sum().item()
            total_predictions += labels.size(0)
    
    avg_loss = total_loss / len(data_loader)
    accuracy = correct_predictions / total_predictions
    return avg_loss, accuracy


# --- Main Training Orchestration ---

def train_sentiment_model(dataset_path):
    """
    Main function that orchestrates the entire training process.
    """
    # Create the directory to save our model, if it doesn't exist.
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Set the device to GPU if available, otherwise CPU.
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"--- Using device: {device} ---")
    
    try:
        # 1. Load and process data
        texts, labels = load_and_preprocess_data(dataset_path)
        
        # 2. Encode labels from strings (e.g., 'happy') to numbers (e.g., 0).
        label_encoder = LabelEncoder()
        encoded_labels = label_encoder.fit_transform(labels)
        num_labels = len(label_encoder.classes_)
        
        # Save the encoder classes so the prediction service knows the mapping.
        np.save(os.path.join(OUTPUT_DIR, 'label_encoder_classes.npy'), label_encoder.classes_)
        print("\nEmotion classes:", label_encoder.classes_)
        
        # 3. Load BERT tokenizer and model
        print(f"\n--- Loading BERT model ({MODEL_NAME}) and tokenizer... ---")
        tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
        model = BertForSequenceClassification.from_pretrained(
            MODEL_NAME,
            num_labels=num_labels,
            problem_type="single_label_classification"
        )
        
        # 4. Fine-tuning strategy: Freeze most of BERT to speed up training
        # and prevent catastrophic forgetting. We only train the last few layers.
        for param in model.bert.embeddings.parameters():
            param.requires_grad = False
        
        for i, layer in enumerate(model.bert.encoder.layer):
            if i < 10:  # Freeze the first 10 out of 12 layers
                for param in layer.parameters():
                    param.requires_grad = False
        
        model.to(device)
        print("✅ BERT model loaded successfully!")
        
        # 5. Split data into training and validation sets
        train_texts, val_texts, train_labels, val_labels = train_test_split(
            texts,
            encoded_labels,
            test_size=0.2, # 20% for validation
            random_state=42,
            stratify=encoded_labels # Ensure same class distribution in train/val
        )
        
        # 6. Create Datasets and DataLoaders
        print("\n--- Preparing datasets... ---")
        train_dataset = EmotionDataset(train_texts, train_labels, tokenizer)
        val_dataset = EmotionDataset(val_texts, val_labels, tokenizer)
        
        train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)
        print("✅ Datasets prepared successfully!")
        
        # 7. Setup optimizer and learning rate scheduler
        warmup_steps = len(train_loader) * 2  # 2 epochs of warmup
        total_steps = len(train_loader) * NUM_EPOCHS
        
        # Use different learning rates for different parts of the model
        optimizer_grouped_parameters = [
            {'params': [p for n, p in model.named_parameters() if 'classifier' in n], 'lr': 2e-4, 'weight_decay': 0.01},
            {'params': [p for n, p in model.named_parameters() if 'layer.11' in n], 'lr': 1e-4, 'weight_decay': 0.01},
            {'params': [p for n, p in model.named_parameters() if 'layer.10' in n], 'lr': 5e-5, 'weight_decay': 0.01},
        ]
        
        optimizer = AdamW(optimizer_grouped_parameters)
        scheduler = get_scheduler(
            name="linear",
            optimizer=optimizer,
            num_warmup_steps=warmup_steps,
            num_training_steps=total_steps
        )
        
        best_accuracy = 0
        
        # 8. The main training loop
        print("\n--- Starting model training... ---")
        for epoch in range(NUM_EPOCHS):
            print(f"\nEpoch {epoch + 1}/{NUM_EPOCHS}")
            
            train_loss, train_acc = train_epoch(model, train_loader, optimizer, scheduler, device)
            print(f"  Training   -> Loss: {train_loss:.4f}, Accuracy: {train_acc:.4f}")
            
            val_loss, val_acc = evaluate(model, val_loader, device)
            print(f"  Validation -> Loss: {val_loss:.4f}, Accuracy: {val_acc:.4f}")
            
            # Save the model only if it has the best validation accuracy so far
            if val_acc > best_accuracy:
                best_accuracy = val_acc
                print(f"  ✨ New best model found! Saving to '{OUTPUT_DIR}/best_model'...")
                model.save_pretrained(os.path.join(OUTPUT_DIR, 'best_model'))
                tokenizer.save_pretrained(os.path.join(OUTPUT_DIR, 'best_model'))
        
        print(f"\n--- Training complete! ---")
        print(f"🏆 Best validation accuracy: {best_accuracy:.4f}")
        
        # 9. Save the final model configuration
        model_config = {
            'model_name': MODEL_NAME,
            'num_labels': num_labels,
            'max_length': MAX_LENGTH,
            'label_mapping': {i: label for i, label in enumerate(label_encoder.classes_)}
        }
        with open(os.path.join(OUTPUT_DIR, 'model_config.json'), 'w') as f:
            json.dump(model_config, f, indent=4)
        print(f"✅ Model configuration saved to '{OUTPUT_DIR}/model_config.json'")
        
    except Exception as e:
        print(f"\n❌ An error occurred during training: {e}")
        raise

# --- Script Execution ---
# This block runs only when the script is executed directly from the command line.
if __name__ == "__main__":
    # Check if the user provided the dataset path as a command-line argument.
    if len(sys.argv) != 2:
        print("Usage: python train_model.py <path_to_dataset.csv>")
        sys.exit(1)
    
    dataset_file_path = sys.argv[1]
    
    try:
        train_sentiment_model(dataset_file_path)
    except Exception as e:
        # A final catch-all for any errors.
        print(f"Fatal error: {e}")
        sys.exit(1)
