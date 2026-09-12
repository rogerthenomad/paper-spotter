"""Paper Spotter: run academic papers through multiple open AI-text detectors."""

from paper_spotter.ensemble import scan_text, scan_path
from paper_spotter.types import EngineResult, ScanReport

__version__ = "0.1.0"
__all__ = ["scan_text", "scan_path", "EngineResult", "ScanReport", "__version__"]
