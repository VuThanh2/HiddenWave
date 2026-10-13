import sys
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated

import typer

from hiddenwave.adapters.ffmpeg.transcoder import FfmpegTranscoder
from hiddenwave.adapters.paths import EVALUATION_DIR, SAMPLES_DIR
from hiddenwave.core.codec import StegoDecoder, StegoEncoder
from hiddenwave.core.errors import HiddenWaveError
from hiddenwave.core.models import StegoMode
from hiddenwave.core.schemes import capacity
from hiddenwave.core.wav.wav_file import WavFile

app = typer.Typer(
    name="hiddenwave",
    help="LSB audio steganography for PCM 16-bit WAV. Without a command: start the web app.",
    no_args_is_help=False,
    add_completion=False,
)

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000
DEFAULT_EVALUATION_RATES = "0.05,0.1,0.25,0.5,0.75,1.0"
PASSPHRASE_ENV = "HIDDENWAVE_PASSPHRASE"

ModeOption = Annotated[
    StegoMode, typer.Option("--mode", "-m", case_sensitive=False, help="Stego mode.")
]
PassphraseOption = Annotated[
    str | None,
    typer.Option(
        "--passphrase",
        "-p",
        envvar=PASSPHRASE_ENV,
        help=f"Hardened-mode passphrase (prompted if omitted; or set {PASSPHRASE_ENV}).",
    ),
]


@app.callback(invoke_without_command=True)
def main(context: typer.Context) -> None:
    _use_utf8_console()
    if context.invoked_subcommand is None:
        serve()


@app.command()
def serve(
    port: Annotated[int, typer.Option(help="Port on 127.0.0.1.")] = DEFAULT_PORT,
    open_browser: Annotated[bool, typer.Option("--open/--no-open")] = False,
) -> None:
    """Start the local API and, if built, the web UI. Listens on 127.0.0.1 only."""
    import uvicorn

    from hiddenwave.adapters.api.app import create_app, default_client_dist

    client_dist = default_client_dist()
    if not client_dist.is_dir():
        typer.secho(f"Web UI not built ({client_dist} missing): serving the API only.", fg="yellow")
    url = f"http://{DEFAULT_HOST}:{port}"
    typer.echo(f"HiddenWave running at {url}  (API docs: {url}/docs)")
    if open_browser:
        import webbrowser

        webbrowser.open(url)
    uvicorn.run(create_app(client_dist=client_dist), host=DEFAULT_HOST, port=port)


@app.command()
def info(file: Annotated[Path, typer.Argument(exists=True, dir_okay=False)]) -> None:
    """Show the audio format and the capacity of each mode."""
    with _domain_errors():
        wav = WavFile.parse(file.read_bytes())
    audio = wav.audio_format
    typer.echo(f"Channels:     {audio.channels}")
    typer.echo(f"Sample rate:  {audio.sample_rate} Hz")
    typer.echo(f"Duration:     {wav.duration_seconds:.2f} s ({wav.sample_count} samples)")
    for mode in StegoMode:
        typer.echo(f"Capacity ({mode.value}): {capacity(mode, wav.sample_count)} bytes")


@app.command()
def encode(
    cover: Annotated[Path, typer.Argument(exists=True, dir_okay=False)],
    output: Annotated[Path, typer.Argument(dir_okay=False)],
    mode: ModeOption = StegoMode.CLASSIC,
    message: Annotated[str | None, typer.Option("--message", help="Message text.")] = None,
    message_file: Annotated[
        Path | None, typer.Option(exists=True, dir_okay=False, help="Read the message (UTF-8).")
    ] = None,
    passphrase: PassphraseOption = None,
) -> None:
    """Hide a message in COVER and write the stego file to OUTPUT."""
    text = _message_from(message, message_file)
    with _domain_errors():
        wav = WavFile.parse(cover.read_bytes())
        encoder = StegoEncoder.for_mode(mode, _passphrase_for(mode, passphrase, confirm=True))
        result = encoder.encode(wav, text)
    output.write_bytes(result.stego.raw)
    typer.secho(f"Wrote {output}", fg="green")
    typer.echo(
        f"{result.payload_bytes}/{result.capacity_bytes} bytes used, "
        f"{result.changed_samples} of {wav.sample_count} samples changed"
    )


@app.command()
def decode(
    stego: Annotated[Path, typer.Argument(exists=True, dir_okay=False)],
    mode: ModeOption = StegoMode.CLASSIC,
    passphrase: PassphraseOption = None,
    output: Annotated[
        Path | None, typer.Option(dir_okay=False, help="Write the message to a file.")
    ] = None,
) -> None:
    """Extract the hidden message from STEGO (no cover file needed)."""
    with _domain_errors():
        wav = WavFile.parse(stego.read_bytes())
        decoder = StegoDecoder.for_mode(mode, _passphrase_for(mode, passphrase, confirm=False))
        message = decoder.decode(wav)
    if output is None:
        typer.echo(message)
    else:
        output.write_text(message, encoding="utf-8")
        typer.secho(f"Wrote {output}", fg="green")


@app.command()
def evaluate(
    samples: Annotated[
        Path, typer.Argument(file_okay=False, help="Folder of cover WAV files.")
    ] = SAMPLES_DIR,
    output: Annotated[Path, typer.Option(file_okay=False)] = EVALUATION_DIR,
    rates: Annotated[str, typer.Option(help="Comma-separated embedding rates.")] = (
        DEFAULT_EVALUATION_RATES
    ),
    rs: Annotated[bool, typer.Option("--rs/--no-rs", help="Run RS Analysis.")] = True,
    mp3: Annotated[bool, typer.Option("--mp3/--no-mp3", help="Run the MP3 test.")] = True,
) -> None:
    """Regenerate every table (CSV) and figure used in the report."""
    from hiddenwave.adapters.cli.evaluation import Evaluation

    covers = sorted(samples.glob("*.wav"))
    if not covers:
        typer.secho(f"No .wav files in {samples}", fg="red", err=True)
        raise typer.Exit(1)

    transcoder = FfmpegTranscoder()
    if mp3 and not transcoder.is_available():
        typer.secho("FFmpeg not found: skipping the MP3 robustness test.", fg="yellow")
        mp3 = False

    evaluation = Evaluation(
        output=output,
        rates=_parse_rates(rates),
        include_rs=rs,
        transcoder=transcoder if mp3 else None,
    )
    for cover in covers:
        typer.echo(f"Evaluating {cover.name} ...")
        try:
            evaluation.add(cover)
        except HiddenWaveError as error:
            typer.secho(f"  skipped: {error}", fg="yellow")
    for written in evaluation.write_tables():
        typer.secho(f"Wrote {written}", fg="green")


def _message_from(message: str | None, message_file: Path | None) -> str:
    if (message is None) == (message_file is None):
        raise typer.BadParameter("Provide exactly one of --message or --message-file")
    return message if message is not None else message_file.read_text(encoding="utf-8")


def _passphrase_for(mode: StegoMode, passphrase: str | None, *, confirm: bool) -> str | None:
    if mode is not StegoMode.HARDENED or passphrase is not None:
        return passphrase
    return typer.prompt("Passphrase", hide_input=True, confirmation_prompt=confirm)


def _parse_rates(text: str) -> list[float]:
    try:
        rates = [float(part) for part in text.split(",") if part.strip()]
    except ValueError as error:
        raise typer.BadParameter(f"Invalid rate list: {text}") from error
    if not rates or not all(0 < rate <= 1 for rate in rates):
        raise typer.BadParameter("Rates must be in (0, 1]")
    return rates


@contextmanager
def _domain_errors() -> Iterator[None]:
    try:
        yield
    except HiddenWaveError as error:
        typer.secho(f"Error: {error}", fg="red", err=True)
        raise typer.Exit(1) from error


def _use_utf8_console() -> None:
    # Console Windows mặc định cp1252 không in được tiếng Việt.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
