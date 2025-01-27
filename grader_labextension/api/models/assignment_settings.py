from datetime import date, datetime  # noqa: F401

from typing import List, Dict  # noqa: F401

from grader_labextension.api.models.base_model import Model
from grader_labextension.api.models.submission_period import SubmissionPeriod
from grader_labextension.api import util

from grader_labextension.api.models.submission_period import SubmissionPeriod  # noqa: E501

class AssignmentSettings(Model):
    """NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).

    Do not edit the class manually.
    """

    def __init__(self, deadline=None, assignment_type=None, max_submissions=None, allowed_files=None, late_submission=None, autograde_type=None):  # noqa: E501
        """AssignmentSettings - a model defined in OpenAPI

        :param deadline: The deadline of this AssignmentSettings.  # noqa: E501
        :type deadline: datetime
        :param assignment_type: The assignment_type of this AssignmentSettings.  # noqa: E501
        :type assignment_type: str
        :param max_submissions: The max_submissions of this AssignmentSettings.  # noqa: E501
        :type max_submissions: int
        :param allowed_files: The allowed_files of this AssignmentSettings.  # noqa: E501
        :type allowed_files: List[str]
        :param late_submission: The late_submission of this AssignmentSettings.  # noqa: E501
        :type late_submission: List[SubmissionPeriod]
        :param autograde_type: The autograde_type of this AssignmentSettings.  # noqa: E501
        :type autograde_type: str
        """
        self.openapi_types = {
            'deadline': datetime,
            'assignment_type': str,
            'max_submissions': int,
            'allowed_files': List[str],
            'late_submission': List[SubmissionPeriod],
            'autograde_type': str
        }

        self.attribute_map = {
            'deadline': 'deadline',
            'assignment_type': 'assignment_type',
            'max_submissions': 'max_submissions',
            'allowed_files': 'allowed_files',
            'late_submission': 'late_submission',
            'autograde_type': 'autograde_type'
        }

        self._deadline = deadline
        self._assignment_type = assignment_type
        self._max_submissions = max_submissions
        self._allowed_files = allowed_files
        self._late_submission = late_submission
        self._autograde_type = autograde_type

    @classmethod
    def from_dict(cls, dikt) -> 'AssignmentSettings':
        """Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The AssignmentSettings of this AssignmentSettings.  # noqa: E501
        :rtype: AssignmentSettings
        """
        return util.deserialize_model(dikt, cls)

    @property
    def deadline(self) -> datetime:
        """Gets the deadline of this AssignmentSettings.


        :return: The deadline of this AssignmentSettings.
        :rtype: datetime
        """
        return self._deadline

    @deadline.setter
    def deadline(self, deadline: datetime):
        """Sets the deadline of this AssignmentSettings.


        :param deadline: The deadline of this AssignmentSettings.
        :type deadline: datetime
        """

        self._deadline = deadline

    @property
    def assignment_type(self) -> str:
        """Gets the assignment_type of this AssignmentSettings.


        :return: The assignment_type of this AssignmentSettings.
        :rtype: str
        """
        return self._assignment_type

    @assignment_type.setter
    def assignment_type(self, assignment_type: str):
        """Sets the assignment_type of this AssignmentSettings.


        :param assignment_type: The assignment_type of this AssignmentSettings.
        :type assignment_type: str
        """
        allowed_values = ["user", "group"]  # noqa: E501
        if assignment_type not in allowed_values:
            raise ValueError(
                "Invalid value for `assignment_type` ({0}), must be one of {1}"
                .format(assignment_type, allowed_values)
            )

        self._assignment_type = assignment_type

    @property
    def max_submissions(self) -> int:
        """Gets the max_submissions of this AssignmentSettings.


        :return: The max_submissions of this AssignmentSettings.
        :rtype: int
        """
        return self._max_submissions

    @max_submissions.setter
    def max_submissions(self, max_submissions: int):
        """Sets the max_submissions of this AssignmentSettings.


        :param max_submissions: The max_submissions of this AssignmentSettings.
        :type max_submissions: int
        """

        self._max_submissions = max_submissions

    @property
    def allowed_files(self) -> List[str]:
        """Gets the allowed_files of this AssignmentSettings.


        :return: The allowed_files of this AssignmentSettings.
        :rtype: List[str]
        """
        return self._allowed_files

    @allowed_files.setter
    def allowed_files(self, allowed_files: List[str]):
        """Sets the allowed_files of this AssignmentSettings.


        :param allowed_files: The allowed_files of this AssignmentSettings.
        :type allowed_files: List[str]
        """

        self._allowed_files = allowed_files

    @property
    def late_submission(self) -> List[SubmissionPeriod]:
        """Gets the late_submission of this AssignmentSettings.


        :return: The late_submission of this AssignmentSettings.
        :rtype: List[SubmissionPeriod]
        """
        return self._late_submission

    @late_submission.setter
    def late_submission(self, late_submission: List[SubmissionPeriod]):
        """Sets the late_submission of this AssignmentSettings.


        :param late_submission: The late_submission of this AssignmentSettings.
        :type late_submission: List[SubmissionPeriod]
        """

        self._late_submission = late_submission

    @property
    def autograde_type(self) -> str:
        """Gets the autograde_type of this AssignmentSettings.


        :return: The autograde_type of this AssignmentSettings.
        :rtype: str
        """
        return self._autograde_type

    @autograde_type.setter
    def autograde_type(self, autograde_type: str):
        """Sets the autograde_type of this AssignmentSettings.


        :param autograde_type: The autograde_type of this AssignmentSettings.
        :type autograde_type: str
        """
        allowed_values = ["auto", "full_auto", "unassisted"]  # noqa: E501
        if autograde_type not in allowed_values:
            raise ValueError(
                "Invalid value for `autograde_type` ({0}), must be one of {1}"
                .format(autograde_type, allowed_values)
            )

        self._autograde_type = autograde_type
