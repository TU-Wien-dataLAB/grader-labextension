import { Lecture } from '../../../model/lecture';
import { Assignment } from '../../../model/assignment';
import { Submission } from '../../../model/submission';
import { Box, Card, IconButton, LinearProgress, Tooltip } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { SectionTitle } from '../../util/section-title';
import ReplayIcon from '@mui/icons-material/Replay';
import * as React from 'react';
import { getAllSubmissions } from '../../../services/submissions.service';
import { SubmissionTimeSeries } from './submission-timeseries';
import { GradingProgress } from './grading-progress';
import { StudentSubmissions } from './student-submissions';
import { ScoreDistribution } from './score-distribution';
import { getLecture, getUsers } from '../../../services/lectures.service';
import { GradeBook } from '../../../services/gradebook';
import { AssignmentScore } from './assignment-score';
import { getAssignment, getAssignmentProperties } from '../../../services/assignments.service';
import { extractIdsFromBreadcrumbs } from '../../util/breadcrumbs';
import { useQuery } from '@tanstack/react-query';

export const filterUserSubmissions = (
  submissions: Submission[],
  users: string[]
): Submission[] => {
  return submissions.filter((v, i, a) => !users.includes(v.username));
};

export interface IStatsSubComponentProps {
  lecture: Lecture;
  assignment: Assignment;
  allSubmissions: Submission[];
  latestSubmissions: Submission[];
  users: { students: string[]; tutors: string[]; instructors: string[] };
}

export const StatsComponent = () => {
  const { lectureId, assignmentId } = extractIdsFromBreadcrumbs();

  const { data: lecture, isLoading: isLoadingLecture } = useQuery({
    queryKey: ['lecture', lectureId],
    queryFn: () => getLecture(lectureId), 
    enabled: !!lectureId, 
  });

  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => getAssignment(lectureId, assignmentId), 
    enabled: !!lectureId && !!assignmentId, 
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', lectureId],
    queryFn: () => getUsers(lectureId),
    enabled: !!lectureId, 
  });

  const { data: allSubmissions = [], isLoading: isLoadingAllSubmissions } = useQuery({
    queryKey: ['allSubmissions', lectureId, assignmentId],
    queryFn: () => getAllSubmissions(lectureId, assignmentId, 'none', true),
    enabled: !!lectureId && !!assignmentId, 
  });

  const { data: latestSubmissions = [], isLoading: isLoadingLatestSubmissions } = useQuery({
    queryKey: ['latestSubmissions', lectureId, assignmentId],
    queryFn: () => getAllSubmissions(lectureId, assignmentId, 'latest', true),
    enabled: !!lectureId && !!assignmentId, 
  });

  const [allSubmissionsState, setAllSubmissionsState] = React.useState([]);
  const [latestSubmissionsState, setLatestSubmissionsState] = React.useState([]);
  const [gb, setGb] = React.useState(null);
  const [usersState, setUsersState] = React.useState({ students: [], tutors: [], instructors: [] });

  const updateSubmissions = async () => {
    const newAllSubmissions = await getAllSubmissions(lectureId, assignmentId, 'none', true);
    const newLatestSubmissions = await getAllSubmissions(lectureId, assignmentId, 'latest', true);
    const newUsers = await getUsers(lectureId);
    const newGb = new GradeBook(await getAssignmentProperties(lectureId, assignmentId));

    setAllSubmissionsState(newAllSubmissions);
    setLatestSubmissionsState(newLatestSubmissions);
    setUsersState(newUsers);
    setGb(newGb);
  };

  React.useEffect(() => {
    if (allSubmissions.length > 0) {
      setAllSubmissionsState(allSubmissions);
    }
  }, [allSubmissions]);

  React.useEffect(() => {
    if (latestSubmissions.length > 0) {
      setLatestSubmissionsState(latestSubmissions);
    }
  }, [latestSubmissions]);

  React.useEffect(() => {
    if (Object.keys(usersData).length > 0) {
      setUsersState(usersData);
    }
  }, [usersData]);

  React.useEffect(() => {
    if (lecture && assignment) {
      getAssignmentProperties(lecture.id, assignment.id).then(properties => {
        setGb(new GradeBook(properties));
      });
    }
  }, [lecture, assignment]);

  if (isLoadingLecture || isLoadingAssignment || isLoadingUsers || isLoadingAllSubmissions || isLoadingLatestSubmissions) {   
    return (
      <div>
        <Card>
          <LinearProgress />
        </Card>
      </div>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <SectionTitle title={`${assignment.name} Stats`}>
        <Box sx={{ ml: 2 }} display="inline-block">
          <Tooltip title="Reload">
            <IconButton aria-label="reload" onClick={updateSubmissions}>
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </SectionTitle>
      <Box sx={{ ml: 3, mr: 3, mb: 3, mt: 3 }}>
        <Grid container spacing={2} alignItems="stretch">
          <Grid xs={12}>
            <SubmissionTimeSeries
              lecture={lecture}
              assignment={assignment}
              allSubmissions={allSubmissionsState}
              latestSubmissions={latestSubmissionsState}
              users={usersState}
            />
          </Grid>
          <Grid md={12} lg={4}>
            <GradingProgress
              lecture={lecture}
              assignment={assignment}
              allSubmissions={allSubmissionsState}
              latestSubmissions={latestSubmissionsState}
              users={usersState}
            />
          </Grid>
          <Grid md={12} lg={4}>
            <StudentSubmissions
              lecture={lecture}
              assignment={assignment}
              allSubmissions={allSubmissionsState}
              latestSubmissions={latestSubmissionsState}
              users={usersState}
            />
          </Grid>
          <Grid md={12} lg={4}>
            <AssignmentScore gb={gb} />
          </Grid>
          <Grid xs={12}>
            <ScoreDistribution
              lecture={lecture}
              assignment={assignment}
              allSubmissions={allSubmissionsState}
              latestSubmissions={latestSubmissionsState}
              users={usersState}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
