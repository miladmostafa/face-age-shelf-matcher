import type { ProblemKey } from "./problems";

/**
 * Product-copy terms for each concern.
 * `en` is required. Add another language by giving it a term list
 * (for example `de: ["trockene haut"]`); matching uses every language present.
 */
export type TermTable = Record<string, readonly string[]> & { en: readonly string[] };

export type DictionaryEntry = {
  label: string;
  terms: TermTable;
};

export const DICTIONARY: Record<ProblemKey, DictionaryEntry> = {
  fineWrinkles: {
    label: "Fine wrinkles",
    terms: {
      en: ["fine lines", "fine wrinkles", "expression lines", "line smoothing"],
      fa: ["خطوط ریز", "چروک ریز"],
    },
  },
  eyeWrinkles: {
    label: "Eye wrinkles",
    terms: {
      en: ["crow's feet", "crows feet", "eye wrinkles", "lines around the eyes"],
      fa: ["چروک دور چشم", "خطوط دور چشم"],
    },
  },
  deepWrinkles: {
    label: "Deep wrinkles",
    terms: {
      en: ["deep wrinkles", "deep lines", "wrinkle repair", "anti-wrinkle"],
      fa: ["چروک عمیق", "خطوط عمیق"],
    },
  },
  darkCircle: {
    label: "Dark circles",
    terms: {
      en: ["dark circles", "dark circle", "under-eye", "undereye", "under eye"],
      fa: ["سیاهی دور چشم", "تیرگی دور چشم"],
    },
  },
  eyeBag: {
    label: "Eye bags",
    terms: {
      en: ["eye bags", "eye bag", "eyebags", "puffy eyes", "puffiness", "depuff", "de-puff"],
      fa: ["پف زیر چشم", "پف چشم"],
    },
  },
  pores: {
    label: "Pores",
    terms: {
      en: ["pores", "enlarged pores", "pore minimizing", "minimize pores", "blackheads"],
      fa: ["منافذ باز", "منافذ پوست"],
    },
  },
  pigment: {
    label: "Pigment",
    terms: {
      en: [
        "dark spots",
        "pigmentation",
        "hyperpigmentation",
        "pigment",
        "discoloration",
        "uneven skin tone",
        "age spots",
        "sun spots",
        "melasma",
      ],
      fa: ["لک صورت", "لک پوست", "ملاسما"],
    },
  },
  redness: {
    label: "Redness",
    terms: {
      en: ["redness", "reduce redness", "redness-prone", "rosacea"],
      fa: ["قرمزی پوست", "قرمزی"],
    },
  },
  oiliness: {
    label: "Oiliness",
    terms: {
      en: ["oil control", "oily skin", "mattifying", "sebum", "shine control", "excess oil"],
      fa: ["پوست چرب", "کنترل چربی"],
    },
  },
  dryness: {
    label: "Dryness",
    terms: {
      en: [
        "hydrating",
        "hydration",
        "moisturizing",
        "moisturising",
        "moisturizer",
        "moisturiser",
        "dry skin",
        "moisture barrier",
        "hyaluronic",
      ],
      fa: ["آبرسان", "مرطوب کننده", "پوست خشک"],
    },
  },
  sagginess: {
    label: "Sagginess",
    terms: {
      en: ["firming", "firmness", "sagging", "loss of firmness", "loss of elasticity"],
      fa: ["سفت کننده", "افتادگی پوست"],
    },
  },
  dullness: {
    label: "Dullness",
    terms: {
      en: ["dullness", "dull skin", "radiance", "radiant skin", "brightening", "luminosity"],
      fa: ["پوست کدر", "روشن کننده"],
    },
  },
  acne: {
    label: "Acne",
    terms: {
      en: [
        "acne",
        "blemish",
        "blemishes",
        "breakout",
        "breakouts",
        "pimple",
        "pimples",
        "salicylic acid",
      ],
      fa: ["جوش", "آکنه"],
    },
  },
};
