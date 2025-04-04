from datetime import date, datetime  # noqa: F401

from typing import List, Dict  # noqa: F401

from grader_labextension.api.models.base_model import Model
from grader_labextension.api import util


class RemoteFileStatus(Model):
    """NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).

    Do not edit the class manually.
    """

    def __init__(self, status=None):  # noqa: E501
        """RemoteFileStatus - a model defined in OpenAPI

        :param status: The status of this RemoteFileStatus.  # noqa: E501
        :type status: str
        """
        self.openapi_types = {
            'status': str
        }

        self.attribute_map = {
            'status': 'status'
        }

        self._status = status

    @classmethod
    def from_dict(cls, dikt) -> 'RemoteFileStatus':
        """Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The RemoteFileStatus of this RemoteFileStatus.  # noqa: E501
        :rtype: RemoteFileStatus
        """
        return util.deserialize_model(dikt, cls)

    @property
    def status(self) -> str:
        """Gets the status of this RemoteFileStatus.


        :return: The status of this RemoteFileStatus.
        :rtype: str
        """
        return self._status

    @status.setter
    def status(self, status: str):
        """Sets the status of this RemoteFileStatus.


        :param status: The status of this RemoteFileStatus.
        :type status: str
        """
        allowed_values = ["UP_TO_DATE", "DIVERGENT", "PULL_NEEDED", "PUSH_NEEDED", "NO_REMOTE_REPO"]  # noqa: E501
        if status not in allowed_values:
            raise ValueError(
                "Invalid value for `status` ({0}), must be one of {1}"
                .format(status, allowed_values)
            )

        self._status = status
