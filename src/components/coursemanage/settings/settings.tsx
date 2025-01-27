import { Assignment } from '../../../model/assignment';
import { Submission } from '../../../model/submission';
import * as React from 'react';
import { useFormik } from 'formik';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import {
  updateAssignment,
  deleteAssignment,
  getAssignment
} from '../../../services/assignments.service';
import { enqueueSnackbar } from 'notistack';
import { Lecture } from '../../../model/lecture';
import * as yup from 'yup';
import { SectionTitle } from '../../util/section-title';
import { useNavigate } from 'react-router-dom';
import {
  getLateSubmissionInfo,
  ILateSubmissionInfo,
  LateSubmissionForm
} from './late-submission-form';
import { FormikValues } from 'formik/dist/types';
import moment from 'moment';
import { red } from '@mui/material/colors';
import { showDialog } from '../../util/dialog-provider';
import { updateMenus } from '../../../menu';
import { extractIdsFromBreadcrumbs } from '../../util/breadcrumbs';
import { getLecture } from '../../../services/lectures.service';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../../widgets/assignmentmanage';

const gradingBehaviourHelp = `Specifies the behaviour when a students submits an assignment.\n
No Automatic Grading: No action is taken on submit.\n
Automatic Grading: The assignment is being autograded as soon as the students makes a submission.\n
Fully Automatic Grading: The assignment is autograded and feedback is generated as soon as the student makes a submission. 
(requires all scores to be based on autograde results)`;

const validationSchema = yup.object({
  name: yup
    .string()
    .min(4, 'Name should be 4-50 character length')
    .max(50, 'Name should be 4-50 character length')
    .required('Name is required'),
  due_date: yup.date().nullable(),
  type: yup.mixed().oneOf(['user', 'group']),
  automatic_grading: yup.mixed().oneOf(['unassisted', 'auto', 'full_auto']),
  max_submissions: yup
    .number()
    .nullable()
    .min(1, 'Students must be able to at least submit once')
});

export const SettingsComponent = () => {
  const navigate = useNavigate();

  const { lectureId, assignmentId } = extractIdsFromBreadcrumbs();

  const { data: lecture } = useQuery<Lecture>({
    queryKey: ['lecture', lectureId],
    queryFn: () => getLecture(lectureId),
    enabled: !!lectureId
  });

  const { data: assignment } = useQuery<Assignment>({
    queryKey: ['assignment', assignmentId],
    queryFn: () => getAssignment(lectureId, assignmentId),
    enabled: !!lecture && !!assignmentId
  });

  const [checked, setChecked] = React.useState(assignment.settings.deadline !== null);
  const [checkedLimit, setCheckedLimit] = React.useState(
    Boolean(assignment.settings.max_submissions)
  );

  const validateLateSubmissions = (values: FormikValues) => {
    const late_submissions: ILateSubmissionInfo[] = getLateSubmissionInfo(
      values.settings.late_submission
    );
    const error = { late_submission: { days: {}, hours: {}, scaling: {} } };
    let nErrors = 0;
    for (let i = 0; i < late_submissions.length; i++) {
      const info = late_submissions[i];
      if (!Number.isInteger(info.days)) {
        error.late_submission.days[i] = 'days have to be whole numbers';
        nErrors++;
      }
      if (!Number.isInteger(info.hours)) {
        error.late_submission.hours[i] = 'hours have to be whole numbers';
        nErrors++;
      }
      if (info.days < 0) {
        error.late_submission.days[i] = 'days cannot be negative';
        nErrors++;
      }
      if (info.hours < 0) {
        error.late_submission.hours[i] = 'hours cannot be negative';
        nErrors++;
      }
      if (info.scaling <= 0 || info.scaling >= 1) {
        error.late_submission.scaling[i] =
          'scaling has to be between 0 and 1 exclusive';
        nErrors++;
      }
      if (parseFloat(info.scaling.toFixed(3)) !== info.scaling) {
        error.late_submission.scaling[i] =
          'scaling can only be specified up to 3 decimal points';
        nErrors++;
      }
      if (
        moment.duration({ days: info.days, hours: info.hours }) <=
        moment.duration(0)
      ) {
        error.late_submission.days[i] = 'period cannot be 0';
        error.late_submission.hours[i] = 'period cannot be 0';
        nErrors++;
      }
      if (i > 0) {
        const prevInfo = late_submissions[i - 1];
        if (
          moment.duration({ days: info.days, hours: info.hours }) <=
          moment.duration({
            days: prevInfo.days,
            hours: prevInfo.hours
          })
        ) {
          error.late_submission.days[i] = 'periods have to be increasing';
          error.late_submission.hours[i] = 'periods have to be increasing';
          nErrors++;
        }
        if (info.scaling >= prevInfo.scaling) {
          error.late_submission.scaling[i] = 'scaling has to decrease';
          nErrors++;
        }
      }
    }
    if (nErrors === 0) {
      // error object has to be empty, otherwise submit is blocked
      return {};
    }
    return error;
  };

  const formik = useFormik({
    initialValues: {
      name: assignment.name,
      due_date:
        assignment.settings.deadline !== null ? new Date(assignment.settings.deadline) : null,
      type: assignment.settings.assignment_type,
      autograde_type: assignment.settings.autograde_type,
      max_submissions: assignment.settings.max_submissions || null,
      allowed_files: assignment.settings.allowed_files || [],
      settings: { late_submission: assignment.settings.late_submission || [] }
    },
    validationSchema: validationSchema,
    onSubmit: values => {
      if (values.max_submissions !== null) {
        values.max_submissions = +values.max_submissions;
      }
      const updatedAssignment: Assignment = Object.assign(assignment, values);
      updateAssignment(lecture.id, updatedAssignment).then(
        async response => {
          await updateMenus(true);
          await queryClient.invalidateQueries({ queryKey: ['assignments'] });
          enqueueSnackbar('Successfully Updated Assignment', {
            variant: 'success'
          });
        },
        (error: Error) => {
          enqueueSnackbar(error.message, {
            variant: 'error'
          });
        }
      );
    },
    validate: validateLateSubmissions
  });

  return (
    <Box sx={{ m: 5, flex: 1, overflow: 'auto' }}>
      <SectionTitle title="Settings" />
      <form onSubmit={formik.handleSubmit}>
        <Stack spacing={2} sx={{ ml: 2, mr: 2 }}>
          <TextField
            variant="outlined"
            fullWidth
            id="name"
            name="name"
            label="Assignment Name"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={checked}
                  onChange={async e => {
                    setChecked(e.target.checked);
                    if (!e.target.checked) {
                      await formik.setFieldValue('due_date', null);
                    } else {
                      await formik.setFieldValue('due_date', new Date());
                    }
                  }}
                />
              }
              label="Set Deadline"
            />
            <DateTimePicker
              ampm={false}
              label="DateTimePicker"
              disabled={!checked}
              value={formik.values.due_date}
              onChange={(date: Date) => {
                formik.setFieldValue('due_date', date);
                if (new Date(date).getTime() < Date.now()) {
                  enqueueSnackbar('You selected date in past!', {
                    variant: 'warning'
                  });
                }
              }}
            />
          </LocalizationProvider>

          <FormControlLabel
            control={
              <Checkbox
                checked={checkedLimit}
                onChange={async e => {
                  setCheckedLimit(e.target.checked);
                  if (!e.target.checked) {
                    await formik.setFieldValue('max_submissions', null);
                  } else {
                    await formik.setFieldValue('max_submissions', 1);
                  }
                }}
              />
            }
            label="Limit Number of Submissions"
          />

          <TextField
            variant="outlined"
            fullWidth
            disabled={!checkedLimit}
            type={'number'}
            id="max-submissions"
            name="max_submissions"
            placeholder="Submissions"
            value={formik.values.max_submissions || null}
            InputProps={{ inputProps: { min: 1 } }}
            onChange={e => {
              formik.setFieldValue('max_submissions', +e.target.value);
            }}
            helperText={
              formik.touched.max_submissions && formik.errors.max_submissions
            }
            error={
              Boolean(formik.values.max_submissions) &&
              formik.values.max_submissions < 1
            }
          />

          <InputLabel id="demo-simple-select-label-auto">
            Auto-Grading Behaviour
            <Tooltip title={gradingBehaviourHelp}>
              <HelpOutlineOutlinedIcon
                fontSize={'small'}
                sx={{ ml: 1.5, mt: 1.0 }}
              />
            </Tooltip>
          </InputLabel>
          <TextField
            select
            id="assignment-type-select"
            value={formik.values.autograde_type}
            label="Auto-Grading Behaviour"
            placeholder="Grading"
            onChange={e => {
              formik.setFieldValue('automatic_grading', e.target.value);
            }}
          >
            <MenuItem value={'auto'}>Automatic Grading</MenuItem>
            <MenuItem value={'full_auto'}>Fully Automatic Grading</MenuItem>
            <MenuItem value={'unassisted'}>No Automatic Grading</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Checkbox
                //FIXME set default type to build: formik.values.allowed_files
                checked={false}
                onChange={async e => {
                  console.log(e.target.checked);
                  await formik.setFieldValue('allow_files', e.target.checked);
                }}
              />
            }
            label="Allow file upload by students"
          />

          <Stack direction={'column'} spacing={2}>
            <InputLabel>
              Late Submissions
              <Tooltip
                title={
                  'Late submissions are defined by a period (in days and hours) and a scaling factor. ' +
                  'When a submission falls in the late submission periods you specified, the scaling factor of the ' +
                  'last period that still matches the submission time is used to calculate the points of the submission by multiplying the total points by ' +
                  'that scaling factor. After the last late submission period is over, the submission is rejected precisely ' +
                  'the same way as if no late submission periods were specified.'
                }
              >
                <HelpOutlineOutlinedIcon
                  fontSize={'small'}
                  sx={{ ml: 1.5, mt: 1.0 }}
                />
              </Tooltip>
            </InputLabel>
            <Stack direction={'column'} spacing={2} sx={{ pl: 3 }}>
              {formik.values.due_date !== null ? (
                <LateSubmissionForm formik={formik} />
              ) : (
                <Typography sx={{ color: red[500] }}>
                  Deadline not set! To configure late submissions set a deadline
                  first!
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
        <Button
          sx={{ whiteSpace: 'nowrap', minWidth: 'auto', mt: 2 }}
          color="primary"
          variant="contained"
          type="submit"
        >
          Save changes
        </Button>
      </form>
    </Box>
  );
};
