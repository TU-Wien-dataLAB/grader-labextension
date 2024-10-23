// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import { SectionTitle } from '../util/section-title';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import * as React from 'react';
import { Lecture } from '../../model/lecture';
import { Assignment } from '../../model/assignment';
import { Submission } from '../../model/submission';
import {
  getAllSubmissions,
  getProperties,
  getSubmission,
  pullFeedback
} from '../../services/submissions.service';
import { GradeBook } from '../../services/gradebook';
import { FilesList } from '../util/file-list';
import { openBrowser } from '../coursemanage/overview/util';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import { getFiles, lectureBasePath } from '../../services/file.service';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLecture } from '../../services/lectures.service';
import { getAssignment } from '../../services/assignments.service';
import { extractIdsFromBreadcrumbs } from '../util/breadcrumbs';

export const Feedback = () => {
  const { lectureId, assignmentId } = extractIdsFromBreadcrumbs();
  const params = useParams();
  const submissionId = +params['sid'];

  const { data: lecture, isLoading: isLoadingLecture } = useQuery<Lecture>({
    queryKey: ['lecture', lectureId],
    queryFn: () => getLecture(lectureId),
    enabled: !!lectureId
   });

  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<Assignment>({
    queryKey: ['assignment', assignmentId],
    queryFn: () => getAssignment(lectureId, assignmentId),
    enabled: !!lecture && !!assignmentId
  });

  const { data: submission, isLoading: isLoadingSubmission } = useQuery<Submission>({
    queryKey: ['submission', lectureId, assignmentId, submissionId],
    queryFn: () => getSubmission(lectureId, assignmentId, submissionId),
    enabled: !!lecture && !!assignment
  });

  const { data: gradeBook, refetch: refetchGradeBook } = useQuery({
    queryKey: ['gradeBook', submissionId],
    queryFn: () => submission ? getProperties(lectureId, assignmentId, submissionId).then(properties => new GradeBook(properties)) : Promise.resolve(null),
    enabled: !!submission
  });

  const feedbackPath = `${lectureBasePath}${lecture?.code}/feedback/${assignmentId}/${submissionId}`;
  const { data: submissionFiles, refetch: refetchSubmissionFiles } = useQuery({
    queryKey: ['submissionFiles', feedbackPath],
    queryFn: () => feedbackPath ? getFiles(feedbackPath) : Promise.resolve([]),
    enabled: !!feedbackPath 
  });


  const reloadProperties = async () => {
    await refetchGradeBook();
  };

  React.useEffect(() => {
    reloadProperties();
  }, []);

  if (isLoadingAssignment || isLoadingLecture || isLoadingSubmission) {
    return <div>Loading...</div>;
  }

  const assignmentLink = `/lecture/${lecture.id}/assignment/${assignment.id}`;

  return (
    <Box sx={{ overflow: 'auto' }}>
      <SectionTitle title={'Feedback for ' + assignment.name} />
      <Box sx={{ m: 2, mt: 12 }}>
        <Stack direction="row" spacing={2} sx={{ ml: 2 }}>
          <Stack sx={{ mt: 0.5 }}>
            <Typography
              textAlign="right"
              color="text.secondary"
              sx={{ fontSize: 12, height: 35 }}
            >
              Lecture
            </Typography>
            <Typography
              textAlign="right"
              color="text.secondary"
              sx={{ fontSize: 12, height: 35 }}
            >
              Assignment
            </Typography>
            <Typography
              textAlign="right"
              color="text.secondary"
              sx={{ fontSize: 12, height: 35 }}
            >
              Points
            </Typography>
            <Typography
              textAlign="right"
              color="text.secondary"
              sx={{ fontSize: 12, height: 35 }}
            >
              Extra Credit
            </Typography>
          </Stack>
          <Stack>
            <Typography
              color="text.primary"
              sx={{ display: 'inline-block', fontSize: 16, height: 35 }}
            >
              {lecture.name}
            </Typography>
            <Typography
              color="text.primary"
              sx={{ display: 'inline-block', fontSize: 16, height: 35 }}
            >
              {assignment.name}
              <Typography
                color="text.secondary"
                sx={{
                  display: 'inline-block',
                  fontSize: 14,
                  ml: 2,
                  height: 35
                }}
              >
                {assignment.type}
              </Typography>
            </Typography>
            <Typography
              color="text.primary"
              sx={{ display: 'inline-block', fontSize: 16, height: 35 }}
            >
              {gradeBook?.getPoints()}
              <Typography
                color="text.secondary"
                sx={{ display: 'inline-block', fontSize: 14, ml: 0.25 }}
              >
                /{gradeBook?.getMaxPoints()}
              </Typography>
            </Typography>
            <Typography
              color="text.primary"
              sx={{ display: 'inline-block', fontSize: 16, height: 35 }}
            >
              {gradeBook?.getExtraCredits()}
            </Typography>
          </Stack>
        </Stack>
      </Box>
      <Typography sx={{ m: 2, mb: 0 }}>Feedback Files</Typography>

      <FilesList
        path={feedbackPath}
        sx={{ m: 2, overflow: 'auto' }}
        lecture={lecture}
        assignment={assignment}
        checkboxes={false}
      />

      <Stack direction={'row'} spacing={2} sx={{ m: 2 }}>
        <Button variant="outlined" component={Link as any} to={assignmentLink}>
          Back
        </Button>
        <Button
          variant="outlined"
          size="small"
          color={'primary'}
          onClick={() => {
            pullFeedback(lecture, assignment, submission).then(async () => {
              await refetchSubmissionFiles();
            });
          }}
        >
          Pull Feedback
        </Button>
        {feedbackPath !== null && (
          <Tooltip title={'Show files in JupyterLab file browser'}>
            <Button
              variant="outlined"
              size="small"
              color={'primary'}
              onClick={() => openBrowser(feedbackPath)}
            >
              <OpenInBrowserIcon fontSize="small" sx={{ mr: 1 }} />
              Show in Filebrowser
            </Button>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};
