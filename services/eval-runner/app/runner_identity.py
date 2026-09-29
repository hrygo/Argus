from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

MAPPING_ENGINE_VERSION = "sha256-mapping-engine-v1"
_UNRELIABLE_BUILD_IDS = {"", "dev", "development", "latest", "unknown", "none", "null"}


@dataclass(frozen=True)
class RunnerIdentity:
    runner_version: str
    build_id: str
    mapping_engine_version: str

    def model_dump(self) -> dict[str, str]:
        return asdict(self)

    @property
    def is_reliable(self) -> bool:
        return all(
            isinstance(value, str) and value.strip()
            for value in (self.runner_version, self.build_id, self.mapping_engine_version)
        ) and self.build_id.strip().lower() not in _UNRELIABLE_BUILD_IDS


def validate_runner_identity(frozen: Any, current: RunnerIdentity) -> str | None:
    """Return a stable execution-precondition error code, or None if identities match."""
    if not isinstance(frozen, dict) or not current.is_reliable:
        return "RUNNER_IDENTITY_UNAVAILABLE"

    expected = RunnerIdentity(
        runner_version=str(frozen.get("runner_version") or ""),
        build_id=str(frozen.get("build_id") or ""),
        mapping_engine_version=str(frozen.get("mapping_engine_version") or ""),
    )
    if not expected.is_reliable:
        return "RUNNER_IDENTITY_UNAVAILABLE"
    if expected != current:
        return "RUNNER_VERSION_MISMATCH"
    return None


def current_runner_identity(*, runner_version: str | None = None) -> RunnerIdentity:
    """Build the process identity from the same image-backed settings in API and Worker."""
    from .config import settings

    return RunnerIdentity(
        runner_version=runner_version or settings.runner_version,
        build_id=settings.build_id,
        mapping_engine_version=MAPPING_ENGINE_VERSION,
    )
