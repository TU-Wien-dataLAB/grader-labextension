// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import { Assignment } from '../../../model/assignment';
import {
  Box,
  Button,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Tooltip,
  Typography
} from '@mui/material';
import * as React from 'react';
import NewReleasesRoundedIcon from '@mui/icons-material/NewReleasesRounded';
import TaskIcon from '@mui/icons-material/Task';
import UndoIcon from '@mui/icons-material/Undo';
import TerminalIcon from '@mui/icons-material/Terminal';
import { ReleaseDialog, ScheduledReleaseDialog } from '../../util/dialog';
import {
  getAssignment,
  pushAssignment,
  updateAssignment
} from '../../../services/assignments.service';
import { Lecture } from '../../../model/lecture';
import { enqueueSnackbar } from 'notistack';
import { DeadlineComponent } from '../../util/deadline';
import { showDialog } from '../../util/dialog-provider';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../../widgets/assignmentmanage';

/**
 * Props for AssignmentStatusComponent.
 */
export interface IAssignmentStatusProps {
  lecture: Lecture;
  assignment: Assignment;
  onAssignmentChange: (assignment: Assignment) => void;
}

/**
 * Calculates step of stepper based on assignment status
 * @param status assignment status
 */
const getActiveStep = (status: Assignment.StatusEnum) => {
  switch (status) {
    case 'created':
      return 0;
    case 'pushed':
      return 0;
    case 'released':
      return 1;
    case 'complete':
      return 2;
  }
};
/**
 * Renders the assignment status and instructions for the end user.
 * @param props props of assignment status
 */
export const AssignmentStatus = (props: IAssignmentStatusProps) => {
  const { data: assignment = props.assignment, refetch: refetchAssignment } =
    useQuery({
      queryKey: ['assignment'],
      queryFn: () => getAssignment(props.lecture.id, props.assignment.id, true)
    });

  const updateStatusMutation = useMutation({
    mutationFn: async (updatedAssignment: Assignment) => {
      return updateAssignment(props.lecture.id, updatedAssignment);
    },
    onError: (error: any) => {
      enqueueSnackbar('Error: ' + error.message, { variant: 'error' });
    },
    onSuccess: (data: Assignment) => {
      props.onAssignmentChange(data);
      enqueueSnackbar('Successfully updated assignment', {
        variant: 'success'
      });
    }
  });

  /**
   * Updates assignment status.
   * @param status assignment status
   * @param success alert color if successful
   * @param error alert color if not successful
   * @param scheduledTime if assignment is scheduled for release in future
   */
  const updateAssignmentStatus = async (
    status: 'pushed' | 'released' | 'complete' | 'release_scheduled',
    success: string,
    error: string,
    scheduledTime?: Date
  ) => {
    try {
      const updatedAssignment = {
        ...props.assignment,
        status,
        scheduled_release: scheduledTime
          ? scheduledTime.toISOString()
          : undefined // Set the scheduled date if provided
      };

      await updateStatusMutation.mutateAsync(updatedAssignment);
      await refetchAssignment();
      queryClient.invalidateQueries({
        queryKey: ['assignments', props.lecture.id]
      });
      enqueueSnackbar(success, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(error, { variant: 'error' });
    }
  };

  /**
   * Handles assignment status change to "scheduled_release".
   */
  const handleScheduledReleaseAssignment = async (scheduledTime: Date) => {
    await updateAssignmentStatus(
      'release_scheduled',
      'Successfully Scheduled Assignment Release',
      'Error Scheduling Assignment Release',
      scheduledTime
    );
  };
  /**
   * Handles assignment status change to "released" status
   */
  const handleReleaseAssignment = async () => {
    await updateAssignmentStatus(
      'released',
      'Successfully Released Assignment',
      'Error Releasing Assignment'
    );
  };

  /**
   * Handles assignment status change to "pushed" status
   */
  const handlePushAssignment = async (commitMessage: string) => {
    try {
      // Note: has to be in this order (release -> source)
      await pushAssignment(props.lecture.id, assignment.id, 'release');
      await pushAssignment(
        props.lecture.id,
        assignment.id,
        'source',
        commitMessage
      );
    } catch (err) {
      enqueueSnackbar('Error Pushing Assignment', {
        variant: 'error'
      });
      return;
    }
    await updateAssignmentStatus(
      'pushed',
      'Successfully Pushed Assignment',
      'Error Updating Assignment'
    );
  };

  const fontSize = 16;
  const steps = [
    {
      label: 'Edit',
      description: (
        <Box>
          <Typography sx={{ fontSize }}>
            The assignment has been created and files can now be added to be
            pushed. You can commit and pull changes from the remote file
            repository through the file view or can work directly with the
            underlying git repositories by opening the assignment in the
            terminal (<TerminalIcon color={'primary'} fontSize={'inherit'} />
            ). After you are done working on the files you can release the
            assignment, which makes a final commit with the current state of the
            assignment.
          </Typography>
          <ReleaseDialog
            assignment={assignment}
            handleCommit={handlePushAssignment}
            handleRelease={handleReleaseAssignment}
          >
            <Tooltip title={'Release Assignment for Students'}>
              <Button sx={{ mt: 1 }} variant="outlined" size="small">
                <NewReleasesRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Release
              </Button>
            </Tooltip>
          </ReleaseDialog>
          <ScheduledReleaseDialog
            assignment={assignment}
            handleScheduledRelease={handleScheduledReleaseAssignment}
            handleCommit={handlePushAssignment}
          >
            Schedule Release
          </ScheduledReleaseDialog>
        </Box>
      )
    },
    {
      label: 'Released',
      description: (
        <Box>
          <Typography sx={{ fontSize }}>
            The assignment has been released to students and it is not advised
            to push further changes to the repository. If the assignment is over
            you can mark it as complete in the edit menu or right here. Undoing
            the release of the assignment will hide the assignment from students
            again but their local files are unaffected by this action. When
            re-releasing the assignment after significant changes a new commit
            will be made and you will have to instruct users to reset their
            progress thus far or work with separate versions later on.
          </Typography>
          <Tooltip title={'Hide Released Assignment from Students'}>
            <Button
              sx={{ mt: 1, mr: 1 }}
              onClick={() =>
                updateAssignmentStatus(
                  'pushed',
                  'Successfully Revoked Assignment',
                  'Error Revoking Assignment'
                )
              }
              variant="outlined"
              size="small"
            >
              <UndoIcon fontSize="small" sx={{ mr: 1 }} />
              Undo Release
            </Button>
          </Tooltip>
          <Tooltip title={'Mark Assignment as Complete'}>
            <Button
              sx={{ mt: 1 }}
              onClick={() => completeAssignment()}
              variant="outlined"
              size="small"
            >
              <TaskIcon fontSize="small" sx={{ mr: 1 }} />
              Complete
            </Button>
          </Tooltip>
        </Box>
      )
    },
    {
      label: 'Assignment Completed',
      description: (
        <Box>
          <Typography sx={{ fontSize }}>
            The assignment has been completed and is not visible to students
            anymore but all their progress will be saved. When re-activating the
            assignment it will again show up in the assignment view and new
            submissions can be made given the deadline is set accordingly.
          </Typography>
          <Tooltip title={'Undo Complete and Release Assignment'}>
            <Button
              sx={{ mt: 1 }}
              onClick={() =>
                updateAssignmentStatus(
                  'released',
                  'Successfully Released Assignment',
                  'Error Releasing Assignment'
                )
              }
              variant="outlined"
              size="small"
            >
              <UndoIcon fontSize="small" sx={{ mr: 1 }} />
              Undo Complete
            </Button>
          </Tooltip>
        </Box>
      )
    }
  ];

  /**
   * Handles assignment status change to "complete" status
   */
  const completeAssignment = async () => {
    showDialog(
      'Complete Assignment',
      `Do you want to mark ${assignment.name} as complete? This action will hide the assignment for all students!`,
      async () => {
        await updateAssignmentStatus(
          'complete',
          'Successfully Completed Assignment',
          'Error Updating Assignment'
        );
      }
    );
  };

  return (
    <Box
      sx={{
        alignItems: { xs: 'center' },
        minWidth: '150px',
        overflowY: 'auto'
      }}
    >
      <Typography fontSize={24}> Overview </Typography>
      <Stepper
        activeStep={getActiveStep(assignment.status)}
        orientation="vertical"
      >
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={
                index === 2 ? (
                  <Typography variant="caption">Last step</Typography>
                ) : null
              }
            >
              {step.label}
            </StepLabel>
            <StepContent>
              <Typography>
                {steps[getActiveStep(assignment.status)].description}
              </Typography>
            </StepContent>
          </Step>
        ))}
      </Stepper>
      <Typography sx={{ mt: 5, fontSize: 24 }}> Deadline </Typography>
      <DeadlineComponent
        due_date={props.assignment.due_date}
        compact={false}
        component={'chip'}
        sx={{ mt: 2 }}
      />
    </Box>
  );
};
