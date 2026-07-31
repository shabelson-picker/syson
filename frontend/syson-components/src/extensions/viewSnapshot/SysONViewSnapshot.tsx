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
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import Divider from '@mui/material/Divider';
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

const layoutDiagramMutation = gql`
  mutation layoutDiagram($input: LayoutDiagramInput!) {
    layoutDiagram(input: $input) {
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

interface SnapshotNode {
  id: string;
  hidden: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  resizedByUser: boolean;
}

interface Snapshot {
  diagramId: string;
  savedAt: string;
  nodes: SnapshotNode[];
}

// The diagram contents only exist in the running page - editingContext.representation returns
// metadata only - so a snapshot is taken from the live React Flow nodes and kept in localStorage,
// which survives page reloads and server restarts.
const storageKey = (diagramId: string): string => `syson.viewSnapshot.${diagramId}`;

const readSnapshot = (diagramId: string): Snapshot | null => {
  const raw = localStorage.getItem(storageKey(diagramId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
};

export const SysONViewSnapshot = ({ editingContextId, diagramId }: DiagramToolbarActionProps) => {
  const nodes = useNodes<Node<NodeData>>();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => readSnapshot(diagramId));

  const [hideDiagramElement] = useMutation(hideDiagramElementMutation);
  const [layoutDiagram] = useMutation(layoutDiagramMutation);

  const closeMenu = () => setAnchorEl(null);

  const freeze = () => {
    const taken: Snapshot = {
      diagramId,
      savedAt: new Date().toISOString(),
      nodes: nodes.map((node) => {
        const data = node.data as NodeData & { minComputedWidth?: number; minComputedHeight?: number; resizedByUser?: boolean };
        const width = node.width ?? node.measured?.width ?? 0;
        const height = node.height ?? node.measured?.height ?? 0;
        return {
          id: node.id,
          hidden: !!node.hidden,
          x: node.position?.x ?? 0,
          y: node.position?.y ?? 0,
          width,
          height,
          minWidth: data?.minComputedWidth ?? width,
          minHeight: data?.minComputedHeight ?? height,
          resizedByUser: !!data?.resizedByUser,
        };
      }),
    };
    localStorage.setItem(storageKey(diagramId), JSON.stringify(taken));
    setSnapshot(taken);
    closeMenu();
  };

  const restore = async () => {
    closeMenu();
    if (!snapshot) {
      return;
    }
    const live = new Set(nodes.map((node) => node.id));
    const known = snapshot.nodes.filter((node) => live.has(node.id));

    const setHidden = (elementIds: string[], hide: boolean) =>
      elementIds.length > 0
        ? hideDiagramElement({
            variables: { input: { id: crypto.randomUUID(), editingContextId, representationId: diagramId, elementIds, hide } },
          })
        : Promise.resolve();

    // Hide first and reveal second: revealing a compartment can hide the tree nodes duplicating its
    // contents, and the reveal must have the final say.
    await setHidden(
      known.filter((node) => node.hidden).map((node) => node.id),
      true
    );
    await setHidden(
      known.filter((node) => !node.hidden).map((node) => node.id),
      false
    );

    const nodeLayoutData = known
      .filter((node) => node.width > 0)
      .map((node) => ({
        id: node.id,
        position: { x: node.x, y: node.y },
        size: { width: node.width, height: node.height },
        minComputedSize: { width: node.minWidth, height: node.minHeight },
        resizedByUser: node.resizedByUser,
        movedByUser: true,
        handleLayoutData: [],
      }));

    if (nodeLayoutData.length > 0) {
      await layoutDiagram({
        variables: {
          input: {
            id: crypto.randomUUID(),
            editingContextId,
            representationId: diagramId,
            cause: 'layout',
            diagramLayoutData: {
              nodeLayoutData,
              edgeLayoutData: [],
              labelLayoutData: [],
              autoLayoutState: 'UNCHANGED',
            },
          },
        },
      });
    }
  };

  return (
    <span>
      <Tooltip title="View snapshot" placement="right">
        <IconButton
          data-testid="syson-view-snapshot-icon"
          color="inherit"
          size="small"
          aria-haspopup="true"
          onClick={(event) => setAnchorEl(event.currentTarget)}>
          <PhotoCameraOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        data-testid="syson-view-snapshot-menu"
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={closeMenu}>
        <MenuItem data-testid="syson-view-snapshot-freeze" onClick={freeze}>
          <ListItemText primary="Freeze current view" secondary="Remember what is shown, hidden and where" />
        </MenuItem>
        <Divider />
        <MenuItem data-testid="syson-view-snapshot-restore" onClick={restore} disabled={snapshot === null}>
          <ListItemText
            primary="Restore frozen view"
            secondary={snapshot ? `Frozen ${new Date(snapshot.savedAt).toLocaleString()}` : 'Nothing frozen yet'}
          />
        </MenuItem>
      </Menu>
    </span>
  );
};
