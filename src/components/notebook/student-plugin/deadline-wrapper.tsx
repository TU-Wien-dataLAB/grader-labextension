import * as React from 'react';
import { DeadlineComponent } from '../../util/deadline';
import { getAllLectures } from '../../../services/lectures.service';
import { getAssignment } from '../../../services/assignments.service';
import { Box } from '@mui/material';
import { lectureSubPaths } from '../../../services/file.service';
import { Assignment } from '../../../model/assignment';
import { Lecture } from '../../../model/lecture';

export interface IDeadlineWrapperProps {
  notebookPaths: string[];
}

/**
 * React Component which handles all requests which are needed to get the assignment deadline
 * Why is this needed => we can not do the requests in the widget because the constructor can not handle async requests
 * There is probably a better way to do this
 * @param props props of the component
 */
export const DeadlineWrapper = (props: IDeadlineWrapperProps) => {
  const [lecture, setLecture] = React.useState<Lecture | null>(null);
  const [assignment, setAssignment] = React.useState<Assignment | null>(null);

  React.useEffect(() => {
    if (lecture === null) {
      getAllLectures().then(response => {
        const l = response.find(
          l => l.code === props.notebookPaths[lectureSubPaths]
        );
        if (l === undefined) {
          return;
        }
        setLecture(l);
        if (l === null) {
          return;
        }
        const assignmentIdIndex = lectureSubPaths + 2;
        getAssignment(l.id, +props.notebookPaths[assignmentIdIndex]).then(
          response => {
            setAssignment(response);
          }
        );
      });
    }
  }, [props]);

  return (
    <Box>
      {assignment !== null && assignment.settings.deadline !== null ?
        <DeadlineComponent
          deadline={assignment.settings.deadline}
          compact={false}
          component={'chip'}
        />
       : null}
    </Box>
  );
};
