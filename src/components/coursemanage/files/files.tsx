// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import * as React from 'react';
import { useEffect } from 'react';
import { Assignment } from '../../../model/assignment';
import { Lecture } from '../../../model/lecture';
import {
  generateAssignment,
  getAssignment,
  pullAssignment,
  pushAssignment
} from '../../../services/assignments.service';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import { CommitDialog } from '../../util/dialog';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Tab,
  Tabs,
  Tooltip
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import TerminalIcon from '@mui/icons-material/Terminal';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { FilesList } from '../../util/file-list';
import { GlobalObjects } from '../../../index';
import { Contents } from '@jupyterlab/services';
import moment from 'moment';
import { openBrowser, openTerminal } from '../overview/util';
import { PageConfig } from '@jupyterlab/coreutils';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import {
  getRemoteStatus,
  lectureBasePath
} from '../../../services/file.service';
import { RepoType } from '../../util/repo-type';
import { enqueueSnackbar } from 'notistack';
import { GitLogModal } from './git-log';
import { showDialog } from '../../util/dialog-provider';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLecture } from '../../../services/lectures.service';
import { loadString, storeString } from '../../../services/storage.service';
import { queryClient } from '../../../widgets/assignmentmanage';

/**
 * Props for FilesComponent.
 */
export interface IFilesProps {
  lecture: Lecture;
  assignment: Assignment;
  onAssignmentChange: (assignment: Assignment) => void;
}

/**
 * Renders in a file list the assignment files.
 * @param props props of the file component
 */
export const Files = (props: IFilesProps) => {
  const navigate = useNavigate();
  const reloadPage = () => navigate(0);

  const { data: lecture = props.lecture } = useQuery({
    queryKey: ['lecture'],
    queryFn: () => getLecture(props.lecture.id, true)
  });

  const { data: assignment = props.assignment } = useQuery({
    queryKey: ['assignment', lecture.id, props.assignment.id],
    queryFn: () => getAssignment(lecture.id, props.assignment.id, true)
  });


  const setSelectedDir = async (value: 'source' | 'release') => {
    storeString('files-selected-dir', value);
    await refetchSelectedDir();
  };

  const { data: selectedDir = 'source', refetch: refetchSelectedDir } =
    useQuery({
      queryKey: ['selectedDir'],
      queryFn: async () => {
        const data = await loadString('files-selected-dir');
        if (data) {
          return data as 'source' | 'release';
        } else {
          return 'source';
        }
      }
    });

  const updateRemoteStatus = async () => {
    const status = await getRemoteStatus(
      props.lecture,
      props.assignment,
      RepoType.SOURCE,
      true
    );
    setRepoStatus(
      status as 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
    );
  };

  openBrowser(
    `${lectureBasePath}${lecture.code}/${selectedDir}/${assignment.id}`
  );

  const setRepoStatus = async (
    value: 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
  ) => {
    storeString('files-repo-status', value);
    await refetchRepoStatus();
  };

  const { data: repoStatus, refetch: refetchRepoStatus } = useQuery({
    queryKey: ['repoStatus'],
    queryFn: async () => {
      const data = await loadString('files-repo-status');
      if (data) {
        return data as
          | 'up_to_date'
          | 'pull_needed'
          | 'push_needed'
          | 'divergent';
      } else {
        return null;
      }
    }
  });
  getRemoteStatus(
    props.lecture,
    props.assignment,
    RepoType.SOURCE,
    true
  ).then(status => {
    setRepoStatus(
      status as 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
    );
  });

  const [srcChangedTimestamp, setSrcChangeTimestamp] = React.useState(
    moment().valueOf()
  ); // now
  const [generateTimestamp, setGenerateTimestamp] = React.useState(null);

  const serverRoot = PageConfig.getOption('serverRoot');

  const isCommitOverwrite = () =>
    repoStatus === 'pull_needed' || repoStatus === 'divergent';
  const isPullOverwrite = () =>
    repoStatus === 'push_needed' || repoStatus === 'divergent';

  useEffect(() => {
    const srcPath = `${lectureBasePath}${lecture.code}/source/${assignment.id}`;
    GlobalObjects.docManager.services.contents.fileChanged.connect(
      (sender: Contents.IManager, change: Contents.IChangedArgs) => {
        const { oldValue, newValue } = change;
        if (newValue && !newValue.path.includes(srcPath)) {
          return;
        }

        if (oldValue && !oldValue.path.includes(srcPath)) {
          return;
        }

        if (newValue) {
          const modified = moment(newValue.last_modified).valueOf();
          if (srcChangedTimestamp === null || srcChangedTimestamp < modified) {
            setSrcChangeTimestamp(modified);
          }
        }

        reloadPage();
        openBrowser(
          `${lectureBasePath}${lecture.code}/${selectedDir}/${assignment.id}`
        );
        getRemoteStatus(
          props.lecture,
          props.assignment,
          RepoType.SOURCE,
          true
        ).then(status => {
          setRepoStatus(
            status as 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
          );
        });
      },
      this
    );
  }, [props.assignment, props.lecture]);

  /**
   * Switches between source and release directory.
   * @param dir dir which should be switched to
   */
  const handleSwitchDir = async (dir: 'source' | 'release') => {
    if (
      dir === 'release' &&
      (generateTimestamp === null || generateTimestamp < srcChangedTimestamp)
    ) {
      await generateAssignment(lecture.id, assignment)
        .then(() => {
          enqueueSnackbar('Generated Student Version Notebooks', {
            variant: 'success'
          });
          setGenerateTimestamp(moment().valueOf());
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

  /**
   * Pushes files to the source und release repo.
   * @param commitMessage the commit message
   */
  const handlePushAssignment = async (
    commitMessage: string,
    selectedFiles: string[]
  ) => {
    // console.log("Files to commit: " + selectedFiles);
    showDialog(
      'Push Assignment',
      `Do you want to push ${assignment.name}? This updates the state of the assignment on the server with your local state.`,
      async () => {
        try {
          // Note: has to be in this order (release -> source)
          await pushAssignment(
            lecture.id,
            assignment.id,
            'release',
            commitMessage,
            selectedFiles
          );
          await pushAssignment(
            lecture.id,
            assignment.id,
            'source',
            commitMessage,
            selectedFiles
          );
          await queryClient.invalidateQueries({ queryKey: ['assignments'] });
          enqueueSnackbar('Successfully Pushed Assignment', {
            variant: 'success'
          });
          getRemoteStatus(
            props.lecture,
            props.assignment,
            RepoType.SOURCE,
            true
          ).then(status => {
            setRepoStatus(
              status as 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
            );
          });
        } catch (err) {
          if (err instanceof Error) {
            enqueueSnackbar('Error Pushing Assignment: ' + err.message, {
              variant: 'error'
            });
          } else {
            console.error('Error cannot interpret unknown as error', err);
          }
          return;
        }
      }
    );
  };
  /**
   * Sets the repo status text.
   * @param status repo status
   */
  const getRemoteStatusText = (
    status: 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
  ) => {
    if (status === 'up_to_date') {
      return 'The local files are up to date with the remote repository.';
    } else if (status === 'pull_needed') {
      return 'The remote repository has new changes. Pull now to load them.';
    } else if (status === 'push_needed') {
      return 'You have made changes to your local repository which you can push.';
    } else {
      return 'The local and remote files are divergent.';
    }
  };

  const getStatusChip = (
    status: 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
  ) => {
    if (status === 'up_to_date') {
      return (
        <Chip
          sx={{ mb: 1.0 }}
          label={'Up To Date'}
          color="success"
          size="small"
          icon={<CheckIcon />}
        />
      );
    } else if (status === 'pull_needed') {
      return (
        <Chip
          sx={{ mb: 1.0 }}
          label={'Pull Needed'}
          color="warning"
          size="small"
          icon={<GetAppRoundedIcon />}
        />
      );
    } else if (status === 'push_needed') {
      return (
        <Chip
          sx={{ mb: 1.0 }}
          label={'Push Needed'}
          color="warning"
          size="small"
          icon={<PublishRoundedIcon />}
        />
      );
    } else {
      return (
        <Chip
          sx={{ mb: 1.0 }}
          label={'Divergent'}
          color="error"
          size="small"
          icon={<ErrorOutlineIcon />}
        />
      );
    }
  };

  /**
   * Pulls changes from source repository.
   */
  const handlePullAssignment = () => {
    showDialog(
      'Pull Assignment',
      `Do you want to pull ${assignment.name}? This updates your assignment with the state of the server and overwrites all changes.`,
      async () => {
        try {
          await pullAssignment(lecture.id, assignment.id, 'source');
          enqueueSnackbar('Successfully Pulled Assignment', {
            variant: 'success'
          });
          getRemoteStatus(
            props.lecture,
            props.assignment,
            RepoType.SOURCE,
            true
          ).then(status => {
            setRepoStatus(
              status as 'up_to_date' | 'pull_needed' | 'push_needed' | 'divergent'
            );
          });
        } catch (err) {
          if (err instanceof Error) {
            enqueueSnackbar('Error Pulling Assignment: ' + err.message, {
              variant: 'error'
            });
          } else {
            console.error('Error cannot interpret unknown as error', err);
          }
        }
      }
    );
  };

  const newUntitled = async () => {
    const res = await GlobalObjects.docManager.newUntitled({
      type: 'notebook',
      path: `${lectureBasePath}${lecture.code}/source/${assignment.id}`
    });
    await updateRemoteStatus();
    await GlobalObjects.docManager.openOrReveal(res.path);
  };

  return (
    <Card
      elevation={3}
      sx={{
        overflowX: 'auto',
        m: 3,
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardHeader
        title="Files"
        titleTypographyProps={{ display: 'inline' }}
        action={
          <Tooltip title="Reload">
            <IconButton aria-label="reload" onClick={() => reloadPage()}>
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        }
        subheader={
          repoStatus !== null && (
            <Tooltip title={getRemoteStatusText(repoStatus)}>
              {getStatusChip(repoStatus)}
            </Tooltip>
          )
        }
        subheaderTypographyProps={{ display: 'inline', ml: 2 }}
      />
      <CardContent sx={{ overflow: 'auto' }}>
        <Tabs
          variant="fullWidth"
          value={selectedDir}
          onChange={(e, dir) => handleSwitchDir(dir)}
        >
          <Tab label="Source" value="source" />
          <Tab label="Release" value="release" />
        </Tabs>
        <Box>
          <FilesList
            path={`${lectureBasePath}${props.lecture.code}/${selectedDir}/${props.assignment.id}`}
            lecture={props.lecture}
            assignment={props.assignment}
            checkboxes={false}
          />
        </Box>
      </CardContent>
      <CardActions sx={{ marginTop: 'auto' }}>
        <CommitDialog
          handleCommit={(msg, selectedFiles) =>
            handlePushAssignment(msg, selectedFiles)
          }
          lecture={props.lecture}
          assignment={props.assignment}
        >
          <Tooltip
            title={`Commit Changes${
              isCommitOverwrite() ? ' (Overwrites remote files!)' : ''
            }`}
          >
            <Button
              sx={{ mt: -1, mr: 1 }}
              variant="outlined"
              size="small"
              color={isCommitOverwrite() ? 'error' : 'primary'}
            >
              <PublishRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              Push
            </Button>
          </Tooltip>
        </CommitDialog>
        <Tooltip
          title={`Pull from Remote${
            isPullOverwrite() ? ' (Overwrites local changes!)' : ''
          }`}
        >
          <Button
            color={isPullOverwrite() ? 'error' : 'primary'}
            sx={{ mt: -1 }}
            onClick={() => handlePullAssignment()}
            variant="outlined"
            size="small"
          >
            <GetAppRoundedIcon fontSize="small" sx={{ mr: 1 }} />
            Pull
          </Button>
        </Tooltip>
        <Tooltip title={'Create new notebook.'}>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: -1 }}
            onClick={newUntitled}
          >
            <AddIcon fontSize="small" sx={{ mr: 1 }} />
            Add new
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
