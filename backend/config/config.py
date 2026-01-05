"""Configuration settings for BookXchange application."""
import os


class Settings:
    """Application settings loaded from environment variables."""
    
    # Password Hashing Settings
    HASH_ITERATIONS: int = int(os.getenv("HASH_ITERATIONS", "100000"))
    HASH_ALGORITHM: str = os.getenv("HASH_ALGORITHM", "sha256")
    
    # JWT Settings - MUST be set via environment variables in production!
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-CHANGE-IN-PRODUCTION")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: float = float(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: float = float(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    
    # Database Password - MUST be set via environment variables in production!
    SA_PASSWORD: str = os.getenv("SA_PASSWORD", "dev-password-CHANGE-IN-PRODUCTION")
