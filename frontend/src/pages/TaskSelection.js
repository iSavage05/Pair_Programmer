import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from '@mui/material';
import useCodingStore from '../store/codingStore';

const TaskSelection = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { setTaskDescription, setDifficultyLevel, setLanguage } = useCodingStore();
  const [task, setTask] = useState('');
  const [familiarity, setFamiliarity] = useState('newbie');
  const [language, setLocalLanguage] = useState('python');

  const handleSubmit = (e) => {
    e.preventDefault();
    setTaskDescription(task);
    setDifficultyLevel(familiarity);
    setLanguage(language);
    
    // Navigate based on familiarity level
    if (familiarity === 'expert') {
      navigate('/quiz');
    } else {
      navigate('/editor');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 2,
          background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)'
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            color: 'primary.main',
            fontWeight: 'bold',
            mb: 4
          }}
        >
          Code Learning Platform
        </Typography>

        <Typography 
          variant="h6" 
          gutterBottom 
          align="center"
          sx={{ 
            color: 'text.secondary',
            mb: 4
          }}
        >
          Enter your coding task and preferences to get started
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Task Description"
            multiline
            rows={4}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            required
            sx={{ mb: 3 }}
            InputProps={{
              sx: {
                borderRadius: 2,
                backgroundColor: 'white'
              }
            }}
          />

          <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Familiarity Level</InputLabel>
              <Select
                value={familiarity}
                label="Familiarity Level"
                onChange={(e) => setFamiliarity(e.target.value)}
                required
                sx={{ 
                  borderRadius: 2,
                  backgroundColor: 'white'
                }}
              >
                <MenuItem value="newbie">Newbie</MenuItem>
                <MenuItem value="expert">Expert</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Programming Language</InputLabel>
              <Select
                value={language}
                label="Programming Language"
                onChange={(e) => setLocalLanguage(e.target.value)}
                required
                sx={{ 
                  borderRadius: 2,
                  backgroundColor: 'white'
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
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontSize: '1.1rem',
              textTransform: 'none',
              boxShadow: 3,
              '&:hover': {
                boxShadow: 6
              }
            }}
          >
            {familiarity === 'expert' ? 'Take Quiz' : 'Start Coding'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TaskSelection; 