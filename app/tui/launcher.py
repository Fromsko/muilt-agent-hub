"""Quick-launch TUI for LL-Code Core — pick a task and go."""

import os
import subprocess

from rich import box
from rich.align import Align
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

console = Console()

# ── Commands ──────────────────────────────────────────────────────────────────

COMMANDS: list[dict[str, str]] = [
    {
        "key": "1",
        "label": "Start API Server",
        "cmd": "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000",
        "desc": "Launch FastAPI dev server with hot-reload",
    },
    {
        "key": "2",
        "label": "Start API Server (prod)",
        "cmd": "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4",
        "desc": "Launch production server with 4 workers",
    },
    {
        "key": "3",
        "label": "DB Migration (generate)",
        "cmd": "alembic revision --autogenerate -m",
        "desc": "Auto-generate a new Alembic migration",
        "prompt": "Migration message",
    },
    {
        "key": "4",
        "label": "DB Migration (upgrade)",
        "cmd": "alembic upgrade head",
        "desc": "Apply all pending migrations",
    },
    {
        "key": "5",
        "label": "DB Migration (downgrade)",
        "cmd": "alembic downgrade -1",
        "desc": "Rollback one migration step",
    },
    {
        "key": "6",
        "label": "Ruff Check",
        "cmd": "ruff check .",
        "desc": "Lint the project with Ruff",
    },
    {
        "key": "7",
        "label": "Ruff Fix",
        "cmd": "ruff check --fix .",
        "desc": "Lint and auto-fix issues",
    },
    {
        "key": "8",
        "label": "Ruff Format",
        "cmd": "ruff format .",
        "desc": "Auto-format all Python files",
    },
    {
        "key": "9",
        "label": "Run Tests",
        "cmd": "python -m pytest tests/ -v",
        "desc": "Run the test suite",
    },
    {
        "key": "0",
        "label": "Quit",
        "cmd": "",
        "desc": "Exit the launcher",
    },
]


def _banner() -> Panel:
    title = Text("LL-Code Core", style="bold cyan", justify="center")
    subtitle = Text("Quick Launcher  v0.1.0", style="dim", justify="center")
    return Panel(
        Align.center(f"{title}\n{subtitle}"),
        border_style="cyan",
        padding=(1, 4),
    )


def _menu_table() -> Table:
    table = Table(
        title="Available Commands",
        box=box.SQUARE,
        show_lines=True,
        border_style="bright_blue",
        title_style="bold",
    )
    table.add_column("Key", style="bold yellow", width=4, justify="center")
    table.add_column("Command", style="bold white", width=26)
    table.add_column("Description", style="dim", width=44)

    for c in COMMANDS:
        table.add_row(c["key"], c["label"], c["desc"])
    return table


def _run(cmd: str) -> None:
    """Execute a command in a sub-process, forwarding output."""
    console.print(Panel(f"[bold green]$ {cmd}[/bold green]", border_style="green", padding=(0, 2)))
    console.rule()
    try:
        proc = subprocess.run(cmd, shell=True, cwd=os.getcwd())
        if proc.returncode == 0:
            console.print("[bold green]✓ Done[/bold green]")
        else:
            console.print(f"[bold red]✗ Exit code: {proc.returncode}[/bold red]")
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted[/yellow]")
    console.rule()


def main() -> None:
    console.print(_banner())
    console.print()

    while True:
        console.print(_menu_table())
        console.print()

        choice = console.input("[bold]Select > [/bold]").strip()
        matched = [c for c in COMMANDS if c["key"] == choice]

        if not matched:
            console.print("[red]Invalid choice[/red]\n")
            continue

        cmd_def = matched[0]

        if choice == "0":
            console.print("[dim]Bye![/dim]")
            break

        cmd = cmd_def["cmd"]

        # Commands that need extra input
        if "prompt" in cmd_def:
            extra = console.input(f"[bold]{cmd_def['prompt']}: [/bold]").strip()
            if not extra:
                console.print("[yellow]Cancelled[/yellow]\n")
                continue
            cmd = f"{cmd} {extra}"

        _run(cmd)
        console.print()


if __name__ == "__main__":
    main()
