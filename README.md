# OmniCampus

**OmniCampus: AI-Powered Academic ERP with RAG Chatbot**

OmniCampus is an AI-powered Academic ERP platform designed to centralize academic management, learning resources, attendance, placement information, and AI-assisted academic support in a single platform.

The system integrates a **Retrieval-Augmented Generation (RAG) chatbot** that retrieves relevant information from institution-specific documents and uses it to provide context-aware responses to academic queries.

## Features

* **Role-Based Authentication**

  * Student
  * Faculty
  * Administrator
  * Training & Placement Officer (TPO)

* **Student Dashboard**

  * View academic information
  * Access study materials
  * Track attendance
  * View placement information
  * Interact with the AI Assistant

* **Faculty Dashboard**

  * Manage courses
  * Upload study materials
  * Manage attendance
  * Access academic information
  * Use the AI Assistant

* **Administrator Dashboard**

  * Manage users and departments
  * Manage academic resources
  * Monitor system activities

* **TPO Dashboard**

  * Manage companies and placement drives
  * Define eligibility criteria
  * Track placement activities

* **AI-Powered RAG Chatbot**

  * Retrieves relevant institutional documents
  * Uses semantic document search
  * Generates context-aware responses
  * Supports academic and placement-related queries

* **Academic Resource Management**

  * Upload and manage learning materials
  * Centralized access to academic resources

* **Attendance Management**

* **Course and Subject Management**

* **Placement Information Management**

## How RAG Chatbot Works

1. Faculty uploads academic documents such as PDF, DOCX, PPTX or TXT files.
2. Documents are processed and converted into vector embeddings.
3. The embeddings are stored in **ChromaDB**.
4. A student or faculty member submits a query through the AI Assistant.
5. Relevant information is retrieved from the stored institutional documents.
6. The retrieved context is passed to the language model.
7. The AI Assistant generates a context-aware response based on the retrieved information.

## WorkFlow
<img width="1014" height="963" alt="image" src="https://github.com/user-attachments/assets/1676959c-83da-465c-924b-b6285189e95a" />

## System Architecture

```text
User
  │
  ▼
React.js Frontend
  │
  ├── Student Dashboard
  ├── Faculty Dashboard
  ├── Admin Dashboard
  └── TPO Dashboard
  │
  ▼
Node.js + Express.js
  │
  ├── Authentication
  ├── Academic Management
  ├── Attendance
  └── Placement Management
  │
  ├──────────────► Supabase PostgreSQL
  │
  ▼
FastAPI AI Service
  │
  ▼
RAG Pipeline
  │
  ├── Document Processing
  ├── ChromaDB Vector Search
  └── Gemini / Ollama
  │
  ▼
Context-Aware AI Response
```

## Tech Stack

### Frontend

* React.js
* JavaScript
* Tailwind CSS

### Backend

* Node.js
* Express.js
* Python
* FastAPI

### Database & Storage

* Supabase PostgreSQL
* ChromaDB

### AI & RAG

* Retrieval-Augmented Generation (RAG)
* Google Gemini API
* Ollama
* Vector Embeddings
* Semantic Search

### Authentication

* JSON Web Token (JWT)
* Role-Based Access Control

### Development Tools

* Visual Studio Code
* Git
* GitHub

## Project Modules

* User Authentication Module
* Student Module
* Faculty Module
* Administrator Module
* Training & Placement Officer Module
* AI Chatbot Module
* Frontend Interface Module
* Database Management Module

## Project Goal

The goal of OmniCampus is to provide a unified academic ecosystem that simplifies academic resource management, improves access to institution-specific information, reduces repetitive queries handled by faculty, and provides students with intelligent academic assistance through a RAG-based AI chatbot.

## Future Scope

* Personalized learning material recommendations
* Voice-based interaction
* Student performance analytics and prediction
* Mobile application support
* Multi-language support
