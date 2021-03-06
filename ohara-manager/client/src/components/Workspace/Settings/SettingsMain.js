/*
 * Copyright 2019 is-land
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

import React from 'react';
import cx from 'classnames';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import Typography from '@material-ui/core/Typography';

import * as hooks from 'hooks';
import { SETTINGS_COMPONENT_TYPES, KIND } from 'const';
import { Wrapper } from './SettingsMainStyles';
import RestartIndicator from './RestartIndicator';
import SectionList from './SectionList';
import SectionComponent from './SectionComponent';

const SettingsMain = ({
  sections,
  handleChange,
  selectedComponent,
  handleClose,
}) => {
  const isDialog = selectedComponent?.type === SETTINGS_COMPONENT_TYPES.DIALOG;
  const sectionWrapperCls = cx('section-wrapper', {
    'should-display': isEmpty(selectedComponent) || isDialog,
  });

  const discardWorkspace = hooks.useDiscardWorkspaceChangedSettingsAction();
  const openRestartWorkspace = hooks.useOpenRestartWorkspaceDialogAction();
  const restartWorkspace = hooks.useRestartWorkspaceAction();
  const hasRunningServices = hooks.useHasRunningServices();
  const {
    shouldBeRestartWorkspace,
    shouldBeRestartWorker,
    shouldBeRestartBroker,
    shouldBeRestartZookeeper,
  } = hooks.useShouldBeRestartWorkspace();

  let kind = KIND.workspace;
  let steps = [
    'Stop Worker',
    'Stop Broker',
    'Stop Zookeeper',
    'Start Zookeeper',
    'Start Broker',
    'Start Worker',
  ];

  if (
    shouldBeRestartWorker &&
    !shouldBeRestartBroker &&
    !shouldBeRestartZookeeper
  ) {
    kind = KIND.worker;
    steps = ['Stop Worker', 'Start Worker'];
  } else if (shouldBeRestartBroker && !shouldBeRestartZookeeper) {
    kind = KIND.broker;
    steps = ['Stop Worker', 'Stop Broker', 'Start Broker', 'Start Worker'];
  }

  const restartConfirmMessage = hooks.useRestartConfirmMessage(kind);

  return (
    <Wrapper>
      <div className={sectionWrapperCls}>
        <RestartIndicator
          hasRunningServices={hasRunningServices}
          isOpen={shouldBeRestartWorkspace}
          onDiscard={discardWorkspace}
          onRestart={() => {
            openRestartWorkspace({ steps });
            restartWorkspace(kind);
          }}
          restartConfirmMessage={restartConfirmMessage}
        />
        {sections.map((section) => {
          const { heading, components, ref } = section;
          const listWrapperCls = cx('list-wrapper', {
            'is-danger-zone': heading === 'Danger Zone',
          });

          return (
            <section key={heading}>
              <div className="anchor-element" ref={ref} />
              <Typography component="h2" variant="h5">
                {heading}
              </Typography>
              <div className={listWrapperCls}>
                <SectionList
                  handleChange={handleChange}
                  list={components}
                  sectionHeading={heading}
                  sectionRef={ref}
                  selectedComponent={selectedComponent}
                />
              </div>
            </section>
          );
        })}
      </div>
      <SectionComponent
        handleClose={handleClose}
        sections={sections}
        selectedComponent={selectedComponent}
      />
    </Wrapper>
  );
};

SettingsMain.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      heading: PropTypes.string.isRequired,
      ref: PropTypes.object,
      components: PropTypes.arrayOf(
        PropTypes.shape({
          icon: PropTypes.node,
          text: PropTypes.string,
        }),
      ),
    }),
  ).isRequired,
  handleChange: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  selectedComponent: PropTypes.shape({
    name: PropTypes.string,
    type: PropTypes.string,
  }),
};

SettingsMain.defaultProps = {
  openRestartProgressDialog: () => {},
};

export default React.memo(SettingsMain);
