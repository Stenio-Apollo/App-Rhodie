const PROMPTS = [
  "What is one thing you did recently that makes you proud? How can you build on it?",
  "Which challenge are you avoiding, and what tiny first step could you take today?",
  "Who relied on you this week, and how did you show up for them?",
  "When did you feel most confident lately? What contributed to that feeling?",
  "What strengths do others see in you that you sometimes overlook?",
  "How would your 10-year-ago self react to where you are now?",
  "What have you learned from a recent setback that makes you stronger?",
  "What does being a good man mean to you today versus five years ago?",
  "Which boundary do you need to protect to feel more energized?",
  "What small act of courage can you commit to in the next 24 hours?",
  "When did you last feel deep gratitude, and how can you recreate that today?",
  "What part of your routine most supports your mental health? What would improve it?",
  "Who inspires you to be better, and what trait of theirs can you practice today?",
  "If today were your best day this month, what would make it so?",
  "What would you tell a close friend who is struggling the way you are right now?",
  "Where do you feel the most at peace, and how can you bring a piece of that into today?",
  "What is a recurring negative thought you can reframe with evidence from your life?",
  "Which promise to yourself do you want to keep today?",
  "How have you shown resilience this year? List three examples.",
  "What do you want to thank your body for today?"
];

function seededIndex(seed: string, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % max;
}

export function getDailyJournalPrompt(date: string) {
  const idx = seededIndex(date, PROMPTS.length);
  return PROMPTS[idx];
}
