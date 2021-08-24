/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  RELATION_CHILD_OF,
  stringifyEntityRef,
  parseEntityRef,
  GroupEntity,
} from '@backstage/catalog-model';
import {
  catalogApiRef,
  entityRouteRef,
  getEntityRelations,
  formatEntityRefTitle,
} from '@backstage/plugin-catalog-react';
import { makeStyles, Typography } from '@material-ui/core';
import ZoomOutMap from '@material-ui/icons/ZoomOutMap';
import React from 'react';
import { useAsync } from 'react-use';
import { BackstageTheme } from '@backstage/theme';

import {
  DependencyGraph,
  DependencyGraphTypes,
  Progress,
  ResponseErrorPanel,
  Link,
} from '@backstage/core-components';
import { useApi, useRouteRef, configApiRef } from '@backstage/core-plugin-api';
import { Chunk } from 'webpack';

const useStyles = makeStyles((theme: BackstageTheme) => ({
  organizationNode: {
    fill: 'coral',
    stroke: theme.palette.border,
  },
  groupNode: {
    fill: 'yellowgreen',
    stroke: theme.palette.border,
  },
}));

const textFontSize: number = 15;
const nodeWidth: number = 180;
const nodeHeight: number = 90;
const nodeCornerRadius: number = 20;
const middleAlignmentShift: number = 5;
const maxWordsPerRow: number = 3;
const maxLinesPerNode: number = 3;

function RenderNode(props: DependencyGraphTypes.RenderNodeProps<any>) {
  const classes = useStyles();
  const catalogEntityRoute = useRouteRef(entityRouteRef);

  if (props.node.id === 'root') {
    return (
      <g>
        <rect
          width={nodeWidth}
          height={nodeHeight}
          rx={nodeCornerRadius}
          className={classes.organizationNode}
        />
        <title>{props.node.name}</title>
        <text
          x={nodeWidth / 2}
          y={nodeHeight / 2 + middleAlignmentShift}
          textAnchor="middle"
          alignmentBaseline="baseline"
          style={{ fontWeight: 'bold' }}
        >
          {props.node.name}
        </text>
      </g>
    );
  }

  const ref = parseEntityRef(props.node.id);
  const nameChunks = splitNameInChunks(props.node.name);
  const objs = prepareForDisplay(nameChunks);

  return (
    <g>
      <rect
        width={nodeWidth}
        height={nodeHeight}
        rx={nodeCornerRadius}
        className={classes.groupNode}
      />
      <title>{props.node.name}</title>

      <Link
        to={catalogEntityRoute({
          kind: ref.kind,
          namespace: ref.namespace,
          name: ref.name,
        })}
      >
        <text
          x={nodeWidth / 2}
          y={nodeHeight / 2 + middleAlignmentShift}
          textAnchor="middle"
          alignmentBaseline="baseline"
          style={{ fontWeight: 'bold', fontSize: textFontSize }}
        >
          {objs.map(function (object: any, i: number) {
            return (
              <tspan
                y={nodeHeight / 2 + middleAlignmentShift}
                x="90"
                textAnchor="middle"
                dy={object.dy}
              >
                {object.text}
              </tspan>
            );
          })}
        </text>
      </Link>
    </g>
  );
}

/**
 *
 * @param chunkedArray
 * @returns
 */
function prepareForDisplay(chunkedArray: any): any {
  return chunkedArray.map((val: Array<string>, pos: number) => {
    const text = val.join(' ');

    // If array length == 1, dy should be 0 since there is no need to handle the blocks inside the node
    const dy = chunkedArray.length === 1 ? 0 : getDy(pos) - 30;
    return { dy: dy, text: `${text}` };
  });
}

/**
 * text svg dy shifting based on array pos and in the blocks inside the node
 */
function getDy(i: number) {
  const blocksSize = nodeHeight / maxLinesPerNode;
  const position = 0 + blocksSize * i;
  return position;
}

/**
 * Create Chunked name based on maxLinesPerNode and maxWordsPerRow
 * @param name from props.node.name
 * @returns
 */
function splitNameInChunks(name: string) {
  const array = name.split(' ');
  const formated = array
    .slice(0, maxLinesPerNode * maxWordsPerRow)
    .map((it, pos) =>
      pos + 1 === maxLinesPerNode * maxWordsPerRow ? `${it}...` : it,
    );
  const chunked = chunkArray(formated, maxWordsPerRow);
  return chunked;
}

/**
 * Returns an array with arrays of the given size.
 *
 * @param arr {Array} Array to split
 * @param size {Integer} Size of each group
 */
function chunkArray(arr: Array<any>, size: number) {
  const results = [];

  while (arr.length) {
    results.push(arr.splice(0, size));
  }
  return results;
}

/**
 * Dynamically generates a diagram of groups registered in the catalog.
 */
export function GroupsDiagram() {
  const nodes = new Array<{
    id: string;
    kind: string;
    name: string;
  }>();
  const edges = new Array<{ from: string; to: string; label: string }>();

  const configApi = useApi(configApiRef);
  const catalogApi = useApi(catalogApiRef);
  const organizationName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';
  const {
    loading,
    error,
    value: catalogResponse,
  } = useAsync(() => {
    return catalogApi.getEntities({
      filter: {
        kind: ['Group'],
      },
    });
  }, [catalogApi]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  // the root of this diagram is the organization
  nodes.push({
    id: 'root',
    kind: 'Organization',
    name: organizationName,
  });

  for (const catalogItem of catalogResponse?.items || []) {
    const currentItemId = stringifyEntityRef(catalogItem);

    nodes.push({
      id: stringifyEntityRef(catalogItem),
      kind: catalogItem.kind,
      name:
        (catalogItem as GroupEntity).spec?.profile?.displayName ||
        formatEntityRefTitle(catalogItem, { defaultKind: 'Group' }),
    });

    // Edge to parent
    const catalogItemRelations_childOf = getEntityRelations(
      catalogItem,
      RELATION_CHILD_OF,
    );

    // if no parent is found, link the node to the root
    if (catalogItemRelations_childOf.length === 0) {
      edges.push({
        from: currentItemId,
        to: 'root',
        label: '',
      });
    }

    catalogItemRelations_childOf.forEach(relation => {
      edges.push({
        from: currentItemId,
        to: stringifyEntityRef(relation),
        label: '',
      });
    });
  }

  return (
    <>
      <DependencyGraph
        nodes={nodes}
        edges={edges}
        nodeMargin={10}
        direction={DependencyGraphTypes.Direction.RIGHT_LEFT}
        renderNode={RenderNode}
      />
      <Typography
        variant="caption"
        style={{ display: 'block', textAlign: 'right' }}
      >
        <ZoomOutMap style={{ verticalAlign: 'bottom' }} /> Use pinch &amp; zoom
        to move around the diagram.
      </Typography>
    </>
  );
}
