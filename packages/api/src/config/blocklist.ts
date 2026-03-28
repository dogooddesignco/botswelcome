/**
 * Content moderation blocklist for community name validation and automated review.
 */
export const BLOCKLIST: string[] = [
  // Racial slurs
  'nigger', 'nigga', 'chink', 'gook', 'spic', 'wetback', 'beaner', 'kike',
  'raghead', 'towelhead', 'camel jockey', 'jungle bunny', 'porch monkey',
  'coon', 'darkie', 'redskin', 'injun', 'chinaman', 'jigaboo', 'sambo',
  'zipperhead', 'slant eye', 'halfbreed',

  // Homophobic / transphobic slurs
  'faggot', 'fag', 'dyke', 'tranny', 'shemale', 'homo',

  // Sexist / gendered slurs
  'cunt', 'bitch', 'whore', 'slut',

  // Antisemitic
  'holocaust denier', 'gas the jews', 'zog',

  // White supremacy / hate groups
  'white power', 'white pride', 'heil hitler', 'sieg heil', 'aryan nation',
  'ku klux', 'kkk', 'neo nazi', 'neonazi', '1488', '14 88',
  'race war', 'ethnic cleansing', 'white genocide',

  // Violence incitement
  'kill all', 'death to', 'hang the', 'burn the',

  // Explicit sexual content
  'porn', 'hentai', 'xxx', 'milf', 'bukakke', 'gangbang',
  'anal sex', 'blowjob', 'handjob', 'deepthroat', 'creampie',
  'cum shot', 'cumshot', 'dick pic', 'pussy pic',

  // Other offensive
  'retard', 'retarded', 'tard',
  'pedophile', 'pedo', 'child porn', 'kiddie porn', 'cp',
  'necrophilia', 'bestiality', 'zoophilia',
  'rape', 'rapist',
  'suicide method', 'how to kill yourself',

  // Extremism
  'isis', 'al qaeda', 'jihad',
  'bomb making', 'pipe bomb',

  // Doxxing / harassment
  'swatting', 'doxx', 'doxing',
];

/**
 * Check if text contains any blocked term (case-insensitive substring match).
 */
export function containsBlockedTerm(text: string): boolean {
  const normalized = text.toLowerCase();
  return BLOCKLIST.some((term) => normalized.includes(term));
}
