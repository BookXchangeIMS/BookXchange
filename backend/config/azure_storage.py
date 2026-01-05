import os
from azure.storage.blob import BlobServiceClient, ContentSettings

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")

# Container names
LISTING_IMAGES_CONTAINER = "listing-images"
PROFILE_PICTURES_CONTAINER = "profile-pictures"

def get_blob_service_client():
    """
    Returns Azure Blob Service Client using connection string from environment.
    
    :return: BlobServiceClient instance
    :raises ValueError: If AZURE_STORAGE_CONNECTION_STRING is not set
    """
    if not AZURE_STORAGE_CONNECTION_STRING:
        raise ValueError("AZURE_STORAGE_CONNECTION_STRING environment variable is not set")
    return BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)

def ensure_containers_exist():
    """
    Creates blob containers if they don't exist.
    Should be called on app startup.
    """
    try:
        blob_service_client = get_blob_service_client()
        
        # Create listing images container
        try:
            blob_service_client.create_container(LISTING_IMAGES_CONTAINER)
            print(f"Created container: {LISTING_IMAGES_CONTAINER}")
        except Exception:
            print(f"Container {LISTING_IMAGES_CONTAINER} already exists")
        
        # Create profile pictures container
        try:
            blob_service_client.create_container(PROFILE_PICTURES_CONTAINER)
            print(f"Created container: {PROFILE_PICTURES_CONTAINER}")
        except Exception:
            print(f"Container {PROFILE_PICTURES_CONTAINER} already exists")
            
    except Exception as e:
        print(f"Warning: Could not ensure containers exist: {e}")
        print("Make sure AZURE_STORAGE_CONNECTION_STRING is configured in Azure App Service")
