import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  CircularProgress,
  Alert,
  useTheme,
  Divider
} from '@mui/material';
import useCodingStore from '../store/codingStore';
import axios from 'axios';

const Quiz = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { taskDescription: task, language } = useCodingStore();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [allQuestionsWithAnswers, setAllQuestionsWithAnswers] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    if (!task || !language) {
      navigate('/');
      return;
    }

    const generateQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.post('http://localhost:8000/api/generate_quiz', {
          task_description: task,
          language: language
        });
        
        if (response.data && response.data.questions) {
          setQuestions(response.data.questions);
          // Store the session ID
          if (response.data.session_id) {
            setSessionId(response.data.session_id);
            console.log("Quiz session ID:", response.data.session_id);
          }
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate quiz';
        setError(errorMessage);
        console.error('Error generating quiz:', err);
      } finally {
        setLoading(false);
      }
    };

    generateQuiz();
  }, [task, language, navigate]);

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    try {
      // Make sure all questions have answers
      if (Object.keys(answers).length !== questions.length) {
        setError("Please answer all questions before submitting.");
        return;
      }
      
      // Make sure we have a session ID
      if (!sessionId) {
        setError("Quiz session not found. Please refresh the page and try again.");
        return;
      }
      
      // Log the answers for debugging
      console.log("Submitting answers:", answers);
      
      // Send answers to backend with session ID
      const response = await axios.post('http://localhost:8000/api/check_quiz', {
        session_id: sessionId,
        answers: answers
      });

      if (response.data) {
        setScore(response.data.score);
        setWrongAnswers(response.data.wrong_answers || []);
        setShowResults(true);
        setQuizCompleted(true);
        
        // Use question_results if available, otherwise create our own
        if (response.data.question_results) {
          setAllQuestionsWithAnswers(response.data.question_results);
        } else {
          // Create a comprehensive list of all questions with answers
          const questionsWithAnswers = questions.map(question => {
            const isCorrect = response.data.correct_answers?.includes(question.id);
            return {
              ...question,
              userAnswer: answers[question.id],
              is_correct: isCorrect
            };
          });
          setAllQuestionsWithAnswers(questionsWithAnswers);
        }
        
        // Log the results for debugging
        console.log("Quiz results:", response.data);
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to check quiz answers');
    }
  };

  const handleContinue = () => {
    if (score === 10) {
      // Perfect score - go directly to editor
      navigate('/editor', { 
        state: { 
          perfectScore: true,
          taskDescription: task,
          language: language
        } 
      });
    } else {
      // Less than perfect score - go to learning page with wrong answers
      navigate('/learning', { 
        state: { 
          wrongAnswers: wrongAnswers,
          score: score,
          totalQuestions: questions.length,
          sessionId: sessionId,
          taskDescription: task,
          language: language
        } 
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (showResults) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" gutterBottom align="center" color="primary">
            Quiz Results
          </Typography>
          
          <Typography variant="h5" gutterBottom align="center" sx={{ mb: 4 }}>
            Score: {score}/10 ({((score/10) * 100).toFixed(1)}%)
          </Typography>

          {score === 10 ? (
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Perfect Score! 🎉
              </Typography>
              <Typography variant="body1" sx={{ mb: 4 }}>
                You've demonstrated excellent understanding of the concepts.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleContinue}
                sx={{ mt: 2 }}
              >
                Proceed to Coding
              </Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                Let's Learn More
              </Typography>
              <Typography variant="body1" sx={{ mb: 4 }}>
                You got {score} out of 10 questions correct. Let's improve your understanding!
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleContinue}
                sx={{
                  backgroundColor: 'success.main',
                  '&:hover': {
                    backgroundColor: 'success.dark'
                  }
                }}
              >
                Start Learning
              </Button>
            </Box>
          )}
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Question Review
          </Typography>
          
          {allQuestionsWithAnswers.map((question, index) => (
            <Paper 
              key={question.id} 
              sx={{ 
                p: 3, 
                mb: 3, 
                borderLeft: question.is_correct ? '4px solid #4caf50' : '4px solid #f44336',
                backgroundColor: question.is_correct ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)'
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Question {index + 1}: {question.question}
              </Typography>
              
              {question.code_snippet && (
                <Box 
                  component="pre" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 1,
                    overflowX: 'auto',
                    mb: 2,
                    fontSize: '0.9rem'
                  }}
                >
                  {question.code_snippet}
                </Box>
              )}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                <Typography>
                  <Box component="span" sx={{ fontWeight: 'bold' }}>Your answer:</Box> {question.user_answer || question.userAnswer}
                </Typography>
                
                <Typography color={question.is_correct ? 'success.main' : 'error.main'}>
                  <Box component="span" sx={{ fontWeight: 'bold' }}>Correct answer:</Box> {question.correct_answer}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ 
        p: 4, 
        borderRadius: 2,
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <Box sx={{
          mb: 4,
          textAlign: 'center',
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          p: 3,
          borderRadius: 2,
          color: 'white',
          boxShadow: '0 4px 20px rgba(33, 203, 243, 0.3)'
        }}>
          <Typography variant="h4" gutterBottom sx={{ 
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
          }}>
            Expert Quiz
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            opacity: 0.9,
            fontWeight: 500
          }}>
            Answer all questions to test your understanding
          </Typography>
        </Box>

        {questions.map((question, index) => (
          <Box key={question.id} sx={{ 
            mb: 4,
            p: 3,
            borderRadius: 2,
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="h6" gutterBottom sx={{ 
              color: '#2196F3',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Box component="span" sx={{ 
                backgroundColor: '#2196F3',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.9rem'
              }}>
                {index + 1}
              </Box>
              {question.question}
            </Typography>

            {question.code_snippet && (
              <Paper 
                sx={{ 
                  p: 2, 
                  backgroundColor: '#f8f9fa',
                  fontFamily: 'monospace',
                  mb: 2,
                  borderRadius: 1,
                  border: '1px solid #e9ecef'
                }}
              >
                <Box component="pre" sx={{ 
                  margin: 0, 
                  whiteSpace: 'pre-wrap',
                  color: '#2c3e50'
                }}>
                  {question.code_snippet}
                </Box>
              </Paper>
            )}

            <FormControl component="fieldset" sx={{ width: '100%' }}>
              <RadioGroup
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
              >
                {question.options.map((option, optIndex) => (
                  <FormControlLabel
                    key={optIndex}
                    value={option}
                    control={
                      <Radio 
                        sx={{
                          color: '#2196F3',
                          '&.Mui-checked': {
                            color: '#2196F3',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ 
                        color: '#2c3e50',
                        fontWeight: answers[question.id] === option ? 600 : 400
                      }}>
                        {option}
                      </Typography>
                    }
                    sx={{
                      m: 1,
                      p: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: '#f8f9fa'
                      },
                      ...(answers[question.id] === option && {
                        backgroundColor: '#e3f2fd',
                        '&:hover': {
                          backgroundColor: '#e3f2fd'
                        }
                      })
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {index < questions.length - 1 && (
              <Divider sx={{ 
                my: 3,
                borderColor: 'rgba(0,0,0,0.1)'
              }} />
            )}
          </Box>
        ))}

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 4,
          gap: 2
        }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            sx={{
              borderColor: '#2196F3',
              color: '#2196F3',
              '&:hover': {
                borderColor: '#1976D2',
                backgroundColor: 'rgba(33, 150, 243, 0.04)',
                transform: 'scale(1.02)',
                transition: 'all 0.2s'
              }
            }}
          >
            Back to Home
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)',
                transform: 'scale(1.05)',
                transition: 'all 0.2s'
              },
              '&:disabled': {
                background: '#cccccc',
                boxShadow: 'none'
              }
            }}
          >
            Submit Quiz
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Quiz; 