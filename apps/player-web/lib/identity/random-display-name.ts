"use client";

const ADJECTIVES = [
  "ashen",
  "golden",
  "hidden",
  "silent",
  "violet",
  "amber",
  "cosmic",
  "purple"
];

const NOUNS = [
  "banana",
  "halo",
  "relic",
  "sigil",
  "crown",
  "feather",
  "oracle",
  "gate"
];

const randomInt = (maxExclusive: number) => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
};

export const generateRandomDisplayName = () => {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  const suffix = String(1000 + randomInt(9000));
  return `${adjective}_${noun}${suffix}`;
};
