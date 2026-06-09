# Crossword Dictionaries

Publishable dictionary data for the Crossword Solver browser extension.

The repository is intended to be consumed directly from GitHub raw URLs. The extension downloads `manifest.json`, then downloads only the language/category files needed for solving.

## Structure

```text
crossword_dict/
├── manifest.json
├── dict/
│   ├── en/
│   │   ├── index.json
│   │   └── *.txt
│   └── ru/
│       ├── index.json
│       └── *.txt
├── schema/
│   └── manifest.schema.json
├── tools/
│   ├── generate-manifest.mjs
│   └── validate.mjs
└── .github/workflows/validate.yml
```

## Dictionary Format

- UTF-8 text files.
- One dictionary entry per line.
- No empty lines.
- No trailing whitespace.
- No duplicate entries inside the same file after lowercase and `ё -> е` normalization.

## Generate Metadata

```bash
npm run generate
```

This updates:

- `manifest.json`
- `dict/en/index.json`
- `dict/ru/index.json`

By default generated URLs use:

```text
https://raw.githubusercontent.com/Sanuch/gv-crossword-dictionary/main
```

Override it when generating metadata for another repository:

```bash
DICTIONARY_BASE_URL="https://raw.githubusercontent.com/<owner>/<repo>/main" npm run generate
```

## Validate

```bash
npm run validate
```

Validation checks dictionary formatting, manifest counts, file hashes and language indexes.

## Consumption

Root manifest:

```text
https://raw.githubusercontent.com/<owner>/<repo>/main/manifest.json
```

Example dictionary file:

```text
https://raw.githubusercontent.com/<owner>/<repo>/main/dict/ru/monsters.txt
```

## Release Notes

For MVP the extension reads from the `main` branch. For stricter reproducibility, publish tagged releases later and point the extension to a tag-specific raw URL.

## License

The license is not finalized yet. Verify dictionary data redistribution rights before public release.
