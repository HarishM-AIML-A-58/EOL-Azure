"""
Authentication utilities for password hashing and validation.
Uses bcrypt for secure password hashing.
"""

import bcrypt
from typing import Optional


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password as string
    """
    # Generate salt and hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a password against its hash

    Args:
        password: Plain text password to verify
        password_hash: Stored password hash

    Returns:
        True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            password_hash.encode('utf-8')
        )
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password meets minimum security requirements

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"

    if len(password) > 128:
        return False, "Password must be less than 128 characters"

    # For local network use, we keep requirements simple
    # Add more requirements here if needed (uppercase, numbers, special chars)

    return True, None


def validate_username(username: str) -> tuple[bool, Optional[str]]:
    """
    Validate username meets requirements

    Args:
        username: Username to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"

    if len(username) > 50:
        return False, "Username must be less than 50 characters"

    # Allow alphanumeric, underscore, hyphen, and dot
    allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.")

    if not all(char in allowed_chars for char in username):
        return False, "Username can only contain letters, numbers, underscore, hyphen, and dot"

    if username[0] in ".-" or username[-1] in ".-":
        return False, "Username cannot start or end with dot or hyphen"

    return True, None


# Example usage for testing
if __name__ == "__main__":
    # Test password hashing
    test_password = "SecurePassword123"

    print("Testing password hashing...")
    hashed = hash_password(test_password)
    print(f"Original: {test_password}")
    print(f"Hashed: {hashed}")

    # Test password verification
    print("\nTesting password verification...")
    is_valid = verify_password(test_password, hashed)
    print(f"Correct password: {is_valid}")

    is_valid = verify_password("WrongPassword", hashed)
    print(f"Wrong password: {is_valid}")

    # Test password validation
    print("\nTesting password strength validation...")
    test_cases = [
        "12345",  # Too short
        "ValidPassword",  # Valid
        "a" * 150,  # Too long
    ]

    for pwd in test_cases:
        valid, msg = validate_password_strength(pwd)
        print(f"Password '{pwd[:20]}...': Valid={valid}, Message={msg}")

    # Test username validation
    print("\nTesting username validation...")
    username_cases = [
        "ab",  # Too short
        "valid_user",  # Valid
        "user@domain",  # Invalid char
        "user.name",  # Valid
        ".startdot",  # Invalid start
    ]

    for uname in username_cases:
        valid, msg = validate_username(uname)
        print(f"Username '{uname}': Valid={valid}, Message={msg}")
