import {
  AssignmentsCommandIDs,
  CourseManageCommandIDs,
  GlobalObjects
} from './index';
import { getAllLectures } from './services/lectures.service';
import { Lecture } from './model/lecture';
import { getAllAssignments } from './services/assignments.service';
import { AssignmentDetail } from './model/assignmentDetail';
import { Menu } from '@lumino/widgets';

export const getLabel = (assignment: AssignmentDetail | null) => {
  return assignment === null ? 'Overview' : assignment.name;
};

const getPath = (lecture: Lecture, assignment: AssignmentDetail | null) => {
  return assignment === null
    ? `/lecture/${lecture.id}`
    : `/lecture/${lecture.id}/assignment/${assignment.id}`;
};

export const updateMenus = async (reload: boolean = false) => {
  const aMenu = GlobalObjects.assignmentMenu;
  const cmMenu = GlobalObjects.courseManageMenu;
  const lectures = await getAllLectures(false, reload);
  const lectureAssignments = await Promise.all(
    lectures.map(async lecture => {
      const assignments = await getAllAssignments(lecture.id, reload);
      return { lecture, assignments };
    })
  );

  aMenu.clearItems();
  lectureAssignments.forEach(v => {
    const subMenu = new Menu({ commands: GlobalObjects.commands });
    subMenu.title.label = v.lecture.name;

    let path = getPath(v.lecture, null);
    let label = getLabel(null);
    subMenu.addItem({
      type: 'command',
      command: AssignmentsCommandIDs.open,
      args: { path, label }
    });

    v.assignments.forEach(a => {
      path = getPath(v.lecture, a);
      label = getLabel(a);
      subMenu.addItem({
        type: 'command',
        command: AssignmentsCommandIDs.open,
        args: { path, label }
      });
    });

    aMenu.addItem({
      type: 'submenu',
      submenu: subMenu
    });
  });
  aMenu.update();

  if (cmMenu) {
    cmMenu.clearItems();
    lectureAssignments.forEach(v => {
      const subMenu = new Menu({ commands: GlobalObjects.commands });
      subMenu.title.label = v.lecture.name;

      let path = getPath(v.lecture, null);
      let label = getLabel(null);
      subMenu.addItem({
        type: 'command',
        command: CourseManageCommandIDs.open,
        args: { path, label }
      });

      v.assignments.forEach(a => {
        path = getPath(v.lecture, a);
        label = getLabel(a);
        subMenu.addItem({
          type: 'command',
          command: CourseManageCommandIDs.open,
          args: { path, label }
        });
      });

      cmMenu.addItem({
        type: 'submenu',
        submenu: subMenu
      });
    });
    cmMenu.update();
  }
};
