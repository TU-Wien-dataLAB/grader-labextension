import React from 'react';
import {
  Card,
  List,
  Paper,
  Typography
} from '@mui/material';
import { Contents } from '@jupyterlab/services';
import IModel = Contents.IModel;
import { Stack, SxProps } from '@mui/system';
import { Theme } from '@mui/material/styles';
import {
  getFiles,
  openFile,
  File,
  extractRelativePaths,
  getRelativePath,
  lectureBasePath
} from '../../services/file.service';
import { grey } from '@mui/material/colors';
import FileItem from './file-item';
import FolderItem from './folder-item';
import { Assignment } from '../../model/assignment';
import { Lecture } from '../../model/lecture';
import { useQuery } from '@tanstack/react-query';

interface IFileListProps {
  path: string;
  sx?: SxProps<Theme>;
  shouldContain?: string[];
  assignment?: Assignment;
  lecture?: Lecture;
  missingFiles?: File[];
  checkboxes: boolean;
  onFileSelectChange?: (filePath: string, isSelected: boolean) => void;
}

export const FilesList = (props: IFileListProps) => {
  const { data: files = [], refetch } = useQuery({
    queryKey: ['files', props.path],
    queryFn: () => getFiles(props.path),
    // Disable automatic refetching, since we want to subscribe directyly on property changes.
    refetchOnMount: false,
    refetchInterval: false
  });

  React.useEffect(() => {
    refetch();
  }, [props]);

  const inContained = (file: string) => {
    if (props.shouldContain) {
      return props.shouldContain.filter(f => file === f).length > 0;
    }
    return true;
  };

  const handleFileSelectChange = (filePath: string, isSelected: boolean) => {
    props.onFileSelectChange(filePath, isSelected);
  };

  const generateItems = (files: File[], handleFileSelectChange) => {
    const filePaths = files.flatMap(file =>
      extractRelativePaths(file, 'assignments')
    );
    const missingFiles: File[] =
      (props.shouldContain &&
        props.shouldContain
          .filter(f => !filePaths.includes(f))
          .map(missingFile => ({
            name:
              missingFile.substring(missingFile.lastIndexOf('/') + 1) ||
              missingFile,
            path:
              `${lectureBasePath}${props.lecture.code}/assignments/${props.assignment.id}/` +
              missingFile,
            type: 'file',
            content: []
          }))) ||
      [];

    const missingFilesTopOrder = missingFiles.filter(missingFile => {
      const relativePath = getRelativePath(missingFile.path, 'assignments');
      return !relativePath.includes('/');
    });

    const items = files.concat(missingFilesTopOrder).map((file: File) => {
      if (file.type === 'directory') {
        return (
          <FolderItem
            key={file.path}
            folder={file}
            lecture={props.lecture}
            assigment={props.assignment}
            missingFiles={missingFiles || []}
            inContained={inContained}
            openFile={openFile}
            allowFiles={props.assignment?.allow_files}
            checkboxes={props.checkboxes}
            onFileSelectChange={handleFileSelectChange}
          />
        );
      } else {
        return (
          <FileItem
            key={file.path}
            file={file}
            lecture={props.lecture}
            assignment={props.assignment}
            missingFiles={missingFiles || []}
            inContained={inContained}
            openFile={openFile}
            allowFiles={props.assignment?.allow_files}
            checkboxes={props.checkboxes}
            onFileSelectChange={handleFileSelectChange}
          />
        );
      }
    });

    return items;
  };

  return (
    <Paper elevation={0} sx={props.sx}>
      <Card sx={{ mt: 1, mb: 1, overflow: 'auto' }} variant="outlined">
        {files.length === 0 ? (
          <Typography variant={'body1'} color={grey[500]} sx={{ ml: 1 }}>
            No Files Found
          </Typography>
        ) : (
          <List dense={false}>{generateItems(files, props.onFileSelectChange)}</List>
        )}
      </Card>
    </Paper>
  );
};
