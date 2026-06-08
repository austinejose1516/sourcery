// ============================================================================
// ReciPeer — database seed
// ============================================================================
// Populates the (otherwise empty) database with the people, recipes and
// relationships shown in the Home-feed and Cold-start mockups, plus the
// supporting taxonomy, so the UI screens have realistic data to render.
//
// Run:  pnpm db:seed     (or)  pnpm prisma db seed
//
// Idempotent: every row has a deterministic id / unique key, so re-running
// upserts in place rather than duplicating. Safe to run repeatedly.
//
// NOTE on endorsement counts ("18 Kerala", "42 Hanoi", "33 Minas Gerais"):
// in production these are COUNT(endorsements WHERE endorser.region = recipe.region).
// We do NOT create 18/42/33 real endorser profiles here (the brief was a
// "handful" of cooks). Instead the denormalised `endorsementCount` column is set
// to the mockup number for display, and a small number of REAL RecipeEndorsement
// rows are created for relational integrity / to exercise the join queries.
// ============================================================================

import { config } from 'dotenv';
import { resolve } from 'node:path';
// Load the repo-root .env (holds SUPABASE_DIRECT_URL) — mirrors prisma.config.ts.
config({ path: resolve(process.cwd(), '.env') });

import {
  PrismaClient,
  type Difficulty,
  type CookingExperience,
  type UnitPreference,
  type SpiceTolerance,
} from '@prisma/client';

const prisma = new PrismaClient();

// ----------------------------------------------------------------------------
// Deterministic ids (valid v4 UUIDs) so re-runs upsert instead of duplicating.
// ----------------------------------------------------------------------------
const U = (n: string) => `11111111-1111-4111-8111-1111111111${n}`; // users
const R = (n: string) => `22222222-2222-4222-8222-2222222222${n}`; // recipes
const T = (n: string) => `33333333-3333-4333-8333-3333333333${n}`; // tried-this
const S = (n: string) => `44444444-4444-4444-8444-4444444444${n}`; // cooking sessions
const C = (n: string) => `55555555-5555-4555-8555-5555555555${n}`; // post comments

const USERS = {
  priya: U('01'),
  linh: U('02'),
  beatriz: U('03'),
  nino: U('04'),
  yousef: U('05'),
  amal: U('06'),
  jiwoo: U('07'),
  maya: U('08'),
  viewer: U('09'), // the demo "you" whose feed the mockups show
};

// Placeholder imagery: pravatar for deterministic portraits, Unsplash for food.
const avatar = (seed: string) => `https://i.pravatar.cc/300?u=${seed}`;
const food = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

// ----------------------------------------------------------------------------
// Static taxonomy
// ----------------------------------------------------------------------------
const CUISINES = [
  { name: 'Indian', slug: 'indian' },
  { name: 'Vietnamese', slug: 'vietnamese' },
  { name: 'Brazilian', slug: 'brazilian' },
  { name: 'Georgian', slug: 'georgian' },
  { name: 'Moroccan', slug: 'moroccan' },
  { name: 'Lebanese', slug: 'lebanese' },
  { name: 'Korean', slug: 'korean' },
];

// Parent (country) regions first, then the specific child regions used by cooks
// and recipes. `parent` references another region's name in this list.
const REGIONS: { name: string; country: string; parent?: string; lat?: number; lng?: number }[] = [
  { name: 'India', country: 'IN' },
  { name: 'Vietnam', country: 'VN' },
  { name: 'Brazil', country: 'BR' },
  { name: 'Georgia', country: 'GE' },
  { name: 'Morocco', country: 'MA' },
  { name: 'Lebanon', country: 'LB' },
  { name: 'South Korea', country: 'KR' },
  { name: 'Canada', country: 'CA' },
  { name: 'Kerala', country: 'IN', parent: 'India', lat: 10.85, lng: 76.27 },
  { name: 'Hanoi', country: 'VN', parent: 'Vietnam', lat: 21.03, lng: 105.85 },
  { name: 'Minas Gerais', country: 'BR', parent: 'Brazil', lat: -18.51, lng: -44.55 },
  { name: 'Belo Horizonte', country: 'BR', parent: 'Minas Gerais', lat: -19.92, lng: -43.94 },
  { name: 'Tbilisi', country: 'GE', parent: 'Georgia', lat: 41.72, lng: 44.79 },
  { name: 'Fes', country: 'MA', parent: 'Morocco', lat: 34.02, lng: -5.0 },
  { name: 'Beirut', country: 'LB', parent: 'Lebanon', lat: 33.89, lng: 35.5 },
  { name: 'Seoul', country: 'KR', parent: 'South Korea', lat: 37.57, lng: 126.98 },
  { name: 'Toronto', country: 'CA', parent: 'Canada', lat: 43.65, lng: -79.38 },
];

const DIETARY_TAGS = [
  { name: 'Vegetarian', slug: 'vegetarian' },
  { name: 'Vegan', slug: 'vegan' },
  { name: 'Gluten-Free', slug: 'gluten-free' },
  { name: 'Dairy-Free', slug: 'dairy-free' },
  { name: 'Pescatarian', slug: 'pescatarian' },
  { name: 'Halal', slug: 'halal' },
  { name: 'Nut-Free', slug: 'nut-free' },
];

// ----------------------------------------------------------------------------
// Users (profiles — id matches what would be auth.users.id; no FK so safe to seed)
// ----------------------------------------------------------------------------
type SeedUser = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  region: string; // region name
  country: string;
  languages: string[];
  cookingExperience: CookingExperience;
  unitPreference: UnitPreference;
  spiceTolerance: SpiceTolerance;
};

const SEED_USERS: SeedUser[] = [
  {
    id: USERS.priya, username: 'priyanair', displayName: 'Priya Nair',
    bio: 'Cooking the Kerala coast — coconut, curry leaves, and a lot of patience.',
    region: 'Kerala', country: 'IN', languages: ['en', 'ml'],
    cookingExperience: 'EXPERIENCED', unitPreference: 'METRIC', spiceTolerance: 'HIGH',
  },
  {
    id: USERS.linh, username: 'linhnguyen', displayName: 'Linh Nguyễn',
    bio: 'Hanoi street-food at home. Broth is patience; herbs are everything.',
    region: 'Hanoi', country: 'VN', languages: ['en', 'vi'],
    cookingExperience: 'EXPERIENCED', unitPreference: 'METRIC', spiceTolerance: 'MEDIUM',
  },
  {
    id: USERS.beatriz, username: 'beatrizsouza', displayName: 'Beatriz Souza',
    bio: 'Mineira kitchen — cheese bread, pão de queijo, and Sunday feijão.',
    region: 'Belo Horizonte', country: 'BR', languages: ['en', 'pt'],
    cookingExperience: 'CONFIDENT', unitPreference: 'METRIC', spiceTolerance: 'LOW',
  },
  {
    id: USERS.nino, username: 'nino', displayName: 'Nino Beridze',
    bio: 'Khinkali pleats and supra spreads from Tbilisi.',
    region: 'Tbilisi', country: 'GE', languages: ['en', 'ka'],
    cookingExperience: 'EXPERIENCED', unitPreference: 'METRIC', spiceTolerance: 'MEDIUM',
  },
  {
    id: USERS.yousef, username: 'yousefelamrani', displayName: 'Yousef El Amrani',
    bio: 'Slow tagines and warm spice from Fes.',
    region: 'Fes', country: 'MA', languages: ['en', 'ar', 'fr'],
    cookingExperience: 'EXPERIENCED', unitPreference: 'METRIC', spiceTolerance: 'MEDIUM',
  },
  {
    id: USERS.amal, username: 'amalhaddad', displayName: 'Amal Haddad',
    bio: 'Levantine mezze — hummus, tabbouleh, and everything lemon.',
    region: 'Beirut', country: 'LB', languages: ['en', 'ar'],
    cookingExperience: 'CONFIDENT', unitPreference: 'METRIC', spiceTolerance: 'MEDIUM',
  },
  {
    id: USERS.jiwoo, username: 'jiwoopark', displayName: 'Ji-woo Park',
    bio: 'Seoul home cooking — fermenting, stewing, banchan for days.',
    region: 'Seoul', country: 'KR', languages: ['en', 'ko'],
    cookingExperience: 'CONFIDENT', unitPreference: 'METRIC', spiceTolerance: 'HIGH',
  },
  {
    id: USERS.maya, username: 'maya', displayName: 'Maya',
    bio: 'Learning to cook the world from a small Toronto kitchen.',
    region: 'Toronto', country: 'CA', languages: ['en'],
    cookingExperience: 'BEGINNER', unitPreference: 'METRIC', spiceTolerance: 'MEDIUM',
  },
  {
    id: USERS.viewer, username: 'you', displayName: 'You',
    bio: 'Hungry and curious.',
    region: 'Toronto', country: 'CA', languages: ['en'],
    cookingExperience: 'BEGINNER', unitPreference: 'METRIC', spiceTolerance: 'MEDIUM',
  },
];

// ----------------------------------------------------------------------------
// Recipes (+ ingredients + steps + dietary tags)
// ----------------------------------------------------------------------------
type SeedIngredient = {
  name: string; nameOriginal?: string; amount?: number; unit?: string;
  quantityNote?: string; groupLabel?: string; substitutionNote?: string;
};
type SeedStep = {
  instruction: string; instructionOriginal?: string;
  startS?: number; endS?: number; timerSeconds?: number; tipText?: string;
};
type SeedRecipe = {
  id: string;
  authorId: string;
  cuisine: string; // slug
  region: string; // region name
  title: string;
  titleOriginal?: string;
  originalLanguage?: string;
  description: string;
  descriptionOriginal?: string;
  difficulty: Difficulty;
  prep: number;
  cook: number;
  servings: number;
  cover: string;
  dietary: string[]; // slugs
  counts: { view: number; save: number; cook: number; endorse: number };
  ingredients: SeedIngredient[];
  steps: SeedStep[];
};

const SEED_RECIPES: SeedRecipe[] = [
  // ----- Priya Nair (Indian / Kerala) ---------------------------------------
  {
    id: R('01'), authorId: USERS.priya, cuisine: 'indian', region: 'Kerala',
    title: 'Fish moilee', titleOriginal: 'മീൻ മൊളീ', originalLanguage: 'ml',
    description:
      'Kerala coastal stew — kingfish in turmeric-yellow coconut milk, finished with curry leaves and green chillies.',
    descriptionOriginal: 'കേരള തീരദേശ മീൻ കറി — മഞ്ഞൾ ചേർത്ത തേങ്ങാപ്പാലിൽ.',
    difficulty: 'MEDIUM', prep: 15, cook: 25, servings: 4,
    cover: food('1455619452474-d2be8b1e70cd'),
    dietary: ['pescatarian', 'gluten-free', 'dairy-free'],
    counts: { view: 1240, save: 210, cook: 64, endorse: 18 },
    ingredients: [
      { name: 'Kingfish steaks', nameOriginal: 'നെയ്മീൻ', amount: 600, unit: 'g', groupLabel: 'Fish', substitutionNote: 'Pomfret or seabass work well too' },
      { name: 'Turmeric powder', amount: 0.5, unit: 'tsp', groupLabel: 'Fish' },
      { name: 'Coconut oil', amount: 2, unit: 'tbsp', groupLabel: 'Stew' },
      { name: 'Shallots', nameOriginal: 'ചെറിയ ഉള്ളി', amount: 8, quantityNote: 'thinly sliced', groupLabel: 'Stew' },
      { name: 'Ginger', amount: 1, unit: 'tbsp', quantityNote: 'julienned', groupLabel: 'Stew' },
      { name: 'Green chillies', amount: 4, quantityNote: 'slit', groupLabel: 'Stew', substitutionNote: 'Use fewer for milder heat' },
      { name: 'Curry leaves', nameOriginal: 'കറിവേപ്പില', quantityNote: '2 sprigs', groupLabel: 'Stew' },
      { name: 'Thin coconut milk', amount: 400, unit: 'ml', groupLabel: 'Stew' },
      { name: 'Thick coconut milk', amount: 200, unit: 'ml', groupLabel: 'Stew' },
    ],
    steps: [
      { instruction: 'Rub the fish with turmeric and a little salt; rest 10 minutes.', startS: 0, endS: 35, tipText: 'Pat the fish dry first so the turmeric clings.' },
      { instruction: 'Warm coconut oil and soften shallots, ginger, green chillies and curry leaves without browning.', startS: 35, endS: 95 },
      { instruction: 'Pour in the thin coconut milk and simmer gently.', startS: 95, endS: 140, timerSeconds: 300 },
      { instruction: 'Slide in the fish and cook until just done.', startS: 140, endS: 215, timerSeconds: 420, tipText: 'Do not stir hard — nudge the pan instead so the fish stays whole.' },
      { instruction: 'Finish with thick coconut milk; warm through but do not boil.', startS: 215, endS: 250, tipText: 'Boiling splits the coconut milk.' },
    ],
  },
  {
    id: R('02'), authorId: USERS.priya, cuisine: 'indian', region: 'Kerala',
    title: 'Appam', titleOriginal: 'അപ്പം', originalLanguage: 'ml',
    description: 'Lacy fermented rice-and-coconut pancakes with soft, spongy centres.',
    difficulty: 'MEDIUM', prep: 20, cook: 20, servings: 4,
    cover: food('1567620905732-2d1ec7ab7445'),
    dietary: ['vegan', 'gluten-free', 'dairy-free'],
    counts: { view: 540, save: 96, cook: 22, endorse: 7 },
    ingredients: [
      { name: 'Raw rice', amount: 250, unit: 'g', substitutionNote: 'Soak 4 hours before grinding' },
      { name: 'Grated coconut', amount: 100, unit: 'g' },
      { name: 'Cooked rice', amount: 50, unit: 'g' },
      { name: 'Sugar', amount: 1, unit: 'tsp' },
      { name: 'Active dry yeast', amount: 0.5, unit: 'tsp' },
    ],
    steps: [
      { instruction: 'Grind soaked rice, coconut and cooked rice into a smooth batter.', startS: 0, endS: 60 },
      { instruction: 'Add yeast and sugar; ferment 6–8 hours until frothy.', startS: 60, endS: 90, timerSeconds: 600 },
      { instruction: 'Swirl a ladle of batter in a hot appam pan; cover and cook until the edges are lacy.', startS: 90, endS: 150, tipText: 'One quick swirl gives the thin lace ring.' },
    ],
  },
  {
    id: R('03'), authorId: USERS.priya, cuisine: 'indian', region: 'Kerala',
    title: 'Kerala prawn curry', titleOriginal: 'ചെമ്മീൻ കറി', originalLanguage: 'ml',
    description: 'Prawns simmered in a tangy kokum-and-coconut gravy.',
    difficulty: 'EASY', prep: 15, cook: 20, servings: 4,
    cover: food('1604908176997-125f25cc6f3d'),
    dietary: ['pescatarian', 'gluten-free', 'dairy-free'],
    counts: { view: 410, save: 70, cook: 15, endorse: 5 },
    ingredients: [
      { name: 'Prawns', amount: 500, unit: 'g', quantityNote: 'cleaned and deveined' },
      { name: 'Kokum', amount: 4, quantityNote: 'pieces', substitutionNote: 'Tamarind works as a substitute' },
      { name: 'Coconut milk', amount: 400, unit: 'ml' },
      { name: 'Chilli powder', amount: 1, unit: 'tsp' },
    ],
    steps: [
      { instruction: 'Simmer kokum with chilli, turmeric and salt in a little water.', startS: 0, endS: 50 },
      { instruction: 'Add prawns and cook until they curl and turn pink.', startS: 50, endS: 110, timerSeconds: 240 },
      { instruction: 'Stir in coconut milk and warm through.', startS: 110, endS: 150 },
    ],
  },

  // ----- Linh Nguyễn (Vietnamese / Hanoi) -----------------------------------
  {
    id: R('04'), authorId: USERS.linh, cuisine: 'vietnamese', region: 'Hanoi',
    title: 'Phở bò', titleOriginal: 'Phở bò', originalLanguage: 'vi',
    description:
      'Hanoi-style beef noodle soup. The broth simmers six hours with charred ginger, star anise and rock sugar.',
    difficulty: 'HARD', prep: 30, cook: 360, servings: 6,
    cover: food('1569718212165-3a8278d5f624'),
    dietary: ['dairy-free'],
    counts: { view: 3100, save: 540, cook: 120, endorse: 42 },
    ingredients: [
      { name: 'Beef bones', nameOriginal: 'xương bò', amount: 2, unit: 'kg', groupLabel: 'Broth' },
      { name: 'Brisket', amount: 800, unit: 'g', groupLabel: 'Broth' },
      { name: 'Ginger', amount: 1, quantityNote: 'large knob, charred', groupLabel: 'Broth' },
      { name: 'Onion', amount: 2, quantityNote: 'charred', groupLabel: 'Broth' },
      { name: 'Star anise', amount: 4, groupLabel: 'Spices' },
      { name: 'Cinnamon stick', amount: 1, groupLabel: 'Spices' },
      { name: 'Rock sugar', amount: 30, unit: 'g', groupLabel: 'Spices' },
      { name: 'Fish sauce', nameOriginal: 'nước mắm', amount: 60, unit: 'ml', groupLabel: 'Season' },
      { name: 'Flat rice noodles', nameOriginal: 'bánh phở', amount: 500, unit: 'g', groupLabel: 'Serve' },
      { name: 'Thinly sliced raw beef', amount: 300, unit: 'g', groupLabel: 'Serve' },
    ],
    steps: [
      { instruction: 'Blanch the bones, drain and rinse to clear the broth.', startS: 0, endS: 90, tipText: 'This first hard boil is what keeps the broth clear.' },
      { instruction: 'Char ginger and onion directly over the flame until fragrant.', startS: 90, endS: 150 },
      { instruction: 'Simmer bones, brisket, charred aromatics and toasted spices for six hours.', startS: 150, endS: 240, timerSeconds: 3600 },
      { instruction: 'Season the broth with fish sauce and rock sugar to balance.', startS: 240, endS: 300 },
      { instruction: 'Blanch noodles, top with raw sliced beef and ladle over boiling broth to cook it.', startS: 300, endS: 360, tipText: 'The broth must be at a rolling boil to cook the raw beef in the bowl.' },
    ],
  },
  {
    id: R('05'), authorId: USERS.linh, cuisine: 'vietnamese', region: 'Hanoi',
    title: 'Bún chả', titleOriginal: 'Bún chả', originalLanguage: 'vi',
    description: 'Grilled pork patties and belly in a sweet-sour dipping broth with rice vermicelli.',
    difficulty: 'MEDIUM', prep: 40, cook: 20, servings: 4,
    cover: food('1503764654157-72d979d9af2f'),
    dietary: ['dairy-free'],
    counts: { view: 980, save: 160, cook: 38, endorse: 12 },
    ingredients: [
      { name: 'Pork shoulder', amount: 400, unit: 'g', quantityNote: 'minced', groupLabel: 'Patties' },
      { name: 'Pork belly', amount: 300, unit: 'g', quantityNote: 'sliced', groupLabel: 'Grill' },
      { name: 'Fish sauce', amount: 4, unit: 'tbsp', groupLabel: 'Dipping broth' },
      { name: 'Rice vermicelli', nameOriginal: 'bún', amount: 400, unit: 'g', groupLabel: 'Serve' },
    ],
    steps: [
      { instruction: 'Marinate pork in fish sauce, sugar, shallots and pepper.', startS: 0, endS: 60, timerSeconds: 1800 },
      { instruction: 'Grill patties and belly over high heat until charred at the edges.', startS: 60, endS: 130 },
      { instruction: 'Mix the warm dipping broth and serve with vermicelli and herbs.', startS: 130, endS: 180 },
    ],
  },
  {
    id: R('06'), authorId: USERS.linh, cuisine: 'vietnamese', region: 'Hanoi',
    title: 'Gỏi cuốn', titleOriginal: 'Gỏi cuốn', originalLanguage: 'vi',
    description: 'Fresh summer rolls with prawn, pork, herbs and vermicelli.',
    difficulty: 'EASY', prep: 30, cook: 10, servings: 4,
    cover: food('1562967916-eb82221dfb92'),
    dietary: ['dairy-free', 'gluten-free'],
    counts: { view: 600, save: 110, cook: 20, endorse: 6 },
    ingredients: [
      { name: 'Rice paper', amount: 12, quantityNote: 'sheets' },
      { name: 'Cooked prawns', amount: 12, quantityNote: 'halved' },
      { name: 'Rice vermicelli', amount: 150, unit: 'g' },
      { name: 'Mixed herbs', quantityNote: 'mint, coriander, perilla' },
    ],
    steps: [
      { instruction: 'Soften a rice paper sheet in warm water for a few seconds.', startS: 0, endS: 30 },
      { instruction: 'Layer herbs, vermicelli, pork and prawn, then roll tightly.', startS: 30, endS: 110, tipText: 'Place prawns last with the cut side down so they show through.' },
    ],
  },

  // ----- Beatriz Souza (Brazilian / Minas Gerais) ---------------------------
  {
    id: R('07'), authorId: USERS.beatriz, cuisine: 'brazilian', region: 'Minas Gerais',
    title: 'Pão de queijo', titleOriginal: 'Pão de queijo', originalLanguage: 'pt',
    description:
      'Mineiro cheese rolls — tapioca starch and aged Minas curd, crisp outside, stretchy as molten cheese inside.',
    difficulty: 'EASY', prep: 15, cook: 25, servings: 6,
    cover: food('1598373182133-52452f7691ef'),
    dietary: ['vegetarian', 'gluten-free'],
    counts: { view: 2200, save: 480, cook: 95, endorse: 33 },
    ingredients: [
      { name: 'Sour tapioca starch', nameOriginal: 'polvilho azedo', amount: 500, unit: 'g', substitutionNote: 'Sweet tapioca starch gives a less tangy roll' },
      { name: 'Whole milk', amount: 250, unit: 'ml' },
      { name: 'Oil', amount: 125, unit: 'ml' },
      { name: 'Eggs', amount: 3 },
      { name: 'Aged Minas cheese', nameOriginal: 'queijo Minas', amount: 200, unit: 'g', quantityNote: 'grated', substitutionNote: 'Parmesan + mozzarella is a common swap' },
    ],
    steps: [
      { instruction: 'Bring milk, oil and salt to a boil and pour over the tapioca starch; mix to a shaggy mass.', startS: 0, endS: 70, tipText: 'The starch must be scalded — that gelatinises it for the chew.' },
      { instruction: 'Once cool enough to handle, beat in the eggs one at a time, then the cheese.', startS: 70, endS: 150 },
      { instruction: 'Roll into balls and bake at 180°C until puffed and golden.', startS: 150, endS: 220, timerSeconds: 1500 },
    ],
  },
  {
    id: R('08'), authorId: USERS.beatriz, cuisine: 'brazilian', region: 'Minas Gerais',
    title: 'Brigadeiro', titleOriginal: 'Brigadeiro', originalLanguage: 'pt',
    description: 'Fudgy chocolate truffles rolled in sprinkles — the Brazilian party staple.',
    difficulty: 'EASY', prep: 5, cook: 15, servings: 6,
    cover: food('1511381939415-e44015466834'),
    dietary: ['vegetarian', 'gluten-free'],
    counts: { view: 1500, save: 320, cook: 60, endorse: 14 },
    ingredients: [
      { name: 'Condensed milk', amount: 395, unit: 'g' },
      { name: 'Cocoa powder', amount: 3, unit: 'tbsp' },
      { name: 'Butter', amount: 1, unit: 'tbsp' },
      { name: 'Chocolate sprinkles', quantityNote: 'to coat' },
    ],
    steps: [
      { instruction: 'Cook condensed milk, cocoa and butter over low heat, stirring constantly.', startS: 0, endS: 90, timerSeconds: 600, tipText: 'It is ready when it pulls away from the pan base.' },
      { instruction: 'Cool, roll into balls and coat in sprinkles.', startS: 90, endS: 150 },
    ],
  },
  {
    id: R('09'), authorId: USERS.beatriz, cuisine: 'brazilian', region: 'Minas Gerais',
    title: 'Feijão tropeiro', titleOriginal: 'Feijão tropeiro', originalLanguage: 'pt',
    description: 'Minas beans tossed with cassava flour, sausage, collards and egg.',
    difficulty: 'MEDIUM', prep: 20, cook: 30, servings: 6,
    cover: food('1543339308-43e59d6b73a6'),
    dietary: [],
    counts: { view: 720, save: 130, cook: 28, endorse: 9 },
    ingredients: [
      { name: 'Cooked brown beans', amount: 400, unit: 'g' },
      { name: 'Cassava flour', nameOriginal: 'farinha de mandioca', amount: 150, unit: 'g' },
      { name: 'Calabresa sausage', amount: 200, unit: 'g', quantityNote: 'sliced' },
      { name: 'Collard greens', amount: 1, quantityNote: 'bunch, shredded' },
    ],
    steps: [
      { instruction: 'Fry sausage and bacon until rendered and crisp.', startS: 0, endS: 60 },
      { instruction: 'Add drained beans and collards; toss to coat.', startS: 60, endS: 120 },
      { instruction: 'Sprinkle in cassava flour off the heat and fold through with fried eggs.', startS: 120, endS: 180 },
    ],
  },

  // ----- Nino Beridze (Georgian / Tbilisi) ----------------------------------
  {
    id: R('10'), authorId: USERS.nino, cuisine: 'georgian', region: 'Tbilisi',
    title: 'Khinkali', titleOriginal: 'ხინკალი', originalLanguage: 'ka',
    description: 'Twisted Georgian soup dumplings filled with spiced meat and a burst of broth.',
    difficulty: 'HARD', prep: 60, cook: 15, servings: 4,
    cover: food('1496116218417-1a781b1c416c'),
    dietary: [],
    counts: { view: 1900, save: 360, cook: 70, endorse: 21 },
    ingredients: [
      { name: 'Plain flour', amount: 500, unit: 'g', groupLabel: 'Dough' },
      { name: 'Water', amount: 250, unit: 'ml', groupLabel: 'Dough' },
      { name: 'Minced beef and pork', amount: 500, unit: 'g', groupLabel: 'Filling' },
      { name: 'Onion', amount: 1, quantityNote: 'finely grated', groupLabel: 'Filling' },
      { name: 'Coriander', quantityNote: 'small bunch', groupLabel: 'Filling' },
      { name: 'Cold stock or water', amount: 150, unit: 'ml', groupLabel: 'Filling', substitutionNote: 'This is what makes the soupy centre' },
    ],
    steps: [
      { instruction: 'Knead a firm dough and rest it, covered, for 30 minutes.', startS: 0, endS: 70, timerSeconds: 1800 },
      { instruction: 'Mix the filling with the cold liquid until loose and juicy.', startS: 70, endS: 130, tipText: 'A wet filling = a soupy dumpling.' },
      { instruction: 'Cut rounds, add filling, and pleat into a topknot.', startS: 130, endS: 230, tipText: 'Aim for 18+ pleats; pinch the top firmly so the broth stays in.' },
      { instruction: 'Boil in salted water until they float and puff.', startS: 230, endS: 290, timerSeconds: 480 },
    ],
  },
  {
    id: R('11'), authorId: USERS.nino, cuisine: 'georgian', region: 'Tbilisi',
    title: 'Khachapuri', titleOriginal: 'ხაჭაპური', originalLanguage: 'ka',
    description: 'Boat-shaped cheese bread with a molten egg-and-butter centre.',
    difficulty: 'MEDIUM', prep: 90, cook: 15, servings: 2,
    cover: food('1565299507177-b0ac66763828'),
    dietary: ['vegetarian'],
    counts: { view: 1100, save: 240, cook: 40, endorse: 11 },
    ingredients: [
      { name: 'Bread flour', amount: 350, unit: 'g', groupLabel: 'Dough' },
      { name: 'Sulguni cheese', amount: 300, unit: 'g', quantityNote: 'grated', groupLabel: 'Filling', substitutionNote: 'Low-moisture mozzarella + feta works' },
      { name: 'Egg', amount: 2, groupLabel: 'Finish' },
      { name: 'Butter', amount: 30, unit: 'g', groupLabel: 'Finish' },
    ],
    steps: [
      { instruction: 'Make an enriched dough and prove until doubled.', startS: 0, endS: 80, timerSeconds: 3600 },
      { instruction: 'Shape into a boat, fill with cheese and bake until bubbling.', startS: 80, endS: 160, timerSeconds: 720 },
      { instruction: 'Crack an egg into the centre, return briefly, then finish with butter.', startS: 160, endS: 210, tipText: 'Stir the hot egg and butter into the cheese before tearing in.' },
    ],
  },

  // ----- Yousef El Amrani (Moroccan / Fes) ----------------------------------
  {
    id: R('12'), authorId: USERS.yousef, cuisine: 'moroccan', region: 'Fes',
    title: 'Lamb tagine with prunes', titleOriginal: 'طاجين لحم بالبرقوق', originalLanguage: 'ar',
    description: 'Slow-cooked lamb with prunes, honey and warm spice, finished with toasted almonds and sesame.',
    difficulty: 'MEDIUM', prep: 25, cook: 150, servings: 6,
    cover: food('1547592180-85f173990554'),
    dietary: ['halal', 'gluten-free', 'dairy-free'],
    counts: { view: 1700, save: 300, cook: 55, endorse: 16 },
    ingredients: [
      { name: 'Lamb shoulder', nameOriginal: 'كتف الخروف', amount: 1, unit: 'kg', quantityNote: 'cubed', groupLabel: 'Meat' },
      { name: 'Onion', amount: 2, quantityNote: 'grated', groupLabel: 'Base' },
      { name: 'Ras el hanout', amount: 2, unit: 'tsp', groupLabel: 'Spices' },
      { name: 'Cinnamon stick', amount: 1, groupLabel: 'Spices' },
      { name: 'Prunes', amount: 250, unit: 'g', groupLabel: 'Finish' },
      { name: 'Honey', amount: 2, unit: 'tbsp', groupLabel: 'Finish' },
      { name: 'Toasted almonds', amount: 50, unit: 'g', groupLabel: 'Garnish', substitutionNote: 'Sesame seeds alone are fine if avoiding nuts' },
    ],
    steps: [
      { instruction: 'Brown the lamb in batches, then soften the grated onion with the spices.', startS: 0, endS: 90 },
      { instruction: 'Add water to barely cover and simmer gently until the lamb is tender.', startS: 90, endS: 180, timerSeconds: 3600, tipText: 'Low and slow — rushing it toughens the meat.' },
      { instruction: 'Simmer the prunes with honey and cinnamon until syrupy.', startS: 180, endS: 240, timerSeconds: 900 },
      { instruction: 'Spoon prunes over the lamb and scatter with toasted almonds and sesame.', startS: 240, endS: 290 },
    ],
  },
  {
    id: R('13'), authorId: USERS.yousef, cuisine: 'moroccan', region: 'Fes',
    title: 'Chicken tagine with preserved lemon', titleOriginal: 'طاجين الدجاج بالحامض المصير', originalLanguage: 'ar',
    description: 'Chicken braised with preserved lemon, green olives and saffron.',
    difficulty: 'MEDIUM', prep: 20, cook: 60, servings: 4,
    cover: food('1604908554007-9a8d2a8b2b4f'),
    dietary: ['halal', 'gluten-free', 'dairy-free'],
    counts: { view: 880, save: 150, cook: 30, endorse: 8 },
    ingredients: [
      { name: 'Chicken thighs', amount: 8, quantityNote: 'bone-in' },
      { name: 'Preserved lemon', amount: 1, quantityNote: 'quartered' },
      { name: 'Green olives', amount: 100, unit: 'g' },
      { name: 'Saffron', quantityNote: 'a pinch, bloomed' },
    ],
    steps: [
      { instruction: 'Marinate chicken in saffron, ginger, garlic and herbs.', startS: 0, endS: 60, timerSeconds: 1800 },
      { instruction: 'Braise gently with onion and a little water until tender.', startS: 60, endS: 150, timerSeconds: 2400 },
      { instruction: 'Add preserved lemon and olives; reduce the sauce.', startS: 150, endS: 200 },
    ],
  },

  // ----- Amal Haddad (Lebanese / Beirut) ------------------------------------
  {
    id: R('14'), authorId: USERS.amal, cuisine: 'lebanese', region: 'Beirut',
    title: 'Hummus', titleOriginal: 'حمّص', originalLanguage: 'ar',
    description: 'Silky chickpea purée with tahini, lemon and a pool of olive oil.',
    difficulty: 'EASY', prep: 10, cook: 5, servings: 4,
    cover: food('1577805947697-89e18249d767'),
    dietary: ['vegan', 'gluten-free', 'dairy-free'],
    counts: { view: 1300, save: 280, cook: 50, endorse: 13 },
    ingredients: [
      { name: 'Cooked chickpeas', nameOriginal: 'حمّص', amount: 400, unit: 'g', substitutionNote: 'Peel them for the silkiest texture' },
      { name: 'Tahini', amount: 120, unit: 'g' },
      { name: 'Lemon juice', amount: 60, unit: 'ml' },
      { name: 'Garlic', amount: 1, quantityNote: 'clove' },
    ],
    steps: [
      { instruction: 'Blend tahini with lemon and ice water until pale and whipped.', startS: 0, endS: 50, tipText: 'Whipping the tahini first is the secret to a fluffy hummus.' },
      { instruction: 'Add warm chickpeas and garlic; blend until completely smooth.', startS: 50, endS: 120 },
      { instruction: 'Spread, well the centre and finish with olive oil.', startS: 120, endS: 160 },
    ],
  },
  {
    id: R('15'), authorId: USERS.amal, cuisine: 'lebanese', region: 'Beirut',
    title: 'Tabbouleh', titleOriginal: 'تبّولة', originalLanguage: 'ar',
    description: 'A parsley-forward salad with bulgur, tomato, mint and lemon.',
    difficulty: 'EASY', prep: 25, cook: 0, servings: 4,
    cover: food('1512621776951-a57141f2eefd'),
    dietary: ['vegan', 'dairy-free'],
    counts: { view: 760, save: 140, cook: 18, endorse: 6 },
    ingredients: [
      { name: 'Flat-leaf parsley', amount: 3, quantityNote: 'bunches, finely chopped' },
      { name: 'Fine bulgur', amount: 50, unit: 'g', substitutionNote: 'Soak briefly; use less for a greener salad' },
      { name: 'Tomatoes', amount: 3, quantityNote: 'finely diced' },
      { name: 'Lemon juice', amount: 50, unit: 'ml' },
    ],
    steps: [
      { instruction: 'Soak the bulgur in lemon juice until softened.', startS: 0, endS: 40, timerSeconds: 600 },
      { instruction: 'Chop parsley and mint very finely; combine with tomato and bulgur.', startS: 40, endS: 110 },
      { instruction: 'Dress with olive oil, lemon and salt just before serving.', startS: 110, endS: 150 },
    ],
  },

  // ----- Ji-woo Park (Korean / Seoul) ---------------------------------------
  {
    id: R('16'), authorId: USERS.jiwoo, cuisine: 'korean', region: 'Seoul',
    title: 'Kimchi jjigae', titleOriginal: '김치찌개', originalLanguage: 'ko',
    description: 'A bubbling stew of aged kimchi, pork and tofu — sour, spicy and deeply savoury.',
    difficulty: 'EASY', prep: 10, cook: 25, servings: 3,
    cover: food('1583224964978-2257b960c3d3'),
    dietary: ['dairy-free'],
    counts: { view: 1050, save: 200, cook: 44, endorse: 10 },
    ingredients: [
      { name: 'Aged kimchi', nameOriginal: '묵은지', amount: 300, unit: 'g', substitutionNote: 'The more sour, the better the stew' },
      { name: 'Pork belly', amount: 200, unit: 'g', quantityNote: 'sliced' },
      { name: 'Tofu', amount: 1, quantityNote: 'block, sliced' },
      { name: 'Gochugaru', amount: 1, unit: 'tbsp' },
    ],
    steps: [
      { instruction: 'Fry pork belly until the fat renders, then add kimchi and gochugaru.', startS: 0, endS: 70 },
      { instruction: 'Pour in water or stock and simmer until the kimchi softens.', startS: 70, endS: 150, timerSeconds: 900 },
      { instruction: 'Add tofu and spring onion; simmer a few minutes more.', startS: 150, endS: 200 },
    ],
  },
];

// ----------------------------------------------------------------------------
// Social graph + activity
// ----------------------------------------------------------------------------
// The demo viewer ("you") follows these cooks → drives the populated Home feed.
// Cold-start is simply this same data minus the viewer's follow rows.
const VIEWER_FOLLOWS = [USERS.priya, USERS.linh, USERS.beatriz, USERS.nino, USERS.yousef, USERS.maya];

// A few cross-follows so profile follower counts aren't all zero.
const CROSS_FOLLOWS: [string, string][] = [
  [USERS.maya, USERS.nino],
  [USERS.maya, USERS.priya],
  [USERS.maya, USERS.linh],
  [USERS.beatriz, USERS.yousef],
  [USERS.amal, USERS.linh],
  [USERS.jiwoo, USERS.priya],
];

// The viewer "picked South Asian, Levantine & Korean" → cold-start suggestions.
const VIEWER_INTERESTS = ['indian', 'lebanese', 'korean'];

// (userId, recipeId) — small handful of real endorsements/saves for integrity.
const SAVES: [string, string][] = [
  [USERS.viewer, R('04')], [USERS.viewer, R('01')], [USERS.viewer, R('12')],
  [USERS.maya, R('10')], [USERS.maya, R('07')], [USERS.beatriz, R('01')],
];
const ENDORSEMENTS: [string, string][] = [
  [USERS.beatriz, R('01')], [USERS.nino, R('04')], [USERS.maya, R('10')],
  [USERS.yousef, R('07')], [USERS.amal, R('04')], [USERS.priya, R('14')],
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);

const TRIED_THIS = [
  {
    id: T('01'), userId: USERS.maya, recipeId: R('10'),
    note: 'First time making khinkali from scratch — the pleats took practice but the broth stayed inside! 🥟',
    variations: 'Used a 50/50 beef and pork mix and a little extra coriander.',
    photoUrl: food('1496116218417-1a781b1c416c'), createdAt: hoursAgo(2),
  },
  {
    id: T('02'), userId: USERS.beatriz, recipeId: R('01'),
    note: 'Made Priya’s fish moilee with seabass — that coconut-turmeric broth is unreal.',
    variations: 'Swapped kingfish for seabass; added an extra green chilli.',
    photoUrl: food('1455619452474-d2be8b1e70cd'), createdAt: hoursAgo(9),
  },
  {
    id: T('03'), userId: USERS.maya, recipeId: R('07'),
    note: 'Pão de queijo on my third try — finally got the stretchy centre. So good warm.',
    photoUrl: food('1598373182133-52452f7691ef'), createdAt: hoursAgo(27),
  },
  {
    id: T('04'), userId: USERS.priya, recipeId: R('12'),
    note: 'Made Yousef’s tagine for a dinner party — the preserved lemon really makes it. 🍋',
    photoUrl: null, createdAt: hoursAgo(5),
  },
  {
    id: T('05'), userId: USERS.linh, recipeId: R('10'),
    note: 'Khinkali night with friends! The twist-and-pinch took a few tries but so worth it.',
    photoUrl: food('1496116218417-1a781b1c416c'), createdAt: hoursAgo(14),
  },
  {
    id: T('06'), userId: USERS.nino, recipeId: R('04'),
    note: 'First time making phở from scratch — the broth simmered all afternoon and the house smelled incredible.',
    photoUrl: null, createdAt: hoursAgo(20),
  },
  {
    id: T('07'), userId: USERS.yousef, recipeId: R('07'),
    note: 'These cheese breads disappeared in minutes. Doubling the batch next time.',
    photoUrl: food('1598373182133-52452f7691ef'), createdAt: hoursAgo(40),
  },
];

// Likes on the tried-this posts (idempotent via the (userId, postId) unique).
const POST_LIKES: [string, string][] = [
  [USERS.viewer, T('01')],
  [USERS.priya, T('01')],
  [USERS.linh, T('01')],
  [USERS.viewer, T('02')],
  [USERS.nino, T('02')],
  [USERS.viewer, T('04')],
  [USERS.maya, T('04')],
  [USERS.beatriz, T('05')],
  [USERS.viewer, T('06')],
  [USERS.linh, T('06')],
  [USERS.priya, T('06')],
];

// Comments on the tried-this posts (upserted by fixed id).
const POST_COMMENTS = [
  { id: C('01'), postId: T('01'), userId: USERS.nino, body: 'Those pleats look perfect! 🤩', createdAt: hoursAgo(1) },
  { id: C('02'), postId: T('01'), userId: USERS.viewer, body: 'Adding this to my list this weekend.', createdAt: hoursAgo(1) },
  { id: C('03'), postId: T('02'), userId: USERS.priya, body: 'Seabass is a great call — so glad it worked!', createdAt: hoursAgo(8) },
  { id: C('04'), postId: T('04'), userId: USERS.yousef, body: 'So happy it made it to your table! 🙌', createdAt: hoursAgo(4) },
  { id: C('05'), postId: T('06'), userId: USERS.linh, body: 'Worth every hour of simmering. Looks perfect!', createdAt: hoursAgo(18) },
];

const COOKING_SESSIONS = [
  { id: S('01'), userId: USERS.viewer, recipeId: R('04'), currentStep: 3, completedAt: null as Date | null, startedAt: hoursAgo(1) },
  { id: S('02'), userId: USERS.maya, recipeId: R('10'), currentStep: 4, completedAt: hoursAgo(2), startedAt: hoursAgo(4) },
  { id: S('03'), userId: USERS.beatriz, recipeId: R('01'), currentStep: 5, completedAt: hoursAgo(9), startedAt: hoursAgo(10) },
];

// ============================================================================
// Seed orchestration
// ============================================================================
async function main() {
  console.log('🌱 Seeding ReciPeer sample data…\n');

  // 1. Cuisines (upsert by slug) ---------------------------------------------
  const cuisineId = new Map<string, string>();
  for (const c of CUISINES) {
    const row = await prisma.cuisine.upsert({
      where: { slug: c.slug }, update: { name: c.name }, create: c,
    });
    cuisineId.set(c.slug, row.id);
  }
  console.log(`  ✓ ${CUISINES.length} cuisines`);

  // 2. Regions (upsert by name+country; parents before children) -------------
  const regionId = new Map<string, string>();
  for (const r of REGIONS) {
    const parentRegionId = r.parent ? regionId.get(r.parent) ?? null : null;
    const row = await prisma.region.upsert({
      where: { name_country: { name: r.name, country: r.country } },
      update: { parentRegionId, latitude: r.lat ?? null, longitude: r.lng ?? null },
      create: { name: r.name, country: r.country, parentRegionId, latitude: r.lat ?? null, longitude: r.lng ?? null },
    });
    regionId.set(r.name, row.id);
  }
  console.log(`  ✓ ${REGIONS.length} regions`);

  // 3. Dietary tags (upsert by slug) -----------------------------------------
  const tagId = new Map<string, string>();
  for (const t of DIETARY_TAGS) {
    const row = await prisma.dietaryTag.upsert({
      where: { slug: t.slug }, update: { name: t.name }, create: t,
    });
    tagId.set(t.slug, row.id);
  }
  console.log(`  ✓ ${DIETARY_TAGS.length} dietary tags`);

  // 4. Users (upsert by id) --------------------------------------------------
  for (const u of SEED_USERS) {
    const data = {
      username: u.username, displayName: u.displayName, bio: u.bio,
      avatarUrl: avatar(u.username), regionId: regionId.get(u.region) ?? null,
      country: u.country, languages: u.languages,
      cookingExperience: u.cookingExperience, unitPreference: u.unitPreference,
      spiceTolerance: u.spiceTolerance,
    };
    await prisma.user.upsert({ where: { id: u.id }, update: data, create: { id: u.id, ...data } });
  }
  console.log(`  ✓ ${SEED_USERS.length} users`);

  // 5. Recipes + steps + ingredients + dietary tags --------------------------
  for (const r of SEED_RECIPES) {
    await prisma.$transaction(async (tx) => {
      // Clear children so re-runs stay clean (unique [recipeId, stepNumber] etc).
      await tx.recipeStep.deleteMany({ where: { recipeId: r.id } });
      await tx.recipeIngredient.deleteMany({ where: { recipeId: r.id } });
      await tx.recipeDietaryTag.deleteMany({ where: { recipeId: r.id } });

      const recipeData = {
        authorId: r.authorId,
        title: r.title, titleOriginal: r.titleOriginal ?? null,
        description: r.description, descriptionOriginal: r.descriptionOriginal ?? null,
        originalLanguage: r.originalLanguage ?? null,
        status: 'PUBLISHED' as const, difficulty: r.difficulty,
        prepTimeMinutes: r.prep, cookTimeMinutes: r.cook, totalTimeMinutes: r.prep + r.cook,
        baseServings: r.servings,
        cuisineId: cuisineId.get(r.cuisine) ?? null,
        regionId: regionId.get(r.region) ?? null,
        coverImageUrl: r.cover,
        viewCount: r.counts.view, saveCount: r.counts.save,
        cookCount: r.counts.cook, endorsementCount: r.counts.endorse,
        publishedAt: new Date(),
      };
      await tx.recipe.upsert({
        where: { id: r.id }, update: recipeData, create: { id: r.id, ...recipeData },
      });

      await tx.recipeIngredient.createMany({
        data: r.ingredients.map((ing, i) => ({
          recipeId: r.id, name: ing.name, nameOriginal: ing.nameOriginal ?? null,
          amount: ing.amount ?? null, unit: ing.unit ?? null,
          quantityNote: ing.quantityNote ?? null, groupLabel: ing.groupLabel ?? null,
          substitutionNote: ing.substitutionNote ?? null, orderIndex: i,
        })),
      });
      await tx.recipeStep.createMany({
        data: r.steps.map((s, i) => ({
          recipeId: r.id, stepNumber: i + 1,
          instruction: s.instruction, instructionOriginal: s.instructionOriginal ?? null,
          videoStartMs: s.startS != null ? Math.round(s.startS * 1000) : null,
          videoEndMs: s.endS != null ? Math.round(s.endS * 1000) : null,
          timerSeconds: s.timerSeconds ?? null, tipText: s.tipText ?? null,
        })),
      });
      if (r.dietary.length) {
        await tx.recipeDietaryTag.createMany({
          data: r.dietary.map((slug) => ({ recipeId: r.id, dietaryTagId: tagId.get(slug)! })),
          skipDuplicates: true,
        });
      }
    });
  }
  console.log(`  ✓ ${SEED_RECIPES.length} recipes (with steps + ingredients + tags)`);

  // 6. Follows ---------------------------------------------------------------
  const follows = [
    ...VIEWER_FOLLOWS.map((followingId) => ({ followerId: USERS.viewer, followingId })),
    ...CROSS_FOLLOWS.map(([followerId, followingId]) => ({ followerId, followingId })),
  ];
  await prisma.follow.createMany({ data: follows, skipDuplicates: true });
  console.log(`  ✓ ${follows.length} follows`);

  // 7. Cuisine interests (cold-start suggestions) ----------------------------
  await prisma.userCuisineInterest.createMany({
    data: VIEWER_INTERESTS.map((slug) => ({ userId: USERS.viewer, cuisineId: cuisineId.get(slug)! })),
    skipDuplicates: true,
  });
  console.log(`  ✓ ${VIEWER_INTERESTS.length} cuisine interests for @you`);

  // 8. Saves + endorsements (handful, for integrity) -------------------------
  await prisma.recipeSave.createMany({
    data: SAVES.map(([userId, recipeId]) => ({ userId, recipeId })), skipDuplicates: true,
  });
  await prisma.recipeEndorsement.createMany({
    data: ENDORSEMENTS.map(([userId, recipeId]) => ({ userId, recipeId })), skipDuplicates: true,
  });
  console.log(`  ✓ ${SAVES.length} saves, ${ENDORSEMENTS.length} endorsements`);

  // 9. Tried-this posts (upsert by fixed id) ---------------------------------
  // Counters are derived from the seed likes/comments below so they stay in step.
  const likeCountFor = (postId: string) => POST_LIKES.filter(([, p]) => p === postId).length;
  const commentCountFor = (postId: string) => POST_COMMENTS.filter((c) => c.postId === postId).length;
  for (const p of TRIED_THIS) {
    const data = {
      userId: p.userId, recipeId: p.recipeId, note: p.note,
      variations: p.variations ?? null, photoUrl: p.photoUrl, createdAt: p.createdAt,
      likeCount: likeCountFor(p.id), commentCount: commentCountFor(p.id),
    };
    await prisma.triedThis.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
  }
  console.log(`  ✓ ${TRIED_THIS.length} "tried this" posts`);

  // 9b. Post likes + comments ------------------------------------------------
  await prisma.postLike.createMany({
    data: POST_LIKES.map(([userId, postId]) => ({ userId, postId })), skipDuplicates: true,
  });
  for (const cm of POST_COMMENTS) {
    const data = { userId: cm.userId, postId: cm.postId, body: cm.body, createdAt: cm.createdAt };
    await prisma.postComment.upsert({ where: { id: cm.id }, update: data, create: { id: cm.id, ...data } });
  }
  console.log(`  ✓ ${POST_LIKES.length} post likes, ${POST_COMMENTS.length} post comments`);

  // 10. Cooking sessions (upsert by fixed id) --------------------------------
  for (const s of COOKING_SESSIONS) {
    const data = { userId: s.userId, recipeId: s.recipeId, currentStep: s.currentStep, startedAt: s.startedAt, completedAt: s.completedAt };
    await prisma.cookingSession.upsert({ where: { id: s.id }, update: data, create: { id: s.id, ...data } });
  }
  console.log(`  ✓ ${COOKING_SESSIONS.length} cooking sessions`);

  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
