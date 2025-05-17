import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  useTheme,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Chip
} from '@mui/material';
// Import icons directly to avoid forwarded refs
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useCodingStore from '../store/codingStore';
import axios from 'axios';

// Simple component to render icons safely
const SafeIcon = ({ iconType }) => {
  switch (iconType) {
    case 'error':
      return <span className="material-icons" style={{ color: '#f44336', marginRight: '8px' }}>error_outline</span>;
    case 'school':
      return <span className="material-icons" style={{ color: '#2196F3', marginRight: '8px' }}>school</span>;
    case 'code':
      return <span className="material-icons" style={{ color: '#FF9800', marginRight: '8px' }}>code</span>;
    case 'expand_more':
      return <span className="material-icons">expand_more</span>;
    default:
      return null;
  }
};

const Learning = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { taskDescription: storeTask, language: storeLanguage } = useCodingStore();
  
  // Component state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [learningData, setLearningData] = useState({
    sections: [],
    wrongAnswers: [],
    conceptKeywords: []
  });
  
  // Get data from location state (passed from Quiz)
  const wrongAnswers = location.state?.wrongAnswers || [];
  const score = location.state?.score || 0;
  const totalQuestions = location.state?.totalQuestions || 0;
  const taskDescription = location.state?.taskDescription || storeTask;
  const language = location.state?.language || storeLanguage;

  useEffect(() => {
    // Redirect to home if no task description or language
    if (!taskDescription || !language) {
      navigate('/');
      return;
    }

    const fetchLearningContent = async () => {
      try {
        setLoading(true);
        
        // Format wrong answers for API
        const wrongAnswerData = wrongAnswers.map(item => ({
          question: item.question,
          user_answer: item.user_answer,
          correct_answer: item.correct_answer,
          code_snippet: item.code_snippet || ""
        }));
        
        console.log("Sending request to generate learning content:", {
          task_description: taskDescription,
          language,
          wrong_answers: wrongAnswerData
        });
        
        const response = await axios.post('http://localhost:8000/api/generate_learning', {
          task_description: taskDescription,
          language,
          wrong_answers: wrongAnswerData
        });
        
        console.log("Received learning content response:", response.data);
        
        if (response.data && response.data.content) {
          const content = response.data.content;
          
          // Process and store the data
          setLearningData({
            sections: Array.isArray(content.sections) ? content.sections : [],
            wrongAnswers: Array.isArray(content.wrong_answers) ? content.wrong_answers : [],
            conceptKeywords: Array.isArray(content.concept_keywords) ? content.concept_keywords : []
          });
        } else {
          throw new Error("Invalid response format from server");
        }
      } catch (err) {
        console.error("Error fetching learning content:", err);
        setError(err.response?.data?.detail || err.message || "Failed to load learning content");
      } finally {
        setLoading(false);
      }
    };

    fetchLearningContent();
  }, [taskDescription, language, wrongAnswers, navigate]);

  const handleStartCoding = () => {
    navigate('/editor', {
      state: {
        perfectScore: false,
        fromLearning: true,
        concept_keywords: learningData.conceptKeywords
      }
    });
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6">
          Generating personalized learning content...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" onClick={() => navigate('/')}>
              Go Back
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper 
        elevation={3}
        sx={{ 
          mb: 4, 
          p: 3,
          background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Personalized Learning
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1 }}>
              Score: {score}/{totalQuestions} ({((score/totalQuestions) * 100).toFixed(1)}%)
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#FF9800',
              '&:hover': {
                backgroundColor: 'white'
              }
            }}
          >
            Back to Home
          </Button>
        </Box>
      </Paper>

      {/* Wrong Answers Review */}
      {wrongAnswers.length > 0 && (
        <Paper elevation={2} sx={{ mb: 4, p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SafeIcon iconType="error" />
            <Typography variant="h5" sx={{ color: theme.palette.error.main }}>
              Questions to Review
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {wrongAnswers.map((wrongAnswer, index) => {
            // Find matching explanation if available
            const explanation = learningData.wrongAnswers[index];
            
            return (
              <Accordion 
                key={index}
                sx={{ 
                  mb: 2,
                  '&:before': { display: 'none' },
                  borderRadius: '4px !important',
                  overflow: 'hidden'
                }}
              >
                <AccordionSummary
                  expandIcon={<SafeIcon iconType="expand_more" />}
                  sx={{ 
                    backgroundColor: 'rgba(244, 67, 54, 0.05)',
                    borderLeft: '4px solid #f44336'
                  }}
                >
                  <Typography sx={{ fontWeight: 500 }}>
                    Question {index + 1}: {String(wrongAnswer.question || "")}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                  {wrongAnswer.code_snippet && (
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
                      {String(wrongAnswer.code_snippet)}
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    <Typography>
                      <Box component="span" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                        Your answer:
                      </Box>
                      {" " + String(wrongAnswer.user_answer || "")}
                    </Typography>
                    <Typography>
                      <Box component="span" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                        Correct answer:
                      </Box>
                      {" " + String(wrongAnswer.correct_answer || "")}
                    </Typography>
                  </Box>
                  
                  {/* Explanation section */}
                  {explanation && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Explanation
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {String(explanation.explanation || "No explanation available.")}
                      </Typography>
                      
                      {explanation.visual_explanation && 
                       explanation.visual_explanation.type !== "none" && 
                       explanation.visual_explanation.content && (
                        <Box sx={{ 
                          mt: 2, 
                          p: 2, 
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: 1
                        }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Visual Explanation:
                          </Typography>
                          <Box component="pre" sx={{ 
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace'
                          }}>
                            {String(explanation.visual_explanation.content)}
                          </Box>
                        </Box>
                      )}
                      
                      {/* Concept keywords */}
                      {explanation.concept_keywords && explanation.concept_keywords.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Related Concepts:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {explanation.concept_keywords.map((keyword, idx) => (
                              <Chip 
                                key={idx} 
                                label={String(keyword)} 
                                size="small"
                                color="info"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Paper>
      )}

      {/* Learning Content */}
      {learningData.sections.length > 0 && (
        <Paper elevation={2} sx={{ mb: 4, p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SafeIcon iconType="school" />
            <Typography variant="h5" sx={{ color: theme.palette.primary.main }}>
              Learning Content
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {learningData.sections.map((section, index) => (
            <Accordion 
              key={index}
              defaultExpanded={index === 0}
              sx={{ 
                mb: 2,
                '&:before': { display: 'none' },
                borderRadius: '4px !important',
                overflow: 'hidden'
              }}
            >
              <AccordionSummary
                expandIcon={<SafeIcon iconType="expand_more" />}
                sx={{ 
                  backgroundColor: 'rgba(33, 150, 243, 0.05)',
                  borderLeft: '4px solid #2196F3'
                }}
              >
                <Typography sx={{ fontWeight: 500 }}>
                  {String(section.title || `Section ${index + 1}`)}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {String(section.content || "No content available.")}
                </Typography>
                
                {section.code && (
                  <Box 
                    component="pre" 
                    sx={{ 
                      p: 2, 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: 1,
                      overflowX: 'auto',
                      fontSize: '0.9rem'
                    }}
                  >
                    {String(section.code)}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}

      {/* Concept Keywords Summary */}
      {learningData.conceptKeywords.length > 0 && (
        <Card sx={{ mb: 4, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SafeIcon iconType="code" />
              <Typography variant="h6" sx={{ color: theme.palette.warning.main }}>
                Concepts to Focus On
              </Typography>
            </Box>
            <Typography variant="body1">
              When you start coding, you'll need to implement these concepts yourself:
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              mt: 2
            }}>
              {learningData.conceptKeywords.map((keyword, index) => (
                <Chip
                  key={index}
                  label={String(keyword)}
                  color="warning"
                  variant="outlined"
                  sx={{ 
                    borderRadius: '16px',
                    fontWeight: 500
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Start Coding Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleStartCoding}
          sx={{
            py: 1.5,
            px: 4,
            fontSize: '1.1rem',
            background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
            boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #43A047 30%, #4CAF50 90%)',
              transform: 'scale(1.05)',
              transition: 'all 0.2s'
            }
          }}
        >
          <span className="material-icons" style={{ marginRight: '8px' }}>code</span>
          Start Coding
        </Button>
      </Box>
    </Container>
  );
};

export default Learning; 