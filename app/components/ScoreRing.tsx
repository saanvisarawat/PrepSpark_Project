export default function ScoreRing({ score, size = 148 }: { score: number; size?: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = score >= 75 ? "#05D58B" : score >= 50 ? "#F5B83D" : "#FF6B6B";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label={`Overall score ${score} out of 100`}
    >
      <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="9" />
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset 0.9s ease" }}
      />
      <text
        x="64"
        y="68"
        textAnchor="middle"
        fill="#F8FAFC"
        fontSize="38"
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        {score}
      </text>
      <text
        x="64"
        y="88"
        textAnchor="middle"
        fill="#64748B"
        fontSize="11"
        fontFamily="var(--font-mono)"
      >
        / 100
      </text>
    </svg>
  );
}
