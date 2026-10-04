"""Plain, readable terminal output (works in Windows Terminal / PowerShell / cmd)."""
from __future__ import annotations

import os
import sys

LINE = "=" * 40
_COLORS = {"claude": "\033[38;5;173m", "codex": "\033[38;5;75m", "ok": "\033[32m", "warn": "\033[33m",
           "err": "\033[31m", "dim": "\033[2m", "bold": "\033[1m", "reset": "\033[0m"}


def _setup() -> bool:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # Thai text / box chars on cp1252 consoles
        except (AttributeError, ValueError):
            pass
    if os.environ.get("NO_COLOR") or not sys.stdout.isatty():
        return False
    if os.name == "nt":
        try:
            import ctypes
            k32 = ctypes.windll.kernel32
            handle = k32.GetStdHandle(-11)
            mode = ctypes.c_uint32()
            if k32.GetConsoleMode(handle, ctypes.byref(mode)):
                k32.SetConsoleMode(handle, mode.value | 0x0004)  # ENABLE_VIRTUAL_TERMINAL_PROCESSING
        except Exception:
            return False
    return True


COLOR = _setup()


def c(kind: str, text: str) -> str:
    return f"{_COLORS[kind]}{text}{_COLORS['reset']}" if COLOR and kind in _COLORS else text


class UI:
    def __init__(self, quiet: bool = False):
        self.quiet = quiet
        self.lines: list[str] = []  # kept for tests

    def say(self, text: str = "") -> None:
        self.lines.append(text)
        if not self.quiet:
            print(text, flush=True)

    def agent(self, name: str, text: str) -> None:
        self.say(c(name, f"[{name.capitalize()}]") + " " + text)

    def banner(self, title: str = "AI DEV TEAM") -> None:
        self.say(LINE)
        self.say(" " + c("bold", title))
        self.say(LINE)


def bar(percent: int | None, width: int = 18) -> str:
    if percent is None:
        return "-" * width
    filled = round(width * percent / 100)
    return "█" * filled + "░" * (width - filled)
