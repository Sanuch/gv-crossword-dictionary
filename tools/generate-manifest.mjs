import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dictDir = path.join(rootDir, 'dict');
const version = '1.0.0';
const updatedAt = new Date().toISOString().slice(0, 10);
const baseUrl = process.env.DICTIONARY_BASE_URL || 'https://raw.githubusercontent.com/oivashchenko/crossword_dict/main';

const languageLabels = {
  en: 'English',
  ru: 'Русский'
};

const categoryMetadata = {
  beasties: {
    name: { en: 'Beasties', ru: 'Животные' },
    aliases: { en: ['beast', 'beastie', 'animal', 'pet'], ru: ['животное', 'зверь', 'зверушка', 'питомец'] }
  },
  'dungeon.boss': {
    name: { en: 'Dungeon Bosses', ru: 'Подземные боссы' },
    aliases: { en: ['dungeon boss', 'boss'], ru: ['подземный босс', 'босс подземелья', 'босс'] }
  },
  equipments: {
    name: { en: 'Equipment', ru: 'Снаряжение' },
    aliases: { en: ['equipment', 'gear', 'artifact'], ru: ['снаряжение', 'экипировка', 'артефакт'] }
  },
  items: {
    name: { en: 'Items', ru: 'Трофеи' },
    aliases: { en: ['item', 'trophy', 'loot'], ru: ['предмет', 'трофей', 'обычный трофей'] }
  },
  'items.bold': {
    name: { en: 'Bold Items', ru: 'Жирные трофеи' },
    aliases: { en: ['bold item', 'bold trophy', 'fat trophy'], ru: ['жирный трофей', 'жирный предмет'] }
  },
  'items.heal': {
    name: { en: 'Healing Items', ru: 'Лечебные предметы' },
    aliases: { en: ['healing item', 'heal item', 'medicine'], ru: ['лечебный предмет', 'лечебный трофей', 'лекарство'] }
  },
  monsters: {
    name: { en: 'Monsters', ru: 'Монстры' },
    aliases: { en: ['monster', 'enemy'], ru: ['монстр', 'враг'] }
  },
  'monsters.bosses': {
    name: { en: 'Boss Monsters', ru: 'Боссы' },
    aliases: { en: ['boss monster', 'boss'], ru: ['босс', 'монстр-босс', 'босс-монстр'] }
  },
  'monsters.strong': {
    name: { en: 'Strong Monsters', ru: 'Сильные монстры' },
    aliases: { en: ['strong monster', 'powerful monster'], ru: ['сильный монстр', 'мощный монстр'] }
  },
  place: {
    name: { en: 'Places', ru: 'Места' },
    aliases: { en: ['place', 'location', 'terrain'], ru: ['место', 'местность', 'локация'] }
  },
  skills: {
    name: { en: 'Skills', ru: 'Умения' },
    aliases: { en: ['skill', 'ability'], ru: ['умение', 'навык', 'способность'] }
  },
  towns: {
    name: { en: 'Towns', ru: 'Города' },
    aliases: { en: ['town', 'city'], ru: ['город', 'поселение'] }
  }
};

function normalizeContent(raw) {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function getEntries(raw) {
  return normalizeContent(raw).split('\n').filter(line => line.length > 0);
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function buildDictionary(lang, fileName) {
  const id = fileName.replace(/\.txt$/, '');
  const relativePath = `dict/${lang}/${fileName}`;
  const absolutePath = path.join(rootDir, relativePath);
  const raw = normalizeContent(await readFile(absolutePath, 'utf8'));
  const entries = getEntries(raw);
  const metadata = categoryMetadata[id] || { name: {}, aliases: {} };

  return {
    id,
    name: metadata.name?.[lang] || id,
    path: relativePath,
    url: `${baseUrl}/${relativePath}`,
    count: entries.length,
    sha256: sha256(raw),
    aliases: metadata.aliases?.[lang] || [id],
    description: metadata.name?.[lang] || id
  };
}

async function buildLanguage(lang) {
  const langDir = path.join(dictDir, lang);
  const fileNames = (await readdir(langDir))
    .filter(fileName => fileName.endsWith('.txt'))
    .sort((a, b) => a.localeCompare(b));

  const dictionaries = [];
  for (const fileName of fileNames) {
    dictionaries.push(await buildDictionary(lang, fileName));
  }

  const languageIndex = {
    version,
    updatedAt,
    language: lang,
    label: languageLabels[lang] || lang,
    dictionaries
  };

  await writeFile(path.join(langDir, 'index.json'), `${JSON.stringify(languageIndex, null, 2)}\n`);

  return {
    label: languageLabels[lang] || lang,
    indexPath: `dict/${lang}/index.json`,
    indexUrl: `${baseUrl}/dict/${lang}/index.json`,
    dictionaries
  };
}

const languageCodes = (await readdir(dictDir, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort((a, b) => a.localeCompare(b));

const languages = {};
for (const lang of languageCodes) {
  languages[lang] = await buildLanguage(lang);
}

const manifest = {
  version,
  updatedAt,
  baseUrl,
  languages
};

await writeFile(path.join(rootDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[generate] manifest.json generated for ${languageCodes.length} languages`);
