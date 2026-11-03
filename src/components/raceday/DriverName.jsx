import React from "react";

export function shortenName(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return parts.join(" ");
  // The timing feed appends nicknames and sponsor tags after the surname, so the
  // first two words are the driver's actual name.
  return `${parts[0].charAt(0).toUpperCase()} ${parts[1]}`;
}

// Short names that two different drivers in the same list would share
// (e.g. Donkey Kong and Diddy Kong are both "D Kong").
export function clashingShortNames(names) {
  const seen = new Map();
  for (const name of names) {
    const full = String(name || "").trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    const short = shortenName(name);
    if (!seen.has(short)) seen.set(short, new Set());
    seen.get(short).add(full);
  }
  return new Set([...seen].filter(([, fulls]) => fulls.size > 1).map(([short]) => short));
}

export default function DriverName({ name, className = "", clashes }) {
  const short = shortenName(name);
  const label = clashes?.has(short)
    ? String(name || "").trim().split(/\s+/).slice(0, 2).join(" ")
    : short;
  return <span className={`block min-w-0 truncate ${className}`}>{label}</span>;
}