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

async def generate_learning_content(task_description: str, language: str, wrong_answers: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generate learning content for the task, focusing on concepts that were answered incorrectly.
    """
    if not model:
        try:
            initialize_gemini()
        except Exception as e:
            raise Exception("Failed to initialize Gemini API. Please check your API key.")

    try:
        # Generate explanations for wrong answers if provided
        wrong_answer_explanations = []
        if wrong_answers:
            for wrong in wrong_answers:
                explanation_prompt = f"""For the following programming question in {language}:
                Question: {wrong['question']}
                {f"Code snippet: {wrong['code_snippet']}" if 'code_snippet' in wrong and wrong['code_snippet'] else ""}
                Correct answer: {wrong['correct_answer']}
                User's answer: {wrong['user_answer']}
                
                Provide a detailed explanation that includes:
                1. Why the correct answer is right (2-3 sentences)
                2. What the user might have misunderstood
                3. A visual explanation if the question involves:
                   - Code execution flow
                   - Data structures
                   - Algorithm steps
                   - Memory/stack operations
                   - Object relationships
                
                Format the response as JSON:
                {{
                    "explanation": "Main explanation text",
                    "visual_explanation": {{
                        "type": "flowchart|diagram|steps|memory|none",
                        "content": "ASCII art or text-based visualization if needed"
                    }}
                }}
                
                If no visual explanation is needed, set visual_explanation.type to "none" and content to null."""
                
                try:
                    explanation_response = await model.generate_content_async(explanation_prompt)
                    if explanation_response and explanation_response.text:
                        explanation_data = json.loads(explanation_response.text.strip())
                        wrong_answer_explanations.append({
                            "question": wrong["question"],
                            "code_snippet": wrong.get("code_snippet"),
                            "user_answer": wrong["user_answer"],
                            "correct_answer": wrong["correct_answer"],
                            "explanation": explanation_data["explanation"],
                            "visual_explanation": explanation_data.get("visual_explanation", {"type": "none", "content": None})
                        })
                except Exception as e:
                    logger.error(f"Error generating explanation for question: {str(e)}")
                    wrong_answer_explanations.append({
                        "question": wrong["question"],
                        "code_snippet": wrong.get("code_snippet"),
                        "user_answer": wrong["user_answer"],
                        "correct_answer": wrong["correct_answer"],
                        "explanation": f"The correct answer is {wrong['correct_answer']}.",
                        "visual_explanation": {"type": "none", "content": None}
                    })

        # Generate general learning content
        prompt = f"""Generate comprehensive learning content for the following programming task in {language}:
        Task: {task_description}
        
        Requirements:
        1. Break down the content into clear sections:
           - Core Concepts
           - Implementation Approach
           - Best Practices
           - Common Pitfalls
           - Language-Specific Features
        2. Include code examples where relevant
        3. Provide detailed explanations
        4. Focus on practical understanding
        5. Return the content in the following JSON format:
        {{
            "sections": [
                {{
                    "title": "Section Title",
                    "content": "Detailed explanation...",
                    "code": "Optional code example..."
                }},
                ...
            ]
        }}
        
        Important: 
        - Return ONLY the JSON object, no other text, markdown formatting, or backticks
        - The 'code' field should be a string containing the code example
        - If no code example is needed for a section, omit the 'code' field entirely
        - Make sure the JSON is properly formatted and valid"""

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
            if "sections" not in content:
                raise ValueError("Response missing 'sections' key")
            if not isinstance(content["sections"], list):
                raise ValueError("'sections' must be a list")
            
            # Validate each section has the required fields
            for i, section in enumerate(content["sections"]):
                if not all(key in section for key in ['title', 'content']):
                    raise ValueError(f"Section {i+1} is missing required fields")
                if not isinstance(section['title'], str) or not isinstance(section['content'], str):
                    raise ValueError(f"Section {i+1} title and content must be strings")
                
                # Handle code field more flexibly
                if 'code' in section:
                    if section['code'] is None:
                        # Remove None code fields
                        del section['code']
                    elif not isinstance(section['code'], str):
                        # Convert non-string code to string
                        section['code'] = str(section['code'])
            
            # Add wrong answer explanations if available
            if wrong_answer_explanations:
                content["wrong_answers"] = wrong_answer_explanations
            
            # Add a flag to indicate that boilerplate code should be used
            content["use_boilerplate"] = True
            
            return content
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing learning content JSON: {str(e)}")
            logger.error(f"Raw response: {response_text}")
            raise ValueError("Failed to parse learning content: Invalid JSON format")
        except ValueError as e:
            logger.error(f"Error validating learning content format: {str(e)}")
            raise ValueError(f"Failed to parse learning content: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error generating learning content: {str(e)}")
        raise Exception(f"Failed to generate learning content: {str(e)}") 