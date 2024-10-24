// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import * as React from 'react';
import { useEffect } from 'react';
import { Assignment } from '../../../model/assignment';
import { Lecture } from '../../../model/lecture';
import { generateAssignment, getAssignment, pullAssignment, pushAssignment } from '../../../services/assignments.service';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import { CommitDialog } from '../../util/dialog';
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, IconButton, Tab, Tabs, Tooltip } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import TerminalIcon from '@mui/icons-material/Terminal';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { FilesList } from '../../util/file-list';
import { GlobalObjects } from '../../../index';
import { Contents } from '@jupyterlab/services';
import { openBrowser, openTerminal } from '../overview/util';
import { PageConfig } from '@jupyterlab/coreutils';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import { getRemoteStatus, lectureBasePath } from '../../../services/file.service';
import { RepoType } from '../../util/repo-type';
import { enqueueSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLecture } from '../../../services/lectures.service';
import { loadString, storeString } from '../../../services/storage.service';
import { queryClient } from '../../../widgets/assignmentmanage';
import { RemoteFileStatus } from '../../../model/remoteFileStatus';
import { GitLogModal } from './git-log';

export interface IFilesProps {
  lecture: Lecture;
  assignment: Assignment;
  onAssignmentChange: (assignment: Assignment) => void;
}

export const Files = ({ lecture, assignment, onAssignmentChange }: IFilesProps) => {
  const navigate = useNavigate();
  const reloadPage = () => navigate(0);
  const serverRoot = PageConfig.getOption('serverRoot');
  
  const { data: updatedLecture = lecture } = useQuery({
    queryKey: ['lecture', lecture.id],
    queryFn: () => getLecture(lecture.id, true),
  });

  const { data: updatedAssignment = assignment } = useQuery({
    queryKey: ['assignment', lecture.id, assignment.id],
    queryFn: () => getAssignment(lecture.id, assignment.id, true),
  });

  const { data: selectedDir = 'source', refetch: refetchSelectedDir } = useQuery({
    queryKey: ['selectedDir'],
    queryFn: async () => {
      const data = await loadString('files-selected-dir');
      return data || 'source';
    },
  });

  const { data: repoStatus, refetch: refetchRepoStatus } = useQuery({
    queryKey: ['repoStatus', lecture.id, assignment.id],
    queryFn: async () => {
      const response = await getRemoteStatus(lecture, assignment, RepoType.SOURCE, true);
      return response.status;
    },
  });

  
  useEffect(() => {
    const srcPath = `${lectureBasePath}${lecture.code}/source/${assignment.id}`;
    GlobalObjects.docManager.services.contents.fileChanged.connect(
      (sender: Contents.IManager, change: Contents.IChangedArgs) => {
        const { oldValue, newValue } = change;
        if ((newValue && !newValue.path.includes(srcPath)) || (oldValue && !oldValue.path.includes(srcPath))) {
          return;
        }
        reloadPage();
        refetchRepoStatus();
      },
      this
    );
  }, [assignment.id, lecture.id]);

  /**
   * Switches between source and release directory.
   * @param dir dir which should be switched to
   */
  const handleSwitchDir = async (dir: 'source' | 'release') => {
    if (dir === 'release') {
      await generateAssignment(lecture.id, assignment)
        .then(() => {
          enqueueSnackbar('Generated Student Version Notebooks', {
            variant: 'success'
          });
          setSelectedDir(dir);
        })
        .catch(error => {
          console.log(error);
          enqueueSnackbar(
            'Error Generating Student Version Notebooks: ' + error.message,
            {
              variant: 'error'
            }
          );
        });
    } else {
      setSelectedDir(dir);
    }
  };

  const setSelectedDir = async (dir: 'source' | 'release') => {
    storeString('files-selected-dir', dir);
    refetchSelectedDir();
  };

  const handlePushAssignment = async (commitMessage: string, selectedFiles: string[]) => {
    try {
      await pushAssignment(lecture.id, assignment.id, 'release', commitMessage, selectedFiles);
      await pushAssignment(lecture.id, assignment.id, 'source', commitMessage, selectedFiles);
      queryClient.invalidateQueries({ queryKey: ['assignments', lecture.id] });
      enqueueSnackbar('Successfully Pushed Assignment', { variant: 'success' });
      refetchRepoStatus();
    } catch (err) {
      enqueueSnackbar(`Error Pushing Assignment: ${err}`, { variant: 'error' });
    }
  };

  const handlePullAssignment = async () => {
    try {
      await pullAssignment(lecture.id, assignment.id, 'source');
      enqueueSnackbar('Successfully Pulled Assignment', { variant: 'success' });
      refetchRepoStatus();
    } catch (err) {
      enqueueSnackbar(`Error Pulling Assignment: ${err}`, { variant: 'error' });
    }
  };

  const getRemoteStatusText = (status: RemoteFileStatus.StatusEnum) => {
    switch (status) {
      case RemoteFileStatus.StatusEnum.UpToDate:
        return 'The local files are up to date with the remote repository.';
      case RemoteFileStatus.StatusEnum.PullNeeded:
        return 'The remote repository has new changes. Pull now to load them.';
      case RemoteFileStatus.StatusEnum.PushNeeded:
        return 'You have made changes to your local repository which you can push.';
      case RemoteFileStatus.StatusEnum.Divergent:
        return 'The local and remote files are divergent.';
      case RemoteFileStatus.StatusEnum.NoRemoteRepo:
        return 'There is no remote repository yet. Push your assignment to create it.'
      default:
        return '';
    }
  };

  const newUntitled = async () => {
    const res = await GlobalObjects.docManager.newUntitled({
      type: 'notebook',
      path: `${lectureBasePath}${lecture.code}/source/${assignment.id}`
    });
    GlobalObjects.docManager.openOrReveal(res.path);
  };

  const getStatusChip = (status: RemoteFileStatus.StatusEnum) => {
    // Define the statusMap with allowed `Chip` color values
    const statusMap: Record<RemoteFileStatus.StatusEnum, { label: string, color: "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success", icon: JSX.Element }> = {
      UP_TO_DATE: { label: 'Up To Date', color: 'success', icon: <CheckIcon /> },
      PULL_NEEDED: { label: 'Pull Needed', color: 'warning', icon: <GetAppRoundedIcon /> },
      PUSH_NEEDED: { label: 'Push Needed', color: 'warning', icon: <PublishRoundedIcon /> },
      DIVERGENT: { label: 'Divergent', color: 'error', icon: <ErrorOutlineIcon /> },
      NO_REMOTE_REPO: { label: 'No Remote Repository', color: 'primary', icon: <CheckIcon /> }
    };
  
    // Fallback if the status is not in the statusMap (it should be)
    const { label, color, icon } = statusMap[status] || {};
  
    // Return the Chip component with appropriate props or null if status is invalid
    return label ? <Chip sx={{ mb: 1 }} label={label} color={color} size="small" icon={icon} /> : null;
  };
  
  return (
    <Card sx={{ overflowX: 'auto', m: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Files"
        titleTypographyProps={{ display: 'inline' }}
        action={
          <Tooltip title="Reload">
            <IconButton aria-label="reload" onClick={reloadPage}>
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        }
        subheader={
          repoStatus && (
            <Tooltip title={getRemoteStatusText(repoStatus)}>
              {getStatusChip(repoStatus)}
            </Tooltip>
          )
        }
        subheaderTypographyProps={{ display: 'inline', ml: 2 }}
      />
      <CardContent sx={{ overflow: 'auto' }}>
        <Tabs variant="fullWidth" value={selectedDir} onChange={(e, dir) => handleSwitchDir(dir)}>
          <Tab label="Source" value="source" />
          <Tab label="Release" value="release" />
        </Tabs>
        <Box>
          <FilesList
            path={`${lectureBasePath}${lecture.code}/${selectedDir}/${assignment.id}`}
            lecture={lecture}
            assignment={assignment}
            checkboxes={false}
          />
        </Box>
      </CardContent>
      <CardActions sx={{ marginTop: 'auto' }}>
        <CommitDialog handleCommit={handlePushAssignment} lecture={lecture} assignment={assignment}>
          <Tooltip title="Commit Changes">
            <Button variant="outlined" size="small" color="primary">
              <PublishRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              Push
            </Button>
          </Tooltip>
        </CommitDialog>
        <Tooltip title="Pull from Remote">
          <Button variant="outlined" size="small" onClick={handlePullAssignment}>
            <GetAppRoundedIcon fontSize="small" sx={{ mr: 1 }} />
            Pull
          </Button>
        </Tooltip>
        <Tooltip title="Create new notebook">
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: -1 }}
            onClick={newUntitled}
          >
            <AddIcon fontSize="small" sx={{ mr: 1 }} />
            Create Notebook
          </Button>
        </Tooltip>
        <GitLogModal lecture={lecture} assignment={assignment} />
        <Tooltip title={'Show in File-Browser'}>
          <IconButton
            sx={{ mt: -1, pt: 0, pb: 0 }}
            color={'primary'}
            onClick={() =>
              openBrowser(
                `${lectureBasePath}${lecture.code}/${selectedDir}/${assignment.id}`
              )
            }
          >
            <OpenInBrowserIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={'Open in Terminal'}>
          <IconButton
            sx={{ mt: -1, pt: 0, pb: 0 }}
            color={'primary'}
            onClick={() =>
              openTerminal(
                `${serverRoot}/${lectureBasePath}${lecture.code}/${selectedDir}/${assignment.id}`
              )
            }
          >
            <TerminalIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};
