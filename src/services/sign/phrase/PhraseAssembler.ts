import type { SignPrediction } from "../types";
import { SIGN_VOCABULARY } from "../vocabulary";

export interface ComposedPhraseMapping {
  triggerSigns: string[];
  phraseText: string;
}

const PHRASE_MAPPINGS: ComposedPhraseMapping[] = [
  { triggerSigns: ["hello", "thank_you"], phraseText: "Hello, thank you for meeting with me." },
  { triggerSigns: ["hello", "please", "help"], phraseText: "Hello, could you please assist me?" },
  { triggerSigns: ["hello", "help"], phraseText: "Hello, I need some assistance please." },
  { triggerSigns: ["hello", "good"], phraseText: "Hello! Hope you are doing great today." },
  { triggerSigns: ["help", "water"], phraseText: "Could you please help me get some water?" },
  { triggerSigns: ["water", "please"], phraseText: "Could I please have a glass of water?" },
  { triggerSigns: ["please", "water"], phraseText: "Could I please have some water?" },
  { triggerSigns: ["please", "help"], phraseText: "Please help me." },
  { triggerSigns: ["yes", "help"], phraseText: "Yes, I would appreciate some help." },
  { triggerSigns: ["good", "yes"], phraseText: "Yes, that sounds very good!" },
  { triggerSigns: ["yes", "good"], phraseText: "Yes, that is wonderful!" },
  { triggerSigns: ["yes", "thank_you"], phraseText: "Yes, thank you so much!" },
  { triggerSigns: ["bad", "no"], phraseText: "No, that is not good." },
  { triggerSigns: ["no", "thank_you"], phraseText: "No, thank you." },
  { triggerSigns: ["thank_you", "good"], phraseText: "Thank you, that was very good!" },
  { triggerSigns: ["thank_you", "love"], phraseText: "Thank you, with lots of love!" },
  { triggerSigns: ["love", "thank_you"], phraseText: "I love you, thank you so much!" },
  { triggerSigns: ["stop", "please"], phraseText: "Please wait a moment and hold on." },
  { triggerSigns: ["please", "stop"], phraseText: "Please pause here." },
  { triggerSigns: ["good", "thank_you"], phraseText: "Everything is good, thank you!" },
];

export class PhraseAssembler {
  private tokens: SignPrediction[] = [];
  private composedText = "";
  private manualEditOverride = false;
  private matchedPhrase = false;

  public addToken(prediction: SignPrediction): string {
    this.tokens.push(prediction);
    if (!this.manualEditOverride) {
      this.composedText = this.compilePhrase();
    }
    return this.composedText;
  }

  public undo(): string {
    this.tokens.pop();
    this.manualEditOverride = false;
    this.composedText = this.compilePhrase();
    return this.composedText;
  }

  public clear(): void {
    this.tokens = [];
    this.composedText = "";
    this.manualEditOverride = false;
    this.matchedPhrase = false;
  }

  public getTokens(): SignPrediction[] {
    return [...this.tokens];
  }

  public getComposedText(): string {
    return this.composedText;
  }

  public isPhraseMatched(): boolean {
    return this.matchedPhrase;
  }

  public setComposedText(text: string): void {
    this.composedText = text;
    this.manualEditOverride = true;
  }

  private compilePhrase(): string {
    if (this.tokens.length === 0) {
      this.matchedPhrase = false;
      return "";
    }

    const signIds = this.tokens.map((t) => t.signId);

    // Multi-sign greedy phrase mapping check
    for (const mapping of PHRASE_MAPPINGS) {
      const matchLen = mapping.triggerSigns.length;
      if (signIds.length >= matchLen) {
        const recent = signIds.slice(-matchLen);
        const matches = recent.every((id, idx) => id === mapping.triggerSigns[idx]);
        if (matches) {
          this.matchedPhrase = true;
          return mapping.phraseText;
        }
      }
    }

    this.matchedPhrase = false;

    // Grammatical sentence synthesis with clean conjunctions
    const words = this.tokens.map((t) => {
      const def = SIGN_VOCABULARY[t.signId];
      return def ? def.label : t.label;
    });

    if (words.length === 1) {
      const single = words[0];
      return single.charAt(0).toUpperCase() + single.slice(1) + ".";
    }

    // Natural multi-word joiner
    const sentence = words.join(", ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
  }
}
