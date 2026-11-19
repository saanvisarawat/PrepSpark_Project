export const QUESTION_LIMIT = 5;

export const ROLES = [
  { id: "Frontend Developer", blurb: "React, state, rendering, accessibility, performance" },
  { id: "Backend Developer", blurb: "APIs, databases, auth, server design" },
  { id: "Full Stack Developer", blurb: "End to end features across client, server and data" },
  { id: "Data Analyst", blurb: "SQL, statistics, dashboards, data cleaning" },
  { id: "ML Engineer", blurb: "Models, evaluation, pipelines, deployment" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export type Rating = "strong" | "partial" | "weak" | "";

export interface Turn {
  question: string;
  topic: string;
  answer: string;
  source: "typed" | "voice";
  feedback: string;
  rating: Rating;
  wpm: number;
  fillerCount: number;
  durationSec: number;
}

export interface TopicScore {
  name: string;
  score: number;
}

export interface Evaluation {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  problemSolvingScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  topics: TopicScore[];
  mistakes: string[];
}

export interface SessionView {
  id: string;
  role: string;
  status: string;
  turns: Turn[];
  evaluation: Evaluation | null;
  score: number;
  technicalScore: number;
  communicationScore: number;
  confidence: number;
  durationSec: number;
  createdAt: string;
  completedAt: string | null;
}
