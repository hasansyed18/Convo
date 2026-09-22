// Controlled MVP Sign Vocabulary with Technical Specifications

export interface SignDefinition {
  signId: string;
  label: string;
  emoji: string;
  language: "ASL" | "ISL" | "UNIVERSAL";
  description: string;
  isDynamic: boolean;
  handMode: "oneHand" | "twoHand";
  modelClass: string;
  examplePhrase: string;
}

export const SIGN_VOCABULARY: Record<string, SignDefinition> = {
  hello: {
    signId: "hello",
    label: "Hello",
    emoji: "👋",
    language: "UNIVERSAL",
    description: "Open palm with all fingers extended, oscillating horizontally in a wave.",
    isDynamic: true,
    handMode: "oneHand",
    modelClass: "dynamic_lateral_wave",
    examplePhrase: "Hello! Nice to meet you.",
  },
  thank_you: {
    signId: "thank_you",
    label: "Thank You",
    emoji: "🙏",
    language: "ASL",
    description: "Flat hand starting near mouth/chin and extending forward toward receiver.",
    isDynamic: true,
    handMode: "oneHand",
    modelClass: "dynamic_forward_extension",
    examplePhrase: "Thank you for your assistance.",
  },
  please: {
    signId: "please",
    label: "Please",
    emoji: "🤲",
    language: "ASL",
    description: "Flat open hand rubbing in circular trajectory on chest.",
    isDynamic: true,
    handMode: "oneHand",
    modelClass: "dynamic_circular_motion",
    examplePhrase: "Could you please help me?",
  },
  help: {
    signId: "help",
    label: "Help",
    emoji: "🆘",
    language: "ASL",
    description: "Thumbs-up or closed fist lifted vertically upward.",
    isDynamic: true,
    handMode: "oneHand",
    modelClass: "dynamic_upward_lift",
    examplePhrase: "I need some help, please.",
  },
  yes: {
    signId: "yes",
    label: "Yes",
    emoji: "✊",
    language: "ASL",
    description: "Closed fist nodding vertically like a head nod.",
    isDynamic: true,
    handMode: "oneHand",
    modelClass: "dynamic_vertical_nod",
    examplePhrase: "Yes, that sounds good.",
  },
  no: {
    signId: "no",
    label: "No",
    emoji: "🤏",
    language: "ASL",
    description: "Index and middle fingers snap-closing down onto thumb tip.",
    isDynamic: true,
    handMode: "oneHand",
    modelClass: "dynamic_snap_pinch",
    examplePhrase: "No, thank you.",
  },
  stop: {
    signId: "stop",
    label: "Stop",
    emoji: "🛑",
    language: "UNIVERSAL",
    description: "Flat vertical open palm facing camera, stationary zero velocity.",
    isDynamic: false,
    handMode: "oneHand",
    modelClass: "static_open_palm",
    examplePhrase: "Please stop and wait.",
  },
  water: {
    signId: "water",
    label: "Water",
    emoji: "💧",
    language: "ASL",
    description: "Index, middle, and ring fingers extended upward in 'W' shape with thumb holding pinky.",
    isDynamic: false,
    handMode: "oneHand",
    modelClass: "static_w_shape",
    examplePhrase: "Could I have some water?",
  },
  good: {
    signId: "good",
    label: "Good / Thumbs Up",
    emoji: "👍",
    language: "UNIVERSAL",
    description: "Closed fist with thumb pointing vertically upward.",
    isDynamic: false,
    handMode: "oneHand",
    modelClass: "static_thumbs_up",
    examplePhrase: "That is very good.",
  },
  bad: {
    signId: "bad",
    label: "Bad / Thumbs Down",
    emoji: "👎",
    language: "UNIVERSAL",
    description: "Closed fist with thumb pointing vertically downward.",
    isDynamic: false,
    handMode: "oneHand",
    modelClass: "static_thumbs_down",
    examplePhrase: "That is not good.",
  },
  love: {
    signId: "love",
    label: "I Love You",
    emoji: "🤟",
    language: "ASL",
    description: "Thumb, index, and pinky extended; middle and ring fingers folded down.",
    isDynamic: false,
    handMode: "oneHand",
    modelClass: "static_ily_pose",
    examplePhrase: "I love you.",
  },
};

