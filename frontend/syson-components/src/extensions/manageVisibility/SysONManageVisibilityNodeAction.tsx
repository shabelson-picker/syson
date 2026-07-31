/*******************************************************************************
 * Copyright (c) 2026 Contributors to the Eclipse SysON project.
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *******************************************************************************/

import {
  ACTION_ICON_SIZE,
  ActionProps,
  ManageVisibilityContext,
  ManageVisibilityContextValue,
} from '@eclipse-sirius/sirius-components-diagrams';
import VisibilityIcon from '@mui/icons-material/Visibility';
import IconButton from '@mui/material/IconButton';
import { Theme } from '@mui/material/styles';
import { MouseEvent as ReactMouseEvent, useContext } from 'react';
import { makeStyles } from 'tss-react/mui';

const useToolStyle = makeStyles()((theme: Theme) => ({
  actionIcon: {
    alignSelf: 'start',
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
  },
}));

/**
 * The manage visibility dialog is positioned with its top-left corner on the click coordinates, so it
 * opens directly underneath the pointer and covers the very icon that was clicked. The node then loses
 * the hover state, the actions bar unmounts, and a second click on the same spot lands inside the dialog
 * and merely closes it again - which is why the action looks like it only works every other time.
 *
 * Shifting the coordinates handed to openDialog moves the dialog down and to the right of the icon, so
 * the pointer stays outside of it and the node keeps its hover state.
 */
const DIALOG_OFFSET_X = 16;

const DIALOG_OFFSET_Y = 60;

export const SysONManageVisibilityNodeAction = ({ diagramElementId }: ActionProps) => {
  const { openDialog } = useContext<ManageVisibilityContextValue>(ManageVisibilityContext);
  const { classes } = useToolStyle();

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
    // Keep the click from also selecting the node: a selected node renders its resize controls over
    // the same corner, which makes the icon harder to reach on the next attempt.
    event.stopPropagation();
    const offsetEvent = {
      clientX: event.clientX + DIALOG_OFFSET_X,
      clientY: event.clientY + DIALOG_OFFSET_Y,
    } as ReactMouseEvent<HTMLButtonElement, MouseEvent>;
    openDialog(offsetEvent, diagramElementId);
  };

  return (
    <IconButton
      className={classes.actionIcon}
      size="small"
      color="inherit"
      aria-label="Manage visibility"
      title="Manage visibility"
      onClick={handleClick}
      data-testid="manage-visibility">
      <VisibilityIcon sx={{ fontSize: ACTION_ICON_SIZE }} />
    </IconButton>
  );
};
