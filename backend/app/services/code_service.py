import os
import google.generativeai as genai
from dotenv import load_dotenv
import logging
import json
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize model as None
model = None

def initialize_gemini():
    global model
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("Gemini API initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini API: {str(e)}")
        raise

# Initialize Gemini on module import
try:
    initialize_gemini()
except Exception as e:
    logger.error(f"Failed to initialize Gemini API during startup: {str(e)}")

async def generate_code(task_description: str, language: str, use_boilerplate: bool = False) -> Dict[str, Any]:
    """
    Generate code for the task, either complete implementation or boilerplate.
    """
    if not model:
        try:
            initialize_gemini()
        except Exception as e:
            raise Exception("Failed to initialize Gemini API. Please check your API key.")

    try:
        prompt = f"""Generate {language} code for the following task:
        Task: {task_description}
        
        Requirements:
        1. Generate {'boilerplate code with TODO comments' if use_boilerplate else 'complete, working implementation'}
        2. Include necessary imports and dependencies
        3. Add clear comments explaining the code
        4. Follow best practices for {language}
        5. Return the code in the following JSON format:
        {{
            "code": "The complete code as a string",
            "dependencies": ["list", "of", "required", "packages"],
            "setup_instructions": "Instructions for setting up and running the code"
        }}
        
        Important: 
        - Return ONLY the JSON object, no other text, markdown formatting, or backticks
        - The 'code' field must be a string containing the complete code
        - Make sure the JSON is properly formatted and valid
        - For Python, include all necessary imports
        - For JavaScript, include any required npm packages
        - For other languages, include their respective package managers
        - If generating boilerplate code:
          * Add TODO comments for each major step
          * Include basic structure and imports
          * Add comments explaining what needs to be implemented
          * Make sure the code is runnable even if incomplete"""

        response = await model.generate_content_async(prompt)
        
        if not response or not response.text:
            raise ValueError("No response from AI model")
        
        # Clean the response text to ensure it's valid JSON
        response_text = response.text.strip()
        # Remove any markdown code block indicators
        response_text = response_text.replace('```json', '').replace('```', '')
        # Remove any leading/trailing whitespace
        response_text = response_text.strip()
        
        # Parse the JSON response
        try:
            content = json.loads(response_text)
            if not isinstance(content, dict):
                raise ValueError("Response is not a dictionary")
            if "code" not in content:
                raise ValueError("Response missing 'code' field")
            if not isinstance(content["code"], str):
                raise ValueError("'code' must be a string")
            if "dependencies" not in content:
                raise ValueError("Response missing 'dependencies' field")
            if not isinstance(content["dependencies"], list):
                raise ValueError("'dependencies' must be a list")
            if "setup_instructions" not in content:
                raise ValueError("Response missing 'setup_instructions' field")
            if not isinstance(content["setup_instructions"], str):
                raise ValueError("'setup_instructions' must be a string")
            
            # Add hints for boilerplate code
            if use_boilerplate:
                content["hints"] = [
                    "Complete the TODO comments in the code",
                    "Add necessary error handling",
                    "Test your implementation with different inputs",
                    "Make sure to handle edge cases",
                    "Add proper documentation for your functions"
                ]
            
            return content
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing code JSON: {str(e)}")
            logger.error(f"Raw response: {response_text}")
            raise ValueError("Failed to parse code: Invalid JSON format")
        except ValueError as e:
            logger.error(f"Error validating code format: {str(e)}")
            raise ValueError(f"Failed to parse code: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error generating code: {str(e)}")
        raise Exception(f"Failed to generate code: {str(e)}") 