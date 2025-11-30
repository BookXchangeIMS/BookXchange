import os
import base64
from openai import AzureOpenAI
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

def get_azure_openai_client():
    """
    Initializes and returns the Azure OpenAI client.
    """
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = "2024-02-01" # Or your specific version

    if not endpoint or not api_key:
        print("Warning: Azure OpenAI credentials not found in environment variables.")
        return None

    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version
    )

def analyze_book_image(image_data: bytes):
    """
    Sends the image to Azure OpenAI (GPT-4o) and extracts book details.
    Returns a dictionary with the book information.
    """
    client = get_azure_openai_client()
    if not client:
        return {"error": "Azure OpenAI not configured"}

    # Encode image to base64
    base64_image = base64.b64encode(image_data).decode('utf-8')

    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that extracts book information from images. Return ONLY a JSON object."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Identify the book in this image and return a JSON object with the following fields: 'Title', 'Author' (as a comma-separated string if multiple), 'ISBN' (if visible, else empty string), 'Condition' (estimate based on visual wear: 'Almost new', 'Good', 'Fair', 'Poor'), 'Genre' (comma-separated string, select ONLY from this list: [Fantasy, Science Fiction, Mystery, Thriller, Romance, Non-Fiction, History, Biography, Horror, Adventure]. Do NOT invent new genres. If the book does not fit exactly, choose the closest match from the list.), 'Year' (publication year if visible or known, else empty string), 'Description' (a short summary). If you cannot identify the book, return an empty JSON object."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content
        return json.loads(result_text)

    except Exception as e:
        print(f"Error calling Azure OpenAI: {e}")
        return {"error": str(e)}
