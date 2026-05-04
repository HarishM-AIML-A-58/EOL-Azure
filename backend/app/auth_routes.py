"""
Authentication routes for user registration, login, logout, and session management
"""

from fastapi import APIRouter, HTTPException, Response, Request, Depends, status
from sqlalchemy.orm import Session
import os
from datetime import datetime
import logging

from database import get_db, User, create_session_for_user, invalidate_session, get_valid_session
from auth_utils import hash_password, verify_password, validate_password_strength, validate_username
from auth_middleware import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthResponse,
    SessionStatusResponse,
    get_current_user,
    get_current_user_optional,
    SESSION_COOKIE_NAME
)

logger = logging.getLogger(__name__)

# Create router for auth endpoints
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
async def register(
    user_data: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user account

    Args:
        user_data: Username and password for registration
        db: Database session

    Returns:
        AuthResponse with success status and message
    """
    try:
        # Validate username
        username_valid, username_error = validate_username(user_data.username)
        if not username_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=username_error
            )

        # Validate password strength
        password_valid, password_error = validate_password_strength(user_data.password)
        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=password_error
            )

        # Check if username already exists
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )

        # Hash password
        password_hash = hash_password(user_data.password)

        # Create new user
        new_user = User(
            username=user_data.username,
            password_hash=password_hash,
            created_at=datetime.utcnow()
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"New user registered: {new_user.username}")

        # Convert to response format
        user_response = UserResponse(
            id=new_user.id,
            username=new_user.username,
            created_at=new_user.created_at.isoformat(),
            last_login=None
        )

        return AuthResponse(
            success=True,
            message="User registered successfully",
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    user_data: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login user and create session with cookie

    Args:
        user_data: Username and password for login
        response: FastAPI response object (to set cookies)
        db: Database session

    Returns:
        AuthResponse with user data and sets session cookie
    """
    try:
        # Find user by username
        user = db.query(User).filter(User.username == user_data.username).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        # Verify password
        if not verify_password(user_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()

        # Create session (24 hour expiry)
        session_id = create_session_for_user(db, user.id, expiry_hours=24)

        # Set session cookie (HttpOnly for security)
        is_production = os.getenv("ENV") == "production"
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_id,
            httponly=True,
            samesite="none" if is_production else "lax",
            secure=True if is_production else False,
            max_age=24 * 60 * 60,  # 24 hours in seconds
            path="/"
        )

        logger.info(f"User logged in: {user.username}")

        # Convert to response format
        user_response = UserResponse(
            id=user.id,
            username=user.username,
            created_at=user.created_at.isoformat(),
            last_login=user.last_login.isoformat() if user.last_login else None
        )

        return AuthResponse(
            success=True,
            message="Login successful",
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/session", response_model=SessionStatusResponse)
async def check_session(
    user: User = Depends(get_current_user_optional)
):
    """
    Check current session status

    Args:
        user: Current user (if authenticated, None otherwise)

    Returns:
        SessionStatusResponse with authentication status
    """
    if user:
        user_response = UserResponse(
            id=user.id,
            username=user.username,
            created_at=user.created_at.isoformat(),
            last_login=user.last_login.isoformat() if user.last_login else None
        )

        return SessionStatusResponse(
            authenticated=True,
            user=user_response
        )
    else:
        return SessionStatusResponse(
            authenticated=False,
            user=None
        )


@router.post("/logout", response_model=AuthResponse)
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Logout user and invalidate session

    Args:
        request: FastAPI request object
        response: FastAPI response object (to clear cookies)
        db: Database session

    Returns:
        AuthResponse with success status
    """
    try:
        # Get session ID from cookie
        session_id = request.cookies.get(SESSION_COOKIE_NAME)

        if session_id:
            # Invalidate session in database
            invalidate_session(db, session_id)
            logger.info(f"Session invalidated: {session_id}")

        # Clear session cookie
        is_production = os.getenv("ENV") == "production"
        response.delete_cookie(
            key=SESSION_COOKIE_NAME,
            path="/",
            samesite="none" if is_production else "lax",
            secure=True if is_production else False
        )

        return AuthResponse(
            success=True,
            message="Logout successful",
            user=None
        )

    except Exception as e:
        logger.error(f"Logout error: {e}")
        # Even if there's an error, clear the cookie
        is_production = os.getenv("ENV") == "production"
        response.delete_cookie(
            key=SESSION_COOKIE_NAME,
            path="/",
            samesite="none" if is_production else "lax",
            secure=True if is_production else False
        )
        return AuthResponse(
            success=True,
            message="Logout successful",
            user=None
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information

    Args:
        user: Current authenticated user

    Returns:
        UserResponse with user data
    """
    return UserResponse(
        id=user.id,
        username=user.username,
        created_at=user.created_at.isoformat(),
        last_login=user.last_login.isoformat() if user.last_login else None
    )
