from fastapi import APIRouter, HTTPException
from app.models.task import TaskRequest, ProgrammingLanguage
from app.services.ai_service import generate_code_scaffolding
from app.services.code_executor import execute_code
from app.services.quiz_service import generate_quiz, check_quiz_answers
from app.services.learning_service import generate_learning_content
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/generate_scaffolding")
async def generate_scaffolding(request: TaskRequest):
    try:
        if not request.task_description:
            raise HTTPException(status_code=400, detail="Task description is required")
        
        if not request.difficulty_level:
            raise HTTPException(status_code=400, detail="Difficulty level is required")
        
        if not request.language:
            raise HTTPException(status_code=400, detail="Programming language is required")
        
        logger.info(f"Generating scaffolding for task: {request.task_description}")
        
        # If coming from learning page, force newbie level for boilerplate code
        use_boilerplate = getattr(request, 'use_boilerplate', False)
        if use_boilerplate:
            logger.info("Generating boilerplate code")
            request.difficulty_level = "newbie"
            # Force boilerplate code generation
            result = await generate_code_scaffolding(
                request.task_description,
                "newbie",  # Force newbie level
                request.language,
                force_boilerplate=True  # Add this flag to force boilerplate
            )
        else:
            logger.info(f"Generating complete code for difficulty level: {request.difficulty_level}")
            result = await generate_code_scaffolding(
                request.task_description,
                request.difficulty_level,
                request.language
            )
            
        if not result or "code" not in result:
            logger.error("Failed to generate valid code")
            raise HTTPException(status_code=500, detail="Failed to generate valid code")
            
        # Log the generated code length for debugging
        logger.info(f"Generated code length: {len(result['code'])}")
        
        return {
            "scaffolding": result["code"],
            "hints": result.get("hints", []),
            "dependencies": result.get("dependencies", []),
            "setup_instructions": result.get("setup_instructions", "")
        }
    except Exception as e:
        logger.error(f"Error generating scaffolding: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run_code")
async def run_code(request: dict):
    try:
        if not request.get("code"):
            raise HTTPException(status_code=400, detail="Code is required")
        
        if not request.get("language"):
            raise HTTPException(status_code=400, detail="Programming language is required")
        
        try:
            language = ProgrammingLanguage(request["language"])
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid programming language. Must be one of: {', '.join([lang.value for lang in ProgrammingLanguage])}"
            )
        
        logger.info(f"Running code in {language.value}")
        output = await execute_code(request["code"], language)
        
        return {"output": output}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_quiz")
async def generate_quiz_endpoint(request: dict):
    try:
        if not request.get("task_description"):
            raise HTTPException(status_code=400, detail="Task description is required")
        if not request.get("language"):
            raise HTTPException(status_code=400, detail="Language is required")
        
        questions = await generate_quiz(request["task_description"], request["language"])
        return {"questions": questions}
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check_quiz")
async def check_quiz_endpoint(request: dict):
    try:
        if not request.get("task_description"):
            raise HTTPException(status_code=400, detail="Task description is required")
        if not request.get("language"):
            raise HTTPException(status_code=400, detail="Language is required")
        if not request.get("answers"):
            raise HTTPException(status_code=400, detail="Answers are required")
        
        result = await check_quiz_answers(
            request["task_description"],
            request["language"],
            request["answers"]
        )
        return result
    except Exception as e:
        logger.error(f"Error checking quiz answers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_learning")
async def generate_learning_endpoint(request: dict):
    try:
        if not request.get("task_description"):
            raise HTTPException(status_code=400, detail="Task description is required")
        if not request.get("language"):
            raise HTTPException(status_code=400, detail="Language is required")
        
        content = await generate_learning_content(request["task_description"], request["language"])
        return {"content": content}
    except Exception as e:
        logger.error(f"Error generating learning content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 