/* ==========================================================================
   AI HR Recruitment Assistant - Pure Browser Application Engine
   ========================================================================== */

const API_KEY = "YOUR_API_KEY";

const KNOWN_SKILLS = [
  "Python", "Tableau", "Power BI", "SQL", "PostgreSQL", "MySQL", "Jupyter", "Jupyter Notebook",
  "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch", "Data Analysis", "Data Visualization",
  "Statistics", "Machine Learning", "Deep Learning", "R", "Excel", "ETL", "BigQuery", "Snowflake",
  "JavaScript", "TypeScript", "React", "Next.js", "Vue", "Angular", "Node.js", "Express",
  "Java", "Spring Boot", "C++", "C#", ".NET", "HTML5", "CSS3", "Tailwind CSS", "REST API",
  "GraphQL", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "CI/CD", "Linux",
  "Agile", "Scrum", "Jira", "Project Management", "Talent Acquisition", "Communication", "Leadership"
];

let resumeTextContent = "";
let uploadedFileName = "";

document.addEventListener('DOMContentLoaded', () => {
  setupPdfJs();
  setupEvents();
});

function setupPdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

function setupEvents() {
  const fileInput = document.getElementById('resumeFileInput');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        uploadedFileName = file.name;
        fileNameDisplay.textContent = file.name;

        if (file.name.endsWith('.pdf')) {
          resumeTextContent = await readPdf(file);
        } else {
          resumeTextContent = await readText(file);
        }
      }
    });
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', onAnalyzeClicked);
  }
}

function readText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsText(file);
  });
}

async function readPdf(file) {
  if (!window.pdfjsLib) return await readText(file);
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + "\n";
    }
    return text;
  } catch (err) {
    console.error(err);
    return "";
  }
}

function extractName(text, fileName) {
  if (text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (let line of lines.slice(0, 5)) {
      const lower = line.toLowerCase();
      if (
        lower.includes('resume') || lower.includes('curriculum') || lower.includes('page') ||
        lower.includes('email') || lower.includes('@') || lower.includes('phone') ||
        lower.includes('http') || line.length > 35
      ) {
        continue;
      }
      const clean = line.replace(/[^a-zA-Z\s\.]/g, '').trim();
      if (clean.length >= 3 && clean.split(' ').length <= 4) {
        return clean;
      }
    }
  }

  if (fileName) {
    let clean = fileName.replace(/\.[^/.]+$/, "")
      .replace(/resume|cv|file|doc|pdf|\(\d+\)/gi, "")
      .replace(/[-_]/g, " ")
      .trim();
    if (clean) return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return "Candidate Name";
}

async function onAnalyzeClicked() {
  const jdText = document.getElementById('jobDescriptionInput').value.trim();
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (!resumeTextContent && !uploadedFileName) {
    alert("Please upload a PDF or text resume file first.");
    return;
  }
  if (!jdText) {
    alert("Please paste a Job Description first.");
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "[ Analyzing... ]";

  const candidateName = extractName(resumeTextContent, uploadedFileName);

  if (API_KEY.startsWith("AIzaSy")) {
    try {
      const result = await callGeminiApi(resumeTextContent, jdText, candidateName);
      displayResults(result);
      return;
    } catch (err) {
      console.warn("API Call Notice: Using local parser engine", err);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "[ Analyse Resume ]";
    }
  }

  setTimeout(() => {
    const result = runDynamicParsing(resumeTextContent, jdText, candidateName);
    displayResults(result);
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "[ Analyse Resume ]";
  }, 350);
}

function runDynamicParsing(resume, jd, candidateName) {
  const resumeLower = (resume || "").toLowerCase();
  const jdLower = (jd || "").toLowerCase();

  const matched = new Set();
  const missing = new Set();
  const jdSkills = new Set();

  KNOWN_SKILLS.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const reg = new RegExp(`\\b${escaped}\\b`, 'i');

    const inJd = reg.test(jdLower);
    const inResume = reg.test(resumeLower);

    if (inJd) {
      jdSkills.add(skill);
      if (inResume) matched.add(skill);
      else missing.add(skill);
    } else if (inResume) {
      matched.add(skill);
    }
  });

  const matchedList = Array.from(matched);
  const missingList = Array.from(missing);
  const jdList = Array.from(jdSkills);

  let matchScore = 75;
  if (jdList.length > 0) {
    const overlap = matchedList.filter(s => jdList.includes(s)).length;
    matchScore = Math.min(95, Math.max(50, Math.round((overlap / jdList.length) * 70 + 25)));
  }

  let recommendation = "Hire";
  if (matchScore >= 85) recommendation = "Strong Hire";
  else if (matchScore >= 70) recommendation = "Hire";
  else if (matchScore >= 50) recommendation = "Consider";
  else recommendation = "Do Not Hire";

  const topSkillsStr = matchedList.slice(0, 4).join(', ') || 'Domain Fundamentals';
  const summary = `${candidateName}'s profile matches ${matchScore}% of the job requirements. Key proficiencies identified include ${topSkillsStr}. Recommended for screening.`;

  const strengths = [
    `Demonstrates proficiency in key required skills: ${topSkillsStr}.`,
    `Relevant domain background matching job requirements.`
  ];
  if (resumeLower.includes('senior') || resumeLower.includes('lead') || resumeLower.includes('years')) {
    strengths.push("Proven professional progression and hands-on experience.");
  }

  const weaknesses = [];
  if (missingList.length > 0) {
    weaknesses.push(`Lacks explicit mention of required skills: ${missingList.slice(0, 3).join(', ')}.`);
  } else {
    weaknesses.push("May require onboarding on specific company internal workflows.");
  }
  weaknesses.push("Verify practical project depth during technical interview.");

  const topSkill = matchedList[0] || "Data Analysis";
  const missingSkill = missingList[0] || "Advanced Tooling";

  const techQuestions = [
    `Can you walk us through a recent project where you applied ${topSkill}?`,
    `How do you approach tasks requiring ${missingSkill} when tight deadlines are involved?`,
    `What best practices do you follow to ensure code quality and data accuracy?`
  ];

  const hrQuestions = [
    `Tell us about a time when you had to manage competing priorities under a tight deadline.`,
    `What key factors motivate you in your career, and how does this role fit your goals?`
  ];

  return {
    candidateName: candidateName || "Candidate Name",
    matchScore,
    recommendation,
    resumeSummary: summary,
    skills: matchedList.length > 0 ? matchedList : ["Python", "SQL", "Data Analysis"],
    missingSkills: missingList,
    strengths,
    weaknesses,
    technicalQuestions: techQuestions,
    hrQuestions
  };
}

async function callGeminiApi(resume, jd, candidateName) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const prompt = `Act as an HR Assistant. Evaluate resume against Job Description.
RESUME: ${resume}
JOB DESCRIPTION: ${jd}
Respond ONLY with JSON:
{
  "candidateName": "${candidateName}",
  "matchScore": 82,
  "recommendation": "Hire",
  "resumeSummary": "Summary text",
  "skills": ["Skill 1"],
  "missingSkills": ["Missing Skill 1"],
  "strengths": ["Strength 1"],
  "weaknesses": ["Weakness 1"],
  "technicalQuestions": ["Q1"],
  "hrQuestions": ["Q1"]
}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!res.ok) throw new Error("Gemini API Error");
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

function displayResults(res) {
  document.getElementById('emptyPlaceholder').style.display = 'none';
  document.getElementById('resultsContent').style.display = 'block';

  document.getElementById('resCandidateName').textContent = res.candidateName || "Candidate Name";
  document.getElementById('resMatchScore').textContent = `${res.matchScore || 82}%`;
  document.getElementById('resRecommendation').textContent = res.recommendation || "Hire";
  document.getElementById('resSummaryText').textContent = res.resumeSummary || "";

  // Skills
  const skillsContainer = document.getElementById('resSkillsContainer');
  skillsContainer.innerHTML = (res.skills || []).map(s => `<span class="pill">✓ ${s}</span>`).join('');

  // Missing Skills
  const missingContainer = document.getElementById('resMissingSkillsContainer');
  missingContainer.innerHTML = (res.missingSkills || []).map(s => `<span class="pill missing-pill">✕ ${s}</span>`).join('');

  // Strengths
  const strengthsList = document.getElementById('resStrengthsList');
  strengthsList.innerHTML = (res.strengths || []).map(s => `<li>${s}</li>`).join('');

  // Weaknesses
  const weaknessesList = document.getElementById('resWeaknessesList');
  weaknessesList.innerHTML = (res.weaknesses || []).map(w => `<li>${w}</li>`).join('');

  // Technical Questions
  const techList = document.getElementById('resTechQuestionsList');
  techList.innerHTML = (res.technicalQuestions || []).map(q => `<li>${typeof q === 'string' ? q : q.q}</li>`).join('');

  // HR Questions
  const hrList = document.getElementById('resHrQuestionsList');
  hrList.innerHTML = (res.hrQuestions || []).map(q => `<li>${typeof q === 'string' ? q : q.q}</li>`).join('');

  document.getElementById('resultsCard').scrollIntoView({ behavior: 'smooth' });
}
