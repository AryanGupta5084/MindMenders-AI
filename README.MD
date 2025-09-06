# Sahara (सहारा): Your Space to be Heard

Sahara is a comprehensive, secure, and empathetic mental wellness platform designed for youth. It combines a multi-stage AI system for immediate support with a full suite of tools for proactive wellness, professional help, and peer connection.

---

## ✨ Features

The platform is a complete ecosystem with the following integrated features:

* **🧠 AI-Powered Companion:**
    * **Dual-Stage AI:** Uses a custom-trained **BERT model** for accurate sentiment analysis (anxiety, depression, stress, suicidal) and **Google's Gemini AI** for generating empathetic, culturally-aware responses.
    * **Multi-Language Support:** Seamlessly handles conversations in multiple Indian languages through real-time translation.
    * **Voice Accessibility:** Supports both **Speech-to-Text** (voice input) and **Text-to-Speech** (reads responses aloud) for a more natural and accessible interaction.

* **🛠️ Proactive Wellness Tools:**
    * **Daily Mood Tracking & Journaling:** A private, encrypted journal for users to log their daily mood and thoughts. The system automatically analyzes sentiment to provide insights.
    * **Personal Analytics Dashboard:** Visual charts display a user's mood trends and sentiment distribution over time, empowering them with self-awareness.
    * **Interactive Guided Exercises:** AI-guided sessions based on CBT and Mindfulness principles that teach users practical coping skills in real-time.
    * **Gamification:** A **wellness streak** and achievement system rewards users for consistent journaling, helping to build positive habits.

* **🤝 Human Connection:**
    * **Counselor Booking System:** A complete scheduling system for users to book appointments with professional counselors based on their real-time availability.
    * **Live Chat with Counselors:** A real-time, one-on-one chat platform using WebSockets (Socket.io) for confidential sessions at the scheduled appointment time.
    * **Peer Support Forum:** A moderated community forum where users can anonymously or publicly share experiences and support each other.

* **📚 Content & Management:**
    * **Wellness Resource Hub:** A curated library of articles, videos, and audio content, filterable by language and tags.
    * **Comprehensive Admin & Counselor Dashboards:** Separate, secure portals for administrators to manage all platform data and for counselors to manage their appointments.

---

## 🛠 Tech Stack

-   **Backend:** Node.js, Express.js, Socket.io (for real-time chat)
-   **Frontend:** HTML5, CSS3, Vanilla JavaScript (SPA architecture)
-   **AI/ML:**
    -   **Sentiment Analysis:** Python, Flask, PyTorch, HuggingFace Transformers (BERT)
    -   **Generative AI:** Google Gemini (via `@google/generative-ai`)
-   **Database:** MongoDB (with Mongoose ODM)
-   **Authentication:** JSON Web Tokens (JWT)

---

## 📁 Project Structure

sahara/
├── app.js                  # Main Express server with Socket.io integration
├── controllers/            # Business logic for all features (chat, booking, journal, etc.)
├── middleware/             # Authentication and Admin authorization
├── models/                 # Mongoose schemas for all data structures
├── public/                 # Frontend SPAs (user, admin, counselor)
├── routes/                 # API route definitions for all features
├── sentiment_service/      # Self-contained Python/Flask sentiment microservice
├── socket/                 # Socket.io connection and event handling logic
├── utils/                  # Helper utilities (encryption, translation, etc.)
├── .env                    # Environment variables (NOT committed)
└── package.json            # Node.js dependencies and scripts


---

## ⚡️ Quick Start

### 1. Prerequisites
-   Node.js & npm
-   Python & pip
-   MongoDB instance (local or cloud)

### 2. Setup
Clone the repository and install dependencies for both the Node.js server and the Python service.

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd sentiment_service
pip install -r requirements.txt
python download_nltk_data.py
cd ..
```

### 3. Environment Variables
Create a .env file in the root directory and populate it with your configuration (MongoDB URI, API keys, secrets).

### 4. Run the Application
You can use the provided PowerShell script (for Windows) to launch both services with a health check.

```bash
# This script starts the Python service, waits for it to be ready, then starts the Node server.
./start.ps1
```

Alternatively, run each service in a separate terminal:

```bash
# Terminal 1: Start the Sentiment Service
cd sentiment_service && python app.py

# Terminal 2: Start the Node.js Backend
npm run dev
```

### 5. Access the App
-   **Main App:** http://localhost:5000
-   **Admin Panel:** http://localhost:5000/admin.html
-   **Counselor Dashboard:** http://localhost:5000/counselor.html

---

## 🔌 API Endpoints (Summary)
-   **Authentication:** `POST /api/users/register`, `POST /api/users/login`, `POST /api/users/guest`
-   **AI Chat:** `POST /api/chat/message`, `GET /api/chat/history`, `GET /api/chat/sessions`
-   **Booking:** `GET /api/booking/counselors`, `GET /api/booking/slots/:id`, `POST /api/booking/appointments`, `GET /api/booking/my-appointments`
-   **Forum:** `GET /api/forum/posts`, `POST /api/forum/posts`, `POST /api/forum/posts/:id/comments`
-   **Journaling:** `GET /api/journal`, `POST /api/journal`, `GET /api/journal/stats`
-   **Exercises:** `GET /api/exercises`, `POST /api/exercises/start`
-   **Resources:** `GET /api/resources`
-   **Counselor:** `GET /api/counselors/my-appointments`
-   **Admin:** Full CRUD and management routes under `/api/admin/...`

---

## 🧠 AI/ML Details
-   **Sentiment Service:** A Python Flask app exposes an `/analyze` endpoint. It uses a custom-trained BERT model (fine-tuned with PyTorch and HuggingFace Transformers) to perform real-time sentiment analysis on user text.
-   **Gemini Integration:** The Node.js backend sends user messages, along with the detected sentiment and conversational history, to the Google Gemini API to generate empathetic and context-aware responses.

---

## 🆘 Crisis Response
The chatbot includes an automated crisis detection system that:
-   Identifies potential suicidal ideation via the sentiment model.
-   Immediately provides localized helpline information within the chat response.
-   Flags the conversation in the database for potential review by administrators.

---

## 🔒 Security & Privacy
-   **End-to-End Encryption:** All chat messages and journal entries are encrypted at rest in the database using AES-256-GCM.
-   **Secure Authentication:** All protected routes require a valid JWT. The admin middleware performs real-time database checks to prevent unauthorized access from users with outdated credentials.
-   **Guest Data Privacy:** All data associated with guest users is automatically deleted from the database after a set period using a MongoDB TTL index.
-   **Standard Security Measures:** The application uses helmet for secure headers, express-rate-limit to prevent abuse, and a strict CORS policy.

---

## 🙏 Acknowledgments
-   Google Gemini for generative AI
-   HuggingFace Transformers for the BERT model and tokenizer
-   MongoDB for the database solution
