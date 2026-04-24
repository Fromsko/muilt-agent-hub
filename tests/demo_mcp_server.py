# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "mcp[cli]>=1.27",
# ]
# ///
"""最小 MCP 测试 server，用于 B2 端到端验证。

提供两个工具：
- `add(a, b)`：两数相加，验证结构化参数。
- `echo(text)`：回显输入，验证文本 round-trip。

用法（本机测试）：
    uv run tests/demo_mcp_server.py
默认在 http://127.0.0.1:9100/mcp 启动 Streamable HTTP transport。
"""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP
from rich.console import Console

console = Console()

mcp = FastMCP("agenthub-demo", stateless_http=True)


@mcp.tool()
def add(a: float, b: float) -> str:
    """两数相加，返回 `a + b`。"""
    return str(a + b)


@mcp.tool()
def echo(text: str) -> str:
    """回显输入字符串。"""
    return text


def main() -> None:
    """在本机 9100 端口启动 Streamable HTTP 模式的 MCP server。"""
    console.print("[bold blue]=== demo MCP server ===[/bold blue]")
    console.print("[dim]- POST http://127.0.0.1:9100/mcp[/dim]")
    console.print("[dim]- tools: add, echo[/dim]")
    mcp.settings.host = "127.0.0.1"
    mcp.settings.port = 9100
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
