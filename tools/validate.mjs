import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dictDir = path.join(rootDir, 'dict');
const manifestPath = path.join(rootDir, 'manifest.json');
const errors = [];

function addError(message) {
  errors.push(message);
}

function normalizeContent(raw) {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function validateDictionaryContent(relativePath, raw) {
  if (raw.charCodeAt(0) === 0xfeff) {
    addError(`${relativePath}: UTF-8 BOM is not allowed`);
  }

  if (raw.includes('\r')) {
    addError(`${relativePath}: CRLF/CR line endings are not allowed; use LF`);
  }

  const lines = normalizeContent(raw).split('\n');
  const contentLines = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
  const seen = new Map();

  contentLines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (line.trim().length === 0) {
      addError(`${relativePath}:${lineNumber}: empty line is not allowed`);
      return;
    }

    if (line !== line.trimEnd()) {
      addError(`${relativePath}:${lineNumber}: trailing whitespace is not allowed`);
    }

    const normalized = line.trim().toLocaleLowerCase().replace(/ё/g, 'е');
    if (seen.has(normalized)) {
      addError(`${relativePath}:${lineNumber}: duplicate of line ${seen.get(normalized)}`);
    } else {
      seen.set(normalized, lineNumber);
    }
  });

  return contentLines;
}

async function validateManifest() {
  if (!(await pathExists(manifestPath))) {
    addError('manifest.json is missing. Run npm run generate first.');
    return null;
  }

  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    addError(`manifest.json is invalid JSON: ${error.message}`);
    return null;
  }
}

async function validateDictionaryFiles(manifest) {
  const languageDirs = (await readdir(dictDir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const lang of languageDirs) {
    if (!manifest?.languages?.[lang]) {
      addError(`manifest.json: missing language ${lang}`);
      continue;
    }

    const langManifest = manifest.languages[lang];
    const dictionariesByPath = new Map((langManifest.dictionaries || []).map(entry => [entry.path, entry]));
    const langDir = path.join(dictDir, lang);
    const txtFiles = (await readdir(langDir)).filter(fileName => fileName.endsWith('.txt')).sort();

    for (const fileName of txtFiles) {
      const relativePath = `dict/${lang}/${fileName}`;
      const absolutePath = path.join(rootDir, relativePath);
      const raw = await readFile(absolutePath, 'utf8');
      const lines = validateDictionaryContent(relativePath, raw);
      const manifestEntry = dictionariesByPath.get(relativePath);

      if (!manifestEntry) {
        addError(`manifest.json: missing dictionary entry for ${relativePath}`);
        continue;
      }

      const normalizedRaw = normalizeContent(raw);
      if (manifestEntry.count !== lines.length) {
        addError(`${relativePath}: manifest count ${manifestEntry.count} does not match actual ${lines.length}`);
      }

      const actualHash = sha256(normalizedRaw);
      if (manifestEntry.sha256 !== actualHash) {
        addError(`${relativePath}: manifest sha256 ${manifestEntry.sha256} does not match actual ${actualHash}`);
      }

      if (!Array.isArray(manifestEntry.aliases) || manifestEntry.aliases.length === 0) {
        addError(`${relativePath}: aliases must be a non-empty array`);
      }
    }

    const indexPath = path.join(rootDir, langManifest.indexPath || '');
    if (!(await pathExists(indexPath))) {
      addError(`manifest.json: language index is missing for ${lang}`);
    } else {
      try {
        JSON.parse(await readFile(indexPath, 'utf8'));
      } catch (error) {
        addError(`${langManifest.indexPath}: invalid JSON: ${error.message}`);
      }
    }
  }
}

const manifest = await validateManifest();
if (manifest) {
  await validateDictionaryFiles(manifest);
}

if (errors.length > 0) {
  console.error(`[validate] ${errors.length} error(s) found:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[validate] dictionaries are valid');
