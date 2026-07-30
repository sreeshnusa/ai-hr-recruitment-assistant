# AI HR Recruitment Assistant

An automated candidate evaluation platform designed to streamline initial recruitment screening by parsing resumes, matching candidate skills against job descriptions, calculating match scores, and generating tailored interview questions.

---

## Overview

Recruiters and hiring managers spend significant time manually reviewing resumes against complex job specifications. The AI HR Recruitment Assistant automates this initial evaluation phase using a hybrid architecture that combines client-side document parsing with AI-based semantic evaluation and a local rule-based fallback engine.

The application allows HR teams to upload candidate resumes in PDF or plain text format, paste a target job description, and receive an instant breakdown of candidate suitability.

---

## Key Features

- **Client-Side PDF Text Extraction**: Integrates PDF.js to extract raw text directly inside browser memory, ensuring candidate resume data is processed locally without server persistence.
- **Skill Gap Analysis**: Cross-references candidate skills against job requirements to highlight matched competencies and missing prerequisites.
- **Algorithmic Match Scoring**: Calculates an objective match percentage (0-100%) based on skill overlap and job requirement density.
- **Multi-Agent Processing Pipeline**:
  - **Document Parser**: Extracts candidate identity details and document text.
  - **Skill Matcher**: Scans and categorizes skills against a database of technical tools.
  - **Candidate Evaluator**: Determines overall match score, strengths, and weaknesses.
  - **Interview Specialist**: Formulates technical and behavioral interview questions targeted at candidate gaps.
- **Hybrid AI & Fallback Engine**: Uses the Google Gemini 1.5 Flash API for semantic evaluation when online, and seamlessly falls back to a local heuristic parsing engine when offline.
- **Hiring Recommendation Output**: Provides clear visual indicators (Strong Hire, Hire, Consider, Do Not Hire) alongside executive resume summaries.

---

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Document Processing**: PDF.js
- **API Integration**: Google Gemini 1.5 Flash REST API
- **Alternative Interface**: Python 3.11, Streamlit, PyPDF (`app.py`)

---

## Getting Started

### Option 1: Web Application (HTTP Server)

1. Clone the repository:
   ```bash
   git clone https://github.com/sreeshnusa/ai-hr-recruitment-assistant.git
   cd ai-hr-recruitment-assistant
   ```

2. Start a local HTTP server:
   ```bash
   python -m http.server 8080
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

### Option 2: Streamlit Interface (Python)

1. Install required dependencies:
   ```bash
   pip install streamlit pypdf
   ```

2. Launch the Streamlit dashboard:
   ```bash
   streamlit run app.py
   ```

---

## Repository Structure

```text
ai-hr-recruitment-assistant/
├── index.html          # Primary user interface layout
├── style.css           # Custom stylesheets and layout rules
├── app.js              # Multi-agent execution engine and event handlers
├── app.py              # Streamlit dashboard alternative
├── command.txt         # Sample Job Description reference file
├── .gitignore          # Version control exclusion rules
└── README.md           # Project documentation
```

---

## Security & Data Privacy

Candidate privacy is a key consideration in the system design:
- All PDF text parsing is performed client-side inside browser memory.
- Candidate files and personal identifiable information (PII) are not permanently stored on disk or third-party servers.

---

## Author

Developed by **Sreesh**  
GitHub: [https://github.com/sreeshnusa](https://github.com/sreeshnusa)
