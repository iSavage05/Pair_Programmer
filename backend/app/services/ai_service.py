import os
import google.generativeai as genai
from dotenv import load_dotenv
from app.models.task import DifficultyLevel
import logging
from typing import Dict, Any
import re
import json

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

def get_prompt_by_difficulty(description: str, difficulty: DifficultyLevel) -> str:
    base_prompt = f"Generate code scaffolding for the following task: {description}\n"
    
    if difficulty == DifficultyLevel.BEGINNER:
        return base_prompt + """
        Please provide:
        1. Detailed code structure with comments
        2. Step-by-step implementation guide
        3. Example usage
        4. Common pitfalls to avoid
        Format the response as a code block with TODO comments.
        """
    elif difficulty == DifficultyLevel.INTERMEDIATE:
        return base_prompt + """
        Please provide:
        1. Basic code structure
        2. Key functions and their purposes
        3. Main implementation points
        Format the response as a code block with TODO comments.
        """
    else:  # EXPERT
        return base_prompt + """
        Please provide:
        1. Minimal code structure
        2. High-level implementation points
        Format the response as a code block with TODO comments.
        """

async def generate_code_scaffolding(task_description: str, difficulty_level: str, language: str, force_boilerplate: bool = False) -> Dict[str, Any]:
    """
    Generate code scaffolding based on the task description and difficulty level.
    """
    if not model:
        try:
            initialize_gemini()
        except Exception as e:
            raise Exception("Failed to initialize Gemini API. Please check your API key.")

    try:
        if force_boilerplate:
            prompt = f"""Generate ONLY the basic boilerplate code structure for the following programming task in {language}:
            Task: {task_description}
            
            Requirements:
            1. Provide ONLY the basic function/class structure
            2. Include function/class names and parameters
            3. Include basic docstrings
            4. DO NOT include any implementation logic
            5. DO NOT include any hints or comments about implementation
            6. Return the code in the following JSON format:
            {{
                "code": "The boilerplate code",
                "hints": []
            }}
            
            Important: Return ONLY the JSON object, no other text, markdown formatting, or backticks."""
        else:
            prompt = f"""Generate code scaffolding for the following programming task in {language}:
            Task: {task_description}
            
            Requirements:
            1. For newbie level:
               - Provide only basic boilerplate code
               - Include function/class structure
               - Include basic docstrings
               - DO NOT include implementation details
               - DO NOT include hints
            
            2. For expert level:
               - Provide complete implementation
               - Include all necessary logic
               - Include detailed comments
               - Include error handling
               - Include best practices
            
            Return the code in the following JSON format:
            {{
                "code": "The code",
                "hints": ["Hint 1", "Hint 2", ...]
            }}
            
            Important: Return ONLY the JSON object, no other text, markdown formatting, or backticks."""

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
            result = json.loads(response_text)
            if not isinstance(result, dict):
                raise ValueError("Response is not a dictionary")
            if "code" not in result:
                raise ValueError("Response missing 'code' key")
            if not isinstance(result["code"], str):
                raise ValueError("'code' must be a string")
            if "hints" not in result:
                raise ValueError("Response missing 'hints' key")
            if not isinstance(result["hints"], list):
                raise ValueError("'hints' must be a list")
            
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing code JSON: {str(e)}")
            logger.error(f"Raw response: {response_text}")
            raise ValueError("Failed to parse code: Invalid JSON format")
    
    except Exception as e:
        logger.error(f"Error generating code: {str(e)}")
        raise Exception(f"Failed to generate code: {str(e)}") 