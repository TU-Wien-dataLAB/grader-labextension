import { AssignmentDetail } from '../../model/assignmentDetail';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import * as React from 'react';

interface GroupsDropdownMenuI {
  assignments: AssignmentDetail[];
  chosenGroup: string;
  setChosenGroup: React.Dispatch<React.SetStateAction<string>>;
}

export const GroupsDropdownMenu = (props: GroupsDropdownMenuI) => {
  const assignment_groups = Array.from(
    new Set(
      props.assignments
        .map(a => a.settings?.group)
        .filter((g): g is string => Boolean(g))
        .sort()
    )
  );

  return (
    <FormControl size={'small'}>
      <InputLabel id={'group-select-label'}>Group</InputLabel>
      <Select
        labelId="group-select-label"
        id="group-select"
        value={props.chosenGroup}
        label="Group"
        onChange={e => props.setChosenGroup(e.target.value)}
      >
        <MenuItem value={'All'}>All</MenuItem>
        {assignment_groups.map((group, index) => (
          <MenuItem key={index} value={group}>
            {group}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
