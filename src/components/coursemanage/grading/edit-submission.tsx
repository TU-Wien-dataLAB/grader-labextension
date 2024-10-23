import { SectionTitle } from '../../util/section-title';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import * as React from 'react';
import { Lecture } from '../../../model/lecture';
import { Assignment } from '../../../model/assignment';
import { Submission } from '../../../model/submission';
import {
  createOrOverrideEditRepository,
  getLogs,
  getSubmission,
  pullSubmissionFiles,
  pushSubmissionFiles
} from '../../../services/submissions.service';
import { FilesList } from '../../util/file-list';
import { enqueueSnackbar } from 'notistack';
import { openBrowser } from '../overview/util';
import { getFiles, lectureBasePath } from '../../../services/file.service';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Toolbar from '@mui/material/Toolbar';
import { showDialog } from '../../util/dialog-provider';
import { GraderLoadingButton } from '../../util/loading-button';
import { useQuery } from '@tanstack/react-query';

export const EditSubmission = () => {
  const navigate = useNavigate();

  const { lecture, assignment, manualGradeSubmission } = useOutletContext() as {
    lecture: Lecture;
    assignment: Assignment;
    manualGradeSubmission: Submission;
  };

  const path = `${lectureBasePath}${lecture.code}/edit/${assignment.id}/${manualGradeSubmission.id}`;

  const { data: submission, refetch: refetchSubmission } = useQuery({
    queryKey: [
      'submission',
      lecture.id,
      assignment.id,
      manualGradeSubmission.id
    ],
    queryFn: () =>
      getSubmission(lecture.id, assignment.id, manualGradeSubmission.id, true)
  });

  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ['logs', lecture.id, assignment.id, manualGradeSubmission.id],
    queryFn: () => getLogs(lecture.id, assignment.id, manualGradeSubmission.id)
  });

  const { data: submissionFiles, refetch: refetchSubmissionFiles } = useQuery({
    queryKey: ['submissionFiles'],
    queryFn: () => getFiles(path)
  });

  const [showLogs, setShowLogs] = React.useState(false);

  const reloadSubmission = async () => {
    await refetchSubmission();
  };

  const openLogs = async () => {
    setShowLogs(true);
    await refetchLogs();
  };

  const pushEditedFiles = async () => {
    await pushSubmissionFiles(lecture, assignment, submission).then(
      response => {
        enqueueSnackbar('Successfully Pushed Edited Submission', {
          variant: 'success'
        });
      },
      err => {
        enqueueSnackbar(err.message, {
          variant: 'error'
        });
      }
    );
  };

  const handlePullEditedSubmission = async () => {
    await pullSubmissionFiles(lecture, assignment, submission).then(
      response => {
        openBrowser(path);
        enqueueSnackbar('Successfully Pulled Submission', {
          variant: 'success'
        });
        refetchSubmissionFiles();
      },
      err => {
        enqueueSnackbar(err.message, {
          variant: 'error'
        });
      }
    );
  };

  const setEditRepository = async () => {
    await createOrOverrideEditRepository(
      lecture.id,
      assignment.id,
      submission.id
    ).then(
      response => {
        enqueueSnackbar('Successfully Created Edit Repository', {
          variant: 'success'
        });
        reloadSubmission();
      },
      err => {
        enqueueSnackbar(err.message, {
          variant: 'error'
        });
      }
    );
  };

  return (
    <Stack direction={'column'} sx={{ flex: '1 1 100%' }}>
      <Box sx={{ m: 2, mt: 5 }}>
        <Stack direction="row" spacing={2} sx={{ ml: 2 }}>
          <Stack sx={{ mt: 0.5 }}>
            <Typography
              textAlign="right"
              color="text.secondary"
              sx={{ fontSize: 12, height: 35 }}
            >
              Username
            </Typography>
            <Typography
              textAlign="right"
              color="text.secondary"
              sx={{ fontSize: 12, height: 35 }}
            >
              Assignment
            </Typography>
          </Stack>
          <Stack>
            <Typography
              color="text.primary"
              sx={{ display: 'inline-block', fontSize: 16, height: 35 }}
            >
              {submission?.username}
            </Typography>

            <Typography
              color="text.primary"
              sx={{ display: 'inline-block', fontSize: 16, height: 35 }}
            >
              {assignment.name}
            </Typography>
          </Stack>
        </Stack>
      </Box>
      <Stack direction={'row'} justifyContent="space-between">
        <Typography sx={{ m: 2, mb: 0 }}>Submission Files</Typography>
        <Button
          sx={{ mr: 2 }}
          variant="outlined"
          size="small"
          onClick={openLogs}
        >
          Show Logs
        </Button>
      </Stack>

      <FilesList
        path={path}
        sx={{ m: 2 }}
        lecture={lecture}
        assignment={assignment}
        checkboxes={false}
      />

      <Stack direction={'row'} sx={{ ml: 2 }} spacing={2}>
        <GraderLoadingButton
          color={submission?.edited ? 'error' : 'primary'}
          variant="outlined"
          onClick={async () => {
            await setEditRepository();
          }}
        >
          {submission?.edited ? 'Reset ' : 'Create '}
          Edit Repository
        </GraderLoadingButton>

        <GraderLoadingButton
          color="primary"
          variant="outlined"
          disabled={!submission?.edited}
          onClick={async () => {
            await handlePullEditedSubmission();
          }}
        >
          Pull Submission
        </GraderLoadingButton>

        <GraderLoadingButton
          variant="outlined"
          color="success"
          disabled={!submission?.edited}
          sx={{ ml: 2 }}
          onClick={async () => {
            showDialog(
              'Edit Submission',
              'Do you want to push your submission changes?',
              async () => {
                await pushEditedFiles();
              }
            );
          }}
        >
          Push Edited Submission
        </GraderLoadingButton>
      </Stack>
      <Box sx={{ flex: '1 1 100%' }}></Box>
      <Toolbar>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
      </Toolbar>
      <Dialog
        open={showLogs}
        onClose={() => setShowLogs(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{'Logs'}</DialogTitle>
        <DialogContent>
          <Typography
            id="alert-dialog-description"
            sx={{ fontSize: 10, fontFamily: "'Roboto Mono', monospace" }}
          >
            {logs || 'No logs available'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogs(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
