"""
Database setup and models for user authentication and session management.
Uses SQLite for local network deployment with SQLAlchemy ORM.
"""

from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timedelta
import uuid

# Database configuration
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "eol_core.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine and session
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database Models

class User(Base):
    """User account model"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """Session management model"""
    __tablename__ = "sessions"

    session_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="sessions")

    @property
    def is_valid(self):
        """Check if session is valid (active and not expired)"""
        return self.is_active and self.expires_at > datetime.utcnow()


class SearchHistory(Base):
    """Component search history tracking"""
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    part_number = Column(String, nullable=False)
    manufacturer = Column(String, nullable=True)
    searched_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="search_history")


# Database initialization
def init_db():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Utility functions

def create_session_for_user(db, user_id: str, expiry_hours: int = 24) -> str:
    """
    Create a new session for a user

    Args:
        db: Database session
        user_id: User ID
        expiry_hours: Session expiry time in hours (default: 24)

    Returns:
        session_id: Generated session ID
    """
    session = Session(
        user_id=user_id,
        expires_at=datetime.utcnow() + timedelta(hours=expiry_hours)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session.session_id


def get_valid_session(db, session_id: str):
    """
    Get and validate a session

    Args:
        db: Database session
        session_id: Session ID to validate

    Returns:
        Session object if valid, None otherwise
    """
    session = db.query(Session).filter(Session.session_id == session_id).first()

    if session and session.is_valid:
        return session
    return None


def invalidate_session(db, session_id: str) -> bool:
    """
    Invalidate a session (logout)

    Args:
        db: Database session
        session_id: Session ID to invalidate

    Returns:
        True if successful, False otherwise
    """
    session = db.query(Session).filter(Session.session_id == session_id).first()

    if session:
        session.is_active = False
        db.commit()
        return True
    return False


def cleanup_expired_sessions(db):
    """Remove expired sessions from database"""
    expired_sessions = db.query(Session).filter(
        Session.expires_at < datetime.utcnow()
    ).all()

    for session in expired_sessions:
        db.delete(session)

    db.commit()
    print(f"Cleaned up {len(expired_sessions)} expired sessions")


if __name__ == "__main__":
    # Initialize database when run directly
    init_db()
    print("Database initialized successfully!")
