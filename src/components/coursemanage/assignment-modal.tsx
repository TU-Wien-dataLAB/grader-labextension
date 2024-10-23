// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import * as React from 'react';
import { Badge, Box, Stack, Tab, Tabs } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Link,
  Outlet,
  useMatch,
  useParams
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllSubmissions } from '../../services/submissions.service';
import { extractIdsFromBreadcrumbs } from '../util/breadcrumbs';

function a11yProps(index: any) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`
  };
}

export const AssignmentModalComponent = () => {
  const { lectureId, assignmentId } = extractIdsFromBreadcrumbs();

  const { data: latestSubmissionsNumber = 0 } = useQuery<number>({
    queryKey: ['latestSubmissionsNumber', lectureId, assignmentId],
    queryFn: async () => {
      const submissions = await getAllSubmissions(lectureId, assignmentId, 'latest');
      return submissions.length;
    },
    enabled: !!lectureId && !!assignmentId,
  });
  

  const params = useParams();
  const match = useMatch(`/lecture/${params.lid}/assignment/${params.aid}/*`);
  const tab = match.params['*'];

  let value: number;
  if (tab === '') {
    value = 0;
  } else if (tab === 'files') {
    value = 1;
  } else if (tab.includes('submissions')) {
    value = 2;
  } else if (tab === 'stats') {
    value = 3;
  } else if (tab === 'settings') {
    value = 4;
  } else {
    console.warn(`Unknown tab ${tab}... navigating to overview page!`);
    value = 0;
  }

  return (
    <Stack flexDirection={'column'} sx={{ flex: 1, overflowY: 'auto' }}>
      <Box
        sx={{
          flex: 1,
          bgcolor: 'background.paper',
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        <Tabs
          orientation="vertical"
          value={value}
          sx={{
            borderRight: 1,
            borderColor: 'divider',
            minWidth: '200px',
            marginTop: 5
          }}
        >
          <Tab
            label="Overview"
            icon={<DashboardIcon />}
            iconPosition="start"
            sx={{ justifyContent: 'flex-start' }}
            {...a11yProps(0)}
            component={Link as any}
            to={''}
          />
          <Tab
            label="Files"
            icon={<FolderIcon />}
            iconPosition="start"
            sx={{ justifyContent: 'flex-start' }}
            {...a11yProps(1)}
            component={Link as any}
            to={'files'}
          />
          <Tab
            label="Submissions"
            icon={
              <Badge
                color="secondary"
                badgeContent={latestSubmissionsNumber}
                showZero={latestSubmissionsNumber !== 0}
              >
                <FormatListNumberedIcon />
              </Badge>
            }
            iconPosition="start"
            sx={{ justifyContent: 'flex-start' }}
            {...a11yProps(2)}
            component={Link as any}
            to={'submissions'}
          />
          <Tab
            label="Stats"
            icon={<QueryStatsIcon />}
            iconPosition="start"
            sx={{ justifyContent: 'flex-start' }}
            {...a11yProps(3)}
            component={Link as any}
            to={'stats'}
          />
          <Tab
            label="Settings"
            icon={<SettingsIcon />}
            iconPosition="start"
            sx={{ justifyContent: 'flex-start' }}
            {...a11yProps(4)}
            component={Link as any}
            to={'settings'}
          />
        </Tabs>
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          <Outlet />
        </Box>
      </Box>
    </Stack>
  );
};
