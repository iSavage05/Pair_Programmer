import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper, CircularProgress, Select, MenuItem, FormControl, InputLabel, Divider, useTheme } from '@mui/material';
import useCodingStore from '../store/codingStore';
import axios from 'axios';
import Editor from '@monaco-editor/react';

const CodeEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { taskDescription: task, difficultyLevel: difficulty, language, currentCode: code, setCurrentCode: setCode, setOutput, resetState } = useCodingStore();
  const [localCode, setLocalCode] = useState('');
  const [output, setLocalOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(false);

  // Reset state when component mounts
  useEffect(() => {
    if (!task || !difficulty || !language) {
      navigate('/');
      return;
    }

    const generateScaffolding = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.post('http://localhost:8000/api/generate_scaffolding', {
          task_description: task,
          difficulty_level: difficulty,
          language: language,
          use_boilerplate: location.state?.use_boilerplate || false
        });
        
        if (response.data && response.data.scaffolding) {
          // Ensure the code is a string
          const code = String(response.data.scaffolding);
          setLocalCode(code);
          setCode(code);
          
          // Store additional information if available
          if (response.data.hints) {
            console.log('Hints:', response.data.hints);
          }
          if (response.data.dependencies) {
            console.log('Dependencies:', response.data.dependencies);
          }
          if (response.data.setup_instructions) {
            console.log('Setup Instructions:', response.data.setup_instructions);
          }
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate code scaffolding';
        setError(errorMessage);
        console.error('Error generating scaffolding:', err);
      } finally {
        setLoading(false);
      }
    };

    generateScaffolding();
  }, [task, difficulty, language, navigate, setCode, location.state]);

  const handleRunCode = async () => {
    try {
      setExecuting(true);
      setLocalOutput('');
      setError(null);
      
      const response = await axios.post('http://localhost:8000/api/run_code', {
        code: localCode,
        language: language
      });
      
      if (response.data && response.data.output !== undefined) {
        setLocalOutput(response.data.output);
        setOutput(response.data.output);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to execute code';
      setLocalOutput(errorMessage);
      setError(errorMessage);
      console.error('Error running code:', err);
    } finally {
      setExecuting(false);
    }
  };

  const handleBack = () => {
    resetState();
    navigate('/');
  };

  const handleEditorChange = (value) => {
    setLocalCode(value);
    setCode(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        color: 'white',
        p: 3,
        borderRadius: 2,
        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
      }}>
        <Typography variant="h4" component="h1" sx={{ 
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
        }}>
          Code Editor
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleBack}
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: '#2196F3',
            '&:hover': {
              backgroundColor: 'white',
              transform: 'scale(1.05)',
              transition: 'all 0.2s'
            }
          }}
        >
          Back to Home
        </Button>
      </Box>

      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2, 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        background: 'linear-gradient(to right, #ffffff, #f8f9fa)'
      }}>
        <Typography variant="h6" gutterBottom sx={{ 
          color: '#2196F3', 
          fontWeight: 'bold',
          borderBottom: '2px solid #2196F3',
          pb: 1
        }}>
          Task Description
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, color: '#2c3e50' }}>
          {task || 'No task selected'}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
          p: 2,
          borderRadius: 1
        }}>
          <Typography variant="subtitle1" sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
            Difficulty:
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              backgroundColor: '#2196F3',
              color: 'white',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(33,150,243,0.3)'
            }}
          >
            {difficulty || 'Not specified'}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={language}
            label="Language"
            onChange={(e) => {
              setLocalCode('');
              setCode('');
              setLocalOutput('');
              setOutput('');
              useCodingStore.getState().setLanguage(e.target.value);
            }}
            sx={{ 
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&:hover': {
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }
            }}
          >
            <MenuItem value="python">Python</MenuItem>
            <MenuItem value="javascript">JavaScript</MenuItem>
            <MenuItem value="java">Java</MenuItem>
            <MenuItem value="cpp">C++</MenuItem>
            <MenuItem value="csharp">C#</MenuItem>
            <MenuItem value="go">Go</MenuItem>
            <MenuItem value="rust">Rust</MenuItem>
            <MenuItem value="php">PHP</MenuItem>
            <MenuItem value="ruby">Ruby</MenuItem>
            <MenuItem value="swift">Swift</MenuItem>
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          onClick={handleRunCode} 
          disabled={executing}
          sx={{ 
            px: 4,
            background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
            boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #45a049 30%, #4CAF50 90%)',
              transform: 'scale(1.05)',
              transition: 'all 0.2s'
            },
            '&:disabled': {
              background: '#cccccc',
              boxShadow: 'none'
            }
          }}
        >
          {executing ? 'Running...' : 'Run Code'}
        </Button>
      </Box>

      <Paper sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 2, 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        height: '500px',
        overflow: 'hidden'
      }}>
        <Editor
          height="100%"
          defaultLanguage={language}
          value={localCode}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            roundedSelection: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: true,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10
            }
          }}
        />
      </Paper>

      {output && (
        <Paper sx={{ 
          p: 3, 
          borderRadius: 2, 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          background: 'linear-gradient(to right, #ffffff, #f8f9fa)'
        }}>
          <Typography variant="h6" gutterBottom sx={{ 
            color: '#2196F3', 
            fontWeight: 'bold',
            borderBottom: '2px solid #2196F3',
            pb: 1
          }}>
            Output
          </Typography>
          <Box 
            component="pre" 
            sx={{ 
              margin: 0, 
              whiteSpace: 'pre-wrap',
              backgroundColor: '#f8f9fa',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              border: '1px solid #e9ecef',
              color: '#2c3e50'
            }}
          >
            {output}
          </Box>
        </Paper>
      )}

      {error && (
        <Paper sx={{ 
          p: 3, 
          mt: 3, 
          borderRadius: 2, 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          background: 'linear-gradient(to right, #ffebee, #ffcdd2)',
          border: '1px solid #ef9a9a'
        }}>
          <Typography color="error" component="div" sx={{ 
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}>
            Error
          </Typography>
          <Typography color="error" component="div" sx={{ 
            mt: 1,
            color: '#d32f2f'
          }}>
            {error}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default CodeEditor; 