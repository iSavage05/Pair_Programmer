import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import useCodingStore from '../store/codingStore';
import axios from 'axios';
import Editor from '@monaco-editor/react';

const CodeEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const editorRef = useRef(null);
  const { taskDescription: storeTask, difficultyLevel: difficulty, language: storeLanguage, currentCode: code, setCurrentCode: setCode, setOutput, resetState } = useCodingStore();
  const [localCode, setLocalCode] = useState('');
  const [output, setLocalOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [hints, setHints] = useState([]);
  const [expandedHint, setExpandedHint] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Get the scenario from location state
  const isPerfectScore = location.state?.perfectScore || false;
  const isFromLearning = location.state?.fromLearning || false;
  const useBoilerplate = location.state?.use_boilerplate || false;
  
  // Get task description and language from location state if available
  const task = location.state?.taskDescription || storeTask;
  const language = location.state?.language || storeLanguage;

  // Handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!task || !difficulty || !language) {
      navigate('/');
      return;
    }

    const generateScaffolding = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine if we should use boilerplate code
        let shouldUseBoilerplate = false;
        if (difficulty === 'newbie' || isFromLearning) {
          shouldUseBoilerplate = true;
        } else if (difficulty === 'expert' && !isPerfectScore) {
          shouldUseBoilerplate = true;
        }

        const response = await axios.post('http://localhost:8000/api/generate_scaffolding', {
          task_description: task,
          difficulty_level: difficulty,
          language: language,
          use_boilerplate: shouldUseBoilerplate
        });
        
        if (response.data) {
          // Handle scaffolding
          let code = response.data.scaffolding;
          if (typeof code !== 'string') {
            if (Array.isArray(code)) {
              code = code.join('\n');
            } else if (typeof code === 'object') {
              code = JSON.stringify(code, null, 2);
            } else {
              code = String(code);
            }
          }
          code = code.trim();
          setLocalCode(code);
          setCode(code);
          
          // Handle hints - always show hints for newbie mode
          if (difficulty === 'newbie' && response.data.hints) {
            const hintsArray = Array.isArray(response.data.hints) ? response.data.hints : [];
            const formattedHints = hintsArray.map((hint, index) => ({
              id: index + 1,
              content: typeof hint === 'string' ? hint : String(hint),
              expanded: false
            }));
            setHints(formattedHints);
          } else {
            setHints([]);
          }
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error generating scaffolding:', err);
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate code scaffolding';
        setError(errorMessage);
        
        // Set default code template
        const defaultCode = getDefaultCodeTemplate(language);
        setLocalCode(defaultCode);
        setCode(defaultCode);
        setHints([]);
      } finally {
        setLoading(false);
      }
    };

    generateScaffolding();
  }, [task, difficulty, language, navigate, setCode, isPerfectScore, isFromLearning]);

  const handleHintClick = (hintId) => {
    setExpandedHint(expandedHint === hintId ? null : hintId);
  };

  // Helper function to get default code template
  const getDefaultCodeTemplate = (lang) => {
    const templates = {
      python: '# Write your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()',
      javascript: '// Write your JavaScript code here\n\nfunction main() {\n    // Your code here\n}\n\nmain();',
      java: '// Write your Java code here\n\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
      cpp: '// Write your C++ code here\n\n#include <iostream>\n\nint main() {\n    // Your code here\n    return 0;\n}',
      csharp: '// Write your C# code here\n\nusing System;\n\nclass Program {\n    static void Main(string[] args) {\n        // Your code here\n    }\n}',
      go: '// Write your Go code here\n\npackage main\n\nfunc main() {\n    // Your code here\n}',
      rust: '// Write your Rust code here\n\nfn main() {\n    // Your code here\n}',
      php: '<?php\n// Write your PHP code here\n\nfunction main() {\n    // Your code here\n}\n\nmain();\n?>',
      ruby: '# Write your Ruby code here\n\ndef main\n    # Your code here\nend\n\nmain',
      swift: '// Write your Swift code here\n\nimport Foundation\n\nfunc main() {\n    // Your code here\n}\n\nmain()'
    };
    return templates[lang] || '// Write your code here';
  };

  const handleRunCode = async () => {
    try {
      setExecuting(true);
      setLocalOutput('');
      setError(null);
      
      // Ensure code is a string before sending
      const codeToRun = typeof localCode === 'string' ? localCode : String(localCode);
      
      const response = await axios.post('http://localhost:8000/api/run_code', {
        code: codeToRun,
        language: language
      });
      
      if (response.data && response.data.output !== undefined) {
        const output = String(response.data.output);
        setLocalOutput(output);
        setOutput(output);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error running code:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to execute code';
      setLocalOutput(errorMessage);
      setError(errorMessage);
    } finally {
      setExecuting(false);
    }
  };

  const handleAnalyzeCode = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      
      // Ensure code is a string before sending
      const codeToAnalyze = typeof localCode === 'string' ? localCode : String(localCode);
      
      const response = await axios.post('http://localhost:8000/api/analyze_code', {
        code: codeToAnalyze,
        language: language,
        task_description: task
      });
      
      if (response.data && response.data.analysis) {
        // Store analysis result, ensuring it's a string
        const result = response.data.analysis;
        const sanitizedResult = typeof result === 'string' 
          ? result 
          : typeof result === 'object' 
            ? JSON.stringify(result) 
            : String(result);
            
        setAnalysisResult(sanitizedResult);
        setShowAnalysisDialog(true);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error analyzing code:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to analyze code';
      setError(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBack = () => {
    resetState();
    navigate('/');
  };

  const handleEditorChange = (value) => {
    if (value !== undefined) {
      setLocalCode(value);
      setCode(value);
    }
  };

  // Add dialog to display analysis results
  const AnalysisDialog = () => {
    return (
      <Dialog
        open={showAnalysisDialog}
        onClose={() => setShowAnalysisDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white',
          fontWeight: 'bold'
        }}>
          Code Analysis Results
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box 
            sx={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'inherit',
              '& ul': { pl: 3 },
              '& li': { mb: 1 },
            }}
            dangerouslySetInnerHTML={{ 
              __html: analysisResult 
                ? analysisResult.replace(/\n/g, '<br/>').replace(/• /g, '• ') 
                : 'No analysis available'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowAnalysisDialog(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white'
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
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
        <Button 
          variant="contained" 
          onClick={handleAnalyzeCode} 
          disabled={analyzing || !localCode}
          sx={{ 
            px: 4,
            background: 'linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)',
            boxShadow: '0 3px 5px 2px rgba(103, 58, 183, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #5E35B1 30%, #8E24AA 90%)',
              transform: 'scale(1.05)',
              transition: 'all 0.2s'
            },
            '&:disabled': {
              background: '#cccccc',
              boxShadow: 'none'
            }
          }}
        >
          {analyzing ? 'Analyzing...' : 'Analyze Code'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ flex: 1 }}>
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
              onMount={handleEditorDidMount}
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
        </Box>

        {difficulty === 'newbie' && hints.length > 0 && (
          <Box sx={{ width: '300px' }}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2, 
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              height: '100%',
              position: 'sticky',
              top: '20px'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                mb: 2
              }}>
                <Box component="span" sx={{ color: '#2196F3' }}>
                  <LightbulbIcon />
                </Box>
                <Typography variant="h6" sx={{ 
                  color: '#2196F3',
                  fontWeight: 'bold'
                }}>
                  Hints
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {hints.map((hint) => (
                <Accordion 
                  key={hint.id}
                  expanded={expandedHint === hint.id}
                  onChange={() => handleHintClick(hint.id)}
                  sx={{
                    mb: 1,
                    '&:before': { display: 'none' },
                    boxShadow: 'none',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px !important',
                    '&.Mui-expanded': {
                      margin: '0 0 8px 0',
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <Box component="span">
                        <ExpandMoreIcon />
                      </Box>
                    }
                    sx={{
                      minHeight: '48px',
                      '&.Mui-expanded': {
                        minHeight: '48px'
                      }
                    }}
                  >
                    <Typography sx={{ fontWeight: 500 }}>
                      Hint {hint.id}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      {hint.content}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          </Box>
        )}
      </Box>

      {/* Analysis Dialog */}
      <AnalysisDialog />
    </Container>
  );
};

export default CodeEditor; 