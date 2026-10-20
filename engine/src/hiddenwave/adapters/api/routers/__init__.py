from hiddenwave.adapters.api.routers import analyze, decode, encode, robustness, system

ROUTERS = (system.router, encode.router, decode.router, analyze.router, robustness.router)

__all__ = ["ROUTERS"]
