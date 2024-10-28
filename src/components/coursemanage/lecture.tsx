// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import {
  IconButton,
  Card,
  LinearProgress,
  Stack,
  TableCell,
  TableRow,
  Typography,
  Tooltip,
  Alert
} from '@mui/material';
import * as React from 'react';
import { Assignment } from '../../model/assignment';
import { Lecture } from '../../model/lecture';
import {
  deleteAssignment,
  getAllAssignments
} from '../../services/assignments.service';
import { CreateDialog, EditLectureDialog } from '../util/dialog';
import { getLecture, updateLecture } from '../../services/lectures.service';
import { red, grey } from '@mui/material/colors';
import { enqueueSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { ButtonTr, GraderTable } from '../util/table';
import { DeadlineComponent } from '../util/deadline';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { showDialog } from '../util/dialog-provider';
import { updateMenus } from '../../menu';
import { extractIdsFromBreadcrumbs } from '../util/breadcrumbs';
import { useQuery } from '@tanstack/react-query';
import { AssignmentDetail } from '../../model/assignmentDetail';
import { queryClient } from '../../widgets/assignmentmanage';

interface IAssignmentTableProps {
  lecture: Lecture;
  rows: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
}

const AssignmentTable = (props: IAssignmentTableProps) => {
  const navigate = useNavigate();
  const headers = [
    { name: 'Name' },
    { name: 'Points', width: 100 },
    { name: 'Deadline', width: 200 },
    { name: 'Status', width: 130 },
    { name: 'Show Details', width: 75 },
    { name: 'Delete Assignment', width: 100 }
  ];

  return (
    <>
      <GraderTable<Assignment>
        headers={headers}
        rows={props.rows}
        rowFunc={row => {
          return (
            <TableRow
              key={row.name}
              component={ButtonTr}
              onClick={() =>
                navigate(`/lecture/${props.lecture.id}/assignment/${row.id}`)
              }
            >
              <TableCell component="th" scope="row">
                <Typography variant={'subtitle2'} sx={{ fontSize: 16 }}>
                  {row.name}
                </Typography>
              </TableCell>
              <TableCell>{row.points}</TableCell>
              <TableCell>
                <DeadlineComponent
                  component={'chip'}
                  due_date={row.due_date}
                  compact={true}
                />
              </TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell>
                <IconButton aria-label="detail view" size={'small'}>
                  <SearchIcon />
                </IconButton>
              </TableCell>
              <TableCell>
                <Tooltip
                  title={
                    row.status === 'released' || row.status === 'complete'
                      ? 'Released or Completed Assignments cannot be deleted'
                      : `Delete Assignment ${row.name}`
                  }
                >
                  <span>
                    {' '}
                    {/* span because of https://mui.com/material-ui/react-tooltip/#disabled-elements */}
                    <IconButton
                      aria-label="delete assignment"
                      size={'small'}
                      disabled={
                        row.status === 'released' || row.status === 'complete'
                      }
                      onClick={e => {
                        showDialog(
                          'Delete Assignment',
                          'Do you wish to delete this assignment?',
                          async () => {
                            try {
                              await deleteAssignment(props.lecture.id, row.id);
                              await updateMenus(true);
                              enqueueSnackbar(
                                'Successfully Deleted Assignment',
                                {
                                  variant: 'success'
                                }
                              );
                              props.setAssignments(
                                props.rows.filter(a => a.id !== row.id)
                              );
                            } catch (error: any) {
                              enqueueSnackbar(error.message, {
                                variant: 'error'
                              });
                            }
                          }
                        );
                        e.stopPropagation();
                      }}
                    >
                      <CloseIcon
                        sx={{
                          color:
                            row.status === 'released' ||
                            row.status === 'complete'
                              ? grey[500]
                              : red[500]
                        }}
                      />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        }}
      />
    </>
  );
};

export const LectureComponent = () => {
  const { lectureId } = extractIdsFromBreadcrumbs();

  const { data: lecture, isLoading: isLoadingLecture } = useQuery<Lecture>({
    queryKey: ['lecture', lectureId],
    queryFn: () => getLecture(lectureId, true),
    enabled: !!lectureId
  });

  const {
    data: assignments = [],
    isLoading: isLoadingAssignments,
    refetch: refetchAssignments
  } = useQuery<AssignmentDetail[]>({
    queryKey: ['assignments', lecture, lectureId],
    queryFn: () => getAllAssignments(lectureId),
    enabled: !!lecture
  });

  React.useEffect(() => {
    if (assignments.length > 0) {
      setAssignments(assignments);
    }
  }, [assignments]);

  const [lectureState, setLecture] = React.useState(lecture);
  const [assignmentsState, setAssignments] = React.useState<Assignment[]>([]);
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);

  if (isLoadingLecture || isLoadingAssignments) {
    return (
      <div>
        <Card>
          <LinearProgress />
        </Card>
      </div>
    );
  }

  const handleOpenEditDialog = () => {
    setEditDialogOpen(true);
  };

  const handleUpdateLecture = updatedLecture => {
    updateLecture(updatedLecture).then(
      async response => {
        await updateMenus(true);
        setLecture(response);
        // Invalidate query key "lectures" and "completedLectures", so that we trigger refetch on lectures table and correct lecture name is shown in the table!
        await queryClient.invalidateQueries({ queryKey: ['lectures'] });
        await queryClient.invalidateQueries({
          queryKey: ['completedLectures']
        });
      },
      error => {
        enqueueSnackbar(error.message, {
          variant: 'error'
        });
      }
    );
  };

  return (
    <Stack direction={'column'} sx={{ mt: 5, ml: 5, flex: 1 }}>
      <Typography variant={'h4'} sx={{ mr: 2 }}>
        {lectureState.name}
        {lectureState.complete ? (
          <Typography
            sx={{
              display: 'inline-block',
              ml: 0.75,
              fontSize: 16,
              color: red[400]
            }}
          >
            complete
          </Typography>
        ) : null}
      </Typography>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 2, mb: 1 }}
      >
        <Stack direction="row" alignItems="center" sx={{ mr: 2 }}>
          {lecture.code === lecture.name ? (
            <Alert severity="info">
              The name of the lecture is identical to the lecture code. You
              should give it a meaningful title that accurately reflects its
              content.{' '}
              <span
                style={{
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 'bold'
                }}
                onClick={handleOpenEditDialog}
              >
                Rename Lecture.
              </span>
            </Alert>
          ) : null}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2}>
          <CreateDialog
            lecture={lectureState}
            handleSubmit={async () => {
              await refetchAssignments();
            }}
          />
          <EditLectureDialog
            lecture={lectureState}
            handleSubmit={handleUpdateLecture}
            open={isEditDialogOpen}
            handleClose={() => setEditDialogOpen(false)}
          />
        </Stack>
      </Stack>

      <Stack>
        <Typography variant={'h6'}>Assignments</Typography>
      </Stack>
      <AssignmentTable
        lecture={lectureState}
        rows={assignmentsState}
        setAssignments={setAssignments}
      />
    </Stack>
  );
};