import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  useTheme,
  Divider
} from '@mui/material';
import useCodingStore from '../store/codingStore';
import axios from 'axios';

const Learning = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { taskDescription: task, language } = useCodingStore();
  const [learningContent, setLearningContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!task || !language) {
      navigate('/');
      return;
    }

    const generateLearningContent = async () => {
      try {
        setLoading(true);
        const response = await axios.post('http://localhost:8000/api/generate_learning', {
          task_description: task,
          language: language
        });
        
        if (response.data && response.data.content) {
          setLearningContent(response.data.content);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to generate learning content');
      } finally {
        setLoading(false);
      }
    };

    generateLearningContent();
  }, [task, language, navigate]);

  const handleStartCoding = () => {
    navigate('/editor', { state: { use_boilerplate: true } });
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          Learning Materials
        </Typography>

        <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 4 }}>
          Understanding the concepts for: {task}
        </Typography>

        {learningContent && (
          <Box sx={{ mb: 4 }}>
            {learningContent.sections.map((section, index) => (
              <Box key={index} sx={{ mb: 4 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  {section.title}
                </Typography>
                <Typography variant="body1" paragraph>
                  {section.content}
                </Typography>
                {section.code && (
                  <Paper 
                    sx={{ 
                      p: 2, 
                      backgroundColor: 'grey.100',
                      fontFamily: 'monospace',
                      mb: 2
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {section.code}
                    </pre>
                  </Paper>
                )}
                {index < learningContent.sections.length - 1 && (
                  <Divider sx={{ my: 3 }} />
                )}
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
          <Button
            variant="contained"
            onClick={handleStartCoding}
            sx={{
              backgroundColor: 'success.main',
              '&:hover': {
                backgroundColor: 'success.dark'
              }
            }}
          >
            Start Coding
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Learning; 