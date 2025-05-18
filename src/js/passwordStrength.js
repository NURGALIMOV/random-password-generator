import { t } from "../popup/i18n.js";

// Helper for analyzing password structure and finding weaknesses
function analyzePassword(password) {
  const analysis = {
    length: password.length,
    has: {
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    },
    issues: {
      warnings: [],
      suggestions: [],
    },
    counts: {
      types: 0,
      repeats: 0,
      sequences: 0,
    },
  };

  analysis.counts.types = Object.values(analysis.has).filter(Boolean).length;

  // --- Feedback Generation ---
  // Length-based feedback
  if (analysis.length < 8) {
    analysis.issues.warnings.push({ code: 'length_short', message: t('strengthWarningLengthShort') || 'Too short' });
  } else {
    analysis.issues.suggestions.push({ code: 'length_ok', message: t('strengthSuggestionLengthOk') || 'Good length' });
  }
  if (analysis.length < 12) {
    analysis.issues.suggestions.push({ code: 'length_longer', message: t('strengthSuggestionLengthLonger') || 'Consider making it longer' });
  }

  // Character type feedback
  if (!analysis.has.upper) analysis.issues.suggestions.push({ code: 'add_uppercase', message: t('strengthSuggestionAddUppercase') || 'Add uppercase letters' });
  if (!analysis.has.lower) analysis.issues.suggestions.push({ code: 'add_lowercase', message: t('strengthSuggestionAddLowercase') || 'Add lowercase letters' });
  if (!analysis.has.numbers) analysis.issues.suggestions.push({ code: 'add_numbers', message: t('strengthSuggestionAddNumbers') || 'Add numbers' });
  if (!analysis.has.special) analysis.issues.suggestions.push({ code: 'add_special', message: t('strengthSuggestionAddSpecial') || 'Add special characters' });
  
  // Feedback for lack of diversity
  if (analysis.counts.types <= 2) {
      if (/^[a-zA-Z]+$/.test(password)) analysis.issues.warnings.push({ code: 'only_letters', message: t('strengthWarningOnlyLetters') || 'Contains only letters' });
      if (/^\d+$/.test(password)) analysis.issues.warnings.push({ code: 'only_numbers', message: t('strengthWarningOnlyNumbers') || 'Contains only numbers' });
  }

  // --- Weakness Scoring ---
  // Repeats
  const charCounts = {};
  for (const char of password) {
    charCounts[char] = (charCounts[char] || 0) + 1;
  }
  for (const char in charCounts) {
    if (charCounts[char] > 1) {
      analysis.counts.repeats += charCounts[char] - 1;
    }
  }
  if (analysis.counts.repeats > 0) {
    analysis.issues.warnings.push({ code: 'has_repeats', message: t('strengthWarningRepeats') || 'Has repeated characters' });
  }

  // Sequences
  if (analysis.length > 2) {
    for (let i = 0; i < analysis.length - 2; i++) {
      const c1 = password.charCodeAt(i);
      const c2 = password.charCodeAt(i + 1);
      const c3 = password.charCodeAt(i + 2);
      if ((c1 + 1 === c2 && c2 + 1 === c3) || (c1 - 1 === c2 && c2 - 1 === c3)) {
        analysis.counts.sequences++;
      }
    }
  }
  if (analysis.counts.sequences > 0) {
    analysis.issues.warnings.push({ code: 'has_sequences', message: t('strengthWarningSequences') || 'Contains common sequences (e.g., abc, 123)' });
  }

  return analysis;
}


export function calculateStrength(password) {
  if (!password) {
    return {
      score: 0,
      level: "veryWeak",
      label: "veryWeak",
      feedback: {
        warnings: [{ code: 'empty', message: t('strengthWarningEmpty') || 'Password is empty' }],
        suggestions: [],
      },
    };
  }

  const analysis = analyzePassword(password);
  let score = 0;

  // Additions
  score += Math.min(analysis.length * 4, 40); // Max 40 for length
  score += analysis.counts.types * 10; // Max 40 for diversity
  
  if (analysis.has.lower && analysis.has.upper) score += 5;
  if ((analysis.has.lower || analysis.has.upper) && analysis.has.numbers) score += 5;
  if (analysis.counts.types > 2 && analysis.has.special) score += 5;
  
  // Deductions
  score -= analysis.counts.repeats * 2;
  score -= analysis.counts.sequences * 3;

  const commonWords = ["password", "123456", "qwerty", "admin", "welcome"];
  for (const word of commonWords) {
    if (password.toLowerCase().includes(word)) {
      score -= 15;
      analysis.issues.warnings.push({ code: 'common_word', message: t('strengthWarningCommonWord') || 'Contains a common word' });
      break; 
    }
  }

  // Final score processing
  score = Math.max(0, Math.min(score, 100));

  let level;
  if (score <= 30) {
    level = "veryWeak";
  } else if (score < 50) {
    level = "weak";
  } else if (score < 70) {
    level = "medium";
  } else if (score < 90) {
    level = "strong";
  } else {
    level = "veryStrong";
  }

  return { 
    score, 
    level,
    label: level,
    feedback: analysis.issues 
  };
} 