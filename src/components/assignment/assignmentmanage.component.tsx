// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import * as React from 'react';
import { useState } from 'react';
import { Lecture } from '../../model/lecture';
import { useNavigate } from 'react-router-dom';
import {
  FormControlLabel,
  FormGroup,
  Stack,
  Switch,
  TableCell,
  TableRow,
  Typography
} from '@mui/material';
import Box from '@mui/material/Box';
import { ButtonTr, GraderTable } from '../util/table';
import { useQuery } from '@tanstack/react-query';
import { getAllLectures } from '../../services/lectures.service';

interface ILectureTableProps {
  rows: Lecture[];
}

const LectureTable = (props: ILectureTableProps) => {
  const navigate = useNavigate();
  const headers = [
    { name: 'ID', width: 100 },
    { name: 'Name' },
    { name: 'Code' }
  ];
  return (
    <GraderTable<Lecture>
      headers={headers}
      rows={props.rows}
      rowFunc={row => {
        return (
          <TableRow
            key={row.name}
            component={ButtonTr}
            onClick={() => navigate(`/lecture/${row.id}`)}
          >
            <TableCell style={{ width: 100 }} component="th" scope="row">
              {row.id}
            </TableCell>
            <TableCell>
              <Typography variant={'subtitle2'} sx={{ fontSize: 16 }}>
                {row.name}
              </Typography>
            </TableCell>
            <TableCell>{row.code}</TableCell>
          </TableRow>
        );
      }}
    />
  );
};

/**
 * Renders the lectures which the student addends.
 * @param props Props of the lecture file components
 */
export const AssignmentManageComponent = () => {
  const { data: lectures, isLoading: isLoadingOngoingLectures } = useQuery<Lecture[]>({
    queryKey: ['lectures'],
    queryFn: () => getAllLectures(false)
  });

  const { data: completedLectures, isLoading: isLoadingCompletedLectures } = useQuery<Lecture[]>({
    queryKey: ['completedLectures'],
    queryFn: () => getAllLectures(true)
  });
  
  const [showComplete, setShowComplete] = useState(false);

  if (isLoadingCompletedLectures || isLoadingOngoingLectures) {
    return <div>Loading...</div>
  }


  return (
    <Stack flexDirection={'column'} sx={{ m: 5, flex: 1, overflow: 'hidden' }}>
      <Stack direction="row" justifyContent="center">
        <Typography variant={'h4'}>Assignments</Typography>
      </Stack>
      <Stack direction={'row'} spacing={2}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Lectures
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={showComplete}
                onChange={ev => setShowComplete(ev.target.checked)}
              />
            }
            label="Completed Lectures"
          />
        </FormGroup>
      </Stack>

      <LectureTable
        rows={
          showComplete ? completedLectures : lectures
        }
      />
    </Stack>
  );
};
