# Copyright (c) 2022, TU Wien
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

import json
import os
import shutil
from http import HTTPStatus
from urllib.parse import unquote, quote
from tornado.web import HTTPError, authenticated

from grader_labextension.api.models.assignment import Assignment
from grader_labextension.api.models.assignment_settings import AssignmentSettings
from grader_labextension.api.models.lecture import Lecture
from grader_labextension.services.request import RequestServiceError
from grader_service.convert.converters.base import GraderConvertException
from grader_service.convert.converters.generate_assignment import GenerateAssignment
from .base_handler import ExtensionBaseHandler, cache
from ..api.models.submission import Submission
from ..registry import register_handler
from ..services.git import GitError, GitService
from tornado.httpclient import HTTPResponse


@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/generate\/?"
)
class GenerateHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/generate.
    """

    async def put(self, lecture_id: int, assignment_id: int):
        """Generates the release files from the source files of a assignment

        :param lecture_id: id of the lecture
        :type lecture_id: int
        :param assignment_id: id of the assignment
        :type assignment_id: int
        """
        try:
            lecture = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}",
                header=self.grader_authentication_header,
            )
            assignment = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}",
                header=self.grader_authentication_header,
            )
        except RequestServiceError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.message)
        code = lecture["code"]
        a_id = assignment["id"]

        output_dir = f"{self.root_dir}/{code}/release/{a_id}"
        os.makedirs(
            os.path.expanduser(output_dir),
            exist_ok=True,
        )

        generator = GenerateAssignment(
            input_dir=f"{self.root_dir}/{code}/source/{a_id}",
            output_dir=output_dir,
            file_pattern="*.ipynb",
            assignment_settings=AssignmentSettings(allowed_files=["*"]), # copy all files
        )
        generator.force = True
        generator.log = self.log

        try:
            # delete contents of output directory since we might have chosen to disallow files
            self.log.info("Deleting files in release directory")
            shutil.rmtree(output_dir)
            os.mkdir(output_dir)
        except Exception as e:
            self.log.error(e)
            raise HTTPError(HTTPStatus.INTERNAL_SERVER_ERROR, reason=str(e))

        self.log.info("Starting GenerateAssignment converter")
        try:
            generator.start()
        except Exception as e:
            self.log.error(e)
            raise HTTPError(HTTPStatus.CONFLICT, reason=str(e))
        try:
            gradebook_path = os.path.join(generator._output_directory, "gradebook.json")
            os.remove(gradebook_path)
            self.log.info(f"Successfully deleted {gradebook_path}")
        except OSError as e:
            self.log.error(f"Could delete {gradebook_path}! Error: {e.strerror}")
        self.log.info("GenerateAssignment conversion done")
        self.write({"status": "OK"})


@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/remote-file-status\/(?P<repo>\w*)\/?"
)
class GitRemoteFileStatusHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/remote-file-status/{repo}.
    """

    @authenticated
    async def get(self, lecture_id: int, assignment_id: int, repo: str):
        if repo not in {"assignment", "source", "release"}:
            self.log.error(HTTPStatus.NOT_FOUND)
            raise HTTPError(
                HTTPStatus.NOT_FOUND, reason=f"Repository {repo} does not exist"
            )
        lecture = await self.get_lecture(lecture_id)
        assignment = await self.get_assignment(lecture_id, assignment_id)
        file_path = self.get_query_argument('file')  # Retrieve the file path from the query parameters
        git_service = GitService(
            server_root_dir=self.root_dir,
            lecture_code=lecture["code"],
            assignment_id=assignment["id"],
            repo_type=repo,
            config=self.config,
            force_user_repo=True if repo == "release" else False,
        )
        try:
            if not git_service.is_git():
                git_service.init()
                git_service.set_author(author=self.user_name)
            git_service.set_remote(f"grader_{repo}")
            git_service.fetch_all()
            status = git_service.check_remote_file_status(file_path)
            self.log.info(f"File {file_path} status: {status}")
        except GitError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.error)
        response = json.dumps({"status": status.name})
        self.write(response)


@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/remote-status\/(?P<repo>\w*)\/?"
)
class GitRemoteStatusHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/remote_status/{repo}.
    """

    @authenticated
    async def get(self, lecture_id: int, assignment_id: int, repo: str):
        if repo not in {"assignment", "source", "release"}:
            self.log.error(HTTPStatus.NOT_FOUND)
            raise HTTPError(
                HTTPStatus.NOT_FOUND, reason=f"Repository {repo} does not exist"
            )
        lecture = await self.get_lecture(lecture_id)
        assignment = await self.get_assignment(lecture_id, assignment_id)
        git_service = GitService(
            server_root_dir=self.root_dir,
            lecture_code=lecture["code"],
            assignment_id=assignment["id"],
            repo_type=repo,
            config=self.config,
            force_user_repo=True if repo == "release" else False,
        )
        try:
            if not git_service.is_git():
                git_service.init()
                git_service.set_author(author=self.user_name)
            git_service.set_remote(f"grader_{repo}")
            git_service.fetch_all()
            status = git_service.check_remote_status(f"grader_{repo}", "main")
        except GitError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.error)
        response = json.dumps({"status": status.name})
        self.write(response)


@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/log\/(?P<repo>\w*)\/?"
)
class GitLogHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/log/{repo}.
    """
    @authenticated
    async def get(self, lecture_id: int, assignment_id: int, repo: str):
        """
        Sends a GET request to the grader service to get the logs of a given repo.

        :param lecture_id: id of the lecture
        :param assignment_id: id of the assignment
        :param repo: repo name
        :return: logs of git repo
        """
        if repo not in {"assignment", "source", "release"}:
            self.log.error(HTTPStatus.NOT_FOUND)
            raise HTTPError(
                HTTPStatus.NOT_FOUND, reason=f"Repository {repo} does not exist"
            )
        n_history = int(self.get_argument("n", "10"))
        try:
            lecture = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}",
                header=self.grader_authentication_header,
            )
            assignment = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}",
                header=self.grader_authentication_header,
            )
        except RequestServiceError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.message)

        git_service = GitService(
            server_root_dir=self.root_dir,
            lecture_code=lecture["code"],
            assignment_id=assignment["id"],
            repo_type=repo,
            config=self.config,
            force_user_repo=True if repo == "release" else False,
        )
        try:
            if not git_service.is_git():
                git_service.init()
                git_service.set_author(author=self.user_name)
            git_service.set_remote(f"grader_{repo}")
            git_service.fetch_all()
            if git_service.local_branch_exists("main"):  # at least main should exist
                logs = git_service.get_log(n_history)
            else:
                logs = []
        except GitError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.error)

        self.write(json.dumps(logs))


@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/pull\/(?P<repo>\w*)\/?"
)
class PullHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/pull/{repo}.
    """

    @authenticated
    async def get(self, lecture_id: int, assignment_id: int, repo: str):
        """Creates a local repository and pulls the specified repo type

        :param lecture_id: id of the lecture
        :type lecture_id: int
        :param assignment_id: id of the assignment
        :type assignment_id: int
        :param repo: type of the repository
        :type repo: str
        """
        if repo not in {"assignment", "source", "release", "edit", "feedback"}:
            self.log.error(HTTPStatus.NOT_FOUND)
            raise HTTPError(
                HTTPStatus.NOT_FOUND, reason=f"Repository {repo} does not exist"
            )

        # Submission id needed for edit repository
        sub_id = self.get_argument("subid", None)

        try:
            lecture = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}",
                header=self.grader_authentication_header,
            )
            assignment = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}",
                header=self.grader_authentication_header,
            )
        except RequestServiceError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.message)

        git_service = GitService(
            server_root_dir=self.root_dir,
            lecture_code=lecture["code"],
            assignment_id=assignment["id"],
            repo_type=repo,
            config=self.config,
            force_user_repo=repo == "release",
            sub_id=sub_id,
            log=self.log
        )
        try:
            if not git_service.is_git():
                git_service.init()
                git_service.set_author(author=self.user_name)
            git_service.set_remote(f"grader_{repo}", sub_id=sub_id)
            git_service.pull(f"grader_{repo}", force=True)
            self.write({"status": "OK"})
        except GitError as e:
            self.log.error("GitError:\n" + e.error)
            raise HTTPError(e.code, reason=e.error)


@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/push\/(?P<repo>\w*)\/?"
)
class PushHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/push/{repo}.
    """

    async def put(self, lecture_id: int, assignment_id: int, repo: str):
        """Pushes from the local repositories to remote
        If the repo type is release, it also generates the release files and updates the assignment properties in the grader service

        :param lecture_id: id of the lecture
        :type lecture_id: int
        :param assignment_id: id of the assignment
        :type assignment_id: int
        :param repo: type of the repository
        :type repo: str
        """
        if repo not in {"assignment", "source", "release", "edit"}:
            self.write_error(404)

        # Extract request parameters
        sub_id, commit_message, selected_files, submit, username = self._extract_request_params()

        # Validate commit message for 'source' repo
        if repo == "source":
            self._validate_commit_message(commit_message)

        # Fetch lecture and assignment data
        lecture, assignment = await self._fetch_lecture_and_assignment(lecture_id, assignment_id)

        # Handle 'edit' repo
        if repo == "edit":
            sub_id = await self._handle_edit_repo(lecture_id, assignment_id, sub_id, username)

        # Initialize GitService
        git_service = self._initialize_git_service(lecture, assignment, repo, sub_id, username)

        # Handle 'release' repo
        if repo == "release":
            await self._handle_release_repo(git_service, lecture, assignment, lecture_id, assignment_id, selected_files)

        # Perform Git operations
        await self._perform_git_operations(git_service, repo, commit_message, selected_files, sub_id)

        # Handle submission for 'assignment' repo
        if submit and repo == "assignment":
            await self._submit_assignment(git_service, lecture_id, assignment_id)

        self.write({"status": "OK"})

    def _extract_request_params(self):
        sub_id = self.get_argument("subid", None)
        commit_message = self.get_argument("commit-message", None)
        selected_files = self.get_arguments("selected-files")
        submit = self.get_argument("submit", "false") == "true"
        username = self.get_argument("for_user", None)
        return sub_id, commit_message, selected_files, submit, username

    def _validate_commit_message(self, commit_message):
        if not commit_message:
            self.log.error("Commit message was not found")
            raise HTTPError(HTTPStatus.NOT_FOUND, reason="Commit message was not found")

    async def _fetch_lecture_and_assignment(self, lecture_id, assignment_id):
        try:
            lecture = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}",
                header=self.grader_authentication_header,
            )
            assignment = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}",
                header=self.grader_authentication_header,
            )
            return lecture, assignment
        except RequestServiceError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.message)

    async def _handle_edit_repo(self, lecture_id, assignment_id, sub_id, username):
        if sub_id is None:
            submission = Submission(commit_hash="0" * 40)
            response = await self.request_service.request(
                "POST",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}/submissions",
                body=submission.to_dict(),
                header=self.grader_authentication_header,
            )
            submission = Submission.from_dict(response)
            submission.submitted_at = response["submitted_at"]
            submission.username = username
            submission.edited = True
            await self.request_service.request(
                "PUT",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}/submissions/{submission.id}",
                body=submission.to_dict(),
                header=self.grader_authentication_header,
            )
            self.log.info(f"Created submission {submission.id} for user {username} and pushing to edit repo...")
            return str(submission.id)
        return sub_id

    def _initialize_git_service(self, lecture, assignment, repo, sub_id, username):
        return GitService(
            server_root_dir=self.root_dir,
            lecture_code=lecture["code"],
            assignment_id=assignment["id"],
            repo_type=repo,
            config=self.config,
            sub_id=sub_id,
            username=username
        )

    async def _handle_release_repo(self, git_service, lecture, assignment, lecture_id, assignment_id, selected_files):
        git_service.delete_repo_contents(include_git=True)
        src_path = GitService(
            self.root_dir,
            lecture["code"],
            assignment["id"],
            repo_type="source",
            config=self.config,
        ).path

        if selected_files:
            self.log.info(f"Selected files to push to release repo: {selected_files}")

        git_service.copy_repo_contents(src=src_path, selected_files=selected_files)

        generator = self._initialize_generator(src_path, git_service.path)
        await self._generate_release_files(generator, git_service.path)

        gradebook_path = os.path.join(git_service.path, "gradebook.json")
        await self._update_assignment_properties(gradebook_path, lecture_id, assignment_id)

        try:
            os.remove(gradebook_path)
            self.log.info(f"Successfully deleted {gradebook_path}")
        except OSError as e:
            self.log.error(f"Cannot delete {gradebook_path}! Error: {e.strerror}\nAborting push!")
            raise HTTPError(
                HTTPStatus.CONFLICT,
                reason=f"Cannot delete {gradebook_path}! Error: {e.strerror}\nAborting push!",
            )

    def _initialize_generator(self, src_path, output_path):
        generator = GenerateAssignment(
            input_dir=src_path,
            output_dir=output_path,
            file_pattern="*.ipynb",
            assignment_settings=AssignmentSettings(allowed_files=["*"]), # copy all files from source regardless of assignment settings
        )
        generator.force = True
        generator.log = self.log
        return generator

    async def _generate_release_files(self, generator, output_path):
        try:
            shutil.rmtree(output_path)
            os.mkdir(output_path)
        except Exception as e:
            self.log.error(e)
            raise HTTPError(HTTPStatus.INTERNAL_SERVER_ERROR, reason=str(e))

        self.log.info("Starting GenerateAssignment converter")
        try:
            generator.start()
            self.log.info("GenerateAssignment conversion done")
        except GraderConvertException as e:
            self.log.error("Converting failed: Error converting notebook!", exc_info=True)
            raise HTTPError(HTTPStatus.CONFLICT, reason=str(e))

    async def _update_assignment_properties(self, gradebook_path, lecture_id, assignment_id):
        try:
            with open(gradebook_path, "r") as f:
                gradebook_json = json.load(f)

            response = await self.request_service.request(
                "PUT",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}/properties",
                header=self.grader_authentication_header,
                body=gradebook_json,
                decode_response=False,
            )
            if response.code == 200:
                self.log.info("Properties set for assignment")
            else:
                self.log.error(f"Could not set assignment properties! Error code {response.code}")
        except FileNotFoundError:
            self.log.error(f"Cannot find gradebook file: {gradebook_path}")
            raise HTTPError(HTTPStatus.NOT_FOUND, reason=f"Cannot find gradebook file: {gradebook_path}")

    async def _perform_git_operations(self, git_service: GitService, repo: str, commit_message: str, selected_files, sub_id=None):
        try:
            if not git_service.is_git():
                git_service.init()
                git_service.set_author(author=self.user_name)
            git_service.set_remote(f"grader_{repo}", sub_id)
        except GitError as e:
            self.log.error("git error during git initiation process:" + e.error)
            raise HTTPError(e.code, reason=e.error)

        try:
            git_service.commit(message=commit_message, selected_files=selected_files)
        except GitError as e:
            self.log.error("git error during commit process:" + e.error)
            raise HTTPError(e.code, reason=e.error)

        try:
            git_service.push(f"grader_{repo}", force=True)
        except GitError as e:
            self.log.error("git error during push process:" + e.error)
            git_service.undo_commit()
            raise HTTPError(e.code, reason=str(e.error))

    async def _submit_assignment(self, git_service, lecture_id, assignment_id):
        self.log.info(f"Submitting assignment {assignment_id}!")
        try:
            latest_commit_hash = git_service.get_log(history_count=1)[0]["commit"]
            submission = Submission(commit_hash=latest_commit_hash)
            response = await self.request_service.request(
                "POST",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}/submissions",
                body=submission.to_dict(),
                header=self.grader_authentication_header,
            )
            self.write(json.dumps(response))
        except (KeyError, IndexError) as e:
            self.log.error(e)
            raise HTTPError(HTTPStatus.INTERNAL_SERVER_ERROR, reason=str(e))
        except RequestServiceError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.message)



@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/reset\/?"
)
class ResetHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/reset.
    """

    @authenticated
    async def get(self, lecture_id: int, assignment_id: int):
        """
        Sends a GET request to the grader service that resets the user repo.

        :param lecture_id: id of the lecture
        :param assignment_id: id of the assignment
        :return: void
        """
        try:
            await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}/reset",
                header=self.grader_authentication_header,
            )
        except RequestServiceError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.message)
        self.write({"status": "OK"})


@register_handler(
    path=r"api\/lectures\/(?P<lecture_id>\d*)\/assignments\/(?P<assignment_id>\d*)\/restore\/(?P<commit_hash>\w*)\/?"
)
class RestoreHandler(ExtensionBaseHandler):
    @authenticated
    async def get(self, lecture_id: int, assignment_id: int, commit_hash: str):

        try:
            lecture = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}",
                header=self.grader_authentication_header,
            )
            assignment = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}",
                header=self.grader_authentication_header,
            )
        except RequestServiceError as e:
            self.log.error(e)
            raise HTTPError(e.code, reason=e.message)

        git_service = GitService(
            server_root_dir=self.root_dir,
            lecture_code=lecture["code"],
            assignment_id=assignment["id"],
            repo_type="assignment",
            config=self.config,
            force_user_repo=False,
            sub_id=None,
        )
        try:
            if not git_service.is_git():
                git_service.init()
                git_service.set_author(author=self.user_name)
            git_service.set_remote("grader_assignment")
            # first reset by pull so there are no changes in the repository before reverting
            git_service.pull("grader_assignment", force=True)
            git_service.revert(commit_hash=commit_hash)
            git_service.push("grader_assignment")
            self.write({"status": "OK"})
        except GitError as e:
            self.log.error("GitError:\n" + e.error)
            raise HTTPError(e.code, reason=e.error)


@register_handler(
    path=r"\/(?P<lecture_id>\d*)\/(?P<assignment_id>\d*)\/(?P<notebook_name>.*)"
)
class NotebookAccessHandler(ExtensionBaseHandler):
    """
    Tornado Handler class for http requests to /lectures/{lecture_id}/assignments/{assignment_id}/{notebook_name}.
    """

    @authenticated
    async def get(self, lecture_id: int, assignment_id: int, notebook_name: str):
        """
        Sends a GET request to the grader service to access notebook and redirect to it.
        :param lecture_id: id of the lecture
        :param assignment_id: id of the assignment
        :param notebook_name: notebook name
        :return: void
        """
        notebook_name = unquote(notebook_name)

        try:
            lecture = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}",
                header=self.grader_authentication_header,
            )
            assignment = await self.request_service.request(
                "GET",
                f"{self.service_base_url}api/lectures/{lecture_id}/assignments/{assignment_id}",
                header=self.grader_authentication_header,
            )
        except RequestServiceError as e:
            self.set_status(e.code)
            self.write_error(e.code)
            return

        git_service = GitService(
            server_root_dir=self.root_dir,
            lecture_code=lecture["code"],
            assignment_id=assignment["id"],
            repo_type="release",
            config=self.config,
            force_user_repo=True,
        )

        if not git_service.is_git():
            try:
                git_service.init()
                git_service.set_author(author=self.user_name)
                git_service.set_remote(f"grader_release")
                git_service.pull(f"grader_release", force=True)
                self.write({"status": "OK"})
            except GitError as e:
                self.log.error("GitError:\n" + e.error)
                self.write_error(400)

        try:
            username = self.get_current_user()["name"]
        except TypeError as e:
            self.log.error(e)
            raise HTTPError(HTTPStatus.INTERNAL_SERVER_ERROR, reason=str(e))

        url = f'/user/{username}/lab/tree/{lecture["code"]}/{assignment["id"]}/{quote(notebook_name)}'
        self.log.info(f"Redirecting to {url}")
        self.redirect(url)
