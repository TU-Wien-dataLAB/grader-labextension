import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Stack,
  Typography,
  Checkbox,
  Chip
} from '@mui/material';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import WarningIcon from '@mui/icons-material/Warning';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DangerousIcon from '@mui/icons-material/Dangerous';
import {
  File,
  getRelativePath,
  getRemoteFileStatus
} from '../../services/file.service';
import { Lecture } from '../../model/lecture';
import { Assignment } from '../../model/assignment';
import { RepoType } from './repo-type';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckIcon from '@mui/icons-material/Check';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import { UseQueryOptions, useQuery } from '@tanstack/react-query';

interface IFileItemProps {
  file: File;
  lecture?: Lecture;
  assignment?: Assignment;
  inContained: (file: string) => boolean;
  missingFiles?: File[];
  openFile: (path: string) => void;
  allowFiles?: boolean;
  checkboxes: boolean;
  onFileSelectChange?: (filePath: string, isSelected: boolean) => void;
}

const FileItem = ({
  file,
  lecture,
  assignment,
  inContained,
  openFile,
  allowFiles,
  missingFiles,
  checkboxes,
  onFileSelectChange
}: IFileItemProps) => {
  const inMissing = (filePath: string) => {
    return missingFiles.some(missingFile => missingFile.path === filePath);
  };

  const [isSelected, setIsSelected] = React.useState(true);


  const fileStatusQueryOptions: UseQueryOptions<'up_to_date' | 'push_needed' | 'divergent', Error> = {
    queryKey: ['fileStatus', lecture?.id, assignment?.id, file.path],
    queryFn: () => getRemoteFileStatus(
      lecture,
      assignment,
      RepoType.SOURCE,
      getRelativePath(file.path, 'source'),
      true
    ) as Promise<'up_to_date' | 'push_needed' | 'divergent'>,
    enabled: !!lecture && !!assignment,
    staleTime: 3000
  };

  const { data: fileRemoteStatus } = useQuery(fileStatusQueryOptions);


  const getFleRemoteStatusText = (
    status: 'up_to_date' | 'push_needed' | 'divergent'
  ) => {
    if (status === 'up_to_date') {
      return 'The local file is up to date with the file from remote repository.';
    } else if (status === 'push_needed') {
      return 'You have made changes to this file locally, a push is needed.';
    } else {
      return 'The local and remote file are divergent.';
    }
  };

  const getStatusChip = (
    status: 'up_to_date' | 'push_needed' | 'divergent'
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
          icon={<CompareArrowsIcon />}
        />
      );
    }
  };

  const toggleSelection = () => {
    setIsSelected(prevState => {
      const nextState = !prevState;
      // used only with checkboxes -> in source directory
      onFileSelectChange(getRelativePath(file.path, 'source'), nextState);
      return nextState;
    });
  };

  const extraFileHelp =
    'This file is not part of the assignment and will be removed when grading! Did you rename a notebook file or add it manually?';
  const missingFileHelp =
    'This file should be part of your assignment! Did you delete it?';

  return (
    <ListItem disablePadding>
      {checkboxes && (
        <ListItemIcon>
          <Checkbox checked={isSelected} onChange={toggleSelection} />
        </ListItemIcon>
      )}
      <ListItemButton onClick={() => openFile(file.path)} dense={true}>
        <ListItemIcon>
          {!checkboxes && (
            <KeyboardArrowRightIcon sx={{ visibility: 'hidden' }} />
          )}
          <InsertDriveFileRoundedIcon />
        </ListItemIcon>
        <ListItemText
          primary={<Typography>{file.name}</Typography>}
          secondary={
            <Stack direction={'row'} spacing={2}>
              {checkboxes && (
                <Tooltip title={getFleRemoteStatusText(fileRemoteStatus)}>
                  {getStatusChip(fileRemoteStatus)}
                </Tooltip>
              )}
              {inMissing(file.path) && (
                <Tooltip title={missingFileHelp}>
                  <Stack direction={'row'} spacing={2} flex={0}>
                    <DangerousIcon color={'error'} fontSize={'small'} />
                    <Typography sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}>
                      Missing File
                    </Typography>
                  </Stack>
                </Tooltip>
              )}
              {
                <Stack direction={'row'} spacing={2}>
                  {!inContained(getRelativePath(file.path, 'assignments')) &&
                    !allowFiles && (
                      <Tooltip title={extraFileHelp}>
                        <Stack direction={'row'} spacing={2} flex={0}>
                          <WarningIcon color={'warning'} fontSize={'small'} />
                          <Typography
                            sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
                          >
                            Extra File
                          </Typography>
                        </Stack>
                      </Tooltip>
                    )}
                </Stack>
              }
            </Stack>
          }
        />
      </ListItemButton>
    </ListItem>
  );
};

export default FileItem;
