from pydantic import BaseModel

# User model
class User(BaseModel):
    username: str
    email: str
    password: str


# Token model
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str