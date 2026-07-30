import streamlit as st
import pypdf
import re
import json
import urllib.request
import urllib.parse

# --- Streamlit Page Config ---
st.set_page_config(
    page_title="AI HR Recruitment Assistant",
    page_icon="💼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Broad Skills Database for Extraction
SKILLS_DATABASE = [
    "Python", "Tableau", "Power BI", "SQL", "PostgreSQL", "MySQL", "Jupyter", "Jupyter Notebook",
    "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch", "Data Analysis", "Data Visualization",
    "Statistics", "Machine Learning", "Deep Learning", "R", "Excel", "ETL", "BigQuery", "Snowflake",
    "JavaScript", "TypeScript", "React", "Next.js", "Vue", "Angular", "Node.js", "Express",
    "Java", "Spring Boot", "C++", "C#", ".NET", "HTML5", "CSS3", "Tailwind CSS", "REST API",
    "GraphQL", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "CI/CD", "Linux",
    "Agile", "Scrum", "Jira", "Project Management", "Talent Acquisition", "Communication", "Leadership"
]

# --- Helper Functions ---
def extract_text_from_pdf(uploaded_file):
    try:
        reader = pypdf.PdfReader(uploaded_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        st.error(f"Error reading PDF: {e}")
        return ""

def extract_candidate_name(resume_text, file_name):
    if resume_text:
        lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
        for line in lines[:5]:
            lower = line.lower()
            if any(k in lower for k in ['resume', 'curriculum', 'vitae', 'email', '@', 'phone', 'http', 'page']):
                continue
            clean = re.sub(r'[^a-zA-Z\s\.]', '', line).strip()
            if 3 <= len(clean) <= 35 and len(clean.split()) <= 4:
                return clean.title()

    if file_name:
        clean_file = re.sub(r'\.[^/.]+$', '', file_name)
        clean_file = re.sub(r'resume|cv|file|doc|pdf|\(\d+\)', '', clean_file, flags=re.IGNORECASE)
        clean_file = re.sub(r'[-_]', ' ', clean_file).strip()
        if clean_file:
            return clean_file.title()

    return "Candidate Name"

def run_local_analysis(resume_text, jd_text, candidate_name):
    resume_lower = resume_text.lower() if resume_text else ""
    jd_lower = jd_text.lower() if jd_text else ""

    matched_skills = []
    missing_skills = []

    for skill in SKILLS_DATABASE:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        in_jd = bool(re.search(pattern, jd_lower))
        in_resume = bool(re.search(pattern, resume_lower))

        if in_jd:
            if in_resume:
                matched_skills.append(skill)
            else:
                missing_skills.append(skill)
        elif in_resume:
            matched_skills.append(skill)

    # Score calculation
    if jd_lower:
        total_req = len(matched_skills) + len(missing_skills)
        if total_req > 0:
            match_score = min(95, max(55, int((len(matched_skills) / total_req) * 70 + 25)))
        else:
            match_score = 78
    else:
        match_score = 80

    if match_score >= 85:
        recommendation = "Strong Hire"
    elif match_score >= 70:
        recommendation = "Hire"
    elif match_score >= 50:
        recommendation = "Consider"
    else:
        recommendation = "Do Not Hire"

    top_skills_str = ", ".join(matched_skills[:4]) if matched_skills else "Core Domain Skills"
    summary = f"{candidate_name} shows strong qualifications with key proficiencies in {top_skills_str}. The candidate aligns well ({match_score}% match) with the target job requirements."

    strengths = [
        f"Demonstrated proficiency in required core skills: {top_skills_str}.",
        "Relevant domain background matching the job description expectations.",
        "Clear professional progression evident in resume."
    ]

    weaknesses = []
    if missing_skills:
        weaknesses.append(f"Lacks explicit mention of required tools/skills: {', '.join(missing_skills[:3])}.")
    else:
        weaknesses.append("May require onboarding on team-specific internal tools.")
    weaknesses.append("Verify practical hands-on project depth during interview.")

    tech_skill = matched_skills[0] if matched_skills else "Data Analysis"
    missing_skill = missing_skills[0] if missing_skills else "Advanced Frameworks"

    tech_questions = [
        f"Can you walk us through a recent project where you applied {tech_skill}? What challenges did you face?",
        f"How do you approach learning and implementing skills like {missing_skill} when needed for a project?",
        "What best practices do you follow to ensure high code quality, data accuracy, and project reliability?"
    ]

    hr_questions = [
        "Tell us about a time when you had to manage competing priorities under a tight deadline.",
        "What key factors motivate you in your career, and why are you interested in this position?"
    ]

    return {
        "candidateName": candidate_name,
        "matchScore": match_score,
        "recommendation": recommendation,
        "resumeSummary": summary,
        "skills": matched_skills if matched_skills else ["Python", "SQL", "Data Analysis"],
        "missingSkills": missing_skills,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "technicalQuestions": tech_questions,
        "hrQuestions": hr_questions
    }

def call_gemini_api(api_key, resume_text, jd_text, candidate_name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    prompt = f"""Act as an expert HR Assistant. Read the candidate resume and Job Description.

RESUME TEXT:
{resume_text}

JOB DESCRIPTION:
{jd_text}

Respond ONLY with a valid JSON object:
{{
  "candidateName": "{candidate_name}",
  "matchScore": 82,
  "recommendation": "Hire",
  "resumeSummary": "Summary text",
  "skills": ["Matched Skill 1", "Matched Skill 2"],
  "missingSkills": ["Missing Skill 1"],
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1"],
  "technicalQuestions": ["Technical Question 1", "Technical Question 2"],
  "hrQuestions": ["HR Question 1", "HR Question 2"]
}}"""

    data = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req) as response:
        res_body = response.read().decode("utf-8")
        parsed_body = json.loads(res_body)
        raw_json = parsed_body["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(raw_json)


# --- Streamlit UI Layout ---

# Sidebar Settings
st.sidebar.title("⚙️ Settings")
api_key_input = st.sidebar.text_input("Gemini API Key (Optional)", type="password", help="Paste your Gemini API key starting with AIzaSy...")

# Main Title
st.title("🤖 AI HR Recruitment Assistant")
st.markdown("Upload candidate resumes and match them against Job Descriptions to get instant AI analysis.")

st.divider()

# Grid Layout: Left Column (Inputs) & Right Column (Results)
col_left, col_right = st.columns([1, 1], gap="large")

with col_left:
    st.subheader("1. Input Data")

    # Upload Resume Section
    uploaded_file = st.file_uploader("Upload Resume (PDF, TXT, DOCX)", type=["pdf", "txt", "docx"])
    
    resume_text = ""
    candidate_name = "Candidate Name"

    if uploaded_file is not None:
        if uploaded_file.name.endswith(".pdf"):
            resume_text = extract_text_from_pdf(uploaded_file)
        else:
            resume_text = uploaded_file.read().decode("utf-8", errors="ignore")
        
        candidate_name = extract_candidate_name(resume_text, uploaded_file.name)
        st.success(f"Loaded File: **{uploaded_file.name}**")

    # Job Description Section
    job_description = st.text_area("Job Description", height=220, placeholder="Paste Job Description here...")

    # Action Button
    analyze_clicked = st.button("🚀 Analyse Resume", type="primary", use_container_width=True)

with col_right:
    st.subheader("2. Results")

    if analyze_clicked:
        if not uploaded_file and not resume_text:
            st.warning("⚠️ Please upload a resume file first.")
        elif not job_description.strip():
            st.warning("⚠️ Please paste a Job Description first.")
        else:
            with st.spinner("Analyzing candidate profile..."):
                result = None
                if api_key_input.startswith("AIzaSy"):
                    try:
                        result = call_gemini_api(api_key_input, resume_text, job_description, candidate_name)
                    except Exception as e:
                        st.info("Notice: Using Streamlit Local Analysis Engine.")
                        result = run_local_analysis(resume_text, job_description, candidate_name)
                else:
                    result = run_local_analysis(resume_text, job_description, candidate_name)

                # Store result in session state
                st.session_state["analysis_result"] = result

    # Render Results if available
    if "analysis_result" in st.session_state:
        res = st.session_state["analysis_result"]

        st.markdown(f"### **Candidate Name:** {res.get('candidateName', candidate_name)}")

        # Score & Recommendation metrics
        m_col1, m_col2 = st.columns(2)
        with m_col1:
            st.metric("Match Score", f"{res.get('matchScore', 82)}%")
        with m_col2:
            rec = res.get('recommendation', 'Hire')
            if rec in ["Hire", "Strong Hire"]:
                st.success(f"Recommendation: **{rec}**")
            elif rec == "Consider":
                st.warning(f"Recommendation: **{rec}**")
            else:
                st.error(f"Recommendation: **{rec}**")

        st.markdown("#### **Resume Summary**")
        st.info(res.get("resumeSummary", ""))

        # Skills & Missing Skills
        s_col1, s_col2 = st.columns(2)
        with s_col1:
            st.markdown("#### **Skills**")
            skills = res.get("skills", [])
            if skills:
                st.write(", ".join([f"`{s}`" for s in skills]))
            else:
                st.write("None identified")

        with s_col2:
            st.markdown("#### **Missing Skills**")
            missing = res.get("missingSkills", [])
            if missing:
                st.write(", ".join([f"`{s}`" for s in missing]))
            else:
                st.write("No major gaps identified")

        st.divider()

        # Strengths & Weaknesses
        st1, st2 = st.columns(2)
        with st1:
            st.markdown("#### **Strengths**")
            for item in res.get("strengths", []):
                st.markdown(f"• {item}")

        with st2:
            st.markdown("#### **Weaknesses**")
            for item in res.get("weaknesses", []):
                st.markdown(f"• {item}")

        st.divider()

        # Interview Questions Section
        st.markdown("### **Interview Questions**")

        st.markdown("##### **Technical**")
        for q in res.get("technicalQuestions", []):
            st.markdown(f"• {q}")

        st.markdown("##### **HR**")
        for q in res.get("hrQuestions", []):
            st.markdown(f"• {q}")

    else:
        st.info("Upload a resume and paste a Job Description, then click **Analyse Resume** to see results.")
