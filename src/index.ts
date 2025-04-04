// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.
// noinspection TypeScriptValidateTypes

/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-prototype-builtins */
import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  Dialog,
  ICommandPalette,
  IThemeManager,
  MainAreaWidget,
  showDialog,
  showErrorMessage,
  WidgetTracker
} from '@jupyterlab/apputils';

import { ILauncher } from '@jupyterlab/launcher';
import {
  INotebookTools,
  INotebookTracker,
  Notebook,
  NotebookPanel
} from '@jupyterlab/notebook';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { CourseManageView } from './widgets/coursemanage';

import { Cell } from '@jupyterlab/cells';

import { Menu, PanelLayout } from '@lumino/widgets';

import { NotebookModeSwitch } from './components/notebook/slider';

import { checkIcon, editIcon, runIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents, ServiceManager } from '@jupyterlab/services';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { UserPermissions } from './services/permission.service';
import { AssignmentManageView } from './widgets/assignmentmanage';
import { CreationWidget } from './components/notebook/create-assignment/creation-widget';
import {
  listIcon,
  undoIcon
} from '@jupyterlab/ui-components/lib/icon/iconimports';
import { HintWidget } from './components/notebook/student-plugin/hint-widget';
import { DeadlineWidget } from './components/notebook/student-plugin/deadline-widget';
import { lectureSubPaths } from './services/file.service';
import IModel = Contents.IModel;
import { updateMenus } from './menu';
import { loadString } from './services/storage.service';


export namespace AssignmentsCommandIDs {
  export const create = 'assignments:create';

  export const open = 'assignments:open';
}

export namespace CourseManageCommandIDs {
  export const create = 'coursemanage:create';

  export const open = 'coursemanage:open';
}

namespace NotebookExecuteIDs {
  export const run = 'notebookplugin:run-cell';
}

namespace RevertCellIDs {
  export const revert = 'notebookplugin:revert-cell';
}

namespace ShowHintIDs {
  export const show = 'notebookplugin:show-hint';
}

export class GlobalObjects {
  static commands: CommandRegistry;
  static docRegistry: DocumentRegistry;
  static serviceManager: ServiceManager.IManager;
  static docManager: IDocumentManager;
  static browserFactory: IFileBrowserFactory;
  static tracker: INotebookTracker;
  static themeManager: IThemeManager;
  static assignmentMenu: Menu;
  static courseManageMenu: Menu;
}

const createCourseManagementOpenCommand = (app: JupyterFrontEnd, launcher: ILauncher, courseManageTracker: WidgetTracker<MainAreaWidget<CourseManageView>>) => {
  const command = CourseManageCommandIDs.open;
  app.commands.addCommand(command, {
    label: args =>
      args['label'] ? (args['label'] as string) : 'Course Management',
    execute: async args => {
      let gradingWidget = courseManageTracker.currentWidget;
      if (!gradingWidget) {
        gradingWidget = await app.commands.execute(
          CourseManageCommandIDs.create
        );
      }

      let path = args?.path as string;
      if (args?.path === undefined) {
        const savedPath = loadString('course-manage-react-router-path');
        if (savedPath !== null && savedPath !== '') {
          path = savedPath;
        } else {
          path = '/';
        }
      }
      await gradingWidget.content.router.navigate(path);

      if (!gradingWidget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(gradingWidget, 'main');
      }
      // Activate the widget
      app.shell.activateById(gradingWidget.id);
    },
    icon: args => (args['path'] ? undefined : checkIcon)
  });
  // Add the command to the launcher
  console.log('Add course management launcher');
  launcher.add({
    command: command,
    category: 'Assignments',
    rank: 0
  });
}

//Creation of in-cell widget for create assignment
const connectTrackerSignals = (tracker: INotebookTracker) => {
  tracker.currentChanged.connect(async () => {
    const notebookPanel = tracker.currentWidget;
    //Notebook not yet loaded
    if (notebookPanel === null) {
      return;
    }
    const notebook: Notebook = tracker.currentWidget.content;
    const mode = false;

    notebookPanel.context.ready.then(() => {
      //Creation of widget switch
      const switcher: NotebookModeSwitch = new NotebookModeSwitch(
        mode,
        notebookPanel,
        notebook
      );

      tracker.currentWidget.toolbar.insertItem(10, 'Mode', switcher);

      //Creation of deadline widget
      const deadlineWidget = new DeadlineWidget(
        tracker.currentWidget.context.path
      );
      tracker.currentWidget.toolbar.insertItem(
        11,
        'Deadline',
        deadlineWidget
        );
      });
    }, this);

  tracker.activeCellChanged.connect(() => {
    const notebookPanel: NotebookPanel = tracker.currentWidget;
    //Notebook not yet loaded
    if (notebookPanel === null) {
      return;
    }
    const notebook: Notebook = tracker.currentWidget.content;
    const contentsModel: Omit<IModel, 'content'> =
      notebookPanel.context.contentsModel;
    if (contentsModel === null) {
      return;
    }
    const notebookPaths: string[] = contentsModel.path.split('/');

    if (notebookPaths[lectureSubPaths + 1] === 'manualgrade') {
      return;
    }

    let switcher: any = null;
    (notebookPanel.toolbar.layout as PanelLayout).widgets.map(w => {
      if (w instanceof NotebookModeSwitch) {
        switcher = w;
      }
    });

    const cell: Cell = notebook.activeCell;

    //check if in creationmode and new cell was inserted
    if (
      switcher.mode &&
      (cell.layout as PanelLayout).widgets.every(w => {
        return !(w instanceof CreationWidget);
      })
    ) {
      (cell.layout as PanelLayout).insertWidget(
        0,
        new CreationWidget(cell)
      );
    }
  }, this);
};

/**
 * Initialization data for the grading extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'grader-labextension:plugin',
  autoStart: true,
  requires: [
    ICommandPalette,
    ILauncher,
    INotebookTools,
    IDocumentManager,
    IFileBrowserFactory,
    INotebookTracker,
    ILayoutRestorer,
    IThemeManager,
    IMainMenu
  ],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    launcher: ILauncher,
    nbtools: INotebookTools,
    docManager: IDocumentManager,
    browserFactory: IFileBrowserFactory,
    tracker: INotebookTracker,
    restorer: ILayoutRestorer,
    themeManager: IThemeManager,
    mainMenu: IMainMenu
  ) => {
    console.log('JupyterLab extension grader_labextension is activated!');
    console.log('JupyterFrontEnd:', app);
    console.log('ICommandPalette:', palette);
    console.log('Tracker', tracker);

    GlobalObjects.commands = app.commands;
    GlobalObjects.docRegistry = app.docRegistry;
    GlobalObjects.serviceManager = app.serviceManager;
    GlobalObjects.docManager = docManager;
    GlobalObjects.browserFactory = browserFactory;
    GlobalObjects.tracker = tracker;
    GlobalObjects.themeManager = themeManager;

    // this connects the color-scheme CSS of base.css to the Jupyterlab themeManager
    // the MUI theme provider is set in the corresponding widgets
    // the CSS color-scheme property only applies to native input elements automatically so this does only apply to those (i.e. notebook grading mode and creation mode)
    themeManager.themeChanged.connect(() => {
      document.documentElement.dataset.theme = themeManager.isLight(
        themeManager.theme
      )
        ? 'light'
        : 'dark';
    }, this);

    const assignmentTracker = new WidgetTracker<
      MainAreaWidget<AssignmentManageView>
    >({
      namespace: 'grader-assignments'
    });

    restorer.restore(assignmentTracker, {
      command: AssignmentsCommandIDs.open,
      name: () => 'grader-assignments'
    });

    const courseManageTracker = new WidgetTracker<
      MainAreaWidget<CourseManageView>
    >({
      namespace: 'grader-coursemanage'
    });

    restorer.restore(courseManageTracker, {
      command: CourseManageCommandIDs.open,
      name: () => 'grader-coursemanage'
    });

    /* ##### Course Manage View Widget ##### */
    let command: string = CourseManageCommandIDs.create;
    app.commands.addCommand(command, {
      execute: () => {
        // Create a blank content widget inside of a MainAreaWidget
        const gradingView = new CourseManageView();
        const gradingWidget = new MainAreaWidget<CourseManageView>({
          content: gradingView
        });
        gradingWidget.id = 'coursemanage-jupyterlab';
        gradingWidget.title.label = 'Course Management';
        gradingWidget.title.closable = true;

        courseManageTracker.add(gradingWidget);

        return gradingWidget;
      }
    });

    command = AssignmentsCommandIDs.create;
    app.commands.addCommand(command, {
      execute: () => {
        // Create a blank content widget inside a MainAreaWidget
        const assignmentView = new AssignmentManageView();
        const assignmentWidget = new MainAreaWidget<AssignmentManageView>({
          content: assignmentView
        });
        assignmentWidget.id = 'assignments-jupyterlab';
        assignmentWidget.title.label = 'Assignments';
        assignmentWidget.title.closable = true;

        assignmentTracker.add(assignmentWidget);

        return assignmentWidget;
      }
    });

    // If the user has no instructor roles in any lecture we do not display the course management
    UserPermissions.loadPermissions()
      .then(() => {
        const permissions = UserPermissions.getPermissions();
        let sum = 0;
        for (const el in permissions) {
          if (permissions.hasOwnProperty(el)) {
            sum += permissions[el];
          }
        }

        let cmMenu = null;
        if (sum !== 0) {
          console.log(
            'Non-student permissions found! Adding coursemanage launcher and connecting creation mode'
          );
          connectTrackerSignals(tracker);

          // add Menu to JupyterLab main menu
          cmMenu = new Menu({ commands: app.commands });
          cmMenu.title.label = 'Course Management';
          mainMenu.addMenu(cmMenu, false, { rank: 210 });

          createCourseManagementOpenCommand(app, launcher, courseManageTracker)
        }

        // add Menu to JupyterLab main menu
        const aMenu = new Menu({ commands: app.commands });
        aMenu.title.label = 'Assignments';
        mainMenu.addMenu(aMenu, false, { rank: 200 });

        GlobalObjects.assignmentMenu = aMenu;
        GlobalObjects.courseManageMenu = cmMenu;
        updateMenus();

        // only add assignment list if user permissions can be loaded
        command = AssignmentsCommandIDs.open;
        app.commands.addCommand(command, {
          label: args =>
            args['label'] ? (args['label'] as string) : 'Assignments',
          execute: async args => {
            let assignmentWidget = assignmentTracker.currentWidget;
            if (!assignmentWidget) {
              assignmentWidget = await app.commands.execute(
                AssignmentsCommandIDs.create
              );
            }

            let path = args?.path as string;
            if (args?.path === undefined) {
              const savedPath = loadString(
                'assignment-manage-react-router-path'
              );
              if (savedPath !== null && savedPath !== '') {
                path = savedPath;
              } else {
                path = '/';
              }
            }

            await assignmentWidget.content.router.navigate(path);

            if (!assignmentWidget.isAttached) {
              // Attach the widget to the main work area if it's not there
              app.shell.add(assignmentWidget, 'main');
            }
            // Activate the widget
            app.shell.activateById(assignmentWidget.id);
          },
          icon: args => (args['path'] ? undefined : editIcon)
        });

        // Add the command to the launcher
        console.log('Add assignment launcher');
        launcher.add({
          command: command,
          category: 'Assignments',
          rank: 0
        });
      })
      .catch((error: Error) => {
        showErrorMessage(
          'Grader Labextension Disabled',
          'Please restart your server: ' + error.message 
          )
        }  
      );

    command = NotebookExecuteIDs.run;
    app.commands.addCommand(command, {
      label: 'Run cell',
      execute: async () => {
        await app.commands.execute('notebook:run-cell');
      },
      icon: runIcon
    });

    command = RevertCellIDs.revert;
    app.commands.addCommand(command, {
      label: 'Revert cell',
      isVisible: () => {
        if (tracker.activeCell === null) {
          return false;
        }
        return tracker.activeCell.model.getMetadata('revert') !== null;
      },
      isEnabled: () => {
        if (tracker.activeCell === null) {
          return false;
        }
        return tracker.activeCell.model.getMetadata('revert') !== null;
      },
      execute: () => {
        showDialog({
          title: "Do you want to revert the cell to it's original state?",
          body: 'This will overwrite your current changes!',
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Revert' })]
        }).then(result => {
          if (!result.button.accept) {
            return;
          }
          tracker.activeCell.inputArea.model.sharedModel.setSource('');
          tracker.activeCell.inputArea.model.sharedModel.setSource(
            tracker.activeCell.model.getMetadata('revert').toString()
          );
        });
      },
      icon: undoIcon
    });

    command = ShowHintIDs.show;
    app.commands.addCommand(command, {
      label: 'Show hint',
      isVisible: () => {
        if (tracker.activeCell === null) {
          return false;
        }
        return tracker.activeCell.model.getMetadata('hint') !== null;
      },
      isEnabled: () => {
        if (tracker.activeCell === null) {
          return false;
        }
        return tracker.activeCell.model.getMetadata('hint') !== null;
      },
      execute: () => {
        let hintWidget: HintWidget = null;

        (tracker.activeCell.layout as PanelLayout).widgets.map(widget => {
          if (widget instanceof HintWidget) {
            hintWidget = widget;
          }
        });
        if (hintWidget === null) {
          (tracker.activeCell.layout as PanelLayout).addWidget(
            new HintWidget(
              tracker.activeCell.model.getMetadata('hint').toString()
            )
          );
        } else {
          hintWidget.toggleShowAlert();
          hintWidget.setHint(
            tracker.activeCell.model.getMetadata('hint').toString()
          );
          hintWidget.update();
        }
      },
      icon: listIcon
    });
  }
};
export default extension;
