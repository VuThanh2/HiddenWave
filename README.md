# HiddenWave

LSB audio steganography for **16-bit PCM WAV** files, with a **hardened mode** and built-in steganalysis tools to measure how detectable the hidden message is.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## About

Changing the least significant bit of a 16-bit audio sample is inaudible, so a text message can be hidden in a WAV file without changing its size or header. Plain sequential LSB, however, is easy to detect statistically. HiddenWave offers two modes:

- **Classic:** sequential LSB replacement of the raw message.
- **Hardened:** the message is encrypted with AES-256-GCM (key derived from a passphrase via scrypt + HKDF), spread over key-shuffled sample positions, and embedded with ±1 LSB matching to resist Chi-square and RS analysis.

Everything runs locally on `127.0.0.1`, so your messages and passphrases never leave your machine.

## Features

- **Encode / Decode:** hide and extract UTF-8 messages, with a live capacity check while you type.
- **Compare:** listen to cover vs. stego side by side, plus PSNR, MSE, waveform, difference signal and spectrogram.
- **Analyze:** Chi-square (whole file and sliding window), RS analysis, and an embedding-rate sweep comparing both modes.
- **Robustness:** check whether the message survives an MP3 round trip.
- **Listening Test:** ABX test to see if listeners can tell cover from stego.
- **CLI:** encode, decode and batch evaluation from the terminal.

## Tech Stack

- **Engine:** Python 3.12, numpy, scipy, cryptography, FastAPI, Typer
- **Client:** React, TypeScript, Vite, Tailwind CSS, Plotly, wavesurfer.js

## Getting Started

### Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (installs Python 3.12 automatically if needed)
- [Node.js](https://nodejs.org/) 20.19+ or 22.12+
- FFmpeg is optional: a bundled copy is used if it is not installed

### Installation

```bash
git clone https://github.com/VuThanh2/HiddenWave.git
cd HiddenWave

cd engine && uv sync
cd ../client && npm ci && npm run build
```

### Run

```bash
cd engine
uv run hiddenwave serve --open
```

The app opens at <http://127.0.0.1:8000> (API docs at `/docs`).

### Development

Run the API and the Vite dev server in two terminals:

```bash
cd engine && uv run hiddenwave serve   # API on :8000
cd client && npm run dev               # UI on :5173, proxies /api
```

## CLI Usage

Run from `engine/`:

```bash
uv run hiddenwave info cover.wav
uv run hiddenwave encode cover.wav out.stego.wav --message "Hello"
uv run hiddenwave encode cover.wav out.stego.wav -m hardened --message-file secret.txt
uv run hiddenwave decode out.stego.wav -m hardened
uv run hiddenwave evaluate             # put cover WAVs in samples/; results go to evaluation/
```

In hardened mode you are prompted for a passphrase, or you can pass `-p` / set `HIDDENWAVE_PASSPHRASE`. See `uv run hiddenwave --help` for all options.

## Testing

```bash
cd engine && uv run pytest && uv run ruff check .
cd ../client && npm run lint
```

## Limitations

- Only 16-bit PCM WAV (mono/stereo) is supported.
- Hidden messages do not survive lossy compression such as MP3.