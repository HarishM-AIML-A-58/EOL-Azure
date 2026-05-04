"""
Authentication middleware for FastAPI
Validates session cookies and provides user context to endpoints
"""

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db, get_valid_session, User
import logging

logger = logging.getLogger(__name__)

# Cookie configuration
SESSION_COOKIE_NAME = "eol_session_id"


class AuthenticationError(HTTPException):
    """Custom authentication error"""

    def __init__(self, detail: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_session_from_cookie(request: Request) -> Optional[str]:
    """
    Extract session ID from cookie

    Args:
        request: FastAPI request object

    Returns:
        Session ID if found, None otherwise
    """
    return request.cookies.get(SESSION_COOKIE_NAME)


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from session cookie

    Args:
        request: FastAPI request object
        db: Database session

    Returns:
        User object if authenticated

    Raises:
        AuthenticationError: If session is invalid or not found
    """
    # Get session ID from cookie
    session_id = get_session_from_cookie(request)

    if not session_id:
        logger.warning("No session cookie found")
        raise AuthenticationError("No session found. Please log in.")

    # Validate session
    session = get_valid_session(db, session_id)

    if not session:
        logger.warning(f"Invalid session: {session_id}")
        raise AuthenticationError("Invalid or expired session. Please log in again.")

    # Get user from session
    user = db.query(User).filter(User.id == session.user_id).first()

    if not user:
        logger.error(f"User not found for session: {session_id}")
        raise AuthenticationError("User not found. Please log in again.")

    logger.info(f"User authenticated: {user.username}")
    return user


async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication - returns user if authenticated, None otherwise
    Does not raise exceptions

    Args:
        request: FastAPI request object
        db: Database session

    Returns:
        User object if authenticated, None otherwise
    """
    try:
        return await get_current_user(request, db)
    except AuthenticationError:
        return None


def get_session_id_from_request(request: Request) -> Optional[str]:
    """
    Get session ID from request cookie

    Args:
        request: FastAPI request object

    Returns:
        Session ID if found, None otherwise
    """
    return get_session_from_cookie(request)


# Pydantic models for authentication requests/responses

from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    """User registration request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class UserLoginRequest(BaseModel):
    """User login request"""
    username: str
    password: str


class UserResponse(BaseModel):
    """User response (without sensitive data)"""
    id: str
    username: str
    created_at: str
    last_login: Optional[str] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response"""
    success: bool
    message: str
    user: Optional[UserResponse] = None


class SessionStatusResponse(BaseModel):
    """Session status response"""
    authenticated: bool
    user: Optional[UserResponse] = None
