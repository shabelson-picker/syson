/*******************************************************************************
 * Copyright (c) 2026 Contributors to the Eclipse SysON project.
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *******************************************************************************/

import { gql, useMutation } from '@apollo/client';
import { DiagramToolbarActionProps, NodeData } from '@eclipse-sirius/sirius-components-diagrams';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { Node, useNodes } from '@xyflow/react';
import { useState } from 'react';

const hideDiagramElementMutation = gql`
  mutation hideDiagramElement($input: HideDiagramElementInput!) {
    hideDiagramElement(input: $input) {
      __typename
      ... on ErrorPayload {
        messages {
          body
          level
        }
      }
    }
  }
`;

/**
 * The same three commands as the Manage visibility menu of a single graphical node, applied to every
 * node of the diagram in one go. They are one-off commands, not a setting: nothing is remembered, and
 * the user stays free to adjust individual nodes afterwards.
 *
 * Like the per-node menu, they act on the children of each node - the graphical nodes sitting on the
 * diagram background are left alone, so the diagram never ends up empty.
 */
export const SysONVisibilityCommands = ({ editingContextId, diagramId }: DiagramToolbarActionProps) => {
  const nodes = useNodes<Node<NodeData>>();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const [hideDiagramElement] = useMutation(hideDiagramElementMutation);

  const closeMenu = () => setAnchorEl(null);

  const setHidden = (elementIds: string[], hide: boolean) =>
    elementIds.length > 0
      ? hideDiagramElement({
          variables: {
            input: { id: crypto.randomUUID(), editingContextId, representationId: diagramId, elementIds, hide },
          },
        })
      : Promise.resolve();

  const children = nodes.filter((node) => !!node.parentId);

  const hideAll = async () => {
    closeMenu();
    await setHidden(
      children.map((node) => node.id),
      true
    );
  };

  const revealAll = async () => {
    closeMenu();
    await setHidden(
      nodes.map((node) => node.id),
      false
    );
  };

  const revealValuedContent = async () => {
    closeMenu();
    const parentIds = new Set(children.map((node) => node.parentId));
    const valued = children.filter((node) => parentIds.has(node.id));
    const empty = children.filter((node) => !parentIds.has(node.id));

    // Hide first and reveal second, so that a node holding content always wins over the pass that
    // hides the empty ones.
    await setHidden(
      empty.map((node) => node.id),
      true
    );
    await setHidden(
      valued.map((node) => node.id),
      false
    );
  };

  return (
    <span>
      <Tooltip title="Visibility of all elements" placement="right">
        <IconButton
          data-testid="syson-visibility-commands-icon"
          color="inherit"
          size="small"
          aria-haspopup="true"
          onClick={(event) => setAnchorEl(event.currentTarget)}>
          <VisibilityOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        data-testid="syson-visibility-commands-menu"
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={closeMenu}>
        <MenuItem data-testid="syson-visibility-commands-hide-all" onClick={hideAll}>
          <ListItemText primary="Hide all content" secondary="On every graphical node" />
        </MenuItem>
        <MenuItem data-testid="syson-visibility-commands-reveal-all" onClick={revealAll}>
          <ListItemText primary="Reveal all content" secondary="On every graphical node" />
        </MenuItem>
        <MenuItem data-testid="syson-visibility-commands-reveal-valued" onClick={revealValuedContent}>
          <ListItemText primary="Reveal valued content only" secondary="Hide what is empty, on every graphical node" />
        </MenuItem>
      </Menu>
    </span>
  );
};
