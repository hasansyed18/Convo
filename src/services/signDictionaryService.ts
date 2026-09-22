// Comprehensive Sign Language Dictionary & Kinematic Keyframe System

export type HandShapeType =
  | "open"
  | "fist"
  | "thumbs_up"
  | "thumbs_down"
  | "point"
  | "peace"
  | "ily"
  | "w_sign"
  | "pinch"
  | "cup"
  | "claw"
  | "flat_b";

export type PalmOrientation = "front" | "back" | "side" | "up" | "down";

export interface FingerExtensionState {
  thumb: number;   // 0 = fully extended, 1 = fully curled into palm
  index: number;   // 0 = fully extended, 1 = fully curled
  middle: number;  // 0 = fully extended, 1 = fully curled
  ring: number;    // 0 = fully extended, 1 = fully curled
  pinky: number;   // 0 = fully extended, 1 = fully curled
  spread: number;  // finger splay (0 = tightly together, 1 = wide apart)
}

export interface HandPoseKeyframe extends FingerExtensionState {
  shape?: HandShapeType;
  orientation?: PalmOrientation;
  knuckleBend?: number; // 0 = straight, 1 = bent at 90 deg knuckles
}

export interface ArmKinematics {
  // Angles in degrees
  shoulderElevation: number; // 0 = resting down by side, 90 = horizontal, 140 = high up
  shoulderAbduction: number; // 0 = straight forward, 45 = natural diagonal, 90 = wide to side
  elbowFlexion: number;      // 0 = straight arm, 90 = right angle, 140 = hand close to chest/face
  forearmRotation: number;   // 0 = palm facing camera, 90 = palm inward, 180 = palm away
  wristAngle: number;        // wrist tilt (-30 to +30)
  hand: HandPoseKeyframe;
}

export interface SignAvatarKeyframe {
  headTilt: number;     // -15 to 15
  headNod: number;      // -15 (up) to 15 (down)
  expression: "neutral" | "smile" | "question" | "focused" | "polite";
  rightArm: ArmKinematics;
  leftArm: ArmKinematics;
  motionType?:
    | "static"
    | "wave"
    | "tap_chin"
    | "nod_fist"
    | "circle_chest"
    | "thrust_forward"
    | "snap_pinch"
    | "cross_chest"
    | "fist_lift"
    | "open_spread";
  durationMs: number;
}

export interface HandGestureDetails {
  shape: HandShapeType;
  orientation: PalmOrientation;
  thumb: string;
  index: string;
  middle: string;
  ring: string;
  pinky: string;
  actionCue: string;
}

export interface SignItem {
  id: string;
  name: string;
  category: "greetings" | "courtesy" | "responses" | "needs" | "common" | "questions" | "phrases" | "alphabet";
  emoji: string;
  description: string;
  aslFingerspelling?: string;
  handDetails: HandGestureDetails;
  keyframes: SignAvatarKeyframe[];
  aliases: string[]; // words/phrases that map to this sign
}

export interface TranslatedSignToken {
  sign: SignItem;
  word: string;
  isPhraseMatch?: boolean;
  matchedPhraseText?: string;
}

export interface PhraseMapping {
  triggerSigns: string[]; // sequence of sign IDs
  phraseText: string;
  spokenOutput: string;
  confidenceBonus: number;
}

// Canonical Hand Poses
export const HAND_POSES: Record<HandShapeType, HandPoseKeyframe> = {
  open: {
    shape: "open",
    orientation: "front",
    thumb: 0,
    index: 0,
    middle: 0,
    ring: 0,
    pinky: 0,
    spread: 0.7,
    knuckleBend: 0,
  },
  flat_b: {
    shape: "flat_b",
    orientation: "front",
    thumb: 0.8,
    index: 0,
    middle: 0,
    ring: 0,
    pinky: 0,
    spread: 0.05,
    knuckleBend: 0,
  },
  fist: {
    shape: "fist",
    orientation: "front",
    thumb: 0.9,
    index: 1,
    middle: 1,
    ring: 1,
    pinky: 1,
    spread: 0,
    knuckleBend: 1,
  },
  thumbs_up: {
    shape: "thumbs_up",
    orientation: "side",
    thumb: 0,
    index: 1,
    middle: 1,
    ring: 1,
    pinky: 1,
    spread: 0.2,
    knuckleBend: 1,
  },
  thumbs_down: {
    shape: "thumbs_down",
    orientation: "side",
    thumb: 0,
    index: 1,
    middle: 1,
    ring: 1,
    pinky: 1,
    spread: 0.2,
    knuckleBend: 1,
  },
  point: {
    shape: "point",
    orientation: "side",
    thumb: 0.8,
    index: 0,
    middle: 1,
    ring: 1,
    pinky: 1,
    spread: 0.2,
    knuckleBend: 0.8,
  },
  peace: {
    shape: "peace",
    orientation: "front",
    thumb: 0.9,
    index: 0,
    middle: 0,
    ring: 1,
    pinky: 1,
    spread: 0.8,
    knuckleBend: 0.7,
  },
  ily: {
    shape: "ily",
    orientation: "front",
    thumb: 0,
    index: 0,
    middle: 1,
    ring: 1,
    pinky: 0,
    spread: 0.9,
    knuckleBend: 0.6,
  },
  w_sign: {
    shape: "w_sign",
    orientation: "front",
    thumb: 0.9,
    index: 0,
    middle: 0,
    ring: 0,
    pinky: 0.9,
    spread: 0.6,
    knuckleBend: 0,
  },
  pinch: {
    shape: "pinch",
    orientation: "side",
    thumb: 0.4,
    index: 0.6,
    middle: 0.6,
    ring: 0.6,
    pinky: 0.6,
    spread: 0,
    knuckleBend: 0.7,
  },
  cup: {
    shape: "cup",
    orientation: "up",
    thumb: 0.3,
    index: 0.3,
    middle: 0.3,
    ring: 0.3,
    pinky: 0.3,
    spread: 0.3,
    knuckleBend: 0.4,
  },
  claw: {
    shape: "claw",
    orientation: "front",
    thumb: 0.4,
    index: 0.5,
    middle: 0.5,
    ring: 0.5,
    pinky: 0.5,
    spread: 0.5,
    knuckleBend: 0.6,
  },
};

const REST_ARM: ArmKinematics = {
  shoulderElevation: 10,
  shoulderAbduction: 15,
  elbowFlexion: 15,
  forearmRotation: 90,
  wristAngle: 0,
  hand: {
    shape: "open",
    orientation: "side",
    thumb: 0.2,
    index: 0.3,
    middle: 0.4,
    ring: 0.4,
    pinky: 0.4,
    spread: 0.1,
  },
};

export const SIGN_DICTIONARY: Record<string, SignItem> = {
  hello: {
    id: "hello",
    name: "Hello",
    category: "greetings",
    emoji: "👋",
    description: "Open right hand raised near temple, waving gently side-to-side with a warm smile.",
    handDetails: {
      shape: "open",
      orientation: "front",
      thumb: "Extended naturally away from palm",
      index: "Extended straight up",
      middle: "Extended straight up",
      ring: "Extended straight up",
      pinky: "Extended straight up",
      actionCue: "Raise hand by temple and wave palm side-to-side",
    },
    aliases: ["hello", "hi", "hey", "greetings", "howdy"],
    keyframes: [
      {
        headTilt: 0,
        headNod: -4,
        expression: "smile",
        durationMs: 900,
        motionType: "wave",
        rightArm: {
          shoulderElevation: 75,
          shoulderAbduction: 40,
          elbowFlexion: 100,
          forearmRotation: 0,
          wristAngle: 10,
          hand: HAND_POSES.open,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  thank_you: {
    id: "thank_you",
    name: "Thank you",
    category: "courtesy",
    emoji: "🙏",
    description: "Flat open hand touches fingertips lightly to chin/lips, then extends forward towards the person with a respectful nod.",
    handDetails: {
      shape: "flat_b",
      orientation: "front",
      thumb: "Tucked alongside palm",
      index: "Straight, together with middle",
      middle: "Straight, touching chin",
      ring: "Straight and together",
      pinky: "Straight and together",
      actionCue: "Touch chin lightly, then extend flat palm forward",
    },
    aliases: ["thank you", "thanks", "thank you so much", "thank you very much", "appreciate", "grateful", "many thanks"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 12,
        expression: "polite",
        durationMs: 1100,
        motionType: "tap_chin",
        rightArm: {
          shoulderElevation: 62,
          shoulderAbduction: 15,
          elbowFlexion: 120,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.flat_b,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  please: {
    id: "please",
    name: "Please",
    category: "courtesy",
    emoji: "🤲",
    description: "Flat right palm rubs in a gentle, polite clockwise circle over the center of the chest.",
    handDetails: {
      shape: "flat_b",
      orientation: "front",
      thumb: "Extended slightly outward",
      index: "Straight and together",
      middle: "Straight and together",
      ring: "Straight and together",
      pinky: "Straight and together",
      actionCue: "Place flat palm flat on chest and rub in gentle circle",
    },
    aliases: ["please", "kindly", "if you would", "if you please"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 6,
        expression: "polite",
        durationMs: 1100,
        motionType: "circle_chest",
        rightArm: {
          shoulderElevation: 42,
          shoulderAbduction: 12,
          elbowFlexion: 95,
          forearmRotation: 90,
          wristAngle: -10,
          hand: HAND_POSES.flat_b,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  help: {
    id: "help",
    name: "Help",
    category: "needs",
    emoji: "🆘",
    description: "Left flat hand acts as a supportive platform; right thumbs-up fist rests on it and both lift upward together.",
    handDetails: {
      shape: "thumbs_up",
      orientation: "side",
      thumb: "Extended upright like a mast",
      index: "Curled tightly into fist",
      middle: "Curled into fist",
      ring: "Curled into fist",
      pinky: "Curled into fist",
      actionCue: "Place thumbs-up on flat left palm, lift upward",
    },
    aliases: ["help", "assist", "assistance", "support", "help me", "emergency"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 0,
        expression: "focused",
        durationMs: 1100,
        motionType: "fist_lift",
        rightArm: {
          shoulderElevation: 45,
          shoulderAbduction: 15,
          elbowFlexion: 90,
          forearmRotation: 0,
          wristAngle: 0,
          hand: HAND_POSES.thumbs_up,
        },
        leftArm: {
          shoulderElevation: 40,
          shoulderAbduction: 15,
          elbowFlexion: 90,
          forearmRotation: 0,
          wristAngle: 0,
          hand: HAND_POSES.open,
        },
      },
    ],
  },

  yes: {
    id: "yes",
    name: "Yes",
    category: "responses",
    emoji: "✊",
    description: "Right hand in a closed fist nods up and down from the wrist, mimicking an affirmative head nod.",
    handDetails: {
      shape: "fist",
      orientation: "front",
      thumb: "Wrapped securely across folded fingers",
      index: "Curled fully into palm",
      middle: "Curled fully into palm",
      ring: "Curled fully into palm",
      pinky: "Curled fully into palm",
      actionCue: "Make a fist and nod your wrist up and down",
    },
    aliases: ["yes", "yeah", "yep", "agree", "correct", "sure", "affirmative", "absolutely"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 15,
        expression: "smile",
        durationMs: 850,
        motionType: "nod_fist",
        rightArm: {
          shoulderElevation: 48,
          shoulderAbduction: 22,
          elbowFlexion: 90,
          forearmRotation: 90,
          wristAngle: 15,
          hand: HAND_POSES.fist,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  no: {
    id: "no",
    name: "No",
    category: "responses",
    emoji: "✋",
    description: "Index and middle fingers snap shut quickly against the thumb, like a decisive beak closing.",
    handDetails: {
      shape: "pinch",
      orientation: "front",
      thumb: "Extended up to meet index and middle",
      index: "Extended forward, snaps onto thumb",
      middle: "Extended forward, snaps onto thumb",
      ring: "Curled tightly into palm",
      pinky: "Curled tightly into palm",
      actionCue: "Snap index & middle fingertips firmly against thumb",
    },
    aliases: ["no", "nope", "disagree", "incorrect", "negative", "never"],
    keyframes: [
      {
        headTilt: 10,
        headNod: 0,
        expression: "neutral",
        durationMs: 850,
        motionType: "snap_pinch",
        rightArm: {
          shoulderElevation: 50,
          shoulderAbduction: 25,
          elbowFlexion: 90,
          forearmRotation: 0,
          wristAngle: 0,
          hand: { ...HAND_POSES.pinch, ring: 1, pinky: 1 },
        },
        leftArm: REST_ARM,
      },
    ],
  },

  i_love_you: {
    id: "i_love_you",
    name: "I Love You",
    category: "common",
    emoji: "🤟",
    description: "ASL 'ILY' sign: Thumb, index, and pinky fingers extended upward while middle and ring fingers fold tightly down.",
    handDetails: {
      shape: "ily",
      orientation: "front",
      thumb: "Extended wide to side",
      index: "Pointing straight up",
      middle: "Folded flat against palm",
      ring: "Folded flat against palm",
      pinky: "Pointing straight up",
      actionCue: "Extend thumb, index, and pinky. Hold with love.",
    },
    aliases: ["i love you", "love", "ily", "love you", "lots of love"],
    keyframes: [
      {
        headTilt: -6,
        headNod: 0,
        expression: "smile",
        durationMs: 1100,
        motionType: "wave",
        rightArm: {
          shoulderElevation: 65,
          shoulderAbduction: 35,
          elbowFlexion: 90,
          forearmRotation: 0,
          wristAngle: 0,
          hand: HAND_POSES.ily,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  good: {
    id: "good",
    name: "Good / Thumbs Up",
    category: "responses",
    emoji: "👍",
    description: "Right hand forms an upright thumbs-up sign raised confidently forward.",
    handDetails: {
      shape: "thumbs_up",
      orientation: "side",
      thumb: "Pointing straight upward",
      index: "Folded into tight fist",
      middle: "Folded into tight fist",
      ring: "Folded into tight fist",
      pinky: "Folded into tight fist",
      actionCue: "Extend thumb straight up with closed fist",
    },
    aliases: ["good", "great", "ok", "okay", "fine", "awesome", "like", "positive", "well done"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 8,
        expression: "smile",
        durationMs: 900,
        motionType: "static",
        rightArm: {
          shoulderElevation: 46,
          shoulderAbduction: 20,
          elbowFlexion: 95,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.thumbs_up,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  peace: {
    id: "peace",
    name: "Peace / Victory",
    category: "common",
    emoji: "✌️",
    description: "Index and middle fingers extended upward in a clear V shape, thumb tucked holding ring & pinky.",
    handDetails: {
      shape: "peace",
      orientation: "front",
      thumb: "Folded over ring finger",
      index: "Extended in V-shape",
      middle: "Extended in V-shape",
      ring: "Curled tightly down",
      pinky: "Curled tightly down",
      actionCue: "Make a 'V' sign with index and middle fingers",
    },
    aliases: ["peace", "victory", "two", "bye", "goodbye", "see you"],
    keyframes: [
      {
        headTilt: 5,
        headNod: 0,
        expression: "smile",
        durationMs: 900,
        motionType: "static",
        rightArm: {
          shoulderElevation: 65,
          shoulderAbduction: 35,
          elbowFlexion: 90,
          forearmRotation: 0,
          wristAngle: 0,
          hand: HAND_POSES.peace,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  stop: {
    id: "stop",
    name: "Stop / Wait",
    category: "common",
    emoji: "🛑",
    description: "Open right palm facing forward firmly pushing outward to indicate pause or halt.",
    handDetails: {
      shape: "open",
      orientation: "front",
      thumb: "Extended to side",
      index: "Extended straight up",
      middle: "Extended straight up",
      ring: "Extended straight up",
      pinky: "Extended straight up",
      actionCue: "Firmly extend open palm facing forward toward person",
    },
    aliases: ["stop", "wait", "hold on", "pause", "halt", "wait for me"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 0,
        expression: "focused",
        durationMs: 900,
        motionType: "thrust_forward",
        rightArm: {
          shoulderElevation: 55,
          shoulderAbduction: 15,
          elbowFlexion: 60,
          forearmRotation: 0,
          wristAngle: 25,
          hand: HAND_POSES.open,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  water: {
    id: "water",
    name: "Water",
    category: "needs",
    emoji: "💧",
    description: "W-sign formed with index, middle, and ring fingers spread upright, tapping twice lightly on the chin or lips.",
    handDetails: {
      shape: "w_sign",
      orientation: "side",
      thumb: "Tucked holding down pinky",
      index: "Extended straight up (1st branch of W)",
      middle: "Extended straight up (2nd branch of W)",
      ring: "Extended straight up (3rd branch of W)",
      pinky: "Folded down under thumb",
      actionCue: "Form a 'W' with 3 fingers and tap chin twice",
    },
    aliases: ["water", "drink", "thirsty", "hydrate", "need water", "can i have water"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 6,
        expression: "polite",
        durationMs: 1000,
        motionType: "tap_chin",
        rightArm: {
          shoulderElevation: 60,
          shoulderAbduction: 15,
          elbowFlexion: 125,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.w_sign,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  eat: {
    id: "eat",
    name: "Eat / Food",
    category: "needs",
    emoji: "🍎",
    description: "Fingertips brought together into a pinched O-shape and tapped twice lightly toward the mouth.",
    handDetails: {
      shape: "pinch",
      orientation: "side",
      thumb: "Fingertip touching other 4 fingertips",
      index: "Curved inward to touch thumb",
      middle: "Curved inward to touch thumb",
      ring: "Curved inward to touch thumb",
      pinky: "Curved inward to touch thumb",
      actionCue: "Group all 5 fingertips together and tap mouth twice",
    },
    aliases: ["eat", "food", "hungry", "meal", "dinner", "lunch", "breakfast", "feed"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 6,
        expression: "neutral",
        durationMs: 1000,
        motionType: "tap_chin",
        rightArm: {
          shoulderElevation: 60,
          shoulderAbduction: 10,
          elbowFlexion: 130,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.pinch,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  more: {
    id: "more",
    name: "More",
    category: "needs",
    emoji: "➕",
    description: "Both hands with grouped fingertips brought together in front of the chest repeatedly.",
    handDetails: {
      shape: "pinch",
      orientation: "front",
      thumb: "Touching fingertips in flat-O",
      index: "Curved to touch thumb",
      middle: "Curved to touch thumb",
      ring: "Curved to touch thumb",
      pinky: "Curved to touch thumb",
      actionCue: "Bring both pinched hands together at chest repeatedly",
    },
    aliases: ["more", "again", "repeat", "continue", "another"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 5,
        expression: "polite",
        durationMs: 1000,
        motionType: "thrust_forward",
        rightArm: {
          shoulderElevation: 40,
          shoulderAbduction: 20,
          elbowFlexion: 85,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.pinch,
        },
        leftArm: {
          shoulderElevation: 40,
          shoulderAbduction: 20,
          elbowFlexion: 85,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.pinch,
        },
      },
    ],
  },

  sorry: {
    id: "sorry",
    name: "Sorry / Excuse Me",
    category: "courtesy",
    emoji: "🥺",
    description: "Right closed fist with thumb against fingers rubbed in a circular motion on the chest with an apologetic expression.",
    handDetails: {
      shape: "fist",
      orientation: "front",
      thumb: "Resting against side of index finger",
      index: "Curled into fist",
      middle: "Curled into fist",
      ring: "Curled into fist",
      pinky: "Curled into fist",
      actionCue: "Make a closed fist and rub gently on chest in circle",
    },
    aliases: ["sorry", "apologize", "excuse me", "pardon", "my bad", "forgive me"],
    keyframes: [
      {
        headTilt: 8,
        headNod: 10,
        expression: "polite",
        durationMs: 1100,
        motionType: "circle_chest",
        rightArm: {
          shoulderElevation: 45,
          shoulderAbduction: 15,
          elbowFlexion: 95,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.fist,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  how_are_you: {
    id: "how_are_you",
    name: "How are you?",
    category: "phrases",
    emoji: "❓",
    description: "Curved cupped hands rotate outward from chest toward the viewer with an inquiring, friendly head tilt.",
    handDetails: {
      shape: "cup",
      orientation: "up",
      thumb: "Curved outward",
      index: "Curved gently like holding a cup",
      middle: "Curved gently",
      ring: "Curved gently",
      pinky: "Curved gently",
      actionCue: "Cup both palms inward, roll them outward toward person",
    },
    aliases: [
      "how are you",
      "how are you doing",
      "how are you doing today",
      "what's up",
      "whats up",
      "how is it going",
      "hows it going",
      "how are things",
    ],
    keyframes: [
      {
        headTilt: -6,
        headNod: -5,
        expression: "question",
        durationMs: 1200,
        motionType: "thrust_forward",
        rightArm: {
          shoulderElevation: 45,
          shoulderAbduction: 25,
          elbowFlexion: 75,
          forearmRotation: 0,
          wristAngle: -10,
          hand: HAND_POSES.cup,
        },
        leftArm: {
          shoulderElevation: 45,
          shoulderAbduction: 25,
          elbowFlexion: 75,
          forearmRotation: 0,
          wristAngle: -10,
          hand: HAND_POSES.cup,
        },
      },
    ],
  },

  nice_to_meet_you: {
    id: "nice_to_meet_you",
    name: "Nice to meet you",
    category: "phrases",
    emoji: "🤝",
    description: "Right flat palm slides smoothly across left palm ('Nice'), then both index fingers point upward and meet together ('Meet You').",
    handDetails: {
      shape: "point",
      orientation: "front",
      thumb: "Tucked against side",
      index: "Pointing straight up",
      middle: "Folded flat",
      ring: "Folded flat",
      pinky: "Folded flat",
      actionCue: "Slide right hand across left, then bring index fingers together",
    },
    aliases: [
      "nice to meet you",
      "pleased to meet you",
      "glad to meet you",
      "good to meet you",
      "happy to meet you",
    ],
    keyframes: [
      {
        headTilt: 0,
        headNod: 10,
        expression: "smile",
        durationMs: 1300,
        motionType: "cross_chest",
        rightArm: {
          shoulderElevation: 45,
          shoulderAbduction: 15,
          elbowFlexion: 90,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.flat_b,
        },
        leftArm: {
          shoulderElevation: 45,
          shoulderAbduction: 15,
          elbowFlexion: 90,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.flat_b,
        },
      },
    ],
  },

  good_morning: {
    id: "good_morning",
    name: "Good Morning",
    category: "phrases",
    emoji: "🌅",
    description: "Flat right hand moves from chin outward ('Good'), then right forearm rises upward from inside left elbow like the rising sun ('Morning').",
    handDetails: {
      shape: "open",
      orientation: "front",
      thumb: "Extended naturally",
      index: "Extended straight up",
      middle: "Extended straight up",
      ring: "Extended straight up",
      pinky: "Extended straight up",
      actionCue: "Sign 'good' from chin, then rise right hand up like sunrise",
    },
    aliases: ["good morning", "morning", "have a good morning"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 6,
        expression: "smile",
        durationMs: 1200,
        motionType: "tap_chin",
        rightArm: {
          shoulderElevation: 60,
          shoulderAbduction: 15,
          elbowFlexion: 100,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.open,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  good_night: {
    id: "good_night",
    name: "Good Night",
    category: "phrases",
    emoji: "🌙",
    description: "Right hand moves from chin ('Good'), then bends over left wrist like the sun setting below the horizon ('Night').",
    handDetails: {
      shape: "claw",
      orientation: "front",
      thumb: "Curved gently down",
      index: "Bent at knuckles over wrist",
      middle: "Bent at knuckles",
      ring: "Bent at knuckles",
      pinky: "Bent at knuckles",
      actionCue: "Sign 'good', then arch hand downward over other arm",
    },
    aliases: ["good night", "night", "sweet dreams", "have a good night"],
    keyframes: [
      {
        headTilt: 4,
        headNod: 8,
        expression: "polite",
        durationMs: 1200,
        motionType: "cross_chest",
        rightArm: {
          shoulderElevation: 50,
          shoulderAbduction: 15,
          elbowFlexion: 95,
          forearmRotation: 90,
          wristAngle: -15,
          hand: HAND_POSES.claw,
        },
        leftArm: {
          shoulderElevation: 35,
          shoulderAbduction: 15,
          elbowFlexion: 90,
          forearmRotation: 90,
          wristAngle: 0,
          hand: HAND_POSES.flat_b,
        },
      },
    ],
  },

  you_are_welcome: {
    id: "you_are_welcome",
    name: "You're Welcome",
    category: "courtesy",
    emoji: "🤗",
    description: "Flat open palm sweeps smoothly downward and inward towards waist with a gracious nod.",
    handDetails: {
      shape: "open",
      orientation: "up",
      thumb: "Extended outward",
      index: "Extended flat",
      middle: "Extended flat",
      ring: "Extended flat",
      pinky: "Extended flat",
      actionCue: "Open palm facing up sweeps gracefully downward toward waist",
    },
    aliases: ["you are welcome", "youre welcome", "welcome", "no problem", "my pleasure", "anytime"],
    keyframes: [
      {
        headTilt: 0,
        headNod: 8,
        expression: "smile",
        durationMs: 1000,
        motionType: "thrust_forward",
        rightArm: {
          shoulderElevation: 40,
          shoulderAbduction: 20,
          elbowFlexion: 80,
          forearmRotation: 0,
          wristAngle: -10,
          hand: HAND_POSES.open,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  see_you_later: {
    id: "see_you_later",
    name: "See You Later",
    category: "phrases",
    emoji: "👀",
    description: "V-hand points to eyes ('See'), then points forward ('You') and makes an 'L' shape rotating forward ('Later').",
    handDetails: {
      shape: "peace",
      orientation: "front",
      thumb: "Tucked holding ring finger",
      index: "Pointing from eyes outward",
      middle: "Pointing from eyes outward",
      ring: "Folded into palm",
      pinky: "Folded into palm",
      actionCue: "Touch near eyes with V-fingers and point forward",
    },
    aliases: ["see you later", "see you soon", "see you", "catch you later"],
    keyframes: [
      {
        headTilt: 4,
        headNod: 0,
        expression: "smile",
        durationMs: 1100,
        motionType: "wave",
        rightArm: {
          shoulderElevation: 68,
          shoulderAbduction: 28,
          elbowFlexion: 105,
          forearmRotation: 0,
          wristAngle: 0,
          hand: HAND_POSES.peace,
        },
        leftArm: REST_ARM,
      },
    ],
  },

  what_is_your_name: {
    id: "what_is_your_name",
    name: "What is your name?",
    category: "questions",
    emoji: "📛",
    description: "Open palm points to viewer ('Your'), both H-hands tap together ('Name'), then palms turn up with furrowed inquiring brow ('What').",
    handDetails: {
      shape: "point",
      orientation: "front",
      thumb: "Tucked against side",
      index: "Points toward viewer",
      middle: "Together with index",
      ring: "Folded down",
      pinky: "Folded down",
      actionCue: "Point forward, tap index & middle fingers, open palms",
    },
    aliases: ["what is your name", "whats your name", "who are you", "your name"],
    keyframes: [
      {
        headTilt: -5,
        headNod: -5,
        expression: "question",
        durationMs: 1300,
        motionType: "thrust_forward",
        rightArm: {
          shoulderElevation: 48,
          shoulderAbduction: 20,
          elbowFlexion: 75,
          forearmRotation: 0,
          wristAngle: 0,
          hand: HAND_POSES.open,
        },
        leftArm: {
          shoulderElevation: 48,
          shoulderAbduction: 20,
          elbowFlexion: 75,
          forearmRotation: 0,
          wristAngle: 0,
          hand: HAND_POSES.open,
        },
      },
    ],
  },

  where_is_bathroom: {
    id: "where_is_bathroom",
    name: "Where is the bathroom?",
    category: "needs",
    emoji: "🚻",
    description: "ASL 'T' hand (thumb between index and middle) shakes side-to-side with an inquiring question facial expression.",
    handDetails: {
      shape: "fist",
      orientation: "front",
      thumb: "Poked up between index and middle fingers",
      index: "Curled over thumb",
      middle: "Curled over thumb",
      ring: "Curled into fist",
      pinky: "Curled into fist",
      actionCue: "Form a 'T' hand and gently shake wrist side to side",
    },
    aliases: [
      "where is the bathroom",
      "where is the restroom",
      "bathroom",
      "restroom",
      "toilet",
      "washroom",
      "need bathroom",
    ],
    keyframes: [
      {
        headTilt: -5,
        headNod: 0,
        expression: "question",
        durationMs: 1100,
        motionType: "wave",
        rightArm: {
          shoulderElevation: 55,
          shoulderAbduction: 25,
          elbowFlexion: 90,
          forearmRotation: 0,
          wristAngle: 10,
          hand: HAND_POSES.fist,
        },
        leftArm: REST_ARM,
      },
    ],
  },
};

// Comprehensive ASL Fingerspelling A-Z generator
const ASL_ALPHABET_POSES: Record<string, { hand: HandPoseKeyframe; details: HandGestureDetails }> = {
  a: {
    hand: { shape: "fist", orientation: "front", thumb: 0, index: 1, middle: 1, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "fist", orientation: "front", thumb: "Resting straight upright on side of index", index: "Curled tightly into palm", middle: "Curled into palm", ring: "Curled into palm", pinky: "Curled into palm", actionCue: "Closed fist with thumb resting alongside index finger" },
  },
  b: {
    hand: { shape: "flat_b", orientation: "front", thumb: 0.9, index: 0, middle: 0, ring: 0, pinky: 0, spread: 0.05 },
    details: { shape: "flat_b", orientation: "front", thumb: "Tucked across bottom of palm", index: "Extended straight up", middle: "Extended straight up", ring: "Extended straight up", pinky: "Extended straight up", actionCue: "Four fingers straight together, thumb folded over palm" },
  },
  c: {
    hand: { shape: "cup", orientation: "side", thumb: 0.3, index: 0.3, middle: 0.3, ring: 0.3, pinky: 0.3, spread: 0.2 },
    details: { shape: "cup", orientation: "side", thumb: "Curved up forming bottom arc of C", index: "Curved forming top arc of C", middle: "Curved with index", ring: "Curved with index", pinky: "Curved with index", actionCue: "Curve hand to form clear letter 'C' silhouette" },
  },
  d: {
    hand: { shape: "point", orientation: "front", thumb: 0.5, index: 0, middle: 0.8, ring: 0.8, pinky: 0.8, spread: 0 },
    details: { shape: "point", orientation: "front", thumb: "Touches tips of middle and ring", index: "Pointing straight up", middle: "Curved touching thumb", ring: "Curved touching thumb", pinky: "Curved touching thumb", actionCue: "Index pointing straight up, other fingers form circle with thumb" },
  },
  e: {
    hand: { shape: "claw", orientation: "front", thumb: 0.8, index: 0.9, middle: 0.9, ring: 0.9, pinky: 0.9, spread: 0 },
    details: { shape: "claw", orientation: "front", thumb: "Curled under fingertips", index: "Curled tightly with tips on thumb", middle: "Curled touching thumb", ring: "Curled touching thumb", pinky: "Curled touching thumb", actionCue: "All fingers curled tightly with fingertips resting on thumb" },
  },
  f: {
    hand: { shape: "peace", orientation: "front", thumb: 0.5, index: 0.8, middle: 0, ring: 0, pinky: 0, spread: 0.6 },
    details: { shape: "peace", orientation: "front", thumb: "Touches tip of index forming an O", index: "Touches thumb", middle: "Extended straight up", ring: "Extended straight up", pinky: "Extended straight up", actionCue: "Index touches thumb, other 3 fingers extended upward" },
  },
  g: {
    hand: { shape: "point", orientation: "side", thumb: 0.2, index: 0, middle: 1, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "point", orientation: "side", thumb: "Extended parallel to index", index: "Pointing horizontally to side", middle: "Curled in", ring: "Curled in", pinky: "Curled in", actionCue: "Index and thumb extend sideways like pincers" },
  },
  h: {
    hand: { shape: "peace", orientation: "side", thumb: 0.8, index: 0, middle: 0, ring: 1, pinky: 1, spread: 0.05 },
    details: { shape: "peace", orientation: "side", thumb: "Tucked under fingers", index: "Pointing horizontally sideways", middle: "Pointing horizontally sideways next to index", ring: "Curled in", pinky: "Curled in", actionCue: "Index and middle extended straight sideways together" },
  },
  i: {
    hand: { shape: "fist", orientation: "front", thumb: 0.9, index: 1, middle: 1, ring: 1, pinky: 0, spread: 0 },
    details: { shape: "fist", orientation: "front", thumb: "Folded across index and middle", index: "Curled in", middle: "Curled in", ring: "Curled in", pinky: "Extended straight up", actionCue: "Pinky straight up, other fingers curled in a fist" },
  },
  j: {
    hand: { shape: "fist", orientation: "front", thumb: 0.9, index: 1, middle: 1, ring: 1, pinky: 0, spread: 0 },
    details: { shape: "fist", orientation: "front", thumb: "Folded across fingers", index: "Curled in", middle: "Curled in", ring: "Curled in", pinky: "Tracing a J curve in the air", actionCue: "Pinky draws a 'J' in the air" },
  },
  k: {
    hand: { shape: "peace", orientation: "front", thumb: 0.3, index: 0, middle: 0.1, ring: 1, pinky: 1, spread: 0.4 },
    details: { shape: "peace", orientation: "front", thumb: "Tucked between index and middle", index: "Pointing straight up", middle: "Pointing slightly forward", ring: "Curled in", pinky: "Curled in", actionCue: "Index up, middle forward, thumb resting between them" },
  },
  l: {
    hand: { shape: "point", orientation: "front", thumb: 0, index: 0, middle: 1, ring: 1, pinky: 1, spread: 0.9 },
    details: { shape: "point", orientation: "front", thumb: "Extended at 90 deg angle", index: "Pointing straight up", middle: "Curled in", ring: "Curled in", pinky: "Curled in", actionCue: "Form a sharp 90-degree 'L' with thumb and index" },
  },
  m: {
    hand: { shape: "fist", orientation: "front", thumb: 0.9, index: 0.9, middle: 0.9, ring: 0.9, pinky: 1, spread: 0 },
    details: { shape: "fist", orientation: "front", thumb: "Tucked under index, middle, and ring", index: "Curled over thumb", middle: "Curled over thumb", ring: "Curled over thumb", pinky: "Curled into palm", actionCue: "Three fingers curled over thumb resting between ring & pinky" },
  },
  n: {
    hand: { shape: "fist", orientation: "front", thumb: 0.9, index: 0.9, middle: 0.9, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "fist", orientation: "front", thumb: "Tucked under index and middle", index: "Curled over thumb", middle: "Curled over thumb", ring: "Curled into palm", pinky: "Curled into palm", actionCue: "Two fingers curled over thumb" },
  },
  o: {
    hand: { shape: "cup", orientation: "front", thumb: 0.4, index: 0.4, middle: 0.4, ring: 0.4, pinky: 0.4, spread: 0 },
    details: { shape: "cup", orientation: "front", thumb: "Touches all fingertips", index: "Curved into O", middle: "Curved into O", ring: "Curved into O", pinky: "Curved into O", actionCue: "All fingers curved to form an 'O' with thumb" },
  },
  p: {
    hand: { shape: "peace", orientation: "down", thumb: 0.3, index: 0, middle: 0.1, ring: 1, pinky: 1, spread: 0.4 },
    details: { shape: "peace", orientation: "down", thumb: "Between fingers", index: "Pointing down", middle: "Pointing forward-down", ring: "Curled in", pinky: "Curled in", actionCue: "'K' hand tilted downwards" },
  },
  q: {
    hand: { shape: "point", orientation: "down", thumb: 0.2, index: 0, middle: 1, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "point", orientation: "down", thumb: "Extended down parallel to index", index: "Pointing down", middle: "Curled in", ring: "Curled in", pinky: "Curled in", actionCue: "'G' hand pointing downwards" },
  },
  r: {
    hand: { shape: "peace", orientation: "front", thumb: 0.9, index: 0, middle: 0, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "peace", orientation: "front", thumb: "Holding ring finger", index: "Crossed behind middle finger", middle: "Crossed in front of index", ring: "Curled in", pinky: "Curled in", actionCue: "Cross middle finger over index finger" },
  },
  s: {
    hand: { shape: "fist", orientation: "front", thumb: 0.8, index: 1, middle: 1, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "fist", orientation: "front", thumb: "Wrapped across front of fingers", index: "Curled tightly", middle: "Curled tightly", ring: "Curled tightly", pinky: "Curled tightly", actionCue: "Tight fist with thumb locked horizontally across front" },
  },
  t: {
    hand: { shape: "fist", orientation: "front", thumb: 0.5, index: 0.9, middle: 1, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "fist", orientation: "front", thumb: "Poked between index and middle", index: "Curled over thumb", middle: "Curled in", ring: "Curled in", pinky: "Curled in", actionCue: "Thumb tucked between index and middle fingers in a fist" },
  },
  u: {
    hand: { shape: "peace", orientation: "front", thumb: 0.9, index: 0, middle: 0, ring: 1, pinky: 1, spread: 0.05 },
    details: { shape: "peace", orientation: "front", thumb: "Holding ring finger", index: "Extended straight up together", middle: "Extended straight up together", ring: "Curled in", pinky: "Curled in", actionCue: "Index and middle fingers extended straight up together" },
  },
  v: {
    hand: { shape: "peace", orientation: "front", thumb: 0.9, index: 0, middle: 0, ring: 1, pinky: 1, spread: 0.7 },
    details: { shape: "peace", orientation: "front", thumb: "Holding ring finger", index: "Extended in V shape", middle: "Extended in V shape", ring: "Curled in", pinky: "Curled in", actionCue: "Index and middle fingers spread in a distinct 'V' shape" },
  },
  w: {
    hand: { shape: "w_sign", orientation: "front", thumb: 0.9, index: 0, middle: 0, ring: 0, pinky: 0.9, spread: 0.6 },
    details: { shape: "w_sign", orientation: "front", thumb: "Holding pinky", index: "Extended upright", middle: "Extended upright", ring: "Extended upright", pinky: "Folded down under thumb", actionCue: "Index, middle, and ring fingers spread upright in a 'W'" },
  },
  x: {
    hand: { shape: "point", orientation: "side", thumb: 0.8, index: 0.5, middle: 1, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "point", orientation: "side", thumb: "Resting against side", index: "Bent like a pirate hook", middle: "Curled in", ring: "Curled in", pinky: "Curled in", actionCue: "Index finger hooked like a curved claw" },
  },
  y: {
    hand: { shape: "ily", orientation: "front", thumb: 0, index: 1, middle: 1, ring: 1, pinky: 0, spread: 0.9 },
    details: { shape: "ily", orientation: "front", thumb: "Extended wide to side", index: "Curled in", middle: "Curled in", ring: "Curled in", pinky: "Extended wide to side", actionCue: "Hang loose / Shaka: thumb and pinky extended, middle 3 curled" },
  },
  z: {
    hand: { shape: "point", orientation: "front", thumb: 0.8, index: 0, middle: 1, ring: 1, pinky: 1, spread: 0 },
    details: { shape: "point", orientation: "front", thumb: "Tucked against side", index: "Traces a 'Z' in the air", middle: "Curled in", ring: "Curled in", pinky: "Curled in", actionCue: "Index finger traces the letter 'Z' in the air" },
  },
};

// Natural Multi-token Phrase Sequences (Sign -> Text)
export const PHRASE_DICTIONARY: PhraseMapping[] = [
  {
    triggerSigns: ["hello", "how_are_you"],
    phraseText: "Hello! How are you doing today?",
    spokenOutput: "Hello, how are you doing today?",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["hello", "nice_to_meet_you"],
    phraseText: "Hello, it is a pleasure to meet you!",
    spokenOutput: "Hello, it is a pleasure to meet you.",
    confidenceBonus: 0.25,
  },
  {
    triggerSigns: ["please", "help"],
    phraseText: "Please, I need some assistance.",
    spokenOutput: "Please, I need some assistance.",
    confidenceBonus: 0.25,
  },
  {
    triggerSigns: ["help", "water"],
    phraseText: "Could you please help me get some water?",
    spokenOutput: "Could you please help me get some water?",
    confidenceBonus: 0.25,
  },
  {
    triggerSigns: ["water", "please"],
    phraseText: "Could I please have a glass of water?",
    spokenOutput: "Could I please have a glass of water?",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["eat", "please"],
    phraseText: "I am hungry, could I have something to eat please?",
    spokenOutput: "I am hungry, could I have something to eat please?",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["thank_you", "good"],
    phraseText: "Thank you very much, that was wonderful!",
    spokenOutput: "Thank you very much, that was wonderful.",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["yes", "thank_you"],
    phraseText: "Yes, thank you so much!",
    spokenOutput: "Yes, thank you so much.",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["no", "thank_you"],
    phraseText: "No, thank you.",
    spokenOutput: "No, thank you.",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["sorry", "please"],
    phraseText: "I am sorry, please excuse me.",
    spokenOutput: "I am sorry, please excuse me.",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["good", "morning"],
    phraseText: "Good morning! Hope you have a wonderful day.",
    spokenOutput: "Good morning! Hope you have a wonderful day.",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["see_you_later", "thank_you"],
    phraseText: "See you later, thank you for everything!",
    spokenOutput: "See you later, thank you for everything.",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["i_love_you", "thank_you"],
    phraseText: "I love you, thank you so much!",
    spokenOutput: "I love you, thank you so much.",
    confidenceBonus: 0.2,
  },
  {
    triggerSigns: ["stop", "please"],
    phraseText: "Please wait a moment, hold on.",
    spokenOutput: "Please wait a moment, hold on.",
    confidenceBonus: 0.2,
  },
];

/**
 * Normalizes input text and resolves contractions
 */
function normalizeInputText(text: string): string[] {
  let cleaned = text.toLowerCase();

  // Contraction resolution
  cleaned = cleaned
    .replace(/how's/g, "how is")
    .replace(/what's/g, "what is")
    .replace(/where's/g, "where is")
    .replace(/who's/g, "who is")
    .replace(/don't/g, "do not")
    .replace(/can't/g, "cannot")
    .replace(/i'm/g, "i am")
    .replace(/you're/g, "you are")
    .replace(/we're/g, "we are")
    .replace(/they're/g, "they are")
    .replace(/it's/g, "it is")
    .replace(/that's/g, "that is")
    .replace(/let's/g, "let us")
    .replace(/won't/g, "will not");

  // Remove punctuation except spaces
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, " ");
  return cleaned.split(/\s+/).filter(Boolean);
}

/**
 * Intelligent greedy multi-word n-gram tokenizer & phrase matcher
 * Matches up to 5-word phrases down to single words and fingerspelling
 */
export function translateTextToSignSequence(text: string): TranslatedSignToken[] {
  if (!text || !text.trim()) return [];

  const words = normalizeInputText(text);
  const sequence: TranslatedSignToken[] = [];

  let i = 0;
  while (i < words.length) {
    let matched = false;

    // Greedy matching from 5-gram down to 2-gram
    for (let len = Math.min(5, words.length - i); len >= 2; len--) {
      const phrase = words.slice(i, i + len).join(" ");
      const sign = findSignByAlias(phrase);
      if (sign) {
        sequence.push({
          sign,
          word: phrase,
          isPhraseMatch: true,
          matchedPhraseText: sign.name,
        });
        i += len;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Single-word check
    const singleWord = words[i];
    const sign1 = findSignByAlias(singleWord);
    if (sign1) {
      sequence.push({
        sign: sign1,
        word: singleWord,
        isPhraseMatch: false,
      });
    } else {
      // Fallback: Fingerspell letter by letter
      for (const char of singleWord) {
        const letterSign = getLetterSign(char);
        if (letterSign) {
          sequence.push({
            sign: letterSign,
            word: char.toUpperCase(),
            isPhraseMatch: false,
          });
        }
      }
    }
    i++;
  }

  return sequence;
}

export function findSignByAlias(word: string): SignItem | null {
  const target = word.trim().toLowerCase();
  for (const item of Object.values(SIGN_DICTIONARY)) {
    if (
      item.id.toLowerCase() === target ||
      item.name.toLowerCase() === target ||
      item.aliases.some((a) => a.toLowerCase() === target)
    ) {
      return item;
    }
  }
  return null;
}

export function getLetterSign(char: string): SignItem | null {
  const c = char.toLowerCase();
  if (!/[a-z]/.test(c)) return null;

  const letterInfo = ASL_ALPHABET_POSES[c] || {
    hand: HAND_POSES.open,
    details: {
      shape: "open" as HandShapeType,
      orientation: "front" as PalmOrientation,
      thumb: "Extended",
      index: "Extended",
      middle: "Extended",
      ring: "Extended",
      pinky: "Extended",
      actionCue: `Fingerspell letter ${char.toUpperCase()}`,
    },
  };

  return {
    id: `letter_${c}`,
    name: `Letter '${c.toUpperCase()}'`,
    category: "alphabet",
    emoji: "🔤",
    description: `Fingerspelling letter '${c.toUpperCase()}': ${letterInfo.details.actionCue}`,
    aslFingerspelling: c.toUpperCase(),
    aliases: [c],
    handDetails: letterInfo.details,
    keyframes: [
      {
        headTilt: 0,
        headNod: 0,
        expression: "neutral",
        durationMs: 500,
        motionType: "static",
        rightArm: {
          shoulderElevation: 48,
          shoulderAbduction: 22,
          elbowFlexion: 90,
          forearmRotation: 0,
          wristAngle: 0,
          hand: letterInfo.hand,
        },
        leftArm: REST_ARM,
      },
    ],
  };
}
