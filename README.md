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

## Check Erinome for new words

The checker reads the local files from `dict/`, downloads the corresponding Erinome pages and reports entries that are missing locally. It does not modify dictionary files.

Check the supplied example page from the local fixture:

```bash
npm run check:erinome -- --source ../erinome.html --lang ru --type equipments --letter О
```

Check the same page over HTTP:

```bash
npm run check:erinome -- --url 'https://gv.erinome.net/db?type=3&lang=ru&letter=%D0%9E'
```

Run a full Russian check and save a machine-readable report:

```bash
npm run check:erinome -- --lang ru --delay 1 --output var/erinome-report.json
```

The checker supports `--type` values `0..7` or names such as `equipments`, `monsters`, and `artifacts`. For CI, `--fail-on-new` returns exit code `1` when at least one new word is found; HTTP or parsing errors return exit code `2`.

Apply checked reports to the dictionaries:

```bash
npm run apply:erinome -- \
  --report var/erinome-report-ru.json \
  --report var/erinome-report-en.json
```

Use `--dry-run` to preview the number of additions without changing files.

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
