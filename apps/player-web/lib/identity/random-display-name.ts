const adjectives = [
  "purple",
  "obsidian",
  "silent",
  "gilded",
  "violet",
  "ember",
  "crimson",
  "onyx",
  "saffron",
  "azure",
  "ivory",
  "emerald",
  "sable",
  "ashen",
  "mercury",
  "seraphic",
  "ophidian",
  "celestial"
] as const;

const nouns = [
  "banana",
  "raven",
  "comet",
  "sigil",
  "halo",
  "relic",
  "sphinx",
  "ember",
  "oracle",
  "reverie",
  "tempest",
  "seraph",
  "glyph",
  "mantis",
  "ivory",
  "horizon",
  "echo",
  "veil"
] as const;

const displayNamePattern = /^[\p{L}\p{N}_\s-]+$/u;

const randomInt = (maxExclusive: number) => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
};

export const generateRandomDisplayName = (): string => {
  const adjective = adjectives[randomInt(adjectives.length)];
  const noun = nouns[randomInt(nouns.length)];
  const number = String(1000 + randomInt(9000)).padStart(4, "0");
  const displayName = `${adjective}_${noun}${number}`;

  if (!displayNamePattern.test(displayName)) {
    return "silent_oracle1000";
  }

  return displayName;
};
