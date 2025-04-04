import { Box, Button, IconButton, InputLabel, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { AddCircleOutline, DeleteOutline, HelpOutlineOutlined as HelpIcon } from '@mui/icons-material';
import { red } from "@mui/material/colors";
import React, { useState } from "react";

export const AllowedFilePatterns = ({ patterns, onChange }) => {
    const [newPattern, setNewPattern] = useState('');
  
    const handleAddPattern = () => {
      if (newPattern.trim() && !patterns.includes(newPattern)) {
        onChange([...patterns, newPattern]);
        setNewPattern('');
      }
    };
  
    const handleRemovePattern = (patternToRemove) => {
      onChange(patterns.filter((pattern) => pattern !== patternToRemove));
    };
  
    return (
      <Box>
        <InputLabel>
          Whitelist File Patterns
          <Tooltip title=" Add patterns to allow additional submissions files. Specify allowed file patterns (e.g., submission.py, *.txt, output_dir/*.pdf) using glob patterns.">
            <HelpIcon fontSize="small" sx={{ ml: 1.5, mt: 1 }} />
          </Tooltip>
        </InputLabel>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {patterns.length > 0 ? (
            patterns.map((pattern, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #ccc',
                  borderRadius: 2,
                  padding: 1,
                }}
              >
                <Typography>{pattern}</Typography>
                <IconButton
                  color="error"
                  onClick={() => handleRemovePattern(pattern)}
                >
                  <DeleteOutline />
                </IconButton>
              </Box>
            ))
          ) : (
            <Typography sx={{ color: red[500] }}>
              No file patterns specified. Only files from the student version will be included in submissions.
            </Typography>
          )}
          <Stack direction="row" spacing={2}>
            <TextField
              variant="outlined"
              fullWidth
              placeholder="Enter file pattern (e.g., *.py)"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircleOutline />}
              onClick={handleAddPattern}
              disabled={!newPattern.trim()}
            >
              Add
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  };