import os
import shutil
from datetime import datetime, timedelta
from typing import Optional
import secrets

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

# ===== CONFIGURATION SETUP =====
# Load environment variables from .env file (stores sensitive data like SECRET_KEY)
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

# SECRET_KEY: Used to sign/verify JWT tokens. Should be kept secret in production.
# If no .env file, generate a random key using secrets.token_urlsafe()
SECRET_KEY = os.getenv('SECRET_KEY') or secrets.token_urlsafe(32)

# ALGORITHM: The method used to encode JWT tokens (HS256 = HMAC with SHA-256)
ALGORITHM = 'HS256'

# ACCESS_TOKEN_EXPIRE_MINUTES: How long a login token is valid (30 minutes)
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# UPLOAD_DIR: Directory where uploaded files will be saved on the server
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploaded_files')

# Create the upload directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ===== FastAPI APP INITIALIZATION =====
# Create the main FastAPI application instance
app = FastAPI(title='Secure Upload (FastAPI)')

# ===== CORS MIDDLEWARE =====
# CORS (Cross-Origin Resource Sharing) allows the frontend at localhost:4200 to make requests to this backend
# Without this, the browser would block requests from the Angular app
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:4200'],  # Allow requests from Angular frontend
    allow_credentials=True,  # Allow cookies/auth headers to be sent
    allow_methods=['*'],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=['*'],  # Allow all headers
)

# ===== SECURITY SETUP =====
# pwd_context: Utility for hashing passwords securely (using pbkdf2_sha256 algorithm)
# It takes a plain password and converts it to an unreadable hash for safe storage
pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')

# oauth2_scheme: FastAPI's security scheme for handling Bearer tokens in the Authorization header
# It extracts the JWT token from requests and validates it
oauth2_scheme = OAuth2PasswordBearer(tokenUrl='token')

# ===== DATABASE =====
# fake_users_db: Dictionary storing user accounts (username -> {username, hashed_password})
# In production, this would be a real database like PostgreSQL or MongoDB
fake_users_db = {}

# ===== DATA MODELS =====
# Pydantic models define the structure of data sent/received from the API

class UserCreate(BaseModel):
    """Data model for user registration request
    
    Example:
        {
            "username": "john",
            "password": "mypassword123"
        }
    """
    username: str
    password: str

class Token(BaseModel):
    """Data model for login response containing JWT token
    
    Example:
        {
            "access_token": "eyJhbGc...",
            "token_type": "bearer"
        }
    """
    access_token: str
    token_type: str

# ===== UTILITY FUNCTIONS =====

def verify_password(plain_password, hashed_password):
    """Compare a plain text password with its hashed version
    
    This is used during login to check if the password the user entered is correct.
    It uses a secure algorithm that prevents attackers from simply comparing hashes.
    
    Args:
        plain_password (str): The password the user typed in
        hashed_password (str): The hashed version stored in the database
        
    Returns:
        bool: True if password matches, False otherwise
        
    Example:
        >>> verify_password("mypass123", "$2b$12$abcdef...")
        True  # Password is correct
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Convert a plain text password into a secure hash
    
    This is used during registration to store passwords safely.
    The hash is one-way: you cannot convert it back to the original password.
    
    Args:
        password (str): The plain text password entered by the user
        
    Returns:
        str: A hashed version of the password (safe to store in database)
        
    Example:
        >>> get_password_hash("mypass123")
        "$2b$12$abcdef..."  # Hashed password
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT token that proves the user is logged in
    
    JWT (JSON Web Token) is like a digital ticket. The frontend keeps this token
    and sends it with every request to prove they are authenticated.
    
    Args:
        data (dict): Information to include in the token (e.g., {'sub': 'john'})
        expires_delta (timedelta, optional): How long until token expires. 
                                            Defaults to ACCESS_TOKEN_EXPIRE_MINUTES
        
    Returns:
        str: Encoded JWT token
        
    Example:
        >>> token = create_access_token(data={'sub': 'john'})
        >>> print(token)
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    """
    # Make a copy of data so we don't modify the original
    to_encode = data.copy()
    
    # Calculate when this token expires (current time + 30 minutes)
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add expiration time to the token data
    to_encode.update({'exp': expire})
    
    # Encode the token using our SECRET_KEY (this creates the JWT string)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate a JWT token and return the logged-in user
    
    This function is used as a dependency in protected endpoints.
    It checks if the token is valid and the user exists.
    
    Args:
        token (str): JWT token from the Authorization header (extracted automatically)
        
    Returns:
        dict: User information {'username': '...', 'hashed_password': '...'}
        
    Raises:
        HTTPException: 401 Unauthorized if token is invalid or user not found
        
    How it works:
        1. Extract the token from the Authorization header
        2. Decode the token using our SECRET_KEY
        3. Get the username from the decoded token
        4. Look up the user in our database
        5. If anything fails, return 401 Unauthorized
    """
    # Create the error message to show if authentication fails
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    
    try:
        # Decode the JWT token using our SECRET_KEY
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract the username (stored as 'sub' in the token)
        username: str = payload.get('sub')
        
        # If there's no username in the token, raise an error
        if username is None:
            raise credentials_exception
            
    except JWTError:
        # If the token is invalid/expired/tampered with, raise an error
        raise credentials_exception

    # Look up the user in our database
    user = fake_users_db.get(username)
    
    # If user doesn't exist, raise an error
    if user is None:
        raise credentials_exception
    
    # Return the user if everything is valid
    return user

# ===== API ENDPOINTS =====

@app.get('/health')
async def health():
    """Health check endpoint
    
    Returns a simple status to verify the server is running.
    Useful for monitoring and debugging.
    
    Returns:
        dict: {'status': 'ok'}
    """
    return {'status': 'ok'}

@app.post('/register', status_code=201)
async def register(user: UserCreate):
    """Register a new user account
    
    Creates a new user in the database with a hashed password.
    
    Args:
        user (UserCreate): Contains username and password
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: 400 Bad Request if username already exists
        
    Steps:
        1. Check if username is already taken
        2. Hash the password for security
        3. Store user in database
        4. Return success message
    """
    # Check if this username already exists
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail='Username already registered')
    
    # Hash the password so we don't store it in plain text
    hashed_password = get_password_hash(user.password)
    
    # Store the new user in our database
    fake_users_db[user.username] = {
        'username': user.username,
        'hashed_password': hashed_password
    }
    
    # Return success message
    return {'message': 'User registered successfully'}

@app.post('/token', response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login user and return JWT token
    
    Verifies credentials and creates a JWT token for authenticated requests.
    
    Args:
        form_data (OAuth2PasswordRequestForm): Contains username and password
        
    Returns:
        Token: Contains access_token and token_type ('bearer')
        
    Raises:
        HTTPException: 401 Unauthorized if credentials are wrong
        
    Steps:
        1. Look up user by username
        2. Verify password matches
        3. Create a JWT token
        4. Return token to frontend
    """
    # Look up the user in our database
    user = fake_users_db.get(form_data.username)
    
    # If user doesn't exist OR password is wrong, deny login
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect username or password',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    
    # Create a JWT token containing the username
    access_token = create_access_token(data={'sub': user['username']})
    
    # Return the token to the frontend
    return {'access_token': access_token, 'token_type': 'bearer'}

@app.post('/upload')
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a file from authenticated user
    
    Saves an uploaded file to the server, with filename prefixed by username.
    This endpoint requires a valid JWT token (protected by get_current_user dependency).
    
    Args:
        file (UploadFile): The file being uploaded from the frontend
        current_user (dict): The logged-in user (automatically validated by get_current_user)
        
    Returns:
        dict: Confirmation message with filename and username
        
    How it works:
        1. Receive file from frontend
        2. Create a filename with username prefix (prevents file conflicts)
        3. Save file to disk in the 'uploaded_files' directory
        4. Return success message
    """
    # Create the file path: uploaded_files/username_filename.txt
    # The username prefix ensures files from different users don't overwrite each other
    file_location = os.path.join(UPLOAD_DIR, f"{current_user['username']}_{file.filename}")
    
    # Open the file and write the uploaded content to disk
    with open(file_location, 'wb+') as buffer:
        # Copy the uploaded file's content to our new file
        shutil.copyfileobj(file.file, buffer)
    
    # Return success message
    return {'info': f"File '{file.filename}' saved.", 'user': current_user['username']}

@app.get('/files')
async def list_files(current_user: dict = Depends(get_current_user)):
    """List all files uploaded by the current user
    
    Returns a list of files owned by the logged-in user.
    This endpoint requires a valid JWT token.
    
    Args:
        current_user (dict): The logged-in user (automatically validated)
        
    Returns:
        dict: Contains 'files' list with filename and size info
        
    How it works:
        1. Get the current user's username
        2. Loop through all files in the upload directory
        3. Filter for files that belong to this user (match username prefix)
        4. Extract the original filename and file size
        5. Return list of files
    """
    # Get the username of the current logged-in user
    username = current_user['username']
    
    # Create an empty list to store files
    files = []
    
    # Check if the upload directory exists
    if os.path.exists(UPLOAD_DIR):
        # Loop through all files in the upload directory
        for filename in os.listdir(UPLOAD_DIR):
            # Only include files that belong to this user (start with "username_")
            if filename.startswith(f"{username}_"):
                # Get the full path to the file
                file_path = os.path.join(UPLOAD_DIR, filename)
                
                # Get the file size in bytes
                file_size = os.path.getsize(file_path)
                
                # Remove the "username_" prefix to get the original filename
                original_name = filename[len(username)+1:]
                
                # Add this file to our list
                files.append({'name': original_name, 'size': file_size})
    
    # Return the list of files
    return {'files': files}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('secure_upload_backend.main:app', host='0.0.0.0', port=8000, reload=True)
