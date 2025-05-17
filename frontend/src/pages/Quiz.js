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
      const response = await axios.post('http://localhost:8000/api/check_quiz', {
        task_description: task,
        language: language,
        answers: answers
      });

      if (response.data) {
        setScore(response.data.score);
        setWrongAnswers(response.data.wrong_answers || []);
        setShowResults(true);
        setQuizCompleted(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to check quiz answers');
    }
  };

  const handleContinue = () => {
    if (score === 10) {
      navigate('/editor');
    } else {
      navigate('/learning');
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
            <Box sx={{ textAlign: 'center' }}>
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
            <Box sx={{ textAlign: 'center' }}>
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
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          Expert Quiz
        </Typography>

        <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 4 }}>
          Answer all questions to test your understanding
        </Typography>

        {questions.map((question, index) => (
          <Box key={question.id} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {index + 1}. {question.question}
            </Typography>

            {question.code_snippet && (
              <Paper 
                sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.100',
                  fontFamily: 'monospace',
                  mb: 2
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {question.code_snippet}
                </pre>
              </Paper>
            )}

            <FormControl component="fieldset">
              <RadioGroup
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
              >
                {question.options.map((option, optIndex) => (
                  <FormControlLabel
                    key={optIndex}
                    value={option}
                    control={<Radio />}
                    label={option}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {index < questions.length - 1 && (
              <Divider sx={{ my: 3 }} />
            )}
          </Box>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
          >
            Submit Quiz
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Quiz; 