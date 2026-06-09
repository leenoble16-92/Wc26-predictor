"use client";

// Ported verbatim from called-it.jsx — gold/coral/mint/blue/white confetti.
export default function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="cf"
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 7) * 0.12}s`,
            background: ["#FFD34D", "#FF5C7A", "#4DF0C2", "#7DA0FF", "#FFFFFF"][
              i % 5
            ],
          }}
        />
      ))}
    </div>
  );
}
