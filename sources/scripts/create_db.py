"""Pre-run script for creating the DB if it does not exist."""

import logging
import os
from pathlib import Path

from vless_admin.config import AppConfig
from vless_admin.db import create_db_if_not_exists

logger = logging.getLogger(__name__)


def main() -> None:
    """Create the PostgreSQL database if it does not exist yet."""
    logging.basicConfig(level=logging.INFO)
    config = AppConfig.from_yaml(Path(os.getenv("CONFIG_PATH", "config.yaml")))
    create_db_if_not_exists(config.sync_database_url)


if __name__ == "__main__":
    main()
