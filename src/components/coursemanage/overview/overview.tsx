// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import * as React from 'react';

import { Assignment } from '../../../model/assignment';
import { Lecture } from '../../../model/lecture';
import { SectionTitle } from '../../util/section-title';
import { OverviewCard } from './overview-card';
import { Box, Card, Grid, LinearProgress } from '@mui/material';
import { AssignmentStatus } from './assignment-status';
import { useQuery } from '@tanstack/react-query';
import { getAssignment } from '../../../services/assignments.service';
import { extractIdsFromBreadcrumbs } from '../../util/breadcrumbs';
import { getLecture, getUsers } from '../../../services/lectures.service';
import { getAllSubmissions } from '../../../services/submissions.service';

export const OverviewComponent = () => {
  const { lectureId, assignmentId } = extractIdsFromBreadcrumbs();

  const { data: lecture, isLoading: isLoadingLecture } = useQuery<Lecture>({
    queryKey: ['lecture', lectureId],
    queryFn: () => getLecture(lectureId), 
    enabled: !!lectureId, 
  });

  const { data: assignment, refetch: refetchAssignment, isLoading: isLoadingAssignment } = useQuery<Assignment>({
    queryKey: ['assignment', assignmentId],
    queryFn: () => getAssignment(lectureId, assignmentId, true), 
    enabled: !!lectureId && !!assignmentId, 
  });

  const { data: latestSubmissionsNumber = 0 } = useQuery<number>({
    queryKey: ['latestSubmissionsNumber', lectureId, assignmentId],
    queryFn: async () => {
      const submissions = await getAllSubmissions(lectureId, assignmentId, 'latest');
      return submissions.length;
    },
    enabled: !!lectureId && !!assignmentId,
  });

  const { data: students = 0 } = useQuery<number>({
    queryKey: ['users', lectureId],
    queryFn: async () => {
      const users = await getUsers(lectureId);
      return users['students'].length;
    },
    enabled: !!lectureId, 
  });


  if (isLoadingLecture || isLoadingAssignment) {
    return (
      <div>
        <Card>
          <LinearProgress />
        </Card>
      </div>
    );
  }


  const onAssignmentChange = async () => {
    await refetchAssignment();
  };

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <SectionTitle title={assignment.name}></SectionTitle>
      <Box sx={{ ml: 3, mr: 3, mb: 3, mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item md={12} xs={7} lg={6} xl={7}>
            <AssignmentStatus
              lecture={lecture}
              assignment={assignment}
              onAssignmentChange={onAssignmentChange}
            />
          </Grid>
          <Grid item md={12} xs={12} lg={6} xl={5}>
            <OverviewCard
              lecture={lecture}
              assignment={assignment}
              latestSubmissions={latestSubmissionsNumber}
              students={students}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
