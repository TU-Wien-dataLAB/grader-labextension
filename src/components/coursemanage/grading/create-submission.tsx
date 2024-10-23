import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  LinearProgress,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import * as React from 'react';
import { Lecture } from '../../../model/lecture';
import { Assignment } from '../../../model/assignment';
import { Submission } from '../../../model/submission';
import { FilesList } from '../../util/file-list';
import {
  lectureBasePath,
  makeDirs
} from '../../../services/file.service';
import { Link, useOutletContext } from 'react-router-dom';
import { showDialog } from '../../util/dialog-provider';
import Autocomplete from '@mui/material/Autocomplete';
import moment from 'moment';
import { Contents } from '@jupyterlab/services';
import { GlobalObjects } from '../../../index';
import { openBrowser } from '../overview/util';
import {
  createSubmissionFiles
} from '../../../services/submissions.service';
import { enqueueSnackbar } from 'notistack';
import { GraderLoadingButton } from '../../util/loading-button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getLecture, getUsers } from '../../../services/lectures.service';
import { extractIdsFromBreadcrumbs } from '../../util/breadcrumbs';

export const CreateSubmission = () => {
  const { assignment, rows, setRows } = useOutletContext() as {
    lecture: Lecture;
    assignment: Assignment;
    rows: Submission[];
    setRows: React.Dispatch<React.SetStateAction<Submission[]>>;
    manualGradeSubmission: Submission;
    setManualGradeSubmission: React.Dispatch<React.SetStateAction<Submission>>;
  };

  const { lectureId } = extractIdsFromBreadcrumbs();

  const { data: lecture, isLoading: isLoadingLecture } = useQuery<Lecture>({
    queryKey: ['lecture', lectureId],
    queryFn: () => getLecture(lectureId, true),
    enabled: !!lectureId
  });

  const { data: students = [], isLoading: isLoadingStudents } = useQuery<string[]>({
    queryKey: ['students', lectureId],
    queryFn: async () => {
      const users = await getUsers(lectureId);
      return users['students'];
    },
    enabled: !!lectureId, 
  });
  
  const { data: path, refetch: reloadPath } = useQuery({
    queryKey: ['path', lectureBasePath, lecture.code, assignment.id],
    queryFn: () =>
      makeDirs(`${lectureBasePath}${lecture.code}`, [
        'create',
        `${assignment.id}`,
        userDir
      ])
  });

  const [userDir, setUserDir] = React.useState<string | null>(null);
  const submissionsLink = `/lecture/${lecture.id}/assignment/${assignment.id}/submissions`;
  const [srcChangedTimestamp, setSrcChangeTimestamp] = React.useState(
    moment().valueOf()
  ); // now

  const createSubmissionMutation = useMutation({
    mutationFn: async () => {
      return createSubmissionFiles(lecture, assignment, userDir);
    },
    onError: (error: any) => {
      enqueueSnackbar('Error: ' + error.message, { variant: 'error' });
    },
    onSuccess: () => {
      enqueueSnackbar(`Successfully Created Submission for user: ${userDir}`, {
        variant: 'success'
      });
    }
  });

  React.useEffect(() => {
    if (path) {
      openBrowser(path);
      GlobalObjects.docManager.services.contents.fileChanged.connect(
        (sender: Contents.IManager, change: Contents.IChangedArgs) => {
          const { oldValue, newValue } = change;
          if (!newValue.path.includes(path)) {
            return;
          }

          const modified = moment(newValue.last_modified).valueOf();
          if (srcChangedTimestamp === null || srcChangedTimestamp < modified) {
            setSrcChangeTimestamp(modified);
          }
        },
        this
      );
    }
  }, [path]);

 
  if (isLoadingLecture || isLoadingStudents) {
    return (
      <div>
        <Card>
          <LinearProgress />
        </Card>
      </div>
    );
  }


  const createSubmission = async () => {
    createSubmissionMutation.mutate();
  };

  return (
    <Box sx={{ overflow: 'auto' }}>
      <Stack direction={'column'} sx={{ flex: '1 1 100%' }}>
        <Alert severity="info" sx={{ m: 2 }}>
          <AlertTitle>Info</AlertTitle>
          If you want to create a submission for a student manually, make sure
          to follow these steps: <br />
          <br />
          1. &ensp; Choose a student for whom you want to create a
          submission.
          <br />
          2. &ensp; By selecting the student for whom you want to create
          submission, directory 'create/{assignment.id}/student_id' is
          automatically opened in File Browser on your left-hand side.
          <br />
          3. &ensp; Upload the desired files here. They will automatically
          appear in the Submission Files below.
          <br />
          4. &ensp; Push the submission.
        </Alert>
        <Typography sx={{ m: 2, mb: 0 }}>Select a student</Typography>
        <Autocomplete
          options={students}
          autoHighlight
          onChange={(event: any, newUserDir: string | null) => {
            setUserDir(newUserDir);
            reloadPath();
          }}
          sx={{ m: 2 }}
          renderInput={params => (
            <TextField
              {...params}
              label="Select Student"
              inputProps={{
                ...params.inputProps
              }}
            />
          )}
        />
        <Typography sx={{ ml: 2 }}>Submission Files</Typography>
        <FilesList
          path={path}
          sx={{ m: 2 }}
          lecture={lecture}
          assignment={assignment}
          checkboxes={false}
        />
        <Stack direction={'row'} sx={{ ml: 2 }} spacing={2}>
          <GraderLoadingButton
            variant="outlined"
            color="success"
            sx={{ ml: 2 }}
            onClick={async () => {
              showDialog(
                'Manual Submission',
                'Do you want to push new submission?',
                async () => {
                  await createSubmission();
                }
              );
            }}
          >
            Push Submission
          </GraderLoadingButton>
        </Stack>
        <Stack sx={{ ml: 2, mt: 3, mb: 5 }} direction={'row'}>
          <Button
            variant="outlined"
            component={Link as any}
            to={submissionsLink}
          >
            Back
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};
