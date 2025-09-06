# nltk_downloader.py
# This is a simple, one-off utility script.
# Its only job is to download the necessary data packages that the NLTK
# (Natural Language Toolkit) library needs to perform tasks like tokenization,
# lemmatization, and part-of-speech tagging.

# You should run this script once before starting the main application for the first time.

import nltk

def download_nltk_data():
    """
    Downloads all the required NLTK data packages.
    """
    # List of packages we need for our NLP tasks.
    required_packages = [
        'punkt',                  # Used for tokenizing text (splitting into sentences/words)
        'wordnet',                # A large lexical database of English.
        'averaged_perceptron_tagger', # Used for Part-of-Speech (POS) tagging.
        'omw-1.4'                 # Open Multilingual Wordnet, for wordnet to work in multiple languages.
    ]

    print("--- Starting NLTK Data Download ---")
    
    for package in required_packages:
        try:
            print(f"Downloading '{package}'...")
            nltk.download(package)
            print(f"✅ Successfully downloaded '{package}'.")
        except Exception as e:
            # Catch any errors during download, e.g., network issues.
            print(f"❌ Error downloading '{package}': {e}")
            
    print("\n--- NLTK Data Download Complete ---")


# This is standard Python practice to make sure the code inside this block
# only runs when the script is executed directly.
if __name__ == '__main__':
    download_nltk_data()
