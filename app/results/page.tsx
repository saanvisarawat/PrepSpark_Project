"use client";

import { useEffect, useState } from "react";
import SideRays from "../components/SideRays";

export default function ResultsPage() {
  const [allAnswers, setAllAnswers] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. FIXED KEYS: Now pulling the correct data from the interview session
    const savedAnswers = localStorage.getItem("finalAnswers");
    const savedQuestions = localStorage.getItem("finalQuestions");
    const savedResume = localStorage.getItem("resumeText");

    let parsedQuestions = [];
    let parsedAnswers = [];

    if (savedQuestions) {
      parsedQuestions = JSON.parse(savedQuestions);
      setAllQuestions(parsedQuestions);
    }
    
    if (savedAnswers) {
      parsedAnswers = JSON.parse(savedAnswers);
      setAllAnswers(parsedAnswers);
    }

    // 2. Fetch evaluation using the properly parsed arrays
    fetch("/api/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeText: savedResume || "",
        questions: parsedQuestions,
        answers: parsedAnswers,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Evaluation Data:", data);
        setEvaluation(data);
      })
      .catch((error) => console.error("Failed to fetch evaluation:", error))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main style={styles.container}>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');` }} />
      
      {/* Background SideRays */}
      <div style={styles.raysContainer}>
        <SideRays rayColor1="#00FF87" rayColor2="#0CEBEB" intensity={1.5} opacity={0.4} />
      </div>

      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Interview Results</h1>

        {isLoading ? (
          <div style={styles.loadingCard}>
            <p style={styles.loadingText}>Analyzing your interview performance...</p>
          </div>
        ) : (
          <>
            {/* AI Evaluation Section */}
            {evaluation && (
              <div style={styles.card}>
                <h2 style={styles.sectionHeader}>AI Evaluation</h2>
                
                <div style={styles.scoreGrid}>
                  <div style={styles.scoreBox}>
                    <p style={styles.scoreLabel}>Overall Score</p>
                    <p style={styles.scoreValue}>{evaluation.overallScore}/10</p>
                  </div>
                  <div style={styles.scoreBox}>
                    <p style={styles.scoreLabel}>Technical</p>
                    <p style={styles.scoreValue}>{evaluation.technicalScore}/10</p>
                  </div>
                  <div style={styles.scoreBox}>
                    <p style={styles.scoreLabel}>Communication</p>
                    <p style={styles.scoreValue}>{evaluation.communicationScore}/10</p>
                  </div>
                </div>

                <div style={styles.feedbackGrid}>
                  <div style={styles.feedbackSection}>
                    <h3 style={styles.feedbackTitle}>Strengths</h3>
                    {evaluation?.strengths?.length > 0 ? (
                      <ul style={styles.list}>
                        {evaluation.strengths.map((item: string, index: number) => (
                          <li key={index} style={styles.listItem}>✓ {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={styles.mutedText}>No major strengths identified.</p>
                    )}
                  </div>

                  <div style={styles.feedbackSection}>
                    <h3 style={styles.feedbackTitle}>Weaknesses</h3>
                    {evaluation?.weaknesses?.length > 0 ? (
                      <ul style={styles.list}>
                        {evaluation.weaknesses.map((item: string, index: number) => (
                          <li key={index} style={styles.listItem}>✗ {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={styles.mutedText}>No major weaknesses identified.</p>
                    )}
                  </div>
                </div>

                <div style={styles.suggestionsSection}>
                  <h3 style={styles.feedbackTitle}>Suggestions for Improvement</h3>
                  {evaluation?.suggestions?.length > 0 ? (
                    <ul style={styles.list}>
                      {evaluation.suggestions.map((item: string, index: number) => (
                        <li key={index} style={styles.listItem}>→ {item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={styles.mutedText}>No suggestions available.</p>
                  )}
                </div>
              </div>
            )}

            {/* Transcript Section */}
            <div style={styles.card}>
              <h2 style={styles.sectionHeader}>Interview Transcript</h2>
              
              {allQuestions.length === 0 ? (
                <p style={styles.mutedText}>No questions were asked during this session.</p>
              ) : (
                allQuestions.map((q, index) => (
                  <div key={index} style={styles.transcriptItem}>
                    <p style={styles.questionText}>
                      <span style={styles.speakerLabel}>AI:</span> {q}
                    </p>
                    <p style={styles.answerText}>
                      <span style={styles.speakerLabel}>You:</span> {allAnswers[index] || "(No answer provided)"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { position: 'relative', width: '100vw', minHeight: '100vh', backgroundColor: '#0B0F19', fontFamily: "'Space Grotesk', sans-serif", padding: '60px 20px', color: 'white', overflowX: 'hidden' },
  raysContainer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' },
  content: { position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' },
  pageTitle: { fontSize: '2.5rem', marginBottom: '40px', color: '#05D58B', textAlign: 'center', fontWeight: 700 },
  card: { backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(0, 255, 135, 0.2)', backdropFilter: 'blur(15px)', marginBottom: '30px' },
  loadingCard: { backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: '60px', borderRadius: '24px', border: '1px solid rgba(0, 255, 135, 0.2)', backdropFilter: 'blur(15px)', textAlign: 'center' },
  loadingText: { fontSize: '1.25rem', color: '#0CEBEB', animation: 'pulse 2s infinite' },
  sectionHeader: { fontSize: '1.75rem', marginBottom: '30px', color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '15px' },
  
  // Score Layout
  scoreGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' },
  scoreBox: { backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' },
  scoreLabel: { fontSize: '1rem', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' },
  scoreValue: { fontSize: '2.5rem', fontWeight: 700, color: '#05D58B', margin: 0 },
  
  // Feedback Layout
  feedbackGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' },
  feedbackSection: { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '25px', borderRadius: '16px' },
  suggestionsSection: { backgroundColor: 'rgba(12, 235, 235, 0.05)', padding: '25px', borderRadius: '16px', border: '1px solid rgba(12, 235, 235, 0.1)' },
  feedbackTitle: { fontSize: '1.25rem', marginBottom: '15px', color: '#0CEBEB' },
  list: { listStyleType: 'none', padding: 0, margin: 0 },
  listItem: { fontSize: '1rem', marginBottom: '12px', color: '#E2E8F0', lineHeight: 1.5, display: 'flex', gap: '10px' },
  mutedText: { color: '#64748B', fontStyle: 'italic' },
  
  // Transcript Layout
  transcriptItem: { marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' },
  speakerLabel: { fontWeight: 700, color: '#94A3B8', marginRight: '8px' },
  questionText: { fontSize: '1.1rem', marginBottom: '12px', color: 'white', lineHeight: 1.6 },
  answerText: { fontSize: '1rem', color: '#05D58B', lineHeight: 1.6, backgroundColor: 'rgba(5, 213, 139, 0.05)', padding: '15px', borderRadius: '12px' }
};