/*
 * Copyright 2020 The Backstage Authors
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

import React, { PropsWithChildren } from 'react';
import { BackstageTheme } from '@backstage/theme';
import { makeStyles, ThemeProvider } from '@material-ui/core';

export type PageClassKey = 'root';

const useStyles = makeStyles(
  () => ({
    root: {
      display: 'grid',
      gridTemplateAreas:
        "'pageHeader pageHeader pageHeader' 'pageSubheader pageSubheader pageSubheader' 'pageNav pageContent pageSidebar'",
      gridTemplateRows: 'max-content auto 1fr',
      gridTemplateColumns: 'auto 1fr auto',
      height: '100vh',
      overflowY: 'auto',
    },
  }),
  { name: 'BackstagePage' },
);

type Props = {
  themeId: string;
};

export function Page(props: PropsWithChildren<Props>) {
  const { themeId, children } = props;
  const classes = useStyles();
  return (
    <ThemeProvider
      theme={(baseTheme: BackstageTheme) => ({
        ...baseTheme,
        page: baseTheme.getPageTheme({ themeId }),
      })}
    >
      <div className={classes.root}>{children}</div>
    </ThemeProvider>
  );
}
