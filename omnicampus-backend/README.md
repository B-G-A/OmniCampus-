# OmniCampus — Backend Services

This repository contains the complete backend architecture for **OmniCampus**, an AI-assisted web platform for academic support and campus collaboration. 

The backend consists of two services:
1. **Node.js + Express API** (`node-server/`) — Primary database interface, user authentication, file uploads management, and core business logic.
2. **Python FastAPI Service** (`python-ai-service/`) — RAG (Retrieval-Augmented Generation) pipeline using ChromaDB and Google Gemini API for parsing and querying uploaded academic materials.

---

## Architecture Overview

```
                  ┌──────────────────────┐
                  │   React Frontend     │
                  └──────────┬───────────┘
                             │
                     (HTTP / JSON REST)
                             │
                             ▼
                  ┌──────────────────────┐
                  │    Node.js Server    │◀──┐
                  │    (Express API)     │   │
                  └──────────┬───────────┘   │ (Async Ingestion Complete Callback
                             │               │  with X-Internal-Key Auth)
                     (Internal HTTP)         │
                             │               │
                             ▼               │
                  ┌──────────────────────┐   │
                  │  Python AI Service   │───┘
                  │      (FastAPI)       │
                  └─────┬──────────┬─────┘
                        │          │
                  (ChromaDB)   (Gemini API)
                        │          │
                        ▼          ▼
                 [Vector Store]  [LLM]
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed data flow breakdown.

---

## Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v18.x or higher)
- **Python** (v3.11.x or higher)
- **MongoDB** (running locally on port `27017` or a cloud URI)
- **Google Gemini API Key** (for RAG embedding and querying)

---

## Installation & Setup

### 1. Node.js Express Server Setup

1. Navigate to the Node server directory:
   ```bash
   cd omnicampus-backend/node-server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. The `.env` file has been automatically initialized for you with default configurations. Open it and verify the variables:
   - Make sure `MONGODB_URI` points to your active MongoDB instance.
   - Configure SMTP credentials if you want to test email verification and password reset.

### 2. Python FastAPI AI Service Setup

1. Navigate to the Python service directory:
   ```bash
   cd omnicampus-backend/python-ai-service
   ```
2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **Windows (cmd):** `venv\Scripts\activate.bat`
   * **Windows (PowerShell):** `.\venv\Scripts\activate.ps1`
   * **macOS/Linux:** `source venv/bin/activate`
4. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
5. Configure the `.env` file inside `python-ai-service/`:
   - Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Google Gemini API key.
   - `INTERNAL_SERVICE_KEY` must match the same key configured in `node-server/.env` (default is `omnicampus_internal_callback_key_2026`).

---

## Running the Services

For development, you should run both servers concurrently.

### Run Node.js Server:
```bash
cd omnicampus-backend/node-server
npm run dev
```
Runs on `http://localhost:5000`.

### Run Python AI Service:
```bash
cd omnicampus-backend/python-ai-service
# Make sure your virtual env is active
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Runs on `http://localhost:8000`.

---

## Endpoint Verification & Testing (cURL Examples)

Here is a quick workflow to test the major endpoints end-to-end.

### 1. Register a Teacher
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Professor Clark", "email": "clark@omnicampus.edu", "password": "Password123", "role": "teacher"}'
```

### 2. Verify Email (Simulated)
Extract the verification token from your console logs or directly from your MongoDB `users` collection.
```bash
curl -X GET "http://localhost:5000/api/auth/verify-email?token=<verification-token>"
```

### 3. Log In (Get JWT)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "clark@omnicampus.edu", "password": "Password123"}'
```
*Note: Copy the `accessToken` from the response to use as `Bearer <token>` in subsequent requests.*

### 4. Create Semester (Teacher)
```bash
curl -X POST http://localhost:5000/api/semesters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Semester 1", "year": "2026", "semesterNumber": 1, "startDate": "2026-06-01", "endDate": "2026-12-01"}'
```
*Note: Copy the `_id` of the created semester (e.g. `64a78bc91...`).*

### 5. Create Subject (Teacher)
```bash
curl -X POST http://localhost:5000/api/subjects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Data Structures", "code": "CS-101", "description": "Introduction to Data Structures", "semester": "<semesterId>"}'
```
*Note: Copy the `_id` of the created subject.*

### 6. Upload Course Material (Teacher)
Upload a `.txt`, `.pdf`, `.docx`, or `.pptx` file:
```bash
curl -X POST http://localhost:5000/api/materials/upload \
  -H "Authorization: Bearer <token>" \
  -F "title=Syllabus" \
  -F "description=Course description and syllabus" \
  -F "subjectId=<subjectId>" \
  -F "semesterId=<semesterId>" \
  -F "file=@/path/to/your/document.pdf"
```

### 7. Query RAG Chatbot (Student)
To chat with the materials, log in as an enrolled student, create a chat session, and post a query:
```bash
# Register & verify student first, then log in to get student token
curl -X POST http://localhost:5000/api/chat/new-session \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"subjectId": "<subjectId>"}'

# Use the returned sessionId
curl -X POST http://localhost:5000/api/chat/query \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is covered in week 3?", "subjectId": "<subjectId>", "sessionId": "<sessionId>", "allowExternal": false}'
```
